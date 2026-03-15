#!/bin/bash
# Empire Agent — Deploy to Vercel
# Run: bash DEPLOY.sh

set -e
cd "$(dirname "$0")"

echo ""
echo "================================================"
echo "  EMPIRE AGENT — Deploying to Vercel"
echo "================================================"
echo ""

# Login to Vercel (opens browser)
echo "Step 1: Logging into Vercel (browser will open)..."
vercel login

# Add environment variable
echo ""
echo "Step 2: Setting up environment variable..."
echo "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" | \
  vercel env add OPENROUTER_API_KEY production --yes 2>/dev/null || true

# Deploy
echo ""
echo "Step 3: Deploying to production..."
vercel --prod --yes

echo ""
echo "================================================"
echo "  DONE! Empire Agent is live."
echo "================================================"
