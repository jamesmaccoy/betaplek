# Manual Package Migration Steps

Since the automated script requires environment setup, here's how to migrate packages manually or via API.

## Option 1: Via API Endpoint (Recommended)

### Step 1: Start your development server
```bash
npm run dev
```

### Step 2: Log in as admin
Navigate to your site and log in with admin credentials.

### Step 3: Run migration via API
Open your browser console and run:

```javascript
fetch('/api/admin/migrate-packages', {
  method: 'POST',
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => console.log('Migration result:', data))
```

You'll see output like:
```json
{
  "success": true,
  "message": "Package migration completed successfully",
  "total": 15,
  "migrated": 15,
  "skipped": 0,
  "errors": 0
}
```

## Option 2: Manual via Admin Panel

### For each package:

1. Go to `/admin/collections/packages`
2. Click on a package
3. Find the `revenueCatId` field value
4. Copy that value to the `yocoId` field
5. Set `source` to `yoco`
6. Click Save

Repeat for all packages.

## Option 3: Via MongoDB (if using MongoDB)

If you're using MongoDB and have access to the database:

```javascript
// Connect to your MongoDB
use your_database_name

// Update all packages
db.packages.updateMany(
  { yocoId: { $exists: false } }, // Only packages without yocoId
  [
    {
      $set: {
        yocoId: "$revenueCatId",
        source: "yoco"
      }
    }
  ]
)
```

## Verification

After migration, verify in admin panel:

1. Go to `/admin/collections/packages`
2. Open each package
3. Verify:
   - ✅ `yocoId` field is populated
   - ✅ `yocoId` matches `revenueCatId`
   - ✅ `source` is set to `'yoco'`

## Example: Before & After

### Before Migration
```json
{
  "name": "Virtual Wine Experience",
  "revenueCatId": "virtual_wine",
  "yocoId": null,
  "source": null
}
```

### After Migration
```json
{
  "name": "Virtual Wine Experience",
  "revenueCatId": "virtual_wine",
  "yocoId": "virtual_wine",
  "source": "yoco"
}
```

## Troubleshooting

### Issue: API returns 401
**Solution**: Make sure you're logged in as admin

### Issue: API returns 403
**Solution**: Your user account needs admin role

### Issue: Migration shows 0 packages
**Solution**: Check that packages exist in database

---

**Quick Start**: Use Option 1 (API endpoint) - it's the fastest and safest way!

