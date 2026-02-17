# Deployment Guide for buhbuh

This guide covers deploying the buhbuh project to GitHub Pages with a custom CloudFlare domain.

## Overview

- **Hosting**: GitHub Pages (free)
- **Custom Domain**: CloudFlare (DNS pointing to GitHub Pages)
- **CI/CD**: GitHub Actions (automated builds and deployments)
- **Deployment Trigger**: Automatic on push to `main` branch

## Prerequisites

- GitHub account with the repository created
- Custom domain registered (e.g., via CloudFlare, Namecheap, or your registrar)
- Repository cloned locally with all files committed

## Initial Setup (One-Time)

### 1. Enable GitHub Pages

1. Go to your GitHub repository
2. Navigate to **Settings** → **Pages**
3. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
   - This allows the workflow to deploy automatically

### 2. Configure Custom Domain with CloudFlare

#### If using CloudFlare for DNS:

1. **In CloudFlare Dashboard**:
   - Add your domain if not already there
   - Go to **DNS** settings
   - Create an `A` record pointing to GitHub Pages:
     ```
     Type: A
     Name: @ (or your subdomain, e.g., www)
     IPv4 address: 185.199.108.153 (or one of: 185.199.109.153, 185.199.110.153, 185.199.111.153)
     Proxy status: Proxied (or DNS only, depending on your preference)
     ```
   - For `www` subdomain (optional):
     ```
     Type: CNAME
     Name: www
     Target: yourusername.github.io
     ```
   - Let DNS propagate (may take a few minutes to a few hours)

2. **In GitHub Repository Settings** → **Pages**:
   - Under "Custom domain", enter your domain name (e.g., `example.com`)
   - GitHub will create a `CNAME` file in the repository
   - Enable "Enforce HTTPS" once the domain is configured (wait for SSL certificate)

#### If using another registrar:

1. Update your domain's nameservers to point to CloudFlare:
   - Get CloudFlare's nameservers from your CloudFlare dashboard
   - Update at your current registrar
   
2. Follow the CloudFlare DNS setup above

### 3. Verify Deployment Workflow

1. Push a commit to the `main` branch
2. Go to your repository's **Actions** tab
3. Watch the "Deploy to GitHub Pages" workflow run
4. Once complete, visit your domain to see the deployed site

## Deployment Process

The GitHub Actions workflow automatically:

1. ✅ Checks out your code
2. ✅ Sets up Node.js (v18) and pnpm
3. ✅ Installs dependencies from `pnpm-lock.yaml`
4. ✅ Runs linting (`pnpm run lint`)
5. ✅ Builds the project (`pnpm run build`)
6. ✅ Uploads the `dist/` folder to GitHub Pages
7. ✅ Deploys to your configured domain

**Trigger**: Any push to the `main` branch automatically triggers this workflow.

## Manual Deployment

If you need to manually trigger a deployment:

1. Go to your repository's **Actions** tab
2. Select "Deploy to GitHub Pages" workflow
3. Click "Run workflow" button
4. Select `main` branch and confirm

## Troubleshooting

### Domain not resolving

- **Issue**: Site shows 404 or doesn't load at your custom domain
- **Solution**:
  - Wait 24-48 hours for DNS propagation
  - Clear browser cache (Ctrl+Shift+Del or Cmd+Shift+Delete)
  - Verify DNS records in CloudFlare dashboard
  - Check GitHub Pages settings has your custom domain configured
  - Ensure a `CNAME` file exists in your repository

### Deployment fails in Actions

- **Issue**: Workflow shows red X
- **Solution**:
  - Click on the failed workflow to see detailed logs
  - Common causes:
    - Missing dependencies: Run `pnpm install` locally and commit `pnpm-lock.yaml`
    - Lint errors: Run `pnpm run lint` locally to fix
    - Build errors: Run `pnpm run build` locally to debug

### GitHub Pages shows wrong branch

- **Issue**: Deployment from wrong branch or static files
- **Solution**:
  - Go to **Settings** → **Pages**
  - Ensure "Source" is set to "GitHub Actions"
  - Not "Deploy from a branch" (which is the old method)

### HTTPS not working

- **Issue**: Site loads over HTTP, not HTTPS
- **Solution**:
  - Wait 24 hours after configuring custom domain
  - Github needs time to issue an SSL certificate
  - Then check "Enforce HTTPS" in GitHub Pages settings

## Continuous Deployment Best Practices

### Before pushing to `main`:

1. **Test locally**:
   ```bash
   pnpm run dev      # Test in development
   pnpm run build    # Test production build
   pnpm run preview  # Preview production build
   ```

2. **Lint your code**:
   ```bash
   pnpm run lint
   ```

3. **Run tests** (if applicable):
   ```bash
   pnpm run test
   ```

### Commit hygiene:

- Write clear commit messages
- Keep commits focused and logical
- Reference issues if fixing bugs (#123)

## Rollback Process

If a deployment causes issues:

1. Go to your repository's **Actions** tab
2. Find the last successful workflow run
3. Or revert the problematic commit:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```
4. The workflow will automatically redeploy the reverted version

## Monitoring Deployments

- **Real-time**: Check **Actions** tab during deployment
- **History**: Actions tab shows all past deployments with logs
- **Status badge**: Consider adding a status badge to your README:
  ```markdown
  ![Deploy to GitHub Pages](https://github.com/yourusername/buhbuh/actions/workflows/deploy.yml/badge.svg)
  ```

## File Structure Reference

Important files for deployment:

```
.github/
  workflows/
    deploy.yml           # GitHub Actions workflow config
package.json             # Project dependencies and scripts
pnpm-lock.yaml          # Locked versions (must be committed)
vite.config.ts          # Build configuration
dist/                   # Output folder (auto-generated)
CNAME                   # Custom domain file (auto-generated by GitHub)
```

## Next Steps

1. Verify the workflow file is in place: `.github/workflows/deploy.yml`
2. Push changes to ensure actions are enabled
3. Configure custom domain in GitHub Pages settings
4. Update CloudFlare DNS records
5. Monitor the first deployment in the Actions tab
6. Test your site at the custom domain URL

## Support

For issues with:
- **GitHub Pages**: [GitHub Pages Documentation](https://docs.github.com/en/pages)
- **CloudFlare**: [CloudFlare DNS Documentation](https://developers.cloudflare.com/dns/)
- **Vite Build Issues**: [Vite Documentation](https://vitejs.dev/)
- **React**: [React Documentation](https://react.dev/)
