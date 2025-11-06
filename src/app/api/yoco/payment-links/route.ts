import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { productId, amount, description } = await req.json()

    const yocoSecretKey = process.env.YOCO_SECRET_KEY
    
    if (!yocoSecretKey) {
      console.warn('Yoco API key not configured, returning mock payment link')
      return NextResponse.json({
        url: 'https://example.com/mock-payment',
        id: 'mock-payment-id'
      })
    }

    // Call Yoco API to create payment link
    const response = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${yocoSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'ZAR',
        cancelUrl: `${process.env.NEXT_PUBLIC_URL}/subscribe?cancelled=true`,
        successUrl: `${process.env.NEXT_PUBLIC_URL}/bookings?success=true`,
        failureUrl: `${process.env.NEXT_PUBLIC_URL}/subscribe?failed=true`,
        metadata: {
          productId,
          description
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Yoco API error:', errorData)
      throw new Error(`Yoco API error: ${response.status}`)
    }

    const data = await response.json()
    
    return NextResponse.json({
      url: data.redirectUrl || data.url,
      id: data.id
    })
  } catch (error) {
    console.error('Error creating payment link:', error)
    return NextResponse.json(
      { error: 'Failed to create payment link' },
      { status: 500 }
    )
  }
}

