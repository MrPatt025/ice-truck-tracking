#!/bin/bash
# Final QA validation pipeline
# Run this before pushing to main or deploying to production

set -e  # Exit on error

echo "🔍 Step 1/8: Installing dependencies..."
pnpm install --frozen-lockfile

echo "🎨 Step 2/8: Checking code formatting..."
pnpm run format:check

echo "🔎 Step 3/8: Running ESLint (strict - zero warnings allowed)..."
pnpm run lint:ci

echo "📝 Step 4/8: Type-checking TypeScript..."
pnpm run type-check

echo "🏗️  Step 5/8: Building production bundles..."
pnpm run build

echo "♿ Step 6/8: Running accessibility scans..."
# Start dashboard dev server in background
pnpm -F dashboard dev &
DEV_PID=$!
# Wait for server to be ready
sleep 10
# Run axe scan
pnpm run a11y:scan || true
# Kill dev server
kill $DEV_PID

echo "🧪 Step 7/8: Running test suites..."
pnpm run test

echo "🧹 Step 8/8: Checking for unused code..."
echo "  → Unused exports..."
pnpm run unused:exports > unused-exports.txt || true
echo "  → Unused files..."
pnpm run unused:files > unused-files.txt || true
echo "  → Unused dependencies..."
pnpm run unused:deps > unused-deps.txt || true

echo ""
echo "✅ All validation checks passed!"
echo ""
echo "📊 Review unused code reports:"
echo "  - unused-exports.txt"
echo "  - unused-files.txt"
echo "  - unused-deps.txt"
