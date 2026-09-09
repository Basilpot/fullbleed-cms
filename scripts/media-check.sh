#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-http://localhost:8787}"
ID="$(date +%s)"
PASS_DIR="$(mktemp -d)"
trap 'rm -rf "$PASS_DIR"' EXIT

# 1. register a throwaway account -> session cookie
COOKIE="$PASS_DIR/cookies.txt"
curl -s -c "$COOKIE" -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"MediaCheck\",\"email\":\"media$ID@example.com\",\"password\":\"check-password-123\",\"workspaceName\":\"MediaCheck $ID\"}" \
  | grep -q '"ok":true\|"user"' || { echo "FAIL: register"; exit 1; }

# tiny 1x1 png bytes
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xff\xff?\x00\x05\xfe\x02\xfe\xa7\x93\xbe\x00\x00\x00\x00IEND\xaeB\x60\x82' > "$PASS_DIR/pixel.png"

# 2. upload
UP=$(curl -s -b "$COOKIE" -F "file=@$PASS_DIR/pixel.png" "$BASE/api/media-library/upload")
echo "$UP" | grep -q '"data":' || { echo "FAIL: upload"; exit 1; }
URL=$(echo "$UP" | sed -n 's/.*"url":"\([^"]*\)".*/\1/p')
MID=$(echo "$UP" | sed -n 's/.*"mediaId":"\([^"]*\)".*/\1/p')

# 3. read the file back
curl -sf -o /dev/null "$BASE$URL" || { echo "FAIL: file read"; exit 1; }

# 4. list shows it
curl -s -b "$COOKIE" "$BASE/api/media-library?search=pixel" | grep -q '"total":1' || { echo "FAIL: list/search"; exit 1; }

# 5. delete it
curl -s -b "$COOKIE" -X DELETE "$BASE/api/media-library/$MID" | grep -q '"deleted":true' || { echo "FAIL: delete"; exit 1; }

# 6. file gone
curl -s -o /dev/null -w '%{http_code}' "$BASE$URL" | grep -q '404' || { echo "FAIL: file not deleted"; exit 1; }

echo "PASS: media upload/read/list/delete round-trip"