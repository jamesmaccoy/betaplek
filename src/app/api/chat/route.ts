import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getMeUser } from '@/utilities/getMeUser'

// Use the GEMINI_API_KEY environment variable defined in your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Utility function to extract dates from natural language text
function extractDatesFromMessage(message: string): { fromDate?: string, toDate?: string, duration?: number } | null {
  const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g
  const monthDayRegex = /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/gi
  const durationRegex = /(\d+)\s*(night|nights|day|days)/gi
  
  const dates = message.match(dateRegex) || []
  const monthDayMatches = message.match(monthDayRegex) || []
  const durationMatch = message.match(durationRegex)
  
  let extractedData: { fromDate?: string, toDate?: string, duration?: number } = {}
  
  // Extract duration if mentioned
  if (durationMatch) {
    const durationStr = durationMatch[0]
    const durationNum = parseInt(durationStr.match(/\d+/)?.[0] || '0')
    if (durationNum > 0) {
      extractedData.duration = durationNum
    }
  }
  
  // Try to parse explicit dates
  if (dates.length >= 2) {
    try {
      const firstDate = dates[0]
      const secondDate = dates[1]
      if (firstDate && secondDate) {
        const fromDate = new Date(firstDate)
        const toDate = new Date(secondDate)
        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
          extractedData.fromDate = fromDate.toISOString()
          extractedData.toDate = toDate.toISOString()
        }
      }
    } catch (error) {
      console.log('Error parsing dates:', error)
    }
  } else if (dates.length === 1 && extractedData.duration) {
    // If we have one date and a duration, calculate the end date
    try {
      const firstDate = dates[0]
      if (firstDate) {
        const fromDate = new Date(firstDate)
        if (!isNaN(fromDate.getTime())) {
          const toDate = new Date(fromDate.getTime() + extractedData.duration * 24 * 60 * 60 * 1000)
          extractedData.fromDate = fromDate.toISOString()
          extractedData.toDate = toDate.toISOString()
        }
      }
    } catch (error) {
      console.log('Error calculating end date:', error)
    }
  }
  
  return Object.keys(extractedData).length > 0 ? extractedData : null
}

