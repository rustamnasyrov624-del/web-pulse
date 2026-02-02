#!/bin/bash

# 1. Sync Data from Weekly Report
echo "🔄 Running Pulse Updater..."
python3 "/Users/nsrv/Desktop/Мозг Рустама/.agent/skills/pulse-updater/scripts/sync.py"

# 2. Check for changes
if [[ -n $(git status -s) ]]; then
    echo "📦 Changes detected. Committing..."
    
    # 3. Commit and Push
    git add index.html
    git commit -m "Auto-update: Synced metrics from Weekly Report"
    
    echo "🚀 Pushing to GitHub (Vercel will auto-deploy)..."
    git push origin main
    
    echo "✅ Done! Site should be live in ~30 seconds."
else
    echo "✨ No new data to sync. Site is up to date."
fi
