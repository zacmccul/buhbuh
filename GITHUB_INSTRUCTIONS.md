# GitHub Setup and Deployment Instructions

## Initial Repository Setup

### 1. Create GitHub Repository
- Go to [GitHub](https://github.com/new)
- Create a new repository named `buhbuh`
- Choose **Public** visibility (required for free GitHub Pages)
- Do NOT initialize with README, .gitignore, or license (we'll configure these locally)

### 2. Local Repository Initialization
```bash
git init
git add .
git commit -m "Initial commit: buhbuh project setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/buhbuh.git
git push -u origin main
```

## GitHub Pages Configuration

### 3. Enable GitHub Pages
1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
   - This allows us to build and deploy the Vite static site automatically

### 4. Create GitHub Actions Workflow
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm install
    
    - name: Run tests
      run: npm run test
    
    - name: Build
      run: npm run build
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

## Vite Configuration

### 5. Update `vite.config.ts`
Ensure your Vite config includes the correct base path:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',  // Use root for custom domain
  build: {
    outDir: 'dist',
    sourcemap: false,  // Disable for security
  },
})
```

## CloudFlare Custom Domain Setup

### 6. Domain Registration
- Purchase/transfer your domain through any registrar (Namecheap, GoDaddy, etc.)
- Or register directly with CloudFlare

### 7. Configure CloudFlare
1. Sign up or log in to [CloudFlare](https://www.cloudflare.com)
2. Add your site:
   - Click "Add a site"
   - Enter your domain name
   - CloudFlare will scan your DNS records
3. Update nameservers at your domain registrar to CloudFlare's:
   - `ns1.cloudflare.com`
   - `ns2.cloudflare.com`
   - (CloudFlare will provide the exact nameservers)

### 8. Configure DNS for GitHub Pages
In CloudFlare dashboard:
1. Go to **DNS** settings
2. Add these records:
   ```
   Type: A
   Name: @ (or your domain)
   IPv4: 185.199.108.153
   Proxy status: Proxied
   
   Type: A
   Name: @ (or your domain)
   IPv4: 185.199.109.153
   Proxy status: Proxied
   
   Type: A
   Name: @ (or your domain)
   IPv4: 185.199.110.153
   Proxy status: Proxied
   
   Type: A
   Name: @ (or your domain)
   IPv4: 185.199.111.153
   Proxy status: Proxied
   ```
   (Or add as CNAME: `YOUR_USERNAME.github.io`)

### 9. Add Custom Domain to GitHub Pages
1. Go to repository **Settings** → **Pages**
2. Under "Custom domain", enter your domain (e.g., `buhbuh.com`)
3. Click "Save"
4. GitHub will create a `CNAME` file automatically

## Security Configuration

### 10. CloudFlare Security Settings
1. **SSL/TLS**: Set to "Full (strict)"
2. **Always Use HTTPS**: Enable
3. **Automatic HTTPS Rewrites**: Enable
4. **Browser Integrity Check**: Enable
5. **Challenge Passage**: Set to prevent bot access

### 11. Password Protection (Client-Side)
Since all content is behind a password requirement:
- Implement password verification in React component
- Store hashed password check in your app (separate from actual site content)
- Use encryption for sensitive data
- Never commit passwords to repository

Example approach:
```typescript
// src/hooks/usePasswordAuth.ts
export const PASSWORD_HASH = 'your_secure_hash_here';

export const verifyPassword = (input: string): boolean => {
  // Use bcryptjs or similar for hashing
  return bcryptjs.compareSync(input, PASSWORD_HASH);
}
```

## Development Workflow

### 12. Local Development
```bash
npm install
npm run dev
```

### 13. Before Deploying
```bash
npm run test    # Run vitest tests
npm run build   # Build for production
npm run preview # Preview production build locally
```

### 14. Deploy to Production
Simply push to main branch:
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

GitHub Actions will automatically build and deploy to GitHub Pages.

## Monitoring and Maintenance

### 15. Check Deployment Status
- View deployment status in GitHub repo: **Actions** tab
- Check production at your custom domain
- Monitor CloudFlare analytics dashboard

### 16. Environment Variables (if needed)
For sensitive configuration:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add repository secrets
3. Reference in workflow: `${{ secrets.YOUR_SECRET }}`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Site not found | Check CloudFlare DNS and `CNAME` file in GitHub |
| SSL errors | Ensure CloudFlare SSL is "Full (strict)" |
| Build fails | Check workflow logs in Actions tab |
| Custom domain not working | Wait 24-48 hours for DNS propagation |

---

**Next Steps:**
1. ✅ Create GitHub repository
2. ✅ Push initial code
3. ✅ Enable GitHub Pages with Actions
4. ✅ Set up CloudFlare
5. ✅ Configure custom domain
6. ✅ Deploy and test
