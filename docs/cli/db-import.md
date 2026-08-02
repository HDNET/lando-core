---
title: lando db-import
description: lando db-import imports a dump file into a database service
---

# lando db-import

Imports a dump file into a database service.

This command is provided automatically for any app that has a service that looks like a database. That means a
service whose type is a known database eg `mysql`, `mariadb` or `postgres`, or a service literally called
`database`. If your recipe or Landofile already declares its own `db-import` then that one is used instead.

## Usage

```sh
lando db-import <file> [--host <service>] [--no-wipe]
```

## Arguments

```sh
file  The dump file to import
```

### Options

```sh
--host, -h  The database service to use                                                                            [default: "database"]
--no-wipe   Do not destroy the existing database before an import                                                              [boolean]
```

## Examples

```sh
# Import a dump into the default database service
lando db-import dump.sql

# Import a gzipped dump without wiping the database first
lando db-import dump.sql.gz --no-wipe

# Import into a specific database service
lando db-import dump.sql --host mydb

# Import from stdin
cat dump.sql | lando db-import
```

::: warning File paths are resolved inside the container!
A relative path is resolved against the working directory *inside* the service, which is normally your app mount
eg `/app`. If a service has its app mount disabled then only paths that exist inside that container will work.
:::
