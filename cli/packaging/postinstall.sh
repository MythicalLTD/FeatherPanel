#!/bin/bash
set -e

case "${1:-}" in
  configure)
    ;;
  *)
    exit 0
    ;;
esac

if [ -x /usr/local/bin/feathercli ]; then
  echo "FeatherCli installed at /usr/local/bin/feathercli"
  echo "Run: feathercli config setup"
fi

exit 0
