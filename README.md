# TPM(typings package manager)

TPM is a command line tool for managing your `TypeScript` `@types/xxx` packages.

> Support npm, pnpm, and yarn package manager.

## Install

```shell
pnpm install @heroor/tpm -g
```

## Usage

### install typings

```shell
tpm node react

# same as:
# npm install @types/node @types/react -D
# or
# pnpm add @types/node @types/react -D
# or
# yarn add @types/node @types/react -D
```

### uninstall typings

```shell
tpm - node react

# same as:
# npm uninstall @types/node @types/react -D
# or
# pnpm remove @types/node @types/react -D
# or
# yarn remove @types/node @types/react -D
```

## develop

```shell
pnpm install
pnpm run dev
pnpm link --global # link to global
pnpm remove --global @heroor/tpm # remove/unlink tpm
```

## Licence

License [MIT](https://github.com/Heroor/tpm/blob/main/LICENSE)

© 2022-present, [Bener](https://github.com/Heroor)
