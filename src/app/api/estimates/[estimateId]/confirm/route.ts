import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function POST(req: NextRequest, { params }: { params: { estimateId: string } }) {
  try {
    const estimateId = params.estimateId
    const body = await req.json()

    const payload = await getPayload({ config: configPromise })

    // Get the current estimate
    const estimate = await payload.findByID({
      collection: 'estimates',
      id: estimateId,
    })

    if (!estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    // Update the estimate with confirmation data
    const updatedEstimate = await payload.update({
      collection: 'estimates',
      id: estimateId,
      data: {
        paymentStatus: 'paid',
        packageType: body.packageType,
        total: body.baseRate,
      },
    })

    return NextResponse.json(updatedEstimate)
  } catch (error) {
    console.error('Error confirming estimate:', error)
    return NextResponse.json(
      { error: 'Failed to confirm estimate' },
      { status: 500 }
    )
  }
} 