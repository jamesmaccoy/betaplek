import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { revenueCatService } from '@/lib/revenueCatService'
import type { Estimate } from '@/payload-types'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { postId, fromDate, toDate, guests, title, packageType, total } = body

    console.log('Looking for package:', { postId, packageType })
    let pkg: any = null
    let multiplier = 1
    let baseRate = 150
    let customName: string | null = null // Store custom name from package settings

    // Get the post data to access packageSettings for custom names
    let postData: any = null
    try {
      postData = await payload.findByID({
        collection: 'posts',
        id: postId,
        depth: 1,
      })
    } catch (error) {
      console.log('Failed to fetch post data:', error)
    }

    // First, get all available packages for this post (including RevenueCat)
    try {
      // Get database packages
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
      
      // Combine database packages with RevenueCat products
      const allPackages = [
        ...dbPackages.docs.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          description: pkg.description,
          multiplier: pkg.multiplier,
          category: pkg.category,
          minNights: pkg.minNights,
          maxNights: pkg.maxNights,
          revenueCatId: pkg.revenueCatId,
          baseRate: pkg.baseRate,
          isEnabled: pkg.isEnabled,
          features: pkg.features?.map((f: any) => f.feature) || [],
          source: 'database'
        })),
        ...revenueCatProducts.map(product => ({
          id: product.id,
          name: product.title,
          description: product.description,
          multiplier: 1, // Default multiplier for RevenueCat products
          category: product.category,
          minNights: product.period === 'hour' ? 1 : product.periodCount,
          maxNights: product.period === 'hour' ? 1 : product.periodCount,
          revenueCatId: product.id,
          baseRate: product.price,
          isEnabled: product.isEnabled,
          features: product.features,
          source: 'revenuecat'
        }))
      ]

      // Find the package by ID (works for both database and RevenueCat packages)
      pkg = allPackages.find((p: any) => p.id === packageType)
      
      if (pkg) {
        multiplier = typeof pkg.multiplier === 'number' ? pkg.multiplier : 1
        baseRate = typeof pkg.baseRate === 'number' ? pkg.baseRate : 150
        
        // Check for custom name in packageSettings
        if (postData?.packageSettings && Array.isArray(postData.packageSettings)) {
          const packageSetting = postData.packageSettings.find((setting: any) => {
            const pkgId = typeof setting.package === 'object' ? setting.package.id : setting.package
            return pkgId === pkg.id
          })
          if (packageSetting?.customName) {
            customName = packageSetting.customName
            console.log('Found custom name for package:', customName)
          }
        }
        
        console.log('Found package in combined list:', customName || pkg.name)
      }
    } catch (error) {
      console.log('Failed to fetch combined packages, falling back to individual lookups:', error)
    }

    // If not found, try database lookup by ID
    if (!pkg) {
      try {
        const packageResult = await payload.findByID({
          collection: 'packages',
          id: packageType,
        })
        
        if (packageResult && packageResult.post === postId) {
          pkg = packageResult
          if (pkg) {
            multiplier = typeof pkg.multiplier === 'number' ? pkg.multiplier : 1
            baseRate = typeof pkg.baseRate === 'number' ? pkg.baseRate : 150
            
            // Check for custom name in packageSettings
            if (postData?.packageSettings && Array.isArray(postData.packageSettings)) {
              const packageSetting = postData.packageSettings.find((setting: any) => {
                const pkgId = typeof setting.package === 'object' ? setting.package.id : setting.package
                return pkgId === pkg.id
              })
              if (packageSetting?.customName) {
                customName = packageSetting.customName
                console.log('Found custom name for package:', customName)
              }
            }
            
            console.log('Found package by ID in database:', customName || pkg.name)
          }
        }
      } catch (error) {
        console.log('Package not found by ID in database')
      }
    }

    // If not found by ID, try to find by name in database
    if (!pkg) {
      const packageResult = await payload.find({
        collection: 'packages',
        where: {
          post: { equals: postId },
          name: { equals: packageType },
          isEnabled: { equals: true }
        },
        limit: 1,
      })
      
      if (packageResult.docs.length > 0) {
        pkg = packageResult.docs[0]
        if (pkg) {
          multiplier = typeof pkg.multiplier === 'number' ? pkg.multiplier : 1
          baseRate = typeof pkg.baseRate === 'number' ? pkg.baseRate : 150
          
          // Check for custom name in packageSettings
          if (postData?.packageSettings && Array.isArray(postData.packageSettings)) {
            const packageSetting = postData.packageSettings.find((setting: any) => {
              const pkgId = typeof setting.package === 'object' ? setting.package.id : setting.package
              return pkgId === pkg.id
            })
            if (packageSetting?.customName) {
              customName = packageSetting.customName
              console.log('Found custom name for package:', customName)
            }
          }
          
          console.log('Found package by name in database:', customName || pkg.name)
        }
      }
    }

    // If still not found, check RevenueCat products directly
    if (!pkg) {
      try {
        const revenueCatProducts = await revenueCatService.getProducts()
        const revenueCatProduct = revenueCatProducts.find(product => product.id === packageType)
        
        if (revenueCatProduct) {
          pkg = {
            id: revenueCatProduct.id,
            name: revenueCatProduct.title,
            description: revenueCatProduct.description,
            multiplier: 1, // Default multiplier for RevenueCat products
            baseRate: revenueCatProduct.price,
            category: revenueCatProduct.category,
            minNights: revenueCatProduct.period === 'hour' ? 1 : revenueCatProduct.periodCount,
            maxNights: revenueCatProduct.period === 'hour' ? 1 : revenueCatProduct.periodCount,
            revenueCatId: revenueCatProduct.id,
            isEnabled: revenueCatProduct.isEnabled,
            features: revenueCatProduct.features,
            source: 'revenuecat'
          }
          multiplier = pkg.multiplier
          baseRate = pkg.baseRate
          
          // Check for custom name in packageSettings for RevenueCat products too
          if (postData?.packageSettings && Array.isArray(postData.packageSettings)) {
            const packageSetting = postData.packageSettings.find((setting: any) => {
              const pkgId = typeof setting.package === 'object' ? setting.package.id : setting.package
              return pkgId === pkg.id
            })
            if (packageSetting?.customName) {
              customName = packageSetting.customName
              console.log('Found custom name for RevenueCat package:', customName)
            }
          }
          
          console.log('Found RevenueCat product:', customName || pkg.name)
        }
      } catch (error) {
        console.error('Error fetching RevenueCat products:', error)
      }
    }

    if (!pkg) {
      console.error('Package not found:', { packageType, postId })
      return NextResponse.json({ 
        error: 'Package not found', 
        details: `Package ${packageType} not found in database or RevenueCat products for post ${postId}` 
      }, { status: 400 })
    }

    const duration = fromDate && toDate
      ? Math.max(1, Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 1
    const calculatedTotal = total !== undefined ? Number(total) : baseRate * duration * multiplier

    // Use custom name if available, otherwise fall back to package name
    const displayName = customName || pkg.name || pkg.id

    // Check for existing estimate
    const existing = await payload.find({
      collection: 'estimates',
      where: {
        post: { equals: postId },
        customer: { equals: user.id },
        fromDate: { equals: fromDate },
        toDate: { equals: toDate }
      },
      limit: 1,
    })

    let estimate: Estimate
    if (existing.docs.length && existing.docs[0]) {
      // Update
      estimate = await payload.update({
        collection: 'estimates',
        id: existing.docs[0].id,
        data: {
          total: calculatedTotal,
          guests,
          fromDate,
          toDate,
          customer: user.id,
          packageType: displayName, // Use custom name if available
          selectedPackage: {
            package: pkg.id,
            customName: displayName, // Store the display name
            enabled: true
          }
        },
        user: user.id
      })
    } else {
      // Create
      estimate = await payload.create({
      collection: 'estimates',
      data: {
          title: title || `Estimate for ${postId}`,
          post: postId,
        fromDate,
        toDate,
        guests,
          total: calculatedTotal,
          customer: user.id,
        packageType: displayName, // Use custom name if available
        selectedPackage: {
          package: pkg.id,
          customName: displayName, // Store the display name
          enabled: true
        }
      },
        user: user.id
      })
    }

    return NextResponse.json(estimate, { status: existing.docs.length ? 200 : 201 })
  } catch (err) {
    console.error('Estimate creation error:', err)
    return NextResponse.json({ error: (err instanceof Error ? err.message : 'Unknown error') }, { status: 500 })
  }
}