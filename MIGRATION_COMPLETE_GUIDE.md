# ✅ Yoco Migration - Ready to Execute

## Current Status

All code changes are complete! The package schema has been updated and types have been generated. Now you just need to migrate the data.

---

## Quick Start: Migrate Your Packages

### Recommended Method: API Endpoint

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Open your browser** and log in as admin

3. **Open browser console** (F12 or Cmd+Option+I on Mac)

4. **Run this command:**
   ```javascript
   fetch('/api/admin/migrate-packages', {
     method: 'POST',
     credentials: 'include'
   })
     .then(res => res.json())
     .then(data => console.log('✅ Migration result:', data))
   ```

5. **Check the console** for results:
   ```json
   {
     "success": true,
     "total": 15,
     "migrated": 15,
     "skipped": 0,
     "errors": 0
   }
   ```

That's it! ✨

---

## What This Migration Does

For each package in your database:
1. Copies `revenueCatId` → `yocoId`
2. Sets `source` to `'yoco'`
3. Skips packages already migrated
4. Reports detailed results

### Example Transformation

**Before:**
```json
{
  "name": "Virtual Wine Experience",
  "revenueCatId": "virtual_wine",
  "yocoId": null,
  "source": null
}
```

**After:**
```json
{
  "name": "Virtual Wine Experience",
  "revenueCatId": "virtual_wine",
  "yocoId": "virtual_wine",
  "source": "yoco"
}
```

---

## Verification Steps

After migration:

### 1. Check Admin Panel
- Go to `/admin/collections/packages`
- Open a few packages
- Verify `yocoId` is populated
- Verify `source` is `'yoco'`

### 2. Test Booking Flow
- Go to a property page
- Create an estimate
- Select a package
- Click "Book Now"
- Verify Yoco payment link is created

### 3. Check Console Logs
Look for:
```
Available Yoco products: [...]
Looking for package with yocoId: virtual_wine
```

---

## Alternative Migration Methods

If the API method doesn't work, see `MANUAL_MIGRATION_STEPS.md` for:
- Manual migration via admin panel
- MongoDB direct update (if applicable)

---

## What's Been Completed

### ✅ Code Changes (100% Complete)
- [x] Fixed unsafe type access in SmartEstimateBlock
- [x] Created Yoco service (`src/lib/yocoService.ts`)
- [x] Created Yoco provider (`src/providers/Yoco/index.tsx`)
- [x] Created Yoco API routes
- [x] Updated subscribe page to use Yoco
- [x] Updated SmartEstimateBlock to use Yoco
- [x] Updated useSubscription hook
- [x] Updated providers index
- [x] Updated package collection schema
- [x] Generated TypeScript types
- [x] Created migration tooling

### ⏳ Remaining Steps
- [ ] Run package migration (via API - see above)
- [ ] Test payment flow end-to-end
- [ ] Remove `@revenuecat/purchases-js` from package.json

---

## Environment Variables Needed

Make sure these are in your `.env`:

```bash
# Yoco Payment Integration
YOCO_SECRET_KEY=sk_live_xxxxxxxxxxxxx
YOCO_SECRET_KEY_V2=sk_live_xxxxxxxxxxxxx  # Optional
NEXT_PUBLIC_URL=http://localhost:3000
```

---

## Files Created/Modified

### New Files
1. `src/lib/yocoService.ts` - Yoco payment service
2. `src/providers/Yoco/index.tsx` - Yoco React provider
3. `src/app/api/yoco/payment-links/route.ts` - Payment link API
4. `src/app/api/yoco/customer-info/route.ts` - Customer API
5. `src/app/api/yoco/products/route.ts` - Products API
6. `src/scripts/migrate-packages.ts` - Migration logic
7. `src/app/api/admin/migrate-packages/route.ts` - Migration API
8. `MANUAL_MIGRATION_STEPS.md` - Migration guide
9. `YOCO_MIGRATION_SUMMARY.md` - Complete migration docs
10. `PACKAGE_MIGRATION_GUIDE.md` - Package-specific guide

### Modified Files
1. `src/collections/Packages/index.ts` - Added yocoId & source fields
2. `src/lib/package-types.ts` - Updated type definitions
3. `src/app/(frontend)/subscribe/page.tsx` - Yoco integration
4. `src/blocks/EstimateBlock/SmartEstimateBlock.tsx` - Yoco payments
5. `src/hooks/useSubscription.ts` - Yoco provider
6. `src/providers/index.tsx` - Yoco provider
7. `package.json` - Updated scripts
8. `src/payload-types.ts` - Auto-generated types

---

## Backward Compatibility

✅ **Fully Backward Compatible!**

- `revenueCatId` field preserved
- Code checks both `yocoId` and `revenueCatId`
- Gradual migration supported
- No breaking changes

---

## Support & Troubleshooting

### Migration shows 0 packages migrated
- Check that packages exist in database
- Verify you're logged in as admin
- Check console for errors

### API returns 401/403
- Make sure you're logged in
- Verify your account has admin role

### Payment link creation fails
- Check `YOCO_SECRET_KEY` is set in `.env`
- Verify API key is valid
- Check console logs for details

---

## Next Actions

1. ✅ **Run migration** (see Quick Start above)
2. ✅ **Test booking flow**
3. ✅ **Remove RevenueCat dependency** (optional)
4. ✅ **Deploy to production**

---

**You're ready to go!** 🚀

Just run the API migration command and you'll be live with Yoco payments.

