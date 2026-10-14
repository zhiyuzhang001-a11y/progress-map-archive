#!/bin/zsh
set -eu
cd "${0:A:h}"
if command -v node >/dev/null 2>&1 && node -e 'process.exit(Number(process.versions.node.split(".")[0])>=24?0:1)' >/dev/null 2>&1; then
  runtime=$(command -v node)
elif [[ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]]; then
  runtime="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
else
  print '需要 Node.js 24+。请安装后重试。'
  exit 1
fi
if ! "$runtime" -e 'if(Number(process.versions.node.split(".")[0])<24)process.exit(1)'; then
  print '需要 Node.js 24 或更新版本；当前 PATH 中的 Node 版本过旧。'
  exit 1
fi
exec "$runtime" scripts/manage-service.ts start --open
