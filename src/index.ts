import path from 'path'
import fs from 'fs/promises'
import { spawn } from 'child_process'
import { lockFileMap, cmdMap, type Action } from './config'

const cwd = process.cwd()
const args = process.argv.slice(2).filter(Boolean)
const action: Action = args[0] === '-' ? (args.shift(), 'uninstall') : 'install'

export async function tpm() {
  if (!args.length) {
    console.error('Error: No package provided')
    return
  }

  const manager = await getManager()
  const packages = args.map(pkg => `@types/${pkg}`)
  const act = cmdMap[action].get(manager)
  const command = `${manager} ${act} ${packages.join(' ')} -D`
  console.log('manager:', manager)
  console.log(`${action}:`, args.join(', '))
  console.log(command)
  spawn(command, { shell: true, stdio: 'inherit', cwd })
}

async function getManager() {
  let manager = 'npm'
  for await (const [manager, lockFile] of lockFileMap) {
    try {
      await fs.access(path.resolve(cwd, lockFile))
      return manager
    } catch (_) {}
  }
  return manager
}
