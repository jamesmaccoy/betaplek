# Package Migration Guide: Adding Yoco ID Field

## Overview

This guide explains how to update your existing packages in the database to include the new `yocoId` and `source` fields.

## What Changed

### Schema Updates

The Packages collection now includes three fields for payment provider integration:

1. **`revenueCatId`** (string, optional) - Legacy field, kept for backward compatibility
2. **`yocoId`** (string, optional) - New field for Yoco payment IDs
3. **`source`** (select: 'yoco' | 'revenuecat') - Indicates which payment provider to use

### Default Values

- New packages will default to `source: 'yoco'`
- Existing packages will need to be migrated

## Migration Steps

### Step 1: Generate Updated Types

After updating the collection schema, regenerate Payload types:

```bash
npm run payload generate:types
```

This will update `src/payload-types.ts` with the new fields.

### Step 2: Update Existing Packages (Manual via Admin Panel)

1. Log into your Payload admin panel at `/admin`
2. Navigate to Collections → Packages
3. For each package:
   - Add the same value from `revenueCatId` to `yocoId` field
   - Set `source` to `yoco`
   - Save the package

### Step 3: Update Existing Packages (Programmatic)

Alternatively, you can use this migration script to update all packages at once:

```typescript
// scripts/migrate-packages-to-yoco.ts
import payload from 'payload'

async function migratePackages() {
  await payload.init({
    secret: process.env.PAYLOAD_SECRET!,
    local: true,
  })

  // Fetch all packages
  const packages = await payload.find({
    collection: 'packages',
    limit: 1000,
  })

  console.log(`Found ${packages.docs.length} packages to migrate`)

  // Update each package
  for (const pkg of packages.docs) {
    if (!pkg.yocoId && pkg.revenueCatId) {
      await payload.update({
        collection: 'packages',
        id: pkg.id,
        data: {
          yocoId: pkg.revenueCatId, // Copy revenueCatId to yocoId
          source: 'yoco',
        },
      })
      console.log(`✅ Migrated package: ${pkg.name} (${pkg.id})`)
    } else if (pkg.yocoId) {
      console.log(`⏭️ Skipped (already has yocoId): ${pkg.name}`)
    } else {
      console.log(`⚠️ Skipped (no revenueCatId): ${pkg.name}`)
    }
  }

  console.log('Migration complete!')
  process.exit(0)
}

migratePackages().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
```

To run the migration script:

```bash
# Add script to package.json
"scripts": {
  "migrate:packages": "tsx scripts/migrate-packages-to-yoco.ts"
}

# Run migration
npm run migrate:packages
```

## Package ID Mapping

All Yoco product IDs should match the old RevenueCat IDs for seamless migration:

| Package Name | RevenueCat ID | Yoco ID | Status |
|--------------|---------------|---------|--------|
| Studio Space | per_hour | per_hour | ✅ Matched |
| Virtual Wine Experience | virtual_wine | virtual_wine | ✅ Matched |
| Parking | per_hour_guest | per_hour_guest | ✅ Matched |
| Luxury Hours | per_hour_luxury | per_hour_luxury | ✅ Matched |
| Three Night Getaway | three_nights_customer | three_nights_customer | ✅ Matched |
| World Explorer | weekly_customer | weekly_customer | ✅ Matched |
| Two Week Paradise | week_x2_customer | week_x2_customer | ✅ Matched |
| Three Week Adventure | week_x3_customer | week_x3_customer | ✅ Matched |
| Monthly Escape | week_x4_customer | week_x4_customer | ✅ Matched |
| Monthly Guest | monthly | monthly | ✅ Matched |
| Gathering | gathering | gathering | ✅ Matched |
| Annual agreement | gathering_monthly | gathering_monthly | ✅ Matched |
| Weekly Pro | weekly | weekly | ✅ Matched |
| Royal Suite Experience | hosted7nights | hosted7nights | ✅ Matched |
| 3 Nights for guests | hosted3nights | hosted3nights | ✅ Matched |
| Romantic Escape | per_night_customer | per_night_customer | ✅ Matched |
| Business Function | per_night_luxury | per_night_luxury | ✅ Matched |

## Verification

After migration, verify the changes:

### 1. Check Admin Panel

- Open `/admin/collections/packages`
- Verify all packages have `yocoId` populated
- Verify all packages have `source` set to `yoco`

### 2. Test API

```bash
# Fetch packages via API
curl http://localhost:3000/api/packages

# Check response includes yocoId and source fields
```

### 3. Test Booking Flow

1. Navigate to a property
2. Select dates and create an estimate
3. Select a package
4. Verify payment link is created with Yoco
5. Complete test payment

## Rollback Plan

If you need to rollback:

1. The `revenueCatId` field is preserved, so old code will still work
2. You can temporarily switch back to RevenueCat by reverting provider changes
3. Package data is not deleted, only new fields are added

## Important Notes

⚠️ **Before Migration:**
- Backup your database
- Test migration on staging environment first
- Verify all package IDs match between systems

✅ **After Migration:**
- Test booking flow end-to-end
- Verify payment links are generated correctly
- Check that correct packages are shown based on user entitlements

## Support

If you encounter issues during migration:

1. Check the console for error messages
2. Verify environment variables are set correctly
3. Ensure Yoco API keys are valid
4. Review the `YOCO_MIGRATION_SUMMARY.md` for troubleshooting

---

**Migration Date**: November 3, 2025  
**Version**: 1.0.0

