import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/utilities/getUserFromRequest'

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Mock customer info for now
    // In production, you would fetch this from your database
    // based on Yoco payment records
    const customerInfo = {
      id: user.id,
      entitlements: {},
      activeSubscriptions: [],
      allPurchasedProductIdentifiers: [],
    }

    return NextResponse.json(customerInfo)
  } catch (error) {
    console.error('Error fetching customer info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer info' },
      { status: 500 }
    )
  }
}

