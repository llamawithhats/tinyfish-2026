#!/bin/sh
set -eu

DOCKER_APP_BIN="/Applications/Docker.app/Contents/Resources/bin"

export PATH="$DOCKER_APP_BIN:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

exec "$DOCKER_APP_BIN/docker" compose "$@"
