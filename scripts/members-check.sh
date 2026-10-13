#!/usr/bin/env bash
# Drives the add-member path: register owner -> owner creates a member account
# (email + password, no email sent, no invite link) -> member logs in straight
# into the owner's workspace -> existing account is added as-is -> member cap.
#
#   pnpm dev                      # then, in another shell:
#   scripts/members-check.sh
#   scripts/members-check.sh http://localhost:8787   # or wrangler dev
set -euo pipefail

BASE="${1:-http://localhost:3001}"
ID="$(date +%s)"
PASS_DIR="$(mktemp -d)"
trap 'rm -rf "$PASS_DIR"' EXIT

OWNER_COOKIE="$PASS_DIR/owner.txt"
MEMBER_COOKIE="$PASS_DIR/member.txt"
OTHER_COOKIE="$PASS_DIR/other.txt"
OWNER_EMAIL="owner-$ID@test.dev"
MEMBER_EMAIL="member-$ID@test.dev"
OTHER_EMAIL="other-$ID@test.dev"
MEMBER_PASSWORD="member-password-123"
PASS=""; FAIL=""
ok()   { PASS="$PASS\n  ok   $1"; }
bad()  { FAIL="$FAIL\n  FAIL $1"; echo "  FAIL $1" >&2; exit 1; }
check() { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (want '$3', got '$2')"; fi; }

post() { curl -s -b "$1" -c "$1" -X POST "$BASE$2" -H 'Content-Type: application/json' -d "$3"; }
get()  { curl -s -b "$1" "$BASE$2"; }
status() { curl -s -o /dev/null -w '%{http_code}' -b "$1" -X POST "$BASE$2" -H 'Content-Type: application/json' -d "$3"; }
login() { curl -s -o /dev/null -w '%{http_code}' -c "$1" -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$2\",\"password\":\"$3\"}"; }

# 1. owner registers (creates the workspace)
OWNER=$(post "$OWNER_COOKIE" /api/auth/register \
  "{\"name\":\"Owner $ID\",\"email\":\"$OWNER_EMAIL\",\"password\":\"check-password-123\",\"workspaceName\":\"OwnerWS $ID\"}")
SLUG=$(echo "$OWNER" | jq -r '.data.workspace.slug // empty')
[ -n "$SLUG" ] || bad "owner register (got: $OWNER)"
check "owner sees 1 member" "$(get "$OWNER_COOKIE" "/api/members?workspace=$SLUG" | jq -r '.data.members | length')" "1"

# 2. API responses are never cached
check "api responses are no-store" \
  "$(curl -s -o /dev/null -D - -b "$OWNER_COOKIE" "$BASE/api/members?workspace=$SLUG" | tr -d '\r' | awk -F': ' 'tolower($1)=="cache-control"{print $2}')" "no-store"

# 3. validation
check "short password is refused" "$(status "$OWNER_COOKIE" "/api/members?workspace=$SLUG" "{\"name\":\"X\",\"email\":\"x-$ID@test.dev\",\"password\":\"short\"}")" "400"
check "name required for new account" "$(status "$OWNER_COOKIE" "/api/members?workspace=$SLUG" "{\"email\":\"x-$ID@test.dev\",\"password\":\"$MEMBER_PASSWORD\"}")" "400"

# 4. owner creates the member's account directly
ADD=$(post "$OWNER_COOKIE" "/api/members?workspace=$SLUG" \
  "{\"name\":\"Member $ID\",\"email\":\"$MEMBER_EMAIL\",\"password\":\"$MEMBER_PASSWORD\"}")
check "add creates a new account" "$(echo "$ADD" | jq -r '.data.created')" "true"
check "default role is editor" "$(echo "$ADD" | jq -r '.data.role')" "editor"
check "owner now has 2 members" "$(get "$OWNER_COOKIE" "/api/members?workspace=$SLUG" | jq -r '.data.members | length')" "2"
check "adding twice is refused" "$(status "$OWNER_COOKIE" "/api/members?workspace=$SLUG" "{\"email\":\"$MEMBER_EMAIL\"}")" "409"

# 5. member logs in with those credentials and lands in the owner's workspace
check "member logs in" "$(login "$MEMBER_COOKIE" "$MEMBER_EMAIL" "$MEMBER_PASSWORD")" "200"
# unscoped = the member's default workspace; it must be the owner's (they never made one)
check "member's default workspace is the owner's" "$(get "$MEMBER_COOKIE" /api/members | jq -r --arg e "$OWNER_EMAIL" '[.data.members[].email] | index($e) != null')" "true"
check "member reads scoped members" "$(get "$MEMBER_COOKIE" "/api/members?workspace=$SLUG" | jq -r '.data.members | length')" "2"
check "editor cannot add members" "$(status "$MEMBER_COOKIE" "/api/members?workspace=$SLUG" "{\"email\":\"nope-$ID@test.dev\"}")" "403"

# 6. an email that already has an account is added as-is (password untouched)
post "$OTHER_COOKIE" /api/auth/register \
  "{\"name\":\"Other $ID\",\"email\":\"$OTHER_EMAIL\",\"password\":\"check-password-123\",\"workspaceName\":\"OtherWS $ID\"}" > /dev/null
EXISTING=$(post "$OWNER_COOKIE" "/api/members?workspace=$SLUG" "{\"email\":\"$OTHER_EMAIL\",\"password\":\"ignored-password-123\"}")
check "existing account is linked, not created" "$(echo "$EXISTING" | jq -r '.data.created')" "false"
check "existing account keeps its password" "$(login /dev/null "$OTHER_EMAIL" check-password-123)" "200"

# 7. a non-member gets nothing, even with a valid session cookie
check "non-member is refused" "$(get "$OWNER_COOKIE" "/api/members?workspace=otherws-$ID" | jq -r '.error')" "Unauthorized"

# 8. the member cap: owner + member + other = 3, fill to 5, then the 6th is refused
CAP=5
for n in $(seq 4 "$CAP"); do
  FILL=$(post "$OWNER_COOKIE" "/api/members?workspace=$SLUG" \
    "{\"name\":\"Fill $n\",\"email\":\"fill$n-$ID@test.dev\",\"password\":\"$MEMBER_PASSWORD\"}")
  [ "$(echo "$FILL" | jq -r '.data.created')" = "true" ] || bad "add #$n should be allowed below the cap (got: $FILL)"
done
check "workspace holds $CAP members" "$(get "$OWNER_COOKIE" "/api/members?workspace=$SLUG" | jq -r '.data.members | length')" "$CAP"

OVER=$(post "$OWNER_COOKIE" "/api/members?workspace=$SLUG" "{\"name\":\"Over\",\"email\":\"overflow-$ID@test.dev\",\"password\":\"$MEMBER_PASSWORD\"}")
check "add past the cap is refused" "$(echo "$OVER" | jq -r '.error')" "Member limit of $CAP reached"

printf '%b\n  %d checks passed\n' "  $PASS" "$(printf '%b' "$PASS" | grep -c 'ok  ')"
[ -z "$FAIL" ] || printf '%b\n' "$FAIL"
