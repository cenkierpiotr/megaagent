#!/bin/bash

REPO_URL="https://github.com/cenkierpiotr/megaagent"

echo "🐙 Syncing with GitHub Repository: $REPO_URL"

if [ ! -d .git ]; then
    git init
    echo "node_modules/
.env
logs/
shared/*.db
shared/__pycache__
*.pyc
__pycache__/
dist/
.next/
" > .gitignore
    git remote add origin "$REPO_URL"
fi

# Ensure remote is correct
git remote set-url origin "$REPO_URL"

git add .
git commit -m "Automated Sync: Claw-Omni-OS Update" || echo "Nothing to commit"
git push -u origin main || git push -u origin master
echo "✅ Changes pushed to $REPO_URL"
