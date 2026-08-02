#!/bin/bash
set -e

# Get the lando logger
. /helpers/log.sh

# Set the module
LANDO_MODULE="sqlcli"

# Set generic config
HOST=localhost

# Get type-specific config
if [[ ${POSTGRES_DB} != '' ]]; then
  DATABASE=${POSTGRES_DB:-database}
  PORT=${LANDO_DB_CLI_PORT:-5432}
  USER=${LANDO_DB_CLI_USER:-${POSTGRES_USER:-postgres}}
else
  DATABASE=${MYSQL_DATABASE:-database}
  PORT=${LANDO_DB_CLI_PORT:-3306}
  USER=${LANDO_DB_CLI_USER:-root}
fi

# PARSE THE ARGZZ
# The --host option is handled by landos built in dynamic service resolution so we just need to drop it here,
# everything else gets passed straight through to the underlying client
ARGS=()
while (( "$#" )); do
  case "$1" in
    -h|--host)
      shift 2
      ;;
    --host=*)
      shift
      ;;
    --)
      shift
      ;;
    *)
      ARGS+=("$1")
      shift
      ;;
  esac
done

# Build DB specific connection command
if [[ ${POSTGRES_DB} != '' ]]; then
  if ! command -v psql >/dev/null 2>&1; then
    lando_red "Could not find a psql client on service ${LANDO_SERVICE_NAME}!"
    exit 1
  fi
  exec psql "postgresql://${USER}@${HOST}:${PORT}/${DATABASE}" ${LANDO_EXTRA_DB_CLI_ARGS} "${ARGS[@]}"
fi

# Newer MariaDB images have dropped the mysql symlink so prefer the mariadb client if mysql is not around
CLIENT=mysql
if ! command -v mysql >/dev/null 2>&1 && command -v mariadb >/dev/null 2>&1; then
  CLIENT=mariadb
fi

if ! command -v "$CLIENT" >/dev/null 2>&1; then
  lando_red "Could not find a mysql or mariadb client on service ${LANDO_SERVICE_NAME}!"
  exit 1
fi

exec "$CLIENT" -h "$HOST" -P "$PORT" -u "$USER" ${LANDO_EXTRA_DB_CLI_ARGS} "$DATABASE" "${ARGS[@]}"
