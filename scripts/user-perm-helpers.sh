#!/bin/sh

# Source da helpas
. /helpers/log.sh

# Set the module
LANDO_MODULE="userperms"

# Verify user
verify_user() {
  local USER=$1
  local GROUP=$2
  id -u "$USER" > /dev/null 2>&1
  groups "$USER" | grep "$GROUP" > /dev/null 2>&1
  if command -v chsh > /dev/null 2>&1 ; then
    if command -v /bin/bash > /dev/null 2>&1 ; then
      chsh -s /bin/bash $USER || true
    fi;
  else
    true
    # is there a chsh we can use? do we need to?
  fi;
}

# Reset user
reset_user() {
  local USER=$1
  local GROUP=$2
  local HOST_UID=$3
  local HOST_GID=$4
  local DISTRO=$5
  local USER_HOME=$6

  if getent group "$GROUP" 1>/dev/null 2>/dev/null; then
    local CURRENT_GID=$(getent group "$GROUP" | cut -d: -f3)
    if [ "$CURRENT_GID" != "$HOST_GID" ]; then
      if [ "$DISTRO" = "alpine" ]; then
        # No groupmod on Alpine — edit /etc/group directly (atomic-ish, no delete)
        sed -i "s/^\($GROUP:[^:]*:\)[0-9]*/\1$HOST_GID/" /etc/group
      else
        groupmod -o -g "$HOST_GID" "$GROUP" 2>/dev/null
      fi
    fi
  else
    if [ "$DISTRO" = "alpine" ]; then
      addgroup -g "$HOST_GID" "$GROUP" 2>/dev/null
    else
      groupadd -o -g "$HOST_GID" "$GROUP" 2>/dev/null
    fi
  fi

  if id -u "$USER" 1>/dev/null 2>/dev/null; then
    # User exists — fix UID and primary group if needed
    if [ "$DISTRO" = "alpine" ]; then
      # No usermod on Alpine — edit /etc/passwd directly (no delete/recreate race)
      local CURRENT_UID=$(id -u "$USER")
      local CURRENT_GID=$(id -g "$USER")
      if [ "$CURRENT_UID" != "$HOST_UID" ] || [ "$CURRENT_GID" != "$HOST_GID" ]; then
        sed -i "s/^\($USER:[^:]*:\)[0-9]*:[0-9]*/\1$HOST_UID:$HOST_GID/" /etc/passwd
      fi
    else
      if [ "$(id -u "$USER")" != "$HOST_UID" ]; then
        usermod -o -u "$HOST_UID" "$USER" 2>/dev/null
      fi
      if [ "$(id -g "$USER")" != "$HOST_GID" ]; then
        usermod -g "$HOST_GID" "$USER" 2>/dev/null
      fi
    fi
  else
    if [ "$DISTRO" = "alpine" ]; then
      adduser -u "$HOST_UID" -G "$GROUP" -h "$USER_HOME" -D "$USER" 2>/dev/null
    else
      useradd -o -u "$HOST_UID" -g "$HOST_GID" -d "$USER_HOME" -M "$USER" 2>/dev/null
    fi
  fi

  if [ "$(id -u "$USER" 2>/dev/null)" != "$HOST_UID" ]; then
    lando_warn "Could not map $USER to UID $HOST_UID, aborting..."
    exit 1
  fi
  if [ "$(id -g "$USER" 2>/dev/null)" != "$HOST_GID" ]; then
    lando_warn "Could not map $USER to GID $HOST_GID, aborting..."
    exit 1
  fi
}

# Perm sweeper
# Note that while the order of these things might seem weird and/or redundant
# it is designed to fix more "critical" directories first
perm_sweep() {
  local USER=$1
  local GROUP=$2
  local USER_HOME=$3
  local OTHER_DIR=$4

  chmod 755 /var/www

  # Do other dirs first if we have them
  if [ ! -z "$OTHER_DIR" ]; then
    nohup chown -R $USER:$GROUP $OTHER_DIR >> /tmp/perms.out 2>> /tmp/perms.err && lando_info "chowned $OTHER_DIR" &
  fi

  # Build a list of bind-mount paths under /var/www to exclude from the sweep.
  # LANDO_DOCKER_DATA_ROOT is set from dockerode's docker info and contains the Docker storage root.
  # Mounts with sources under that path are Docker-managed (volumes, containers, etc.) and should be chowned.
  # Everything else mounted under /var/www is a host bind mount and should be skipped.
  PRUNE_ARGS=""
  if [ -f /proc/self/mountinfo ] && [ -n "$LANDO_DOCKER_DATA_ROOT" ]; then
    for mnt in $(awk -v root="$LANDO_DOCKER_DATA_ROOT" '$5 ~ "^/var/www/.+" && $4 !~ root {print $5}' /proc/self/mountinfo); do
      PRUNE_ARGS="$PRUNE_ARGS -path $mnt -prune -o"
    done
  fi

  # Do permission sweep and wait for completion
  nohup find /var/www $PRUNE_ARGS -not -user $USER -exec chown $USER:$GROUP {} + >> /dev/null 2>> /tmp/perms.err && lando_info "chowned /var/www" &
  nohup find /usr/local $PRUNE_ARGS -not -user $USER -exec chown $USER:$GROUP {} + >> /tmp/perms.out 2>> /tmp/perms.err && lando_info "chowned /usr/local" &
  nohup chmod -R 777 /tmp > /tmp/perms.out 2> /tmp/perms.err && lando_info "chowned /tmp" &

  if [ -d "$USER_HOME" ]; then
    nohup find "$USER_HOME" $PRUNE_ARGS -not -user $USER -exec chown $USER:$GROUP {} + >> /tmp/perms.out 2>> /tmp/perms.err && lando_info "chowned $USER_HOME" &
  fi
  if [ -d /lando/keys ]; then
    nohup chown -R $USER:$GROUP /lando/keys >> /tmp/perms.out 2>> /tmp/perms.err && lando_info "chowned /lando/keys" &
  fi

  wait
  lando_info "perm sweep complete"

  if [ -s /tmp/perms.err ]; then
    lando_warn "Perm sweep errors occured! This may or not impact you (dangling symlinks or read-only filesystem errors are fine)"
    lando_warn "$(cat /tmp/perms.err)"
  fi
}
