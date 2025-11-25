import { Endpoint } from 'payload'
import { addDays, format, differenceInDays } from 'date-fns'

export const suggestDates: Endpoint = {
  method: 'get',
  path: '/suggest-dates',
  handler: async (req) => {
    const { slug, postId, startDate, endDate, duration } = req.query

    if ((!slug && !postId) || !startDate || !endDate) {
      return Response.json(
        {
          message: 'Post slug/ID and date range (startDate, endDate) are required',
        },
        { status: 400 },
      )
    }

    try {
      let resolvedPostId = postId

      // If slug is provided, find the post by slug
      if (slug && !postId) {
        const posts = await req.payload.find({
          collection: 'posts',
          where: {
            slug: {
              equals: slug,
            },
          },
          select: {
            slug: true,
          },
          limit: 1,
        })

        if (!posts.docs.length) {
          return Response.json({ message: 'Post not found' }, { status: 404 })
        }

        resolvedPostId = posts.docs[0]?.id
      }

      // Parse the requested date range
      const requestStart = new Date(startDate as string)
      const requestEnd = new Date(endDate as string)

      if (isNaN(requestStart.getTime()) || isNaN(requestEnd.getTime())) {
        return Response.json({ message: 'Invalid date format' }, { status: 400 })
      }

      // Calculate duration if not provided
      const calculatedDuration = duration
        ? parseInt(duration as string)
        : differenceInDays(requestEnd, requestStart)

      // Get all bookings for this post
      const bookings = await req.payload.find({
        collection: 'bookings',
        where: {
          post: { equals: resolvedPostId },
        },
        limit: 1000,
        select: {
          fromDate: true,
          toDate: true,
        },
        depth: 0,
      })

      // Create a set of unavailable dates
      const unavailableDates = new Set<string>()
      bookings.docs.forEach((booking) => {
        const from = new Date(booking.fromDate)
        const to = new Date(booking.toDate)

        let current = new Date(from)
        while (current < to) {
          unavailableDates.add(format(current, 'yyyy-MM-dd'))
          current = addDays(current, 1)
        }
      })

      // Function to check if a date range is available
      const isRangeAvailable = (start: Date, nights: number): boolean => {
        for (let i = 0; i < nights; i++) {
          const checkDate = addDays(start, i)
          if (unavailableDates.has(format(checkDate, 'yyyy-MM-dd'))) {
            return false
          }
        }
        return true
      }

      // Find alternative dates
      const suggestions: Array<{
        startDate: string
        endDate: string
        nights: number
        daysFromOriginal: number
        direction: 'before' | 'after' | 'nearby'
      }> = []

      const maxDaysToSearch = 60 // Search up to 2 months before/after
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Search for alternative dates (prefer closer dates)
      for (let offset = 1; offset <= maxDaysToSearch && suggestions.length < 5; offset++) {
        // Try dates after the requested date
        const afterStart = addDays(requestStart, offset)
        if (afterStart >= today && isRangeAvailable(afterStart, calculatedDuration)) {
          suggestions.push({
            startDate: format(afterStart, 'yyyy-MM-dd'),
            endDate: format(addDays(afterStart, calculatedDuration), 'yyyy-MM-dd'),
            nights: calculatedDuration,
            daysFromOriginal: offset,
            direction: 'after'
          })
        }

        // Try dates before the requested date
        const beforeStart = addDays(requestStart, -offset)
        if (beforeStart >= today && isRangeAvailable(beforeStart, calculatedDuration)) {
          suggestions.push({
            startDate: format(beforeStart, 'yyyy-MM-dd'),
            endDate: format(addDays(beforeStart, calculatedDuration), 'yyyy-MM-dd'),
            nights: calculatedDuration,
            daysFromOriginal: offset,
            direction: 'before'
          })
        }
      }

      // Sort by proximity to original dates
      suggestions.sort((a, b) => a.daysFromOriginal - b.daysFromOriginal)

      // Find gaps in bookings that might work for longer stays
      const gaps: Array<{ start: Date; end: Date; nights: number }> = []
      const sortedBookings = bookings.docs
        .map(b => ({
          from: new Date(b.fromDate),
          to: new Date(b.toDate)
        }))
        .sort((a, b) => a.from.getTime() - b.from.getTime())

      // Check gap from today to first booking
      if (sortedBookings.length > 0) {
        const firstBooking = sortedBookings[0]
        const nightsAvailable = differenceInDays(firstBooking.from, today)
        if (nightsAvailable >= calculatedDuration) {
          gaps.push({
            start: today,
            end: firstBooking.from,
            nights: nightsAvailable
          })
        }
      }

      // Check gaps between bookings
      for (let i = 0; i < sortedBookings.length - 1; i++) {
        const currentBooking = sortedBookings[i]
        const nextBooking = sortedBookings[i + 1]
        const nightsAvailable = differenceInDays(nextBooking.from, currentBooking.to)

        if (nightsAvailable >= calculatedDuration) {
          gaps.push({
            start: currentBooking.to,
            end: nextBooking.from,
            nights: nightsAvailable
          })
        }
      }

      return Response.json({
        requestedRange: {
          startDate: format(requestStart, 'yyyy-MM-dd'),
          endDate: format(requestEnd, 'yyyy-MM-dd'),
          nights: calculatedDuration
        },
        suggestions: suggestions.slice(0, 5), // Return top 5 suggestions
        availableGaps: gaps.slice(0, 3), // Return top 3 gaps
        message: suggestions.length > 0
          ? `Found ${suggestions.length} alternative dates nearby`
          : 'No alternative dates found within 60 days'
      })
    } catch (error) {
      console.error('Error suggesting dates:', error)
      return Response.json({ message: 'Error suggesting dates' }, { status: 500 })
    }
  },
}
