#!/usr/bin/env bash
# Drives the dashboard content path for a user who belongs to two workspaces:
# Referer-based workspace scoping -> analytics counts (posts vs services, trash
# excluded) -> tags attached to a post -> inquiries are gone.
#
#   pnpm dev                      # then, in another shell:
#   scripts/content-check.sh
#   scripts/content-check.sh http://localhost:8787   # or wrangler dev
set -euo pipefail

BASE="${1:-http://localhost:3001}"
ID="$(date +%s)"
PASS_DIR="$(mktemp -d)"
trap 'rm -rf "$PASS_DIR"' EXIT

A_COOKIE="$PASS_DIR/a.txt"
B_COOKIE="$PASS_DIR/b.txt"
PASS=""
ok()   { PASS="$PASS\n  ok   $1"; }
bad()  { echo "  FAIL $1" >&2; exit 1; }
check() { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (want '$3', got '$2')"; fi; }

# $1 cookie, $2 workspace slug the request comes from, then curl args
as() { local cookie="$1" ws="$2"; shift 2; curl -s -b "$cookie" -e "$BASE/workspace/$ws/dashboard" "$@"; }
json() { as "$1" "$2" -X "$3" "$BASE$4" -H 'Content-Type: application/json' ${5:+-d "$5"}; }

register() {
  curl -s -c "$1" -X POST "$BASE/api/auth/register" -H 'Content-Type: application/json' \
    -d "{\"name\":\"$2\",\"email\":\"$3\",\"password\":\"check-password-123\",\"workspaceName\":\"$4\"}" | jq -r '.data.workspace.slug // empty'
}

# 1. user A owns workspace A; user B owns workspace B and adds A, so A's NEWEST
#    membership is B — the case that used to leak B's data into A's dashboard
A_SLUG=$(register "$A_COOKIE" "A $ID" "a-$ID@test.dev" "ContentA $ID")
B_SLUG=$(register "$B_COOKIE" "B $ID" "b-$ID@test.dev" "ContentB $ID")
[ -n "$A_SLUG" ] && [ -n "$B_SLUG" ] || bad "register"
json "$B_COOKIE" "$B_SLUG" POST "/api/members?workspace=$B_SLUG" "{\"email\":\"a-$ID@test.dev\"}" > /dev/null

# 2. content in workspace A, sent from A's pages
json "$A_COOKIE" "$A_SLUG" POST /api/blogs/ '{"title":"Live post","slug":"live-post","content":"<p>x</p>","published":true,"tags":"News, Launch"}' > /dev/null
json "$A_COOKIE" "$A_SLUG" POST /api/blogs/ '{"title":"Draft post","slug":"draft-post","content":"<p>x</p>","published":false}' > /dev/null
json "$A_COOKIE" "$A_SLUG" POST /api/blogs/ '{"title":"Trashed post","slug":"trashed-post","content":"<p>x</p>","published":true}' > /dev/null
json "$A_COOKIE" "$A_SLUG" POST /api/info-page '{"title":"About","slug":"about","content":"<p>x</p>","published":true}' > /dev/null
TRASH_ID=$(as "$A_COOKIE" "$A_SLUG" "$BASE/api/blogs?limit=100" | jq -r '.data.data[] | select(.slug == "trashed-post") | .id')
check "post moved to trash" "$(json "$A_COOKIE" "$A_SLUG" DELETE "/api/blogs/$TRASH_ID" | jq -r '.message')" "Blog deleted"

# 3. scoping: same cookie, different page -> different workspace
check "A's page sees A's 2 posts" "$(as "$A_COOKIE" "$A_SLUG" "$BASE/api/blogs" | jq -r '.data.pagination.total')" "2"
check "B's page sees B's 0 posts" "$(as "$A_COOKIE" "$B_SLUG" "$BASE/api/blogs" | jq -r '.data.pagination.total')" "0"
check "non-member workspace is refused" "$(as "$A_COOKIE" "nope-$ID" -o /dev/null -w '%{http_code}' "$BASE/api/blogs")" "401"

# 4. analytics for A: 2 posts (trash excluded), 1 service, published/draft split
STATS=$(as "$A_COOKIE" "$A_SLUG" "$BASE/api/admin/analytics")
check "posts count excludes trash" "$(echo "$STATS" | jq -r '.data.posts')" "2"
check "services counted" "$(echo "$STATS" | jq -r '.data.services')" "1"
check "total content" "$(echo "$STATS" | jq -r '.data.contentTotal')" "3"
check "published count" "$(echo "$STATS" | jq -r '.data.contentPublished')" "2"
check "draft count" "$(echo "$STATS" | jq -r '.data.contentDraft')" "1"
check "tags count" "$(echo "$STATS" | jq -r '.data.tags')" "2"

# 5. tags attached to the post and counted per tag
check "post carries its tags" "$(as "$A_COOKIE" "$A_SLUG" "$BASE/api/blogs/live-post" | jq -r '.tags')" "Launch, News"
check "tag shows its post count" "$(as "$A_COOKIE" "$A_SLUG" "$BASE/api/tags?limit=100" | jq -r '.data.tags[] | select(.name == "News") | ._count.products')" "1"
json "$A_COOKIE" "$A_SLUG" PATCH /api/blogs/update/live-post '{"title":"Live post","slug":"live-post","content":"<p>x</p>","published":true,"tags":"News"}' > /dev/null
check "removing a tag detaches it" "$(as "$A_COOKIE" "$A_SLUG" "$BASE/api/blogs/live-post" | jq -r '.tags')" "News"

# 6. authors: only owners attach them (A is an editor in workspace B)
json "$B_COOKIE" "$B_SLUG" POST /api/authors/create '{"name":"Ada Writer","username":"ada-writer","email":"ada@writers.test"}' > /dev/null
json "$B_COOKIE" "$B_SLUG" POST /api/authors/create '{"name":"Bob Writer","username":"bob-writer","email":"bob@writers.test"}' > /dev/null
AUTHORS=$(as "$B_COOKIE" "$B_SLUG" "$BASE/api/authors?limit=100")
ADA=$(echo "$AUTHORS" | jq -r '.data[] | select(.username == "ada-writer") | .id')
BOB=$(echo "$AUTHORS" | jq -r '.data[] | select(.username == "bob-writer") | .id')
[ -n "$ADA" ] && [ -n "$BOB" ] || bad "authors created (got: $AUTHORS)"
json "$B_COOKIE" "$B_SLUG" POST /api/blogs/ "{\"title\":\"Bylined\",\"slug\":\"bylined\",\"content\":\"<p>x</p>\",\"authorId\":\"$ADA\"}" > /dev/null
check "owner attaches author on create" "$(as "$B_COOKIE" "$B_SLUG" "$BASE/api/blogs/bylined" | jq -r '.author.name')" "Ada Writer"
json "$A_COOKIE" "$B_SLUG" PATCH /api/blogs/update/bylined "{\"title\":\"Bylined edited\",\"slug\":\"bylined\",\"content\":\"<p>y</p>\",\"authorId\":\"$BOB\"}" > /dev/null
BYLINED=$(as "$B_COOKIE" "$B_SLUG" "$BASE/api/blogs/bylined")
check "editor's edit is saved" "$(echo "$BYLINED" | jq -r '.title')" "Bylined edited"
check "editor cannot change the author" "$(echo "$BYLINED" | jq -r '.author.name')" "Ada Writer"
json "$B_COOKIE" "$B_SLUG" PATCH /api/blogs/update/bylined "{\"title\":\"Bylined edited\",\"slug\":\"bylined\",\"content\":\"<p>y</p>\",\"authorId\":\"$BOB\"}" > /dev/null
check "owner changes the author" "$(as "$B_COOKIE" "$B_SLUG" "$BASE/api/blogs/bylined" | jq -r '.author.name')" "Bob Writer"
check "author from another workspace is refused" "$(json "$A_COOKIE" "$A_SLUG" PATCH /api/blogs/update/live-post "{\"title\":\"Live post\",\"slug\":\"live-post\",\"content\":\"<p>x</p>\",\"published\":true,\"tags\":\"News\",\"authorId\":\"$ADA\"}" | jq -r '.message')" "Author not found"
json "$B_COOKIE" "$B_SLUG" PATCH /api/blogs/update/bylined '{"title":"Bylined edited","slug":"bylined","content":"<p>y</p>","authorId":null}' > /dev/null
check "owner clears the author" "$(as "$B_COOKIE" "$B_SLUG" "$BASE/api/blogs/bylined" | jq -r '.author')" "null"

# 7. inquiries are gone
check "dashboard inquiries API removed" "$(as "$A_COOKIE" "$A_SLUG" -o /dev/null -w '%{http_code}' "$BASE/api/inquiries")" "404"
check "public inquiries API removed" "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/v1/inquiries" -H 'Content-Type: application/json' -d '{}')" "405"

printf '%b\n  %d checks passed\n' "  $PASS" "$(printf '%b' "$PASS" | grep -c 'ok  ')"
