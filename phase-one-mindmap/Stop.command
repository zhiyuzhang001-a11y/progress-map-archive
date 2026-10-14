#!/bin/zsh
set -eu
cd "${0:A:h}"
if command -v node >/dev/null 2>&1 && node -e 'process.exit(Number(process.versions.node.split(".")[0])>=24?0:1)' >/dev/null 2>&1; then
 runtime=$(command -v node)
else
 runtime="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
exec "$runtime" scripts/manage-service.ts stop
