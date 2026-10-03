#!/usr/bin/env bash
# Drives the full invite path: register owner -> register invitee -> invite ->
# accept -> assert membership. This path had zero coverage, which is why a dropped
# email promise and a stale signup redirect went unnoticed.
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
GUEST_COOKIE="$PASS_DIR/guest.txt"
OWNER_EMAIL="owner-$ID@test.dev"
GUEST_EMAIL="guest-$ID@test.dev"
PASS=""; FAIL=""
ok()   { PASS="$PASS\n  ok   $1"; }
bad()  { FAIL="$FAIL\n  FAIL $1"; echo "  FAIL $1" >&2; exit 1; }
check() { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (want '$3', got '$2')"; fi; }

post() { curl -s -b "$1" -c "$1" -X POST "$BASE$2" -H 'Content-Type: application/json' -d "$3"; }
get()  { curl -s -b "$1" "$BASE$2"; }
status() { curl -s -o /dev/null -w '%{http_code}' -b "$1" -X POST "$BASE$2" -H 'Content-Type: application/json' -d "$3"; }

# 1. two throwaway accounts, each with its own workspace + session cookie
OWNER=$(post "$OWNER_COOKIE" /api/auth/register \
  "{\"name\":\"Owner $ID\",\"email\":\"$OWNER_EMAIL\",\"password\":\"check-password-123\",\"workspaceName\":\"OwnerWS $ID\"}")
SLUG=$(echo "$OWNER" | jq -r '.data.workspace.slug // empty')
[ -n "$SLUG" ] || bad "owner register (got: $OWNER)"

post "$GUEST_COOKIE" /api/auth/register \
  "{\"name\":\"Guest $ID\",\"email\":\"$GUEST_EMAIL\",\"password\":\"check-password-123\",\"workspaceName\":\"GuestWS $ID\"}" \
  > /dev/null
check "guest registers" "$(get "$GUEST_COOKIE" /api/members | jq -r '.data.members | length')" "1"

# 2. baseline
check "owner sees 1 member" "$(get "$OWNER_COOKIE" "/api/members?workspace=$SLUG" | jq -r '.data.members | length')" "1"

# 3. owner invites the guest
INVITE=$(post "$OWNER_COOKIE" "/api/members?workspace=$SLUG" "{\"email\":\"$GUEST_EMAIL\"}")
TOKEN=$(echo "$INVITE" | jq -r '.data.token // empty')
[ -n "$TOKEN" ] || bad "invite returns a token (got: $INVITE)"
ok "invite returns a token"

# the whole point of the fix: the response must say whether the email actually went out
HAS_SENT_FLAG=$(echo "$INVITE" | jq -r '.data | has("emailed")')
check "invite reports email outcome" "$HAS_SENT_FLAG" "true"
SENT=$(echo "$INVITE" | jq -r '.data.emailed')
if [ "$SENT" = "true" ]; then
  ok "invite email sent"
elif echo "$INVITE" | jq -r '.data.emailError' | grep -q .; then
  ok "invite email failed loudly: $(echo "$INVITE" | jq -r '.data.emailError')"
else
  bad "invite reported neither emailed=true nor an emailError"
fi

# 4. guest sees the invite publicly, before accepting
META=$(get /dev/null "/api/members/invitations/$TOKEN")
check "invite is publicly readable" "$(echo "$META" | jq -r '.data.email')" "$GUEST_EMAIL"
check "invite names the workspace" "$(echo "$META" | jq -r '.data.workspaceName')" "OwnerWS $ID"

# 5. guest accepts and joins
ACCEPT=$(post "$GUEST_COOKIE" /api/members/accept "{\"token\":\"$TOKEN\"}")
check "accept returns the invited workspace" "$(echo "$ACCEPT" | jq -r '.data.workspace.slug')" "$SLUG"
check "owner now has 2 members" "$(get "$OWNER_COOKIE" "/api/members?workspace=$SLUG" | jq -r '.data.members | length')" "2"

# 6. replaying the token is rejected
check "replayed invite is rejected" "$(status "$GUEST_COOKIE" /api/members/accept "{\"token\":\"$TOKEN\"}")" "410"

# 7. scoping: the guest can read this workspace's members but not manage them
check "guest reads scoped members" "$(get "$GUEST_COOKIE" "/api/members?workspace=$SLUG" | jq -r '.data.members | length')" "2"
check "guest cannot invite" "$(status "$GUEST_COOKIE" "/api/members?workspace=$SLUG" "{\"email\":\"nope-$ID@test.dev\"}")" "403"

# 8. a non-member gets nothing, even with a valid session cookie
check "non-member is refused" "$(get "$OWNER_COOKIE" "/api/members?workspace=guestws-$ID" | jq -r '.error')" "Unauthorized"

# 9. the member cap: fill the workspace to 5, then prove the 6th is refused.
#    (owner already counts as 1, plus the guest accepted above = 2)
CAP=5
for n in $(seq 3 "$CAP"); do
  FILL_COOKIE="$PASS_DIR/fill$n.txt"
  FILL_EMAIL="fill$n-$ID@test.dev"
  post "$FILL_COOKIE" /api/auth/register \
    "{\"name\":\"Fill $n\",\"email\":\"$FILL_EMAIL\",\"password\":\"check-password-123\",\"workspaceName\":\"FillWS$n $ID\"}" > /dev/null
  FILL_TOKEN=$(post "$OWNER_COOKIE" "/api/members?workspace=$SLUG" "{\"email\":\"$FILL_EMAIL\"}" | jq -r '.data.token // empty')
  [ -n "$FILL_TOKEN" ] || bad "invite #$n should be allowed below the cap"
  post "$FILL_COOKIE" /api/members/accept "{\"token\":\"$FILL_TOKEN\"}" > /dev/null
done
check "workspace holds $CAP members" "$(get "$OWNER_COOKIE" "/api/members?workspace=$SLUG" | jq -r '.data.members | length')" "$CAP"

OVER=$(post "$OWNER_COOKIE" "/api/members?workspace=$SLUG" "{\"email\":\"overflow-$ID@test.dev\"}")
check "invite past the cap is refused" "$(echo "$OVER" | jq -r '.error')" "Member limit of $CAP reached"

printf '%b\n  %d checks passed\n' "  $PASS" "$(printf '%b' "$PASS" | grep -c 'ok  ')"
[ -z "$FAIL" ] || printf '%b\n' "$FAIL"
