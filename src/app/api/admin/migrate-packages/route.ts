import { NextRequest, NextResponse } from 'next/server'
import { migratePackagesToYoco } from '@/scripts/migrate-packages'
import { getUserFromRequest } from '@/utilities/getUserFromRequest'

export async function POST(req: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const user = await getUserFromRequest(req)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user has admin role
    const roles = user.roles || []
    if (!roles.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
        { status: 403 }
      )
    }

    // Run migration
    console.log('🚀 Starting package migration via API...')
    const result = await migratePackagesToYoco()

    return NextResponse.json({
      success: true,
      message: 'Package migration completed successfully',
      ...result
    })
  } catch (error) {
    console.error('Migration API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

