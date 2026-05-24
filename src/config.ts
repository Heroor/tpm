export type Action = 'install' | 'uninstall'
export type ManagerName = 'npm' | 'pnpm' | 'yarn' | 'bun'

export type ManagerCommand = {
  command: string
  args: string[]
}

export type Manager = {
  name: ManagerName
  lockFiles: string[]
  commands: Record<Action, ManagerCommand>
}

const npm: Manager = {
  name: 'npm',
  lockFiles: ['package-lock.json'],
  commands: {
    install: {
      command: 'install',
      args: ['--save-dev'],
    },
    uninstall: {
      command: 'uninstall',
      args: [],
    },
  },
}

const pnpm: Manager = {
  name: 'pnpm',
  lockFiles: ['pnpm-lock.yaml'],
  commands: {
    install: {
      command: 'add',
      args: ['--save-dev'],
    },
    uninstall: {
      command: 'remove',
      args: [],
    },
  },
}

const yarn: Manager = {
  name: 'yarn',
  lockFiles: ['yarn.lock'],
  commands: {
    install: {
      command: 'add',
      args: ['--dev'],
    },
    uninstall: {
      command: 'remove',
      args: [],
    },
  },
}

const bun: Manager = {
  name: 'bun',
  lockFiles: ['bun.lock', 'bun.lockb'],
  commands: {
    install: {
      command: 'add',
      args: ['--dev'],
    },
    uninstall: {
      command: 'remove',
      args: [],
    },
  },
}

export const managers = [npm, pnpm, yarn, bun] as const satisfies Manager[]

export function getManagerConfig(name: ManagerName): Manager {
  const manager = managers.find(manager => manager.name === name)

  if (!manager) {
    throw new Error(`tpm: unsupported package manager "${name}".`)
  }

  return manager
}
