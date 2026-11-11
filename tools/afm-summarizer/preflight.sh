#!/usr/bin/env bash
# Read-only readiness check for summarize.swift. Generates nothing, downloads nothing, changes nothing.
set -u

usage() {
  cat <<'EOF'
Usage: tools/afm-summarizer/preflight.sh [-h|--help]

Checks that this Mac can run summarize.swift: macOS 27 or newer, Apple silicon,
swift and the macOS SDK, then asks FoundationModels whether the on-device model is
available. No prompts, no generation, no network, no installs.

Exit codes: 0 ready (warnings allowed), 1 not ready, 2 bad arguments.
EOF
}

if [[ $# -eq 1 && ( "$1" == -h || "$1" == --help ) ]]; then usage; exit 0; fi
[[ $# -eq 0 ]] || { echo "preflight.sh: unexpected argument '$1'" >&2; usage >&2; exit 2; }

fails=0
warns=0
pass() { echo "PASS  $*"; }
warn() { echo "WARN  $*"; warns=$((warns + 1)); }
fail() { echo "FAIL  $*"; fails=$((fails + 1)); }

os="$(sw_vers -productVersion 2>/dev/null)"
if [[ "${os%%.*}" =~ ^[0-9]+$ ]] && (( ${os%%.*} >= 27 )); then pass "macOS $os"
else fail "macOS ${os:-unknown}: summarize.swift needs macOS 27 or newer"; fi

if [[ "$(sysctl -n hw.optional.arm64 2>/dev/null)" != 1 ]]; then
  fail "not Apple silicon ($(uname -m)): the on-device model needs an M-series Mac"
elif [[ "$(sysctl -n sysctl.proc_translated 2>/dev/null)" == 1 ]]; then
  warn "Apple silicon, but this shell runs under Rosetta; run from a native arm64 terminal"
else pass "Apple silicon ($(uname -m))"; fi

if command -v swift >/dev/null; then pass "swift at $(command -v swift)"
else fail "swift not found: install Xcode or the Command Line Tools (xcode-select --install)"; fi

sdk="$(xcrun --sdk macosx --show-sdk-path 2>/dev/null)"
if [[ -n "$sdk" && -d "$sdk" ]]; then pass "macOS SDK at $sdk"
else fail "no macOS SDK from xcrun: install Xcode or the Command Line Tools"; fi

if (( fails > 0 )); then
  echo "Not ready: $fails failed, $warns warnings. Model probe skipped."; exit 1
fi

# The compiler is the SDK check: if this SDK lacks the macOS 27 FoundationModels API, it fails here.
probe='import Foundation
import FoundationModels
let m = SystemLanguageModel.default
switch m.availability {
case .available:
    print("afm:availability=available")
    print("afm:variant=\(m.variant.displayName)")
    print("afm:context=\(m.contextSize)")
    print("afm:locale=\(m.supportsLocale(Locale(identifier: "id_ID")))")
case .unavailable(let reason):
    print("afm:availability=\(reason)")
}'
out="$(swift -e "$probe" 2>&1)"
field() { sed -n "s/^afm:$1=//p" <<<"$out"; }
availability="$(field availability)"

if [[ -z "$availability" ]]; then
  fail "FoundationModels probe did not compile or run. The SDK and toolchain must provide the macOS 27 API:"
  sed 's/^/        /' <<<"$out" | tail -n 15
elif [[ "$availability" != available ]]; then
  case "$availability" in
    *appleIntelligenceNotEnabled*) fix="turn on Apple Intelligence in System Settings > Apple Intelligence & Siri" ;;
    *modelNotReady*) fix="the model is still downloading; keep the Mac online and on power, then rerun" ;;
    *deviceNotEligible*) fix="this Mac cannot run Apple Intelligence" ;;
    *) fix="check System Settings > Apple Intelligence & Siri" ;;
  esac
  fail "model unavailable ($availability): $fix"
else
  pass "model available: $(field variant), context $(field context) tokens"
  if [[ "$(field locale)" == true ]]; then pass "supportsLocale(id_ID) is true"
  else warn "supportsLocale(id_ID) is $(field locale): Indonesian is not guaranteed, review the output"; fi
fi

if (( fails > 0 )); then echo "Not ready: $fails failed, $warns warnings."; exit 1; fi
echo "Ready: summarize.swift can run here ($warns warnings)."
