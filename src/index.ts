import { spawn } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import {
  getManagerConfig,
  managers,
  type Action,
  type ManagerName,
} from './config'

const cwd = process.cwd()

type LockFileMatch = {
  manager: ManagerName
  lockFiles: string[]
}

type ProjectInfo = {
  dir: string
  packageManager?: ManagerName
  lockFiles: LockFileMatch[]
}

type ParsedArgs = {
  action: Action
  dryRun: boolean
  help: boolean
  packages: string[]
  version: boolean
}

export default async function tpm() {
  const parsed = parseArgs(process.argv.slice(2))

  if (parsed.help) {
    printHelp()
    return
  }

  if (parsed.version) {
    console.log(await readVersion())
    return
  }

  if (parsed.packages.length === 0) {
    throw new Error('tpm: no package provided. Run `tpm --help` for usage.')
  }

  const manager = await getManager()
  const command = buildManagerCommand(
    manager,
    parsed.action,
    parsed.packages.map(toTypesPackageName),
  )

  console.log(formatCommand([manager, ...command]))

  if (parsed.dryRun) {
    return
  }

  await spawnManager(manager, command)
}

export function parseArgs(args: string[]): ParsedArgs {
  const positional: string[] = []
  let action: Action = 'install'
  let dryRun = false
  let help = false
  let version = false

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      help = true
      continue
    }

    if (arg === '--version' || arg === '-v') {
      version = true
      continue
    }

    if (arg === '--dry-run' || arg === '-n') {
      dryRun = true
      continue
    }

    positional.push(arg)
  }

  const first = positional[0]
  if (
    first === '-' ||
    first === 'remove' ||
    first === 'rm' ||
    first === 'uninstall'
  ) {
    action = 'uninstall'
    positional.shift()
  }

  return {
    action,
    dryRun,
    help,
    packages: positional,
    version,
  }
}

export function toTypesPackageName(packageName: string): string {
  const value = packageName.trim()

  if (value.length === 0) {
    throw new Error('tpm: package name cannot be empty.')
  }

  if (value.startsWith('@types/')) {
    return value
  }

  const scoped = /^@([^/]+)\/([^/@]+)(@.+)?$/.exec(value)
  if (scoped) {
    const [, scope, name, version = ''] = scoped
    return `@types/${scope}__${name}${version}`
  }

  const regular = /^([^/@]+)(@.+)?$/.exec(value)
  if (regular) {
    const [, name, version = ''] = regular
    return `@types/${name}${version}`
  }

  throw new Error(`tpm: unsupported package name "${packageName}".`)
}

export function buildManagerCommand(
  managerName: ManagerName,
  action: Action,
  packages: string[],
): string[] {
  const manager = getManagerConfig(managerName)
  const managerCommand = manager.commands[action]

  return [managerCommand.command, ...managerCommand.args, ...packages]
}

export async function getManager(
  defaultManager: ManagerName = 'npm',
): Promise<ManagerName> {
  const project = await findNearestProject(cwd)

  if (!project) {
    return defaultManager
  }

  if (project.packageManager) {
    return project.packageManager
  }

  if (project.lockFiles.length === 1) {
    return project.lockFiles[0].manager
  }

  return selectManager(project)
}

async function findNearestProject(
  startDir: string,
): Promise<ProjectInfo | undefined> {
  let dir = startDir

  // 从当前目录逐级向上找最近的项目信号，保证在 monorepo 子目录执行时仍然能命中仓库根目录。
  while (true) {
    const packageManager = await readPackageManager(dir)
    const lockFiles = await readLockFiles(dir)

    if (packageManager || lockFiles.length > 0) {
      return {
        dir,
        packageManager,
        lockFiles,
      }
    }

    const parent = dirname(dir)
    if (parent === dir) {
      return undefined
    }

    dir = parent
  }
}

async function readPackageManager(
  dir: string,
): Promise<ManagerName | undefined> {
  try {
    const packageJson = JSON.parse(
      await readFile(resolve(dir, 'package.json'), 'utf8'),
    )
    const packageManager = packageJson.packageManager

    if (typeof packageManager !== 'string') {
      return undefined
    }

    const manager = packageManager.split('@')[0]
    if (isManagerName(manager)) {
      return manager
    }

    throw new Error(
      `tpm: packageManager "${packageManager}" is not supported. Supported managers: ${managers
        .map(manager => manager.name)
        .join(', ')}.`,
    )
  } catch (error) {
    if (isNotFoundError(error)) {
      return undefined
    }

    throw error
  }
}

async function readLockFiles(dir: string): Promise<LockFileMatch[]> {
  const matches: LockFileMatch[] = []

  for (const manager of managers) {
    const lockFiles: string[] = []

    for (const lockFile of manager.lockFiles) {
      try {
        await access(resolve(dir, lockFile))
        lockFiles.push(lockFile)
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error
        }
      }
    }

    if (lockFiles.length > 0) {
      matches.push({
        manager: manager.name,
        lockFiles,
      })
    }
  }

  return matches
}

async function selectManager(project: ProjectInfo): Promise<ManagerName> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      `tpm: multiple lockfiles found in ${project.dir}. Set packageManager in package.json for non-interactive usage.`,
    )
  }

  console.log(
    `Multiple lockfiles found in ${project.dir}. Select a package manager:`,
  )
  project.lockFiles.forEach(({ manager, lockFiles }, index) => {
    console.log(`${index + 1}. ${manager} (${lockFiles.join(', ')})`)
  })

  const rl = createInterface({ input, output })

  try {
    while (true) {
      const answer = await rl.question('Package manager number: ')
      const index = Number(answer.trim()) - 1
      const selected = project.lockFiles[index]

      if (selected) {
        return selected.manager
      }

      console.log(
        `Please enter a number between 1 and ${project.lockFiles.length}.`,
      )
    }
  } finally {
    rl.close()
  }
}

function spawnManager(manager: ManagerName, args: string[]): Promise<void> {
  return new Promise((resolveChild, rejectChild) => {
    let settled = false
    const child = spawn(manager, args, { stdio: 'inherit', cwd })

    child.on('error', error => {
      if (settled) {
        return
      }
      settled = true

      if (isNotFoundError(error)) {
        rejectChild(new Error(`tpm: command not found: ${manager}`))
        return
      }

      rejectChild(error)
    })

    child.on('exit', code => {
      if (settled) {
        return
      }
      settled = true

      process.exitCode = code ?? 1
      resolveChild()
    })
  })
}

async function readVersion(): Promise<string> {
  try {
    const packageJson = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    )

    if (typeof packageJson.version === 'string') {
      return packageJson.version
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error
    }
  }

  return 'unknown'
}

function printHelp() {
  console.log(`Usage:
  tpm [options] <package...>
  tpm - <package...>
  tpm remove <package...>

Options:
  -n, --dry-run   Print the detected command without running it
  -v, --version   Print the installed tpm version
  -h, --help      Print this help message

Examples:
  tpm node react
  tpm @babel/core
  tpm - node react`)
}

function formatCommand(args: string[]): string {
  return args.map(quoteArg).join(' ')
}

function quoteArg(arg: string): string {
  if (/^[\w@./:-]+$/.test(arg)) {
    return arg
  }

  return JSON.stringify(arg)
}

function isManagerName(value: string): value is ManagerName {
  return managers.some(manager => manager.name === value)
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}
