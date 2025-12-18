#!/bin/bash

# Script to sync all git repositories in the addons directory
# Usage: ./sync-all-repos.sh

set -e  # Exit on error

ADDONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMIT_MESSAGE="Sync"

echo "Starting sync for all git repositories in: $ADDONS_DIR"
echo "=================================================="
echo ""

# Counter for synced repos
SYNCED=0
SKIPPED=0

# Loop through each subdirectory
for dir in "$ADDONS_DIR"/*; do
    # Check if it's a directory
    if [ ! -d "$dir" ]; then
        continue
    fi
    
    # Get directory name
    dirname=$(basename "$dir")
    
    # Skip if it's a hidden directory or this script's directory
    if [[ "$dirname" == .* ]]; then
        continue
    fi
    
    # Check if .git exists
    if [ -d "$dir/.git" ]; then
        echo "Found git repository: $dirname"
        cd "$dir"
        
        # Check if this is a billing addon (starts with "billing") and has Frontend/App/package.json
        if [[ "$dirname" == billing* ]] && [ -f "Frontend/App/package.json" ]; then
            echo "  → Billing addon detected, updating dependencies..."
            cd "Frontend/App"
            
            echo "  → Removing node_modules and yarn.lock..."
            rm -rf node_modules/ || true
            rm -rf yarn.lock || true
            
            echo "  → Running npm-check-updates..."
            ncu -u || {
                echo "  → Warning: ncu failed (might not be installed or other issue)"
            }
            
            echo "  → Installing dependencies with pnpm..."
            pnpm install || {
                echo "  → Warning: pnpm install failed"
            }
            
            cd "$dir"
            echo "  → Dependency update complete!"
        fi
        
        # Check if there are any changes
        if [ -z "$(git status --porcelain)" ]; then
            echo "  → No changes to commit, skipping..."
            SKIPPED=$((SKIPPED + 1))
        else
            echo "  → Adding all changes..."
            git add -A
            
            echo "  → Committing with message: '$COMMIT_MESSAGE'..."
            git commit -m "$COMMIT_MESSAGE" || {
                echo "  → Warning: Commit failed (might be no changes or other issue)"
            }
            
            echo "  → Pushing to remote..."
            git push || {
                echo "  → Warning: Push failed (check remote configuration)"
            }
            
            SYNCED=$((SYNCED + 1))
            echo "  ✓ Synced successfully!"
        fi
        echo ""
    else
        echo "Skipping $dirname (not a git repository)"
        SKIPPED=$((SKIPPED + 1))
    fi
done

echo "=================================================="
echo "Sync complete!"
echo "  Synced: $SYNCED repositories"
echo "  Skipped: $SKIPPED items"
echo ""

