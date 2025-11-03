import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/utilities/getUserFromRequest'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json({ hasActiveSubscription: false }, { status: 200 })
    }

    // For Yoco integration, check subscription status from your database
    // This is a simplified version - you may want to check against Yoco API
    // or maintain subscription status in your user/subscription records
    
    // Mock implementation - replace with actual Yoco subscription check
    const hasActiveSubscription = false // TODO: Implement actual Yoco subscription check
    const activeEntitlements: string[] = [] // TODO: Get from Yoco or database

    const response = NextResponse.json({ 
      hasActiveSubscription,
      customerId: user.id,
      activeEntitlements: activeEntitlements,
    })

    return response
  } catch (error) {
    console.error('Error checking subscription:', error)
    return NextResponse.json({ 
      hasActiveSubscription: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
