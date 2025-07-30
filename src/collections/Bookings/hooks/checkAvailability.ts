import { format } from 'date-fns'
import { APIError, CollectionBeforeChangeHook } from 'payload'

export const checkAvailabilityHook: CollectionBeforeChangeHook = async ({
  data,
  req: { payload },
  req,
}) => {
  if (!('fromDate' in data && 'toDate' in data && 'post' in data)) {
    throw new APIError('Start date, end date, and post are required.', 400, undefined, true)
  }

  const { fromDate, toDate } = data

  if (fromDate >= toDate) {
    throw new APIError('Start date must be before end date.', 400, undefined, true)
  }

  const formattedFromDate = format(new Date(fromDate), 'yyyy-MM-dd')
  const formattedToDate = format(new Date(toDate), 'yyyy-MM-dd')

  // Check if the booking overlaps with existing bookings
  const bookings = await payload.find({
    collection: 'bookings',
    where: {
      and: [
        { post: { equals: data.post } },
        { fromDate: { less_than_equal: formattedToDate } },
        { toDate: { greater_than_equal: formattedFromDate } },
      ],
    },
    limit: 1,
    select: {
      slug: true,
    },
    depth: 0,
    req,
  })

  const isAvailable = bookings.docs.length === 0

  if (!isAvailable) {
    throw new APIError(
      'Booking dates are not available.',
      400,
      [
        {
          message: 'The selected dates overlap with an existing booking.',
        },
      ],
      true,
    )
  }

  return data
}
