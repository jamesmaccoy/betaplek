import { NextRequest } from 'next/server'
import type { User } from '../payload-types'

export async function getUserFromRequest(req: NextRequest): Promise<User | null> {
  try {
    const token = req.cookies.get('payload-token')?.value
    
    if (!token) {
      return null
    }

    // Parse JWT token to get user ID
    const [header, payload, signature] = token.split('.')
    if (!payload) {
      return null
    }

    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString())
    const userId = decodedPayload.id

    if (!userId) {
      return null
    }

    // Fetch user from API
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/users/${userId}`, {
      headers: {
        Authorization: `JWT ${token}`,
      },
    })

    if (!response.ok) {
      return null
    }

    const user = await response.json()
    return user as User
  } catch (error) {
    console.error('Error getting user from request:', error)
    return null
  }
}

