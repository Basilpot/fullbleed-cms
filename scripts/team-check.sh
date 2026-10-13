#!/usr/bin/env bash
# Drives the Team (public staff profiles) path: create with required/optional
# fields -> validation -> update -> workspace isolation -> public /api/v1/team
# with absolute image URL -> delete.
#
#   pnpm dev                      # then, in another shell:
#   scripts/team-check.sh
#   scripts/team-check.sh http://localhost:8787   # or wrangler dev
set -euo pipefail

BASE="${1:-http://localhost:3001}"
ID="$(date +%s)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

A_COOKIE="$TMP/a.txt"
B_COOKIE="$TMP/b.txt"
PASS=""
ok()   { PASS="$PASS\n  ok   $1"; }
bad()  { echo "  FAIL $1" >&2; exit 1; }
check() { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (want '$3', got '$2')"; fi; }

as() { local cookie="$1" ws="$2"; shift 2; curl -s -b "$cookie" -e "$BASE/workspace/$ws/team" "$@"; }
json() { as "$1" "$2" -X "$3" "$BASE$4" -H 'Content-Type: application/json' ${5:+-d "$5"}; }
status() { as "$1" "$2" -o /dev/null -w '%{http_code}' -X "$3" "$BASE$4" -H 'Content-Type: application/json' ${5:+-d "$5"}; }

register() {
  curl -s -c "$1" -X POST "$BASE/api/auth/register" -H 'Content-Type: application/json' \
    -d "{\"name\":\"$2\",\"email\":\"$3\",\"password\":\"check-password-123\",\"workspaceName\":\"$4\"}" | jq -r '.data.workspace.slug // empty'
}

A=$(register "$A_COOKIE" "A $ID" "team-a-$ID@test.dev" "TeamA $ID")
B=$(register "$B_COOKIE" "B $ID" "team-b-$ID@test.dev" "TeamB $ID")
[ -n "$A" ] && [ -n "$B" ] || bad "register"

# 1. required fields
check "missing role rejected" "$(status "$A_COOKIE" "$A" POST /api/team '{"name":"X","description":"Y"}')" 400

# 2. full and minimal members
FULL=$(json "$A_COOKIE" "$A" POST /api/team '{"name":"Dr. Full","role":"Head of Clinic","profession":"Dentist","qualification":"BDS, MDS","description":"Leads the clinic.","license":"NMC 123","image":"/api/media-library/file/ws/photo.webp"}' | jq -r '.data.id')
[ -n "$FULL" ] && [ "$FULL" != null ] || bad "create full member"
ok "create full member"
MIN=$(json "$A_COOKIE" "$A" POST /api/team '{"name":"Min","role":"Nurse","profession":"  "}' | jq -r '.data.id')
LIST=$(as "$A_COOKIE" "$A" "$BASE/api/team")
check "list count" "$(echo "$LIST" | jq '.pagination.total')" 2
check "list keeps creation order" "$(echo "$LIST" | jq -r '.data[0].name')" "Dr. Full"
check "blank optional stored empty" "$(echo "$LIST" | jq -r --arg id "$MIN" '.data[] | select(.id==$id) | .profession + "|" + .description + "|" + .license + "|" + .image')" "|||"

# 3. update
check "update" "$(status "$A_COOKIE" "$A" PATCH "/api/team/$MIN" '{"name":"Min","role":"Senior Nurse","license":"NNC 9"}')" 200
check "update applied" "$(as "$A_COOKIE" "$A" "$BASE/api/team" | jq -r --arg id "$MIN" '.data[] | select(.id==$id) | .role + "|" + .license')" "Senior Nurse|NNC 9"

# 4. isolation: B can't see, edit or delete A's members
check "other workspace list empty" "$(as "$B_COOKIE" "$B" "$BASE/api/team" | jq '.pagination.total')" 0
check "other workspace update 404" "$(status "$B_COOKIE" "$B" PATCH "/api/team/$MIN" '{"name":"H","role":"H","description":"H"}')" 404
check "other workspace delete 404" "$(status "$B_COOKIE" "$B" DELETE "/api/team/$MIN")" 404
check "unauthenticated 401" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/team")" 401

# 5. public API
KEY=$(json "$A_COOKIE" "$A" POST /api/keys | jq -r '.data.key')
PUB=$(curl -s -H "Authorization: Bearer $KEY" "$BASE/api/v1/team")
check "public team count" "$(echo "$PUB" | jq '.data | length')" 2
check "public fields" "$(echo "$PUB" | jq -r '.data[0] | [.name,.role,.profession,.qualification,.description,.license] | join("|")')" "Dr. Full|Head of Clinic|Dentist|BDS, MDS|Leads the clinic.|NMC 123"
check "public image absolute" "$(echo "$PUB" | jq -r '.data[0].image' | grep -c '^https\?://.*/ws/photo.webp$')" 1
check "public blank optionals null" "$(echo "$PUB" | jq -r '.data[1] | [.image,.description,.qualification] | map(tostring) | join("|")')" "null|null|null"
check "public no-store" "$(curl -s -D - -o /dev/null -H "Authorization: Bearer $KEY" "$BASE/api/v1/team" | grep -i '^cache-control' | tr -d '\r' | awk '{print $2}')" no-store

# 6. delete
check "delete" "$(status "$A_COOKIE" "$A" DELETE "/api/team/$FULL")" 200
check "deleted gone from public" "$(curl -s -H "Authorization: Bearer $KEY" "$BASE/api/v1/team" | jq '.data | length')" 1

echo -e "team-check: all passed$PASS"
