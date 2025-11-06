# Package Migration Instructions

## Overview

The package migration endpoint is now deployed and ready to use. It will copy `revenueCatId` values to `yocoId` for all packages in your database.

## Prerequisites

✅ You must be logged in as an **admin user**

## How to Run Migration

### Method 1: Browser (Easiest)

1. **Log in to your admin panel:**
   ```
   https://www.simpleplek.co.za/admin
   ```

2. **Once logged in, visit the migration URL:**
   ```
   https://www.simpleplek.co.za/api/admin/migrate-packages
   ```

3. **You should see a JSON response:**
   ```json
   {
     "success": true,
     "message": "Package migration completed successfully",
     "total": 10,
     "migrated": 8,
     "skipped": 2,
     "errors": 0
   }
   ```

### Method 2: Using cURL (Advanced)

```bash
curl -X GET \
  https://www.simpleplek.co.za/api/admin/migrate-packages \
  -H "Cookie: payload-token=YOUR_TOKEN_HERE"
```

## Expected Behavior

### First Run:
```json
{
  "success": true,
  "message": "Package migration completed successfully",
  "total": 10,
  "migrated": 10,
  "skipped": 0,
  "errors": 0
}
```

### Subsequent Runs (Already Migrated):
```json
{
  "success": true,
  "message": "Package migration completed successfully",
  "total": 10,
  "migrated": 0,
  "skipped": 10,
  "errors": 0
}
```

## What the Migration Does

For each package in your database:

1. **Checks if `yocoId` already exists**
   - If yes: Skips (already migrated)

2. **Checks if `revenueCatId` exists**
   - If no: Skips (nothing to migrate)

3. **Updates the package:**
   ```javascript
   {
     yocoId: pkg.revenueCatId,  // Copy value
     source: 'yoco'              // Set source
   }
   ```

## Troubleshooting

### Error: "Route not found"

**Cause:** The migration endpoint hasn't been deployed yet

**Solution:** 
1. Verify the latest commit is deployed on Vercel
2. Check commit `e2e82a1` is in the deployment
3. Wait for Vercel to rebuild and redeploy

### Error: "Not authenticated"

**Cause:** You're not logged in

**Solution:**
1. Go to `https://www.simpleplek.co.za/admin`
2. Log in with your admin credentials
3. Then visit the migration URL

### Error: "Unauthorized - admin access required"

**Cause:** Your user account doesn't have admin role

**Solution:**
1. Check your user account in the database
2. Ensure `roles` field includes `"admin"`
3. Or ask another admin to run the migration

### Error: "Migration failed"

**Cause:** Database connection or permission issue

**Solution:**
1. Check Vercel function logs for details
2. Verify `DATABASE_URI` environment variable is set
3. Check database connection is working
4. Verify Payload CMS configuration

## Verification

After running the migration, verify it worked:

### Option 1: Check Admin Panel

1. Go to `https://www.simpleplek.co.za/admin/collections/packages`
2. Open any package
3. Verify:
   - ✅ `yocoId` field is populated
   - ✅ `source` field is set to "yoco"
   - ✅ `revenueCatId` is still there (not deleted)

### Option 2: Check API Response

Look at the response from the migration endpoint:
- `migrated` should be > 0 on first run
- `skipped` should be > 0 on subsequent runs
- `errors` should be 0

## Database Changes

### Before Migration:
```javascript
{
  id: "123",
  name: "🍷 Hosted 3-Night Package",
  revenueCatId: "hosted3nights",
  yocoId: undefined,  // ❌ Not set
  source: undefined   // ❌ Not set
}
```

### After Migration:
```javascript
{
  id: "123",
  name: "🍷 Hosted 3-Night Package",
  revenueCatId: "hosted3nights",  // ✅ Preserved
  yocoId: "hosted3nights",        // ✅ Copied from revenueCatId
  source: "yoco"                  // ✅ Set to 'yoco'
}
```

## Safety Features

✅ **Idempotent:** Safe to run multiple times - won't duplicate data

✅ **Non-destructive:** Doesn't delete `revenueCatId` - keeps backward compatibility

✅ **Selective:** Only migrates packages that need migration

✅ **Protected:** Requires admin authentication

✅ **Logged:** All operations logged in Vercel function logs

## After Migration

Once migration is complete:

1. ✅ Test the booking flow on your site
2. ✅ Verify packages load correctly
3. ✅ Ensure `yocoId` is used in payment processing
4. ✅ Monitor for any errors in production

## Related Files

- **API Route:** `src/app/api/admin/migrate-packages/route.ts`
- **Migration Logic:** `src/scripts/migrate-packages.ts`
- **Auth Helper:** `src/utilities/getUserFromRequest.ts`
- **Package Schema:** `src/collections/Packages/index.ts`

## Deployment Status

✅ **Committed:** `e2e82a1` - Added GET handler

✅ **Pushed:** `goingyoco` branch

✅ **Ready:** Available at `/api/admin/migrate-packages`

---

**Need Help?**

If you encounter any issues:
1. Check Vercel deployment logs
2. Verify you're logged in as admin
3. Review the error message details
4. Check database connection is working

**Last Updated:** November 3, 2025

