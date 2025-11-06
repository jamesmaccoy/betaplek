# Environment Variables Setup

## Yoco Payment Integration

To enable Yoco payment functionality in production, you need to add the following environment variables to your `.env.local` file:

### Required Environment Variables

```bash
# Yoco Payment Configuration
# Get your secret keys from https://portal.yoco.com/settings/api-keys
YOCO_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
YOCO_SECRET_KEY_V2=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Next.js Public URL (used for payment callbacks)
NEXT_PUBLIC_URL=https://yourdomain.com
# For local development:
# NEXT_PUBLIC_URL=http://localhost:3000
```

### How to Get Your Yoco API Keys

1. Log in to your Yoco account at https://portal.yoco.com
2. Navigate to **Settings** → **API Keys**
3. Copy your **Secret Key** (starts with `sk_live_` for production or `sk_test_` for testing)
4. Add it to your `.env.local` file

### Testing Without API Keys

The application includes mock data for testing without Yoco API keys configured. When `YOCO_SECRET_KEY` is not set, the application will:

- Display a warning: "Yoco API key not configured, using mock data"
- Use predefined product data from `yocoService.ts`
- Generate mock payment links instead of real Yoco payment links

### Steps to Enable Production Mode

1. Create or update `.env.local` in the project root
2. Add the `YOCO_SECRET_KEY` variable with your actual key
3. Restart your development server: `npm run dev`
4. The warning "Yoco API key not configured" should no longer appear
5. Payment links will be generated using the real Yoco API

### Security Notes

⚠️ **Important:**
- Never commit `.env.local` or `.env` files to version control
- Use `sk_test_` keys for development/testing
- Use `sk_live_` keys only in production
- Keep your secret keys secure and never expose them in client-side code

### Troubleshooting

If you see "Yoco API key not configured, using mock data":
- Check that `.env.local` exists in the project root
- Verify the variable is named exactly `YOCO_SECRET_KEY`
- Ensure there are no extra spaces or quotes around the key
- Restart your development server after adding the variable

For more information, refer to:
- [Yoco API Documentation](https://developer.yoco.com/online/getting-started/)
- [YOCO_SETUP.md](./YOCO_SETUP.md) in this repository

