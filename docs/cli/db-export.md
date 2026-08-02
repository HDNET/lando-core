---
title: lando db-export
description: lando db-export exports a database from a database service to a file
---

# lando db-export

Exports a database from a database service to a file.

This command is provided automatically for any app that has a service that looks like a database. That means a
service whose type is a known database eg `mysql`, `mariadb` or `postgres`, or a service literally called
`database`. If your recipe or Landofile already declares its own `db-export` then that one is used instead.

## Usage

```sh
lando db-export [file] [--host <service>] [--stdout]
```

## Arguments

```sh
file  The file to dump to, defaults to a timestamped file in the current directory
```

### Options

```sh
--host, -h  The database service to use                                                                            [default: "database"]
--stdout    Dump database to stdout
```

## Examples

```sh
# Dump the default database service to a timestamped file
lando db-export

# Dump to a specific file
lando db-export dump.sql

# Dump a specific database service to stdout
lando db-export --host mydb --stdout
```

::: warning File paths are resolved inside the container!
A relative path is resolved against the working directory *inside* the service, which is normally your app mount
eg `/app`. If a service has its app mount disabled then the dump lands somewhere inside the container and is lost
on the next rebuild, so pass a path that is bind mounted from your host.
:::