export async function POST(req: Request) {
  try {
    const { message, bookingContext } = await req.json()
    const { user } = await getMeUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract dates from the user message
    const extractedDates = extractDatesFromMessage(message)
    console.log('Extracted dates from message:', extractedDates)

    // Fetch user's bookings, estimates, and available packages
    const payload = await getPayload({ config: configPromise })

    const [bookings, estimates, packages] = await Promise.all([
      payload.find({
        collection: 'bookings',
        where: {
          customer: { equals: user.id },
        },
        depth: 2,
        sort: '-fromDate',
      }),
      // Only get the latest estimate for the current post to reduce context noise
      bookingContext?.postId ? payload.find({
        collection: 'estimates',
        where: {
          and: [
            { customer: { equals: user.id } },
            { post: { equals: bookingContext.postId } }
          ]
        },
        depth: 2,
        sort: '-createdAt',
        limit: 1, // Only get the most recent estimate for this post
      }) : payload.find({
        collection: 'estimates',
        where: {
          customer: { equals: user.id },
        },
        depth: 2,
        sort: '-createdAt',
        limit: 1, // Limit to just the latest estimate
      }),
      // Fetch all packages to provide recommendations and enabled status
      payload.find({
        collection: 'packages',
        depth: 2,
        sort: 'name',
        limit: 100, // Get a good sample of packages
      }),
    ])

    // Get post details if context provided
    let postDetails = null
    if (bookingContext?.postId) {
      try {
        const post = await payload.findByID({
          collection: 'posts',
          id: bookingContext.postId,
          depth: 1
        })
        postDetails = post
      } catch (error) {
        console.error('Error fetching post details:', error)
      }
    }

    // Format bookings and estimates data for the AI
    const bookingsInfo = bookings.docs.map((booking) => ({
      id: booking.id,
      title: booking.title,
      fromDate: new Date(booking.fromDate).toLocaleDateString(),
      toDate: new Date(booking.toDate).toLocaleDateString(),
      status: booking.paymentStatus || 'unknown',
    }))

    const estimatesInfo = estimates.docs.map((estimate) => ({
      id: estimate.id,
      title:
        typeof estimate.post === 'string' ? estimate.title : estimate.post?.title || estimate.title,
      total: estimate.total,
      fromDate: new Date(estimate.fromDate).toLocaleDateString(),
      toDate: new Date(estimate.toDate).toLocaleDateString(),
      status: estimate.paymentStatus,
      packageName: estimate.packageType || '',
      link: `${process.env.NEXT_PUBLIC_URL}/estimate/${estimate.id}`,
    }))

    // Format packages data for the AI
    const packagesInfo = packages.docs.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      isEnabled: pkg.isEnabled,
      category: pkg.category,
      multiplier: pkg.multiplier,
      minNights: pkg.minNights,
      maxNights: pkg.maxNights,
      baseRate: pkg.baseRate,
      revenueCatId: pkg.revenueCatId,
      features: pkg.features?.map((f: any) => typeof f === 'string' ? f : f.feature).filter(Boolean) || [],
      postTitle: typeof pkg.post === 'object' && pkg.post ? pkg.post.title : 'Unknown Property',
      durationText: pkg.minNights === pkg.maxNights 
        ? `${pkg.minNights} ${pkg.minNights === 1 ? 'night' : 'nights'}`
        : `${pkg.minNights}-${pkg.maxNights} nights`
    }))

    // Create a context with the user's data
    const userContext = {
      bookings: bookingsInfo,
      estimates: estimatesInfo,
      packages: packagesInfo,
      user: {
        id: user.id,
        email: user.email,
      },
      // Add booking context if provided
      currentBooking: bookingContext ? {
        postId: bookingContext.postId,
        postTitle: bookingContext.postTitle || postDetails?.title || 'this property',
        postDescription: bookingContext.postDescription || postDetails?.meta?.description || '',
        baseRate: bookingContext.baseRate || 150,
        duration: bookingContext.duration || 1,
        availablePackages: bookingContext.packages || 0,
        customerEntitlement: bookingContext.customerEntitlement || 'none',
        selectedPackage: bookingContext.selectedPackage || null,
        fromDate: bookingContext.fromDate || null,
        toDate: bookingContext.toDate || null,
        postDetails: postDetails ? {
          title: postDetails.title,
          description: postDetails.meta?.description || ''
        } : null
      } : null
    }

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Create enhanced prompt for booking assistant
    const systemPrompt = bookingContext ? `You are a helpful AI booking assistant for ${userContext.currentBooking?.postTitle}. 

CURRENT BOOKING CONTEXT:
- Property: ${userContext.currentBooking?.postTitle}
- Base Rate: R${userContext.currentBooking?.baseRate}/night
- Customer Entitlement: ${userContext.currentBooking?.customerEntitlement}
- Available Packages: ${userContext.currentBooking?.availablePackages}
${userContext.currentBooking?.selectedPackage ? `- Selected Package: ${userContext.currentBooking.selectedPackage}` : ''}
${userContext.currentBooking?.fromDate && userContext.currentBooking?.toDate ? 
  `- Selected Dates: ${new Date(userContext.currentBooking.fromDate).toLocaleDateString()} to ${new Date(userContext.currentBooking.toDate).toLocaleDateString()} (${userContext.currentBooking.duration} ${userContext.currentBooking.duration === 1 ? 'night' : 'nights'})` : 
  '- Dates: Not yet selected'
}
${userContext.currentBooking?.postDetails?.description ? `- Description: ${userContext.currentBooking.postDetails.description}` : ''}

${userContext.estimates.length > 0 && userContext.estimates[0] ? 
  `LATEST ESTIMATE: ${userContext.estimates[0].fromDate} to ${userContext.estimates[0].toDate} (${userContext.estimates[0].packageName || 'No package'})` : 
  ''
}

AVAILABLE PACKAGES FOR THIS PROPERTY:
${packagesInfo.filter(pkg => pkg.isEnabled).map(pkg => 
  `- ${pkg.name} (${pkg.durationText}): ${pkg.description} - Features: ${pkg.features.join(', ')}`
).join('\n')}

INSTRUCTIONS:
1. Be conversational and helpful
2. When user mentions specific dates, acknowledge them and use them for recommendations
3. If dates are already selected in the UI, acknowledge them and focus on package recommendations  
4. If no dates are selected, guide users to select dates first
5. Recommend packages based on duration and customer needs
6. Explain package benefits clearly
7. For pro-only packages, mention they require a pro subscription if user isn't pro
8. Help with date selection and duration planning when needed
9. Provide pricing estimates when relevant
10. Guide users through the booking process step by step
11. Keep responses concise but informative (2-3 sentences max)
12. Use emojis sparingly for a friendly tone
13. Don't repeat old date information - focus on current conversation

Respond to the user's message naturally, as if you're a knowledgeable booking assistant who knows this property well.` 
    : 
    `You are a helpful AI assistant for a booking platform. You have access to the user's booking history and can help with general questions about properties, packages, and bookings.

USER'S DATA:
- Total Bookings: ${userContext.bookings.length}
- Recent Estimates: ${userContext.estimates.length}
- Available Packages: ${packagesInfo.length}

Be helpful, concise, and guide users to make great booking decisions.`

    // Create a chat context with the user's data
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }],
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I\'m ready to help with booking assistance.' }],
        },
      ],
    })

    // Generate response
    const result = await chat.sendMessage(message)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ 
      message: text,
      extractedDates: extractedDates || undefined
    })
  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json({ error: 'Failed to process your request' }, { status: 500 })
  }
}