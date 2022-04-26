export type Action = 'install' | 'uninstall'
export type Manager = {
  name: string
  install: string
  uninstall: string
  lockFile: string
}

const npm: Manager = {
  name: 'npm',
  install: 'install',
  uninstall: 'uninstall',
  lockFile: 'package-lock.json',
}
const pnpm: Manager = {
  name: 'pnpm',
  install: 'add',
  uninstall: 'remove',
  lockFile: 'pnpm-lock.yaml',
}
const yarn: Manager = {
  name: 'yarn',
  install: 'add',
  uninstall: 'remove',
  lockFile: 'yarn.lock',
}
export const managers = [npm, pnpm, yarn]

export const lockFileMap = new Map(
  managers.map(({ name, lockFile }) => [name, lockFile])
)
export const installCmdMap = new Map(
  managers.map(({ name, install }) => [name, install])
)
export const uninstallCmdMap = new Map(
  managers.map(({ name, uninstall }) => [name, uninstall])
)

type CMDMap = {
  [k in Action]: typeof installCmdMap | typeof uninstallCmdMap
}
export const cmdMap: CMDMap = {
  install: installCmdMap,
  uninstall: uninstallCmdMap,
}
