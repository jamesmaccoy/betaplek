import { NextRequest, NextResponse } from 'next/server'
import payload from 'payload'

export async function POST(request: NextRequest) {
  try {
    const { targetRole } = await request.json()

    // Get user from auth token
    const authCookie = request.cookies.get('payload-token')
    if (!authCookie?.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authCookie.value
    const [header, payloadData, signature] = token.split('.')
    if (!payloadData) throw new Error('Invalid token: missing payload')
    const decodedPayload = JSON.parse(Buffer.from(payloadData, 'base64').toString())
    const userId = decodedPayload.id

    // Get user from database
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validate target role
    const validRoles = ['host', 'admin']
    if (!validRoles.includes(targetRole)) {
      return NextResponse.json({ 
        error: 'Invalid target role. Must be one of: ' + validRoles.join(', '),
        currentRoles: user.role 
      })
    }

    // Check if user has an active subscription with Yoco
    try {
      // TODO: Implement Yoco subscription check
      // For now, we'll allow upgrades (you can add proper check later)
      const hasActiveSubscription = true // TODO: Check against Yoco API or database
      const activeEntitlements: string[] = [] // TODO: Get from Yoco

      if (!hasActiveSubscription) {
        return NextResponse.json({ 
          error: 'Active host subscription required to upgrade role',
          hasSubscription: false,
          activeEntitlements: activeEntitlements
        }, { status: 403 })
      }

      // Update user role
      const currentRoles = user.role || []
      let newRoles = [...currentRoles]

      // Remove guest role if present and add target role
      if (newRoles.includes('guest')) {
        newRoles = newRoles.filter(role => role !== 'guest')
      }
      
      if (!newRoles.includes(targetRole)) {
        newRoles.push(targetRole)
      }

      // Update the user in the database
      const updatedUser = await payload.update({
        collection: 'users',
        id: userId,
        data: {
          role: newRoles,
        },
      })

      return NextResponse.json({
        success: true,
        message: `Successfully upgraded to ${targetRole} role`,
        previousRoles: user.role,
        newRoles: updatedUser.role,
        hasActiveSubscription: true,
        activeEntitlements: activeEntitlements
      })

    } catch (subscriptionError) {
      console.error('Subscription check error:', subscriptionError)
      return NextResponse.json({ 
        error: 'Failed to verify subscription status',
        details: subscriptionError instanceof Error ? subscriptionError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error upgrading role:', error)
    return NextResponse.json({ 
      error: 'Failed to upgrade role',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 