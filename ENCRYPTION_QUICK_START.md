# Encryption System - Quick Start Guide

## 🚀 Initial Setup (Do This Once)

```bash
# After cloning the repository
cd buhbuh
pnpm install

# Create .env file with password
echo "VITE_SITE_PASSWORD=your_secure_password_here" > .env

# Setup git hooks
npm run prepare
```

## 📁 Adding Content

### Basic Workflow

```bash
# 1. Add your unencrypted file
cp my-poem.txt public/poems/

# 2. Stage and commit (hook takes care of encryption)
git add public/poems/my-poem.txt
git commit -m "Add new poem"

# The pre-commit hook automatically:
# - Encrypts the file → public/poems/my-poem.txt.enc
# - Stages the .enc file
# - Prevents unencrypted files from being committed
```

### File Organization

Place files in the correct categories:

| Category | Path | Types |
|----------|------|-------|
| **Poems** | `public/poems/` | .txt, .md, .pdf |
| **Music** | `public/music/` | .mp3, .wav, .ogg, .m4a |
| **Art** | `public/art/` | .png, .jpeg, .gif, .svg, .webp |
| **Pictures** | `public/pictures/` | .jpg, .png, .gif, .webp |
| **Writing** | `public/writing/` | .txt, .md, .pdf, .doc |

## 🔐 Password Management

### Choose a Strong Password

❌ **Bad**: `password`, `123456`, `poem`, `buhbuh`
✅ **Good**: `Tr0pic@l!B1rds$2024~Music*Dreams`

### Requirements

- **Minimum 16 characters** recommended
- Mix of uppercase + lowercase + numbers + symbols
- No dictionary words or personal info
- Unique to this project

### Sharing Password

**NEVER share via unencrypted channels:**
- ❌ Email
- ❌ Slack
- ❌ Text messages
- ❌ GitHub issues/comments

**Safe methods:**
- ✅ Bitwarden/1Password shared vault
- ✅ Signal encrypted message
- ✅ In-person conversation
- ✅ Private KeePass-shared database

## 🧪 Testing

### Run Encryption Tests

```bash
# All tests
npm run test

# Specific test file
npm run test -- crypto-utils.test.ts

# Watch mode (auto-rerun on changes)
npm run test -- --watch

# UI view
npm run test:ui
```

### Verify Encryption Manually

```bash
# Force re-encrypt all files
npm run encrypt

# Check that .enc files exist
ls -la public/**/*.enc

# Inspect an encrypted file
cat public/poems/my-poem.txt.enc
# (It should look like JSON with base64 data)
```

## 🐛 Troubleshooting

### Pre-commit hook not running

```bash
# Reinstall hooks
npm run prepare

# On Windows, verify hook permissions in .git/hooks/pre-commit
# The file should have execute permissions
```

### "VITE_SITE_PASSWORD not found" error

```bash
# Create .env file
echo "VITE_SITE_PASSWORD=YourStrongPassword123!" > .env

# Verify it exists
cat .env
```

### Unencrypted file accidentally committed

⚠️ **If this happens**:

```bash
# Option 1: Remove from recent commits
git rm --cached public/poems/file.txt
echo "public/poems/*" >> .gitignore
git commit --amend --no-edit

# Option 2: Remove from entire history (nuclear option)
# Only if absolutely necessary - coordinate with team
git filter-branch --tree-filter 'rm -f public/poems/file.txt' HEAD
git push --force-with-lease
```

### Decryption not working on website

1. **Check password is correct**: Ask dev for password
2. **Check browser compatibility**: Works in all modern browsers
3. **Check browser console**: Open DevTools → Console tab for errors
4. **Try different browser**: Safari, Chrome, Firefox, Edge

## 📊 Verify Setup

### Checklist

- [ ] `.env` file exists and contains `VITE_SITE_PASSWORD`
- [ ] `.git/hooks/pre-commit` exists and is executable
- [ ] `npm run test` passes all tests
- [ ] `npm run encrypt` runs without errors
- [ ] `.gitignore` contains encryption rules
- [ ] `.enc` files exist in `public/` directories

### Status Command

Create a quick status check:

```bash
# Check if .env exists
[ -f .env ] && echo "✅ .env configured" || echo "❌ Missing .env"

# Check if hooks installed
[ -f .git/hooks/pre-commit ] && echo "✅ Git hooks installed" || echo "❌ Missing hooks"

# Check if tests pass
npm run test && echo "✅ Tests passing" || echo "❌ Tests failing"
```

## 🚢 Before Deployment

### Deployment Checklist

- [ ] All tests passing: `npm run test`
- [ ] No TypeScript errors: `npm run build`
- [ ] `.env` password is strong
- [ ] `.env` is in `.gitignore`
- [ ] Only `.enc` files in `public/` directories
- [ ] No unencrypted files in git history
- [ ] Pre-commit hook working
- [ ] Verified `.enc` files can decrypt on website

### Build Command

```bash
# This will compile TypeScript and build for production
npm run build

# Preview the production build
npm run preview
```

## 📚 Learn More

For detailed information, see:
- [ENCRYPTION_GUIDE.md](../docs/ENCRYPTION_GUIDE.md) - Full documentation
- [crypto-utils.test.ts](src/utils/crypto-utils.test.ts) - Test examples
- [WebCrypto API Docs](https://github.com/mdn/content/blob/main/files/en-us/web/api/webcryptoapi)

## 🆘 Emergency Procedures

### Password Compromise

If password is exposed:

```bash
# 1. Create new strong password
# 2. Update .env with new password
# 3. Re-encrypt all files
npm run encrypt

# 4. Commit new .enc files
git add public/**/*.enc
git commit -m "Security: Re-encrypt with new password"

# 5. Notify all users of new password
# 6. Consider notifying GitHub (if public repo was exposed)
```

### Complete Setup Reset

```bash
# Start fresh
rm -rf .git/hooks
rm .env
npm run prepare
echo "VITE_SITE_PASSWORD=new_password" > .env
npm run encrypt
```

---

**Quick Links**:
- 🔧 [Full Setup](../docs/ENCRYPTION_GUIDE.md)
- 🧪 [Run Tests](npm%20run%20test)
- 🔐 [Password Best Practices](../docs/ENCRYPTION_GUIDE.md#best-practices)

Last updated: 2026-02-17
