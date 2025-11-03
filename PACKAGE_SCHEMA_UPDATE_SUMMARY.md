# Package Schema Update Summary

## ✅ Completed: Package Collection Schema Updated

The Packages collection has been successfully updated to support Yoco payment integration.

---

## Changes Made

### 1. Updated Collection Schema
**File**: `src/collections/Packages/index.ts`

**Added Fields:**

```typescript
{
  name: 'revenueCatId', 
  type: 'text',
  admin: {
    description: 'Legacy RevenueCat product ID (deprecated, use yocoId instead)'
  }
},
{
  name: 'yocoId', 
  type: 'text',
  admin: {
    description: 'Yoco product ID for payment processing'
  }
},
{
  name: 'source',
  type: 'select',
  options: [
    { label: 'Yoco', value: 'yoco' },
    { label: 'RevenueCat (Legacy)', value: 'revenuecat' },
  ],
  defaultValue: 'yoco',
  admin: {
    description: 'Payment provider for this package'
  }
}
```

### 2. Updated Type Definitions
**File**: `src/lib/package-types.ts`

**Updated Interface:**

```typescript
export interface BasePackageConfig {
  id: string
  category: PackageCategory
  durationTier: DurationTier
  minNights: number
  maxNights: number
  baseMultiplier: number
  features: PackageFeature[]
  revenueCatId: string // Legacy, use yocoId for new packages
  yocoId?: string      // NEW
  source?: 'yoco' | 'revenuecat'  // NEW
  customerTierRequired: CustomerTier
  isDefault?: boolean
  canBeRenamed?: boolean
  canBeDisabled?: boolean
}
```

**Added Utility Functions:**

```typescript
// Get package by Yoco ID
export function getPackageByYocoId(yocoId: string): BasePackageConfig | undefined

// Get package by payment ID with source detection
export function getPackageByPaymentId(
  paymentId: string, 
  source: 'yoco' | 'revenuecat' = 'yoco'
): BasePackageConfig | undefined
```

### 3. Created Migration Script
**File**: `scripts/migrate-packages-to-yoco.ts`

Automated script to:
- Fetch all existing packages
- Copy `revenueCatId` → `yocoId`
- Set `source` to `'yoco'`
- Provide detailed migration summary

**Added npm script:**
```json
"scripts": {
  "migrate:packages": "tsx scripts/migrate-packages-to-yoco.ts"
}
```

### 4. Created Migration Documentation
**File**: `PACKAGE_MIGRATION_GUIDE.md`

Complete guide including:
- Step-by-step migration instructions
- Manual and programmatic migration options
- Package ID mapping table
- Verification steps
- Rollback plan

---

## Field Descriptions

### `revenueCatId` (Legacy)
- **Type**: Text (optional)
- **Purpose**: Kept for backward compatibility
- **Status**: Deprecated, use `yocoId` instead
- **Usage**: Old code still references this field

### `yocoId` (New)
- **Type**: Text (optional)
- **Purpose**: Primary payment ID for Yoco integration
- **Default**: None (populated via migration)
- **Usage**: Used by all new Yoco payment flows

### `source` (New)
- **Type**: Select ('yoco' | 'revenuecat')
- **Purpose**: Indicates which payment provider to use
- **Default**: 'yoco'
- **Usage**: Determines payment flow routing

---

## Next Steps

### 1. Generate Updated Types ⏳
```bash
npm run generate:types
```

This will update `src/payload-types.ts` to include the new fields in the `Package` interface.

### 2. Run Migration Script ⏳
```bash
npm run migrate:packages
```

This will:
- Copy all `revenueCatId` values to `yocoId`
- Set `source` to `'yoco'` for all packages
- Provide a detailed summary of changes

### 3. Verify Changes ⏳
- Check admin panel: `/admin/collections/packages`
- Verify all packages have `yocoId` populated
- Test booking flow with updated packages

---

## Database Impact

### Before Migration
```javascript
{
  id: "123",
  name: "Virtual Wine Experience",
  revenueCatId: "virtual_wine",
  // No yocoId field
  // No source field
}
```

### After Migration
```javascript
{
  id: "123",
  name: "Virtual Wine Experience",
  revenueCatId: "virtual_wine",  // Kept for compatibility
  yocoId: "virtual_wine",         // NEW - copied from revenueCatId
  source: "yoco"                  // NEW - default value
}
```

---

## Backward Compatibility

✅ **Fully Backward Compatible**

- `revenueCatId` field is preserved
- Old code can still reference `revenueCatId`
- Gradual migration supported
- No breaking changes

The codebase now checks both fields:
```typescript
const yocoPackageId = selectedPackage.yocoId || selectedPackage.revenueCatId || selectedPackage.id
```

---

## Migration Status

| Task | Status |
|------|--------|
| ✅ Update collection schema | **Complete** |
| ✅ Update type definitions | **Complete** |
| ✅ Create migration script | **Complete** |
| ✅ Create documentation | **Complete** |
| ✅ Add npm script | **Complete** |
| ⏳ Generate types | **Pending** |
| ⏳ Run migration | **Pending** |
| ⏳ Test changes | **Pending** |

---

## Testing Checklist

After running migration:

- [ ] Verify admin panel shows new fields
- [ ] Check all packages have `yocoId` populated
- [ ] Test creating a new estimate
- [ ] Test selecting a package
- [ ] Verify Yoco payment link is created
- [ ] Complete test payment
- [ ] Verify booking is created successfully

---

## Rollback

If needed, rollback is simple:

1. **Schema rollback**: Remove `yocoId` and `source` fields from collection config
2. **Code rollback**: Revert to `revenueCatId` only
3. **Data**: `revenueCatId` is preserved, no data loss

---

## Files Modified

1. ✅ `src/collections/Packages/index.ts`
2. ✅ `src/lib/package-types.ts`
3. ✅ `scripts/migrate-packages-to-yoco.ts` (new)
4. ✅ `PACKAGE_MIGRATION_GUIDE.md` (new)
5. ✅ `package.json` (added script)

---

**Update Date**: November 3, 2025  
**Status**: ✅ Schema updated, ready for migration  
**Next Action**: Run `npm run generate:types` then `npm run migrate:packages`

