import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config: configPromise })
    const { id } = await params
    
    const packageDoc = await payload.findByID({
      collection: 'packages',
      id,
      depth: 1,
    })
    
    return NextResponse.json(packageDoc)
  } catch (error) {
    console.error('Error fetching package:', error)
    return NextResponse.json(
      { error: 'Failed to fetch package' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config: configPromise })
    
    // Try to get the user from the request
    let user = null
    try {
      const authResult = await payload.auth({ headers: request.headers })
      user = authResult.user
    } catch (authError) {
      console.log('Authentication failed, trying admin context:', authError)
      // If authentication fails, this might be an admin request
      // The admin interface handles authentication differently
    }
    
    // For admin requests, we might not have a user object, but the request is still valid
    // The admin interface has its own authentication mechanism
    
    const { id } = await params
    let body: any = {}
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try {
        body = await request.json()
      } catch (err) {
        console.warn('Could not parse JSON body:', err)
        body = {}
      }
    } else {
      // Not JSON, ignore or handle as empty
      body = {}
    }
    
    console.log('PATCH request for package:', { id, body, user: user?.id || 'admin' })
    
    // Validate the package exists first
    let existingPackage
    try {
      existingPackage = await payload.findByID({
        collection: 'packages',
        id,
      })
      console.log('Existing package found:', { 
        id: existingPackage.id, 
        name: existingPackage.name,
        currentMultiplier: existingPackage.multiplier,
        currentCategory: existingPackage.category 
      })
    } catch (error) {
      console.error('Package not found:', error)
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }
    
    // Validate the request body
    const cleanData: any = {}
    
    // Handle isEnabled field
    if (body.isEnabled !== undefined) {
      cleanData.isEnabled = Boolean(body.isEnabled)
      console.log('Setting isEnabled to:', cleanData.isEnabled)
    }
    
    // Handle name field
    if (body.name !== undefined) {
      cleanData.name = String(body.name || '').trim()
      if (!cleanData.name) {
        return NextResponse.json(
          { error: 'Package name cannot be empty' },
          { status: 400 }
        )
      }
      console.log('Setting name to:', cleanData.name)
    }
    
    // Handle description field
    if (body.description !== undefined) {
      cleanData.description = body.description ? String(body.description).trim() : null
      console.log('Setting description to:', cleanData.description)
    }
    
    // Handle multiplier field
    if (body.multiplier !== undefined) {
      const multiplier = Number(body.multiplier)
      if (isNaN(multiplier) || multiplier < 0.1 || multiplier > 3.0) {
        return NextResponse.json(
          { error: 'Multiplier must be between 0.1 and 3.0' },
          { status: 400 }
        )
      }
      cleanData.multiplier = multiplier
      console.log('Setting multiplier to:', cleanData.multiplier)
    }
    
    // Handle other fields
    if (body.category !== undefined) {
      cleanData.category = body.category
      console.log('Setting category to:', cleanData.category)
    }
    
    if (body.minNights !== undefined) {
      const minNights = Number(body.minNights)
      if (isNaN(minNights) || minNights < 1) {
        return NextResponse.json(
          { error: 'Min nights must be at least 1' },
          { status: 400 }
        )
      }
      cleanData.minNights = minNights
      console.log('Setting minNights to:', cleanData.minNights)
    }
    
    if (body.maxNights !== undefined) {
      const maxNights = Number(body.maxNights)
      if (isNaN(maxNights) || maxNights < 1) {
        return NextResponse.json(
          { error: 'Max nights must be at least 1' },
          { status: 400 }
        )
      }
      cleanData.maxNights = maxNights
      console.log('Setting maxNights to:', cleanData.maxNights)
    }
    
    if (body.revenueCatId !== undefined) {
      cleanData.revenueCatId = body.revenueCatId ? String(body.revenueCatId).trim() : null
      console.log('Setting revenueCatId to:', cleanData.revenueCatId)
    }
    
    if (body.baseRate !== undefined) {
      if (body.baseRate === null || body.baseRate === '') {
        cleanData.baseRate = null
      } else {
        const baseRate = Number(body.baseRate)
        if (isNaN(baseRate) || baseRate < 0) {
          return NextResponse.json(
            { error: 'Base rate must be a positive number' },
            { status: 400 }
          )
        }
        cleanData.baseRate = baseRate
      }
      console.log('Setting baseRate to:', cleanData.baseRate)
    }
    
    console.log('Clean data for update:', cleanData)
    console.log('Number of fields to update:', Object.keys(cleanData).length)
    
    if (Object.keys(cleanData).length === 0) {
      console.warn('No valid fields to update')
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }
    
    // For admin requests, we might not have a user object
    const updateOptions: any = {
      collection: 'packages',
      id,
      data: cleanData,
    }
    
    if (user) {
      updateOptions.user = user
    }
    
    console.log('Calling payload.update with options:', {
      collection: updateOptions.collection,
      id: updateOptions.id,
      data: updateOptions.data,
      hasUser: !!updateOptions.user
    })
    
    const packageDoc = await payload.update(updateOptions)
    
    console.log('Package updated successfully with ID:', id)
    console.log('Update operation completed at:', new Date().toISOString())
    
    // Verify the update by refetching the document
    const verifyDoc = await payload.findByID({
      collection: 'packages',
      id,
    })
    
    console.log('Verification fetch shows package exists with name:', verifyDoc.name)
    
    return NextResponse.json(packageDoc)
  } catch (error) {
    console.error('Error updating package:', error)
    return NextResponse.json(
      { error: 'Failed to update package', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config: configPromise })
    
    // Try to get the user from the request
    let user = null
    try {
      const authResult = await payload.auth({ headers: request.headers })
      user = authResult.user
    } catch (authError) {
      console.log('Authentication failed, trying admin context:', authError)
      // If authentication fails, this might be an admin request
    }
    
    const { id } = await params
    
    // For admin requests, we might not have a user object
    const deleteOptions: any = {
      collection: 'packages',
      id,
    }
    
    if (user) {
      deleteOptions.user = user
    }
    
    const deletedPackage = await payload.delete(deleteOptions)
    
    return NextResponse.json(deletedPackage)
  } catch (error) {
    console.error('Error deleting package:', error)
    return NextResponse.json(
      { error: 'Failed to delete package' },
      { status: 500 }
    )
  }
} 