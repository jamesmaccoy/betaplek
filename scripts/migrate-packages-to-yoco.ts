import payload from 'payload'
import config from '../src/payload.config.js'

async function migratePackages() {
  console.log('🚀 Starting package migration to Yoco...\n')

  try {
    // Initialize Payload
    await payload.init({
      config,
      secret: process.env.PAYLOAD_SECRET!,
      local: true,
    })

    console.log('✅ Payload initialized\n')

    // Fetch all packages
    const packages = await payload.find({
      collection: 'packages',
      limit: 1000,
    })

    console.log(`📦 Found ${packages.docs.length} packages to process\n`)

    let migratedCount = 0
    let skippedWithYocoId = 0
    let skippedNoRevenueCatId = 0
    let errorCount = 0

    // Update each package
    for (const pkg of packages.docs) {
      try {
        if (pkg.yocoId) {
          console.log(`⏭️  Skipped (already has yocoId): ${pkg.name}`)
          skippedWithYocoId++
          continue
        }

        if (!pkg.revenueCatId) {
          console.log(`⚠️  Skipped (no revenueCatId): ${pkg.name}`)
          skippedNoRevenueCatId++
          continue
        }

        // Migrate the package
        await payload.update({
          collection: 'packages',
          id: pkg.id,
          data: {
            yocoId: pkg.revenueCatId, // Copy revenueCatId to yocoId
            source: 'yoco',
          },
        })

        console.log(`✅ Migrated: ${pkg.name} (revenueCatId: ${pkg.revenueCatId} → yocoId: ${pkg.revenueCatId})`)
        migratedCount++
      } catch (error) {
        console.error(`❌ Error migrating package ${pkg.name}:`, error)
        errorCount++
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 MIGRATION SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total packages:           ${packages.docs.length}`)
    console.log(`✅ Successfully migrated:  ${migratedCount}`)
    console.log(`⏭️  Already migrated:      ${skippedWithYocoId}`)
    console.log(`⚠️  Skipped (no ID):       ${skippedNoRevenueCatId}`)
    console.log(`❌ Errors:                 ${errorCount}`)
    console.log('='.repeat(60))

    if (errorCount > 0) {
      console.log('\n⚠️  Migration completed with errors. Please review the logs above.')
      process.exit(1)
    } else {
      console.log('\n🎉 Migration completed successfully!')
      process.exit(0)
    }
  } catch (error) {
    console.error('\n💥 Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migratePackages()

