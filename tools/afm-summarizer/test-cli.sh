#!/usr/bin/env bash
# Checks argument, input and output validation. Every case must fail before the model is touched.
# Fixtures are synthetic and written to a temp dir under $SCRATCH_DIR (default: $TMPDIR).
set -u

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
work="$(mktemp -d "${SCRATCH_DIR:-${TMPDIR:-/tmp}}/afm-summarizer-test.XXXXXX")"
trap 'rm -rf "$work"' EXIT

bin="$work/summarize"
swiftc -o "$bin" "$here/summarize.swift" || { echo "FAIL: compile"; exit 1; }

pass=0
fail=0

# expect <exit code> <stderr substring> <description> -- <args...>
expect() {
  local code="$1" needle="$2" name="$3"
  shift 4
  "$bin" "$@" >"$work/out" 2>"$work/err"
  local got=$?
  if [[ $got -ne $code ]]; then
    echo "FAIL: $name: exit $got, want $code"; sed 's/^/    /' "$work/err"; fail=$((fail + 1)); return
  fi
  if ! grep -qF -- "$needle" "$work/err"; then
    echo "FAIL: $name: stderr lacks '$needle'"; sed 's/^/    /' "$work/err"; fail=$((fail + 1)); return
  fi
  if [[ -s "$work/out" ]]; then
    echo "FAIL: $name: stdout should be empty"; fail=$((fail + 1)); return
  fi
  echo "ok:   $name"; pass=$((pass + 1))
}

valid="$work/valid.json"
printf '{"videoId":"test123","language":"id","segments":[{"text":"halo semua","start":0,"end":1},{"text":"ini contoh","start":1,"end":2}]}' >"$valid"
printf '' >"$work/empty.json"
printf '{"videoId":"x","language":"id","segments":[' >"$work/truncated.json"
printf '{"videoId":"x","language":"id"}' >"$work/no-segments.json"
printf '{"videoId":"x","language":"id","segments":[]}' >"$work/empty-segments.json"
printf '{"videoId":"x","language":"id","segments":[{"text":"a"},{"text":5}]}' >"$work/bad-text.json"
printf '{"videoId":"x","language":"id","segments":[{"start":0}]}' >"$work/missing-text.json"
printf '{"videoId":"x","language":"id","segments":[{"text":"  "},{"text":"\\n"}]}' >"$work/blank-text.json"
printf '{"videoId":" ","language":"id","segments":[{"text":"a"}]}' >"$work/blank-id.json"
printf '[1,2]' >"$work/array.json"
printf '' >"$work/empty-instructions.txt"
printf 'x' >"$work/exists.md"

# Help through the real script runner, then the compiled binary.
if swift "$here/summarize.swift" --help >"$work/out" 2>"$work/err" && grep -q '^Usage:' "$work/out"; then
  echo "ok:   swift summarize.swift --help"; pass=$((pass + 1))
else
  echo "FAIL: swift summarize.swift --help"; fail=$((fail + 1))
fi
"$bin" -h >"$work/out" 2>&1 && grep -q -- '--instructions-file' "$work/out" \
  && { echo "ok:   -h"; pass=$((pass + 1)); } || { echo "FAIL: -h"; fail=$((fail + 1)); }

expect 2 "Missing the transcript" "no arguments" --
expect 2 "Unknown option '--bogus'" "unknown flag" -- "$valid" --bogus
expect 2 "Unknown option '-x.json'" "dash-leading path without --" -- -x.json
expect 3 "Transcript not found: -x.json" "dash-leading path after --" -- -- -x.json
expect 2 "--output needs a value." "missing value at end" -- "$valid" --output
expect 2 "needs a value, but got the option '--chunk-size'" "flag as value" -- "$valid" --output --chunk-size 2000
expect 2 "--instructions has an empty value" "empty value" -- "$valid" --instructions ""
expect 2 "given more than once" "duplicate flag" -- "$valid" --chunk-size 2000 --chunk-size 3000
expect 2 "--chunk-size must be" "chunk size too small" -- "$valid" --chunk-size 10
expect 2 "--chunk-size must be" "chunk size too large" -- "$valid" --chunk-size=50000
expect 2 "--chunk-size must be" "chunk size not a number" -- "$valid" --chunk-size abc
expect 2 "Expected one transcript path" "two positionals" -- "$valid" "$valid"
expect 3 "Transcript not found" "missing file" -- "$work/nope.json"
expect 3 "is a directory" "directory as input" -- "$work"
expect 3 "empty file" "empty file" -- "$work/empty.json"
expect 3 "not valid JSON" "truncated JSON" -- "$work/truncated.json"
expect 3 'expected Dictionary' "top-level array" -- "$work/array.json"
expect 3 'missing field "segments"' "no segments field" -- "$work/no-segments.json"
expect 3 "has no segments" "empty segments" -- "$work/empty-segments.json"
expect 3 "at segments[1].text" "non-string text" -- "$work/bad-text.json"
expect 3 'missing field "text" at segments[0]' "segment without text" -- "$work/missing-text.json"
expect 3 "but no text" "whitespace-only text" -- "$work/blank-text.json"
expect 3 "empty videoId" "blank videoId" -- "$work/blank-id.json"
expect 3 "Instructions file not found" "missing instructions file" -- "$valid" --instructions-file "$work/nope.txt"
expect 3 "Instructions file is empty" "empty instructions file" -- "$valid" --instructions-file "$work/empty-instructions.txt"
expect 4 "Output already exists" "output exists" -- "$valid" --output "$work/exists.md"
expect 4 "points at the input transcript" "output equals input" -- "$valid" --output "$valid"
expect 4 "Output directory does not exist" "output dir missing" -- "$valid" --output "$work/missing-dir/out.md"
expect 4 "Refusing to write under src/data/" "output in site data" -- "$valid" --output "$root/src/data/summaries/afm-test.md"

[[ ! -e "$root/src/data/summaries/afm-test.md" ]] || { echo "FAIL: a file was created in src/data"; fail=$((fail + 1)); }

echo "$pass passed, $fail failed"
[[ $fail -eq 0 ]]
