import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { revenueCatService } from '@/lib/revenueCatService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const payload = await getPayload({ config: configPromise })
    const { postId } = await params
    
    // Get the post data to access packageSettings for custom names
    let postData = null
    try {
      postData = await payload.findByID({
        collection: 'posts',
        id: postId,
        depth: 1,
      })
    } catch (error) {
      // Don't log the full error to reduce noise, just continue without custom names
      console.log('Failed to fetch post data for custom names, continuing without custom names')
    }

    // Get packages from database
    const dbPackages = await payload.find({
      collection: 'packages',
      where: {
        post: { equals: postId },
        isEnabled: { equals: true }
      },
      depth: 1,
    })

    // Get RevenueCat products
    const revenueCatProducts = await revenueCatService.getProducts()
    
    // Helper function to get custom name from packageSettings
    const getCustomName = (packageId: string) => {
      if (!postData?.packageSettings || !Array.isArray(postData.packageSettings)) {
        return null
      }
      const packageSetting = postData.packageSettings.find((setting: any) => {
        const pkgId = typeof setting.package === 'object' ? setting.package.id : setting.package
        return pkgId === packageId
      })
      return packageSetting?.customName || null
    }
    
    // Helper function to check if package is enabled for this post
    const isPackageEnabledForPost = (packageId: string) => {
      if (!postData?.packageSettings || !Array.isArray(postData.packageSettings)) {
        return true // Default to enabled if no settings exist
      }
      const packageSetting = postData.packageSettings.find((setting: any) => {
        const pkgId = typeof setting.package === 'object' ? setting.package.id : setting.package
        return pkgId === packageId
      })
      return packageSetting?.enabled !== false // Default to true if not explicitly set to false
    }
    
    // Combine database packages with RevenueCat products
    const allPackages = [
      ...dbPackages.docs.map(pkg => {
        const customName = getCustomName(pkg.id)
        return {
          id: pkg.id,
          name: customName || pkg.name, // Use custom name if available
          originalName: pkg.name, // Keep original name for reference
          description: pkg.description,
          multiplier: pkg.multiplier,
          category: pkg.category,
          minNights: pkg.minNights,
          maxNights: pkg.maxNights,
          revenueCatId: pkg.revenueCatId,
          baseRate: pkg.baseRate,
          isEnabled: pkg.isEnabled && isPackageEnabledForPost(pkg.id),
          features: pkg.features?.map((f: any) => f.feature) || [],
          source: 'database',
          hasCustomName: !!customName
        }
      }),
      ...revenueCatProducts.map(product => {
        const customName = getCustomName(product.id)
        return {
          id: product.id,
          name: customName || product.title, // Use custom name if available
          originalName: product.title, // Keep original name for reference
          description: product.description,
          multiplier: 1, // Default multiplier for RevenueCat products
          category: product.category,
          minNights: product.period === 'hour' ? 1 : product.periodCount,
          maxNights: product.period === 'hour' ? 1 : product.periodCount,
          revenueCatId: product.id,
          baseRate: product.price,
          isEnabled: product.isEnabled && isPackageEnabledForPost(product.id),
          features: product.features,
          source: 'revenuecat',
          hasCustomName: !!customName
        }
      })
    ].filter(pkg => pkg.isEnabled) // Only include enabled packages

    const response = NextResponse.json({
      packages: allPackages,
      total: allPackages.length
    })

    // Add caching headers to prevent excessive API calls
    response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300') // Cache for 1 minute client-side, 5 minutes CDN
    response.headers.set('ETag', `packages-${postId}-${Date.now()}`)

    return response
  } catch (error) {
    console.error('Error fetching packages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 