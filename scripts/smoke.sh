#!/usr/bin/env bash
# End-to-end smoke test for notes-app-server.
# Walks the happy path: sign up -> create -> update -> share -> public read ->
# toggle private -> public 404 -> delete -> list empty.
#
# Requires the dev server to be running:  npm run dev
# Override host with:  API=http://other.host:3001 bash scripts/smoke.sh

set -euo pipefail

API="${API:-http://localhost:3001}"
ORIGIN="${ORIGIN:-http://localhost:5173}"
COOKIE_JAR=$(mktemp)
trap 'rm -f "$COOKIE_JAR"' EXIT

EMAIL="smoke-$(date +%s)@example.com"
PASS="password123"
NAME="Smoke User"

# Every request mimics the browser client: includes Origin so better-auth's
# CSRF check is satisfied once a session cookie is present.
CURL=(curl -sS -H "origin: $ORIGIN" -H 'content-type: application/json')

step() { printf '\n==> %s\n' "$*"; }

extract() {
  python3 -c "import sys,json;print(json.load(sys.stdin)['$1'])"
}

assert_status() {
  local expected=$1 got=$2 desc=$3
  if [[ "$got" != "$expected" ]]; then
    echo "FAIL: expected $expected for $desc, got $got" >&2
    exit 1
  fi
  echo "ok  $desc -> $got"
}

step "1/11 sign up"
STATUS=$("${CURL[@]}" -o /dev/null -w '%{http_code}' -c "$COOKIE_JAR" \
  -X POST "$API/api/auth/sign-up/email" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"name\":\"$NAME\"}")
assert_status 200 "$STATUS" "sign-up"

step "2/11 sign in"
STATUS=$("${CURL[@]}" -o /dev/null -w '%{http_code}' -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X POST "$API/api/auth/sign-in/email" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
assert_status 200 "$STATUS" "sign-in"

step "3/11 create note"
NOTE=$("${CURL[@]}" -b "$COOKIE_JAR" \
  -X POST "$API/api/notes" \
  -d '{"title":"Smoke note"}')
NOTE_ID=$(echo "$NOTE" | extract id)
echo "note id: $NOTE_ID"

step "4/11 list notes (expect 1 entry)"
LIST=$("${CURL[@]}" -b "$COOKIE_JAR" "$API/api/notes")
COUNT=$(echo "$LIST" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))')
[[ "$COUNT" == "1" ]] || { echo "FAIL: expected 1 note, got $COUNT" >&2; exit 1; }
echo "ok  list -> 1 note"

step "5/11 update title"
STATUS=$("${CURL[@]}" -o /dev/null -w '%{http_code}' -b "$COOKIE_JAR" \
  -X PUT "$API/api/notes/$NOTE_ID" \
  -d '{"title":"Updated"}')
assert_status 200 "$STATUS" "update title"

step "6/11 share public"
SHARE=$("${CURL[@]}" -b "$COOKIE_JAR" \
  -X POST "$API/api/notes/$NOTE_ID/share" \
  -d '{"isPublic":true}')
SLUG=$(echo "$SHARE" | extract publicSlug)
echo "slug: $SLUG"

step "7/11 public read (no cookie) -> 200"
STATUS=$(curl -sS -o /dev/null -w '%{http_code}' "$API/api/public-notes/$SLUG")
assert_status 200 "$STATUS" "public read"

step "8/11 toggle private"
STATUS=$("${CURL[@]}" -o /dev/null -w '%{http_code}' -b "$COOKIE_JAR" \
  -X POST "$API/api/notes/$NOTE_ID/share" \
  -d '{"isPublic":false}')
assert_status 200 "$STATUS" "toggle private"

step "9/11 public read after toggle -> 404"
STATUS=$(curl -sS -o /dev/null -w '%{http_code}' "$API/api/public-notes/$SLUG")
assert_status 404 "$STATUS" "public read after private"

step "10/11 delete note -> 204"
STATUS=$("${CURL[@]}" -o /dev/null -w '%{http_code}' -b "$COOKIE_JAR" \
  -X DELETE "$API/api/notes/$NOTE_ID")
assert_status 204 "$STATUS" "delete"

step "11/11 list notes (expect empty)"
LIST=$("${CURL[@]}" -b "$COOKIE_JAR" "$API/api/notes")
COUNT=$(echo "$LIST" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))')
[[ "$COUNT" == "0" ]] || { echo "FAIL: expected 0 notes, got $COUNT" >&2; exit 1; }
echo "ok  list -> 0 notes"

echo
echo "smoke complete - all 11 steps passed"
