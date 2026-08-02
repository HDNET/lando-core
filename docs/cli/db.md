---
title: lando db
description: lando db drops into a database shell on a database service
---

# lando db

Drops into a database shell on a database service.

`lando db` works out which client to use at runtime by inspecting the service, so it does the right thing whether
the service is MySQL, MariaDB or PostgreSQL. If Lando can determine the flavor of your database service up front
it will *also* give you the conventional alias for it eg `lando mysql`, `lando mariadb` or `lando psql`.

This command is provided automatically for any app that has a service that looks like a database. That means a
service whose type is a known database eg `mysql`, `mariadb` or `postgres`, or a service literally called
`database`. If your recipe or Landofile already declares its own then that one is used instead.

## Usage

```sh
lando db [--host <service>]
```

### Options

```sh
--host, -h  The database service to use                                                                            [default: "database"]
```

## Examples

```sh
# Drop into a shell on the default database service
lando db

# Same thing, if Lando could detect the flavor
lando mysql

# Drop into a shell on a specific database service
lando db --host mydb

# Run a single query
lando db -- -e "SELECT 1"
```
