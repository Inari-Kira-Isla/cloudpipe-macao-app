#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash scripts/fix-stale-dynamic-sitemap-launchagent.sh          # dry run
  bash scripts/fix-stale-dynamic-sitemap-launchagent.sh --execute
  bash scripts/fix-stale-dynamic-sitemap-launchagent.sh --verify
  sudo bash scripts/fix-stale-dynamic-sitemap-launchagent.sh --execute

Purpose:
  Remove the stale non-standard LaunchAgent plist:
  ~/.openclaw/LaunchAgents/com.ai.cloudpipe.dynamic-sitemap-generator.plist

The script archives the plist under ~/.openclaw/api-cache/launchagent-cleanup/
before deleting the original. It does not modify ~/Library/LaunchAgents.
EOF
}

MODE="dry-run"
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
elif [[ "${1:-}" == "--execute" ]]; then
  MODE="execute"
elif [[ "${1:-}" == "--verify" ]]; then
  MODE="verify"
elif [[ $# -gt 0 ]]; then
  echo "Unknown argument: $1" >&2
  usage
  exit 2
fi

resolve_user_home() {
  if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
    dscl . -read "/Users/${SUDO_USER}" NFSHomeDirectory | awk '{print $2}'
  else
    printf '%s\n' "${HOME}"
  fi
}

USER_HOME="$(resolve_user_home)"
USER_NAME="${SUDO_USER:-$(id -un)}"
USER_ID="$(id -u "${USER_NAME}")"
LABEL="com.ai.cloudpipe.dynamic-sitemap-generator"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PATH="${SCRIPT_DIR}/$(basename "${BASH_SOURCE[0]}")"

TARGETS=(
  "${USER_HOME}/.openclaw/LaunchAgents/${LABEL}.plist"
  "${USER_HOME}/.openclaw/launchagents/${LABEL}.plist"
)
ARCHIVE_DIR="${USER_HOME}/.openclaw/api-cache/launchagent-cleanup/$(date +%Y%m%d-%H%M%S)"

echo "Mode: ${MODE}"
echo "User: ${USER_NAME} (${USER_ID})"
echo "Label: ${LABEL}"

run() {
  if [[ "${MODE}" == "dry-run" ]]; then
    printf '[DRY] '
    printf '%q ' "$@"
    printf '\n'
  else
    "$@"
  fi
}

run_allow_failure() {
  if [[ "${MODE}" == "dry-run" ]]; then
    printf '[DRY] '
    printf '%q ' "$@"
    printf '\n'
  else
    "$@" || true
  fi
}

print_admin_handoff() {
  cat <<EOF

Administrator action required.
This environment cannot write to ~/.openclaw/LaunchAgents or ~/.openclaw/api-cache.
Run this from a normal macOS Terminal session:

  cd ${SCRIPT_DIR%/scripts}
  sudo bash ${SCRIPT_PATH} --execute
  bash ${SCRIPT_PATH} --verify

EOF
}

unique_existing_targets=()
for target in "${TARGETS[@]}"; do
  if [[ -e "${target}" ]]; then
    duplicate=false
    if [[ ${#unique_existing_targets[@]} -gt 0 ]]; then
      for existing in "${unique_existing_targets[@]}"; do
        if [[ "${target}" -ef "${existing}" ]]; then
          duplicate=true
          break
        fi
      done
    fi
    if [[ "${duplicate}" == "false" ]]; then
      unique_existing_targets+=("${target}")
    fi
  fi
done

if [[ ${#unique_existing_targets[@]} -eq 0 ]]; then
  echo "No stale plist found under ~/.openclaw/LaunchAgents."
  if [[ "${MODE}" == "verify" ]]; then
    latest_archive="$(find "${USER_HOME}/.openclaw/api-cache/launchagent-cleanup" -name "${LABEL}.plist" -type f -print 2>/dev/null | sort | tail -n 1 || true)"
    if [[ -n "${latest_archive}" ]]; then
      echo "Latest archive: ${latest_archive}"
    else
      echo "Warning: no archive found under ~/.openclaw/api-cache/launchagent-cleanup." >&2
      exit 1
    fi
  fi
  exit 0
fi

if [[ "${MODE}" == "verify" ]]; then
  echo "Verification failed: stale plist still exists."
  exit 1
fi

echo "Found stale plist(s):"
for target in "${unique_existing_targets[@]}"; do
  echo "  ${target}"
done

if [[ "${MODE}" == "execute" && "${EUID}" -ne 0 ]]; then
  ARCHIVE_PARENT="${USER_HOME}/.openclaw/api-cache/launchagent-cleanup"
  if ! mkdir -p "${ARCHIVE_PARENT}" 2>/dev/null; then
    print_admin_handoff >&2
    exit 77
  fi

  for target in "${unique_existing_targets[@]}"; do
    if [[ ! -w "$(dirname "${target}")" ]]; then
      print_admin_handoff >&2
      exit 77
    fi
  done
fi

echo "Checking launchd registration..."
if launchctl print "gui/${USER_ID}/${LABEL}" >/dev/null 2>&1; then
  run launchctl bootout "gui/${USER_ID}/${LABEL}"
else
  echo "  ${LABEL} is not registered in gui/${USER_ID}."
fi

for target in "${unique_existing_targets[@]}"; do
  run_allow_failure launchctl unload "${target}"
done

run mkdir -p "${ARCHIVE_DIR}"
for target in "${unique_existing_targets[@]}"; do
  archive_path="${ARCHIVE_DIR}/$(basename "${target}")"
  run cp -p "${target}" "${archive_path}"
  run rm -f "${target}"
done

if [[ "${MODE}" == "execute" && "${EUID}" -eq 0 ]]; then
  run chown -R "${USER_NAME}:staff" "${ARCHIVE_DIR}"
fi

echo "Done. Archive directory: ${ARCHIVE_DIR}"
if [[ "${MODE}" == "dry-run" ]]; then
  echo "Re-run with --execute to apply. Use sudo only if normal execution is denied."
elif [[ "${MODE}" == "execute" ]]; then
  echo "Run --verify to confirm the stale plist was removed."
fi
