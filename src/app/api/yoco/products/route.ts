import { NextResponse } from 'next/server'
import { yocoService } from '@/lib/yocoService'

export async function GET() {
  try {
    const products = await yocoService.getProducts()
    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching Yoco products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

