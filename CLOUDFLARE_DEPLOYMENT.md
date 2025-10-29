# Cloudflare Deployment Guide

This guide will help you deploy your PayloadCMS application to Cloudflare Pages with D1 database.

## Prerequisites

1. Cloudflare account
2. Wrangler CLI installed (`npm install -D wrangler`)
3. Git repository connected to Cloudflare Pages

## Setup Steps

### 1. Create D1 Database

```bash
# Create a new D1 database
npm run d1:create

# This will output a database ID - copy it to wrangler.toml
```

### 2. Update Configuration

1. Open `wrangler.toml` and replace `your-database-id-here` with the actual database ID
2. Update `your-payload-secret-here` with a secure secret
3. Update `your-domain.com` with your actual domain
4. Update R2 bucket name if using R2 for media storage

### 3. Set Environment Variables

In your Cloudflare Pages dashboard:

**Required:**
- `PAYLOAD_SECRET`: Your PayloadCMS secret key
- `NEXT_PUBLIC_SERVER_URL`: Your production URL

**Optional (Email):**
- `SMTP_HOST`: smtp.resend.com
- `SMTP_USER`: Your SMTP username
- `SMTP_PASS`: Your SMTP password
- `EMAIL_FROM_ADDRESS`: noreply@yourdomain.com
- `EMAIL_FROM_NAME`: Your App Name

**Optional (R2 Storage):**
- `R2_ACCESS_KEY_ID`: Your R2 access key
- `R2_SECRET_ACCESS_KEY`: Your R2 secret key
- `R2_BUCKET`: Your R2 bucket name
- `R2_REGION`: auto
- `R2_ENDPOINT`: https://your-account-id.r2.cloudflarestorage.com

**Optional (AI):**
- `GEMINI_API_KEY`: Your Google Gemini API key

### 4. Deploy to Cloudflare Pages

#### Option A: Git Integration (Recommended)
1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set build output directory: `.next`
4. Set Node.js version: 18 or 20

#### Option B: Manual Deployment
```bash
# Build and deploy
npm run deploy:cloudflare
```

### 5. Run Database Migrations

```bash
# For production
npm run d1:migrate:prod

# For local development
npm run d1:migrate
```

### 6. Local Development

```bash
# Start local development with Cloudflare bindings
npm run dev:cloudflare
```

## Database Schema

PayloadCMS will automatically create the necessary tables in D1 when you first access the admin panel.

## Troubleshooting

### D1 Binding Issues
- Ensure the database ID in `wrangler.toml` matches your actual D1 database
- Check that the binding name is `DB` in both `wrangler.toml` and Cloudflare Pages settings

### Build Issues
- Make sure all environment variables are set in Cloudflare Pages
- Check that the build output directory is set to `.next`
- Verify Node.js version compatibility

### Runtime Issues
- Check Cloudflare Pages function logs
- Ensure all required environment variables are set
- Verify D1 database is accessible

## File Structure

```
├── wrangler.toml              # Cloudflare configuration
├── functions/
│   └── _middleware.ts         # Pages middleware for D1 binding
├── _headers                   # Cloudflare Pages headers
├── _redirects                 # Cloudflare Pages redirects
└── CLOUDFLARE_DEPLOYMENT.md  # This guide
```

## Next Steps

1. Create your D1 database
2. Update `wrangler.toml` with your database ID
3. Set environment variables in Cloudflare Pages
4. Deploy your application
5. Run database migrations
6. Access your admin panel at `https://your-domain.com/admin`
