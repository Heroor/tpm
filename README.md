# TPM

TPM is a command line tool for installing and removing TypeScript `@types/*` packages with the package manager used by the current project.

## Features

- Supports `npm`, `pnpm`, `yarn`, and `bun`
- Prefers the `packageManager` field in `package.json`
- Falls back to lockfile detection when `packageManager` is not set
- Searches upward from the current directory, which works well in monorepo subdirectories
- Prompts for a package manager when multiple lockfiles are found in an interactive terminal
- Converts scoped packages such as `@babel/core` to `@types/babel__core`
- Keeps existing `@types/*` package names unchanged

## Installation

```bash
npm install -g @heroor/tpm
```

You can also install it globally with your preferred package manager:

```bash
pnpm add -g @heroor/tpm
yarn global add @heroor/tpm
bun install --global @heroor/tpm
```

## Usage

Install typings:

```bash
tpm node react

# npm install --save-dev @types/node @types/react
# pnpm add --save-dev @types/node @types/react
# yarn add --dev @types/node @types/react
# bun add --dev @types/node @types/react
```

Install typings for scoped packages:

```bash
tpm @babel/core

# @babel/core becomes @types/babel__core
```

Remove typings:

```bash
tpm - node react
tpm remove node react
```

Preview the command without running it:

```bash
tpm --dry-run node react
```

## Package Manager Detection

TPM starts from the current working directory and walks up parent directories until it finds the nearest `package.json` or supported lockfile.

Detection priority:

1. If `package.json` has a `packageManager` field, TPM uses that manager.
2. If lockfiles point to exactly one package manager, TPM uses that manager.
3. If lockfiles point to multiple package managers in an interactive terminal, TPM prompts you to choose one.
4. If no project signal is found, TPM defaults to `npm`.

Supported lockfiles:

| Package manager | Lockfile                 |
| --------------- | ------------------------ |
| `npm`           | `package-lock.json`      |
| `pnpm`          | `pnpm-lock.yaml`         |
| `yarn`          | `yarn.lock`              |
| `bun`           | `bun.lock`, `bun.lockb`  |

For stable CI and script usage, declare the package manager in `package.json`:

```json
{
  "packageManager": "pnpm@11.2.2"
}
```

## Development

```bash
pnpm install
pnpm test
pnpm run typecheck
pnpm run build
```

Source files live in `src/`, tests live in `test/`, and build output is written to `dist/`. The `prepack` script runs the build before publishing.

## License

MIT
