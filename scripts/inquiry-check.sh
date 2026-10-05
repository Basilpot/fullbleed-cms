#!/usr/bin/env bash
# Drives the public inquiry path end to end: register a throwaway workspace ->
# set its site-config contact email -> mint an API key -> POST /v1/inquiries ->
# assert the inquiry is stored AND that the response reports whether the
# notification email went out.
#
# The emailed flag is the whole point. An earlier version of this repo had no
# notification path at all; when one was added the send was briefly a floating
# promise, which a worker drops on response. members-check.sh caught that
# equivalent bug for invites, so this asserts the same contract here.
#
#   pnpm dev                      # then, in another shell:
#   scripts/inquiry-check.sh
#   scripts/inquiry-check.sh http://localhost:8787   # or wrangler dev
set -euo pipefail

BASE="${1:-http://localhost:3001}"
ID="$(date +%s)"
PASS_DIR="$(mktemp -d)"
trap 'rm -rf "$PASS_DIR"' EXIT

COOKIE="$PASS_DIR/owner.txt"
EMAIL="inquirer-$ID@test.dev"
TO="inbox-$ID@test.dev"
PASS=""; FAIL=""
ok()   { PASS="$PASS\n  ok   $1"; }
bad()  { FAIL="$FAIL\n  FAIL $1"; echo "  FAIL $1" >&2; exit 1; }
check() { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (want '$3', got '$2')"; fi; }

post() { curl -s -b "$1" -c "$1" -X POST "$BASE$2" -H 'Content-Type: application/json' -d "$3"; }
get()  { curl -s -b "$1" "$BASE$2"; }

# 1. a throwaway workspace so we never touch real data
OWNER=$(post "$COOKIE" /api/auth/register \
  "{\"name\":\"Inquiry $ID\",\"email\":\"owner-$ID@test.dev\",\"password\":\"check-password-123\",\"workspaceName\":\"InquiryWS $ID\"}")
SLUG=$(echo "$OWNER" | jq -r '.data.workspace.slug // empty')
[ -n "$SLUG" ] || bad "owner register (got: $OWNER)"
ok "owner registers"

# 2. configure where enquiries are delivered
post "$COOKIE" /api/site-config "{\"email\":\"$TO\",\"name\":\"InquiryWS $ID\"}" > /dev/null
check "site-config stores the recipient" \
  "$(get "$COOKIE" /api/site-config | jq -r '.config.email')" "$TO"

# 3. mint the publishable key the website would use
KEY=$(post "$COOKIE" /api/keys '{}' | jq -r '.data.key // empty')
[ -n "$KEY" ] || bad "api key creation"
ok "api key created"

# 4. submit an inquiry through the public API
RESULT=$(curl -s -X POST "$BASE/api/v1/inquiries" \
  -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Ada Lovelace\",\"email\":\"$EMAIL\",\"phone\":\"+9779800000000\",\"subject\":\"Reiki session\",\"message\":\"I would like to book a session next week.\"}")
check "inquiry accepted" "$(echo "$RESULT" | jq -r '.data.received')" "true"

# the assertion that matters: the send outcome is reported, not silently dropped
HAS_FLAG=$(echo "$RESULT" | jq -r '.data | has("emailed")')
check "inquiry reports email outcome" "$HAS_FLAG" "true"
if [ "$(echo "$RESULT" | jq -r '.data.emailed')" = "true" ]; then
  ok "inquiry notification sent to $TO"
elif echo "$RESULT" | jq -r '.data.emailError' | grep -q .; then
  ok "inquiry notification failed loudly: $(echo "$RESULT" | jq -r '.data.emailError')"
else
  bad "inquiry reported neither emailed=true nor an emailError"
fi

# 5. the inquiry is stored regardless of whether mail went out
STORED=$(get "$COOKIE" /api/inquiries | jq -r --arg e "$EMAIL" '.data | map(select(.email == $e)) | length')
check "inquiry is stored in the dashboard" "$STORED" "1"

# 6. the public config read path returns the address with absolute media URLs
PUBLIC=$(curl -s "$BASE/api/v1/site-config" -H "Authorization: Bearer $KEY")
check "public site-config is readable" "$(echo "$PUBLIC" | jq -r '.data.email')" "$TO"

# 7. bad input still 400s before anything is sent
check "invalid inquiry is rejected" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/v1/inquiries" \
     -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' -d '{"name":"x","email":"nope","message":"hi"}')" \
  "400"

printf '%b\n  %d checks passed\n' "  $PASS" "$(printf '%b' "$PASS" | grep -c 'ok  ')"
[ -z "$FAIL" ] || printf '%b\n' "$FAIL"