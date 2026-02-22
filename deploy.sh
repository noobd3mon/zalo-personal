#!/bin/bash
# Deploy script - Push to GitHub and publish to npm
# Usage: ./deploy.sh [patch|minor|major]

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║            🚀 Deploy to GitHub & npm                     ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if git repo
if [ ! -d .git ]; then
    echo "❌ Not a git repository!"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes!"
    echo ""
    git status --short
    echo ""
    read -p "Continue anyway? [y/N]: " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "❌ Aborted"
        exit 1
    fi
fi

# Get version bump type (default: patch)
BUMP_TYPE=${1:-patch}

if [ "$BUMP_TYPE" != "patch" ] && [ "$BUMP_TYPE" != "minor" ] && [ "$BUMP_TYPE" != "major" ]; then
    echo "❌ Invalid version bump type: $BUMP_TYPE"
    echo "   Use: patch, minor, or major"
    exit 1
fi

echo "📦 Version bump type: $BUMP_TYPE"
echo ""

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Bump version
echo "⬆️  Bumping version..."
npm version $BUMP_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "New version: $NEW_VERSION"
echo ""

# Update version in docs
echo "📝 Updating version in documentation..."

# Update README.md
sed -i "s/\*\*Version\*\*: [0-9.]\+/\*\*Version\*\*: $NEW_VERSION/g" README.md
sed -i "s/\*\*Last Updated\*\*: [0-9-]\+/\*\*Last Updated\*\*: $(date +%Y-%m-%d)/g" README.md

# Update QUICK-REFERENCE.vi.md
sed -i "s/\*\*Version\*\*: [0-9.]\+ |/\*\*Version\*\*: $NEW_VERSION |/g" QUICK-REFERENCE.vi.md
sed -i "s/| \*\*Updated\*\*: [0-9-]\+/| \*\*Updated\*\*: $(date +%Y-%m-%d)/g" QUICK-REFERENCE.vi.md

echo "✅ Docs updated"
echo ""

# Git commit
echo "📝 Creating git commit..."
git add package.json README.md QUICK-REFERENCE.vi.md

read -p "Enter commit message (or press Enter for default): " commit_msg

if [ -z "$commit_msg" ]; then
    commit_msg="Release v$NEW_VERSION"
fi

git commit -m "$commit_msg

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

echo "✅ Committed"
echo ""

# Create git tag
echo "🏷️  Creating git tag v$NEW_VERSION..."
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
echo "✅ Tag created"
echo ""

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main
git push origin --tags
echo "✅ Pushed to GitHub"
echo ""

# Publish to npm
echo "📦 Publishing to npm..."
npm publish
echo "✅ Published to npm"
echo ""

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              🎉 DEPLOY SUCCESSFUL!                       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Summary:"
echo "  • Version: $CURRENT_VERSION → $NEW_VERSION"
echo "  • GitHub: https://github.com/noobd3mon/zalo-personal"
echo "  • npm: https://www.npmjs.com/package/zalo-personal"
echo ""
echo "🔍 Verify:"
echo "  npm view zalo-personal version"
echo "  npm info zalo-personal"
echo ""
