#!/bin/bash

# Script to trigger release workflow for all billing addons and wait for completion
# Usage: ./trigger-release-all.sh [version] [changelog] [min_panel_version] [max_panel_version]
# Example: ./trigger-release-all.sh 1.1.2 "Release version 1.1.2"

# Don't use set -e as we need to handle errors gracefully
set -o pipefail

VERSION="${1:-1.1.2}"
CHANGELOG="${2:-Release version ${VERSION}}"
MIN_PANEL_VERSION="${3:-1.1.2}"
MAX_PANEL_VERSION="${4:-2.0.0}"

# Array of repository names (GitHub repo names)
REPOS=(
    "featherpanel-com/BillingAFK"
    "featherpanel-com/BillingCore"
    "featherpanel-com/BillingLinks"
    "featherpanel-com/BillingRedeem"
    "featherpanel-com/BillingResources"
    "featherpanel-com/BillingResourcesNewServers"
    "featherpanel-com/BillingResourcesStore"
)

# Map GitHub repo names to local directory names
declare -A REPO_DIRS
REPO_DIRS["featherpanel-com/BillingAFK"]="billingafk"
REPO_DIRS["featherpanel-com/BillingCore"]="billingcore"
REPO_DIRS["featherpanel-com/BillingLinks"]="billinglinks"
REPO_DIRS["featherpanel-com/BillingRedeem"]="billingredeem"
REPO_DIRS["featherpanel-com/BillingResources"]="billingresources"
REPO_DIRS["featherpanel-com/BillingResourcesNewServers"]="billingresourcesnewservers"
REPO_DIRS["featherpanel-com/BillingResourcesStore"]="billingresourcesstore"

ADDONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

WORKFLOW_FILE=".github/workflows/release.yml"
WORKFLOW_NAME="Build and Release Plugin"

echo "=================================================="
echo "Triggering release workflow for all billing addons"
echo "=================================================="
echo "Version: $VERSION"
echo "Changelog: $CHANGELOG"
echo "Min Panel Version: $MIN_PANEL_VERSION"
echo "Max Panel Version: $MAX_PANEL_VERSION"
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub CLI."
    echo "Run: gh auth login"
    exit 1
fi

