#!/bin/bash
# Smoky Zone — Official GitHub Repository Setup & Sync Script
set -e

REPO_URL="${1:-https://github.com/Smorkfrmdaeast/smokyzone.git}"

echo "=========================================================="
echo "  Smoky Zone — Official GitHub Sync"
echo "  Target: $REPO_URL"
echo "=========================================================="

if [ ! -d ".git" ]; then
  echo "Initializing git repository..."
  git init
  git branch -M main
fi

echo "Staging all code and assets..."
git add .

echo "Creating commit..."
git commit -m "feat: official Smoky Zone release with full persistent media and audio player" || echo "Working tree clean, no new changes to commit."

if git remote | grep -q "origin"; then
  echo "Updating origin remote to: $REPO_URL"
  git remote set-url origin "$REPO_URL"
else
  echo "Adding origin remote: $REPO_URL"
  git remote add origin "$REPO_URL"
fi

echo "Ready to push! To push to your GitHub repo, run:"
echo "git push -u origin main"
