#!/usr/bin/env bash

##
# Generates a changelog from git commits between two tags.
#
# Usage:
#   ./scripts/generate-changelog.sh              # From last tag to HEAD
#   ./scripts/generate-changelog.sh v0.1.0       # From v0.1.0 to HEAD
#   ./scripts/generate-changelog.sh v0.1.0 v0.2.0  # Between two tags
##

set -euo pipefail

FROM_TAG="${1:-}"
TO_REF="${2:-HEAD}"

# If no from-tag provided, find the most recent tag
if [ -z "$FROM_TAG" ]; then
  FROM_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
fi

echo "## What's Changed"
echo ""

if [ -z "$FROM_TAG" ]; then
  # No previous tag — show all commits
  git log --oneline --no-merges "$TO_REF" | while IFS= read -r line; do
    echo "- $line"
  done
else
  git log --oneline --no-merges "${FROM_TAG}..${TO_REF}" | while IFS= read -r line; do
    echo "- $line"
  done
  echo ""
  echo "**Full Changelog**: https://github.com/devkudasov/request-interceptor/compare/${FROM_TAG}...${TO_REF}"
fi