# Function to update version in conf.yml
update_conf_version() {
    local dir=$1
    local version=$2
    local conf_file="$dir/conf.yml"
    
    if [ ! -f "$conf_file" ]; then
        echo "  ⚠ Warning: conf.yml not found in $dir"
        return 1
    fi
    
    # Update version using sed (works on both Linux and macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS sed requires -i '' with extension
        sed -i '' "s/^\(\s*version:\s*\)[\"']\?[^\"']*[\"']\?/\1${version}/" "$conf_file"
    else
        # Linux sed
        sed -i "s/^\(\s*version:\s*\)[\"']\?[^\"']*[\"']\?/\1${version}/" "$conf_file"
    fi
    
    # Verify the update
    local updated_version=$(grep -E "^\s*version:" "$conf_file" | sed -E 's/.*version:\s*["'\'']?([^"'\'']+)["'\'']?/\1/' | tr -d ' ')
    if [ "$updated_version" = "$version" ]; then
        echo "  ✓ Updated version to ${version}"
        return 0
    else
        echo "  ✗ Failed to update version (expected: ${version}, got: ${updated_version})"
        return 1
    fi
}

# Function to get the latest workflow run ID for a repo
get_latest_run_id() {
    local repo=$1
    local max_attempts=5
    local attempt=0
    
    # Try multiple times as GitHub may need a moment to register the run
    while [ $attempt -lt $max_attempts ]; do
        # Try to get workflow_dispatch runs first (most recent)
        local run_id=$(gh run list --repo "$repo" \
            --workflow "$WORKFLOW_NAME" \
            --event workflow_dispatch \
            --limit 1 \
            --json databaseId \
            --jq '.[0].databaseId' 2>/dev/null || echo "")
        
        if [ -n "$run_id" ] && [ "$run_id" != "null" ]; then
            echo "$run_id"
            return 0
        fi
        
        attempt=$((attempt + 1))
        if [ $attempt -lt $max_attempts ]; then
            sleep 2
        fi
    done
    
    # Fallback: get the absolute latest run (might not be ours, but likely is)
    local fallback_id=$(gh run list --repo "$repo" \
        --workflow "$WORKFLOW_NAME" \
        --limit 1 \
        --json databaseId \
        --jq '.[0].databaseId' 2>/dev/null || echo "")
    
    if [ -n "$fallback_id" ] && [ "$fallback_id" != "null" ]; then
        echo "$fallback_id"
        return 0
    fi
    
    return 1
}

# Function to wait for a workflow run to complete
wait_for_run() {
    local repo=$1
    local run_id=$2
    local repo_short=$(basename "$repo")
    
    echo "  → Waiting for workflow to complete..."
    
    # Watch the run with compact output
    if gh run watch "$run_id" --repo "$repo" --exit-status --compact > /dev/null 2>&1; then
        echo "  ✓ $repo_short: Workflow completed successfully"
        return 0
    else
        # Check the actual conclusion status
        local conclusion=$(gh run view "$run_id" --repo "$repo" --json conclusion --jq '.conclusion' 2>/dev/null || echo "unknown")
        if [ "$conclusion" = "success" ]; then
            echo "  ✓ $repo_short: Workflow completed successfully"
            return 0
        else
            echo "  ✗ $repo_short: Workflow failed (conclusion: $conclusion)"
            return 1
        fi
    fi
}

TRIGGERED=0
FAILED_TRIGGER=0
SUCCESSFUL=0
FAILED_RUN=0
declare -a RUN_IDS
declare -a RUN_REPOS

# Step 1: Update versions in conf.yml files
echo "Step 1: Updating versions in conf.yml files..."
echo "=================================================="
UPDATED=0
FAILED_UPDATE=0

for repo in "${REPOS[@]}"; do
    repo_short=$(basename "$repo")
    local_dir="${REPO_DIRS[$repo]}"
    
    if [ -z "$local_dir" ]; then
        echo "⚠ Warning: No local directory mapping for $repo"
        continue
    fi
    
    local_path="$ADDONS_DIR/$local_dir"
    
    if [ ! -d "$local_path" ]; then
        echo "⚠ Warning: Directory not found: $local_path"
        FAILED_UPDATE=$((FAILED_UPDATE + 1))
        continue
    fi
    
    echo "Updating version in: $local_dir"
    if update_conf_version "$local_path" "$VERSION"; then
        UPDATED=$((UPDATED + 1))
    else
        FAILED_UPDATE=$((FAILED_UPDATE + 1))
    fi
    echo ""
done

if [ $FAILED_UPDATE -gt 0 ]; then
    echo "⚠ Warning: Failed to update version in $FAILED_UPDATE plugin(s)"
    echo ""
fi

echo "Successfully updated: $UPDATED plugin(s)"
echo ""

# Step 2: Sync repositories (commit and push changes)
echo "=================================================="
echo "Step 2: Syncing repositories (commit & push)..."
echo "=================================================="

SYNC_SCRIPT="$ADDONS_DIR/sync-all-repos.sh"
if [ ! -f "$SYNC_SCRIPT" ]; then
    echo "Error: sync-all-repos.sh not found at $SYNC_SCRIPT"
    exit 1
fi

if [ ! -x "$SYNC_SCRIPT" ]; then
    chmod +x "$SYNC_SCRIPT"
fi

echo "Running sync script..."
echo ""

# Temporarily disable exit on error for sync script (it may fail on some repos)
set +e
bash "$SYNC_SCRIPT"
SYNC_EXIT_CODE=$?
set -o pipefail

if [ $SYNC_EXIT_CODE -ne 0 ]; then
    echo ""
    echo "⚠ Warning: Sync script exited with code $SYNC_EXIT_CODE"
    echo "Some repositories may not have been synced."
    echo "Proceeding with workflow triggers anyway..."
    echo ""
else
    echo ""
    echo "✓ Sync completed successfully"
    echo ""
fi

echo ""
echo "Waiting a moment for Git to propagate..."
sleep 3

# Step 3: Trigger workflow for each repository and capture run IDs
echo "=================================================="
echo "Step 3: Triggering workflows..."
echo "=================================================="
for repo in "${REPOS[@]}"; do
    repo_short=$(basename "$repo")
    echo "Triggering workflow for: $repo_short"
    
    if gh workflow run "$WORKFLOW_FILE" \
        --repo "$repo" \
        --field "version=$VERSION" \
        --field "changelog=$CHANGELOG" \
        --field "min_panel_version=$MIN_PANEL_VERSION" \
        --field "max_panel_version=$MAX_PANEL_VERSION" 2>/dev/null; then
        echo "  ✓ Workflow triggered successfully"
        TRIGGERED=$((TRIGGERED + 1))
        
        # Store repo for later monitoring
        RUN_REPOS+=("$repo")
        RUN_IDS+=("")  # Will be filled in monitoring step
    else
        echo "  ✗ Failed to trigger workflow"
        FAILED_TRIGGER=$((FAILED_TRIGGER + 1))
    fi
    echo ""
done

# If any failed to trigger, exit early
if [ $FAILED_TRIGGER -gt 0 ]; then
    echo "=================================================="
    echo "Error: Some workflows failed to trigger."
    echo "  Successfully triggered: $TRIGGERED"
    echo "  Failed to trigger: $FAILED_TRIGGER"
    exit 1
fi

# Wait a moment for all workflows to be registered
echo "Waiting for workflows to be registered..."
sleep 5

# Step 4: Get run IDs and monitor all workflows until completion
echo "=================================================="
echo "Step 4: Monitoring workflow runs..."
echo "=================================================="
echo ""

for i in "${!RUN_REPOS[@]}"; do
    repo="${RUN_REPOS[$i]}"
    repo_short=$(basename "$repo")
    
    echo "Getting run ID for: $repo_short"
    run_id=$(get_latest_run_id "$repo")
    
    if [ -z "$run_id" ] || [ "$run_id" = "null" ]; then
        echo "  ✗ Could not retrieve run ID for $repo_short"
        FAILED_RUN=$((FAILED_RUN + 1))
        RUN_IDS[$i]=""
        echo ""
        continue
    fi
    
    RUN_IDS[$i]="$run_id"
    echo "  → Found run ID: $run_id"
    echo "  → Monitoring: $repo_short (Run ID: $run_id)"
    
    if wait_for_run "$repo" "$run_id"; then
        SUCCESSFUL=$((SUCCESSFUL + 1))
    else
        FAILED_RUN=$((FAILED_RUN + 1))
    fi
    echo ""
done

# Final summary
echo "=================================================="
echo "Final Summary:"
echo "=================================================="
echo "  Successfully triggered: $TRIGGERED"
echo "  Completed successfully: $SUCCESSFUL"
echo "  Failed: $FAILED_RUN"
echo ""

if [ $FAILED_RUN -eq 0 ]; then
    echo "✓ All workflows completed successfully!"
    echo ""
    echo "View workflows at:"
    for repo in "${REPOS[@]}"; do
        echo "  https://github.com/$repo/actions"
    done
    exit 0
else
    echo "⚠ Some workflows failed. Check the logs above."
    echo ""
    echo "View failed workflows at:"
    for i in "${!RUN_REPOS[@]}"; do
        if [ -n "${RUN_IDS[$i]}" ] && [ "${RUN_IDS[$i]}" != "null" ]; then
            repo="${RUN_REPOS[$i]}"
            run_id="${RUN_IDS[$i]}"
            conclusion=$(gh run view "$run_id" --repo "$repo" --json conclusion --jq '.conclusion' 2>/dev/null || echo "unknown")
            if [ "$conclusion" != "success" ]; then
                echo "  https://github.com/$repo/actions/runs/$run_id"
            fi
        fi
    done
    exit 1
fi
