import React, { useState } from 'react'
import { Media } from '@/components/Media'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { formatDateTime } from '@/utilities/formatDateTime'
import { useRouter } from 'next/navigation'
import { calculateTotal } from '@/lib/calculateTotal'
import Link from 'next/link'

interface BookingInfoCardProps {
  // Common props
  postImage?: any
  guests?: any[]
  createdAt?: string
  variant: 'booking' | 'estimate'
  postUrl?: string
  
  // Estimate-specific props
  onEstimateRequest?: (dates: { from: Date; to: Date }) => Promise<void>
  isSubmittingEstimate?: boolean
  estimateError?: string | null
  postId?: string
  postTitle?: string
  baseRate?: number
  className?: string
}

export const BookingInfoCard: React.FC<BookingInfoCardProps> = ({
  postImage,
  guests = [],
  createdAt,
  variant,
  postUrl,
  onEstimateRequest,
  isSubmittingEstimate = false,
  estimateError = null,
  postId,
  postTitle = 'Property',
  baseRate = 150,
  className = ''
}) => {
  const router = useRouter()
  
  // Date picker states for estimate requests
  const [selectedDates, setSelectedDates] = useState<DateRange | undefined>()
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  
  // Unavailable dates state
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([])
  const [loadingUnavailableDates, setLoadingUnavailableDates] = useState(false)

  const loadUnavailableDates = async () => {
    if (!postId) return
    
    setLoadingUnavailableDates(true)
    try {
      const response = await fetch(`/api/bookings/unavailable-dates?postId=${postId}`)
      if (response.ok) {
        const data = await response.json()
        const dates = data.unavailableDates.map((dateStr: string) => new Date(dateStr))
        setUnavailableDates(dates)
      }
    } catch (error) {
      console.error('Error loading unavailable dates:', error)
    } finally {
      setLoadingUnavailableDates(false)
    }
  }

  const handleEstimateRequest = async () => {
    if (!selectedDates?.from || !selectedDates?.to || !onEstimateRequest) return
    
    try {
      await onEstimateRequest({
        from: selectedDates.from,
        to: selectedDates.to
      })
    } catch (error) {
      console.error('Error in estimate request:', error)
    }
  }

  const getDateLabel = () => {
    if (variant === 'booking') {
      return 'Date Booked'
    }
    return 'Date Estimated'
  }

  const getEstimateButtonText = () => {
    if (variant === 'booking') {
      return 'Reschedule Booking'
    }
    return 'Create new estimate for different dates'
  }

  return (
    <div className={`w-full rounded-md overflow-hidden bg-muted p-2 flex items-center gap-3 ${className}`}>
      {/* Property Image */}
      {postImage && (
        <div className="w-24 h-24 flex-shrink-0 rounded-md overflow-hidden border border-border bg-white">
          {postUrl ? (
            <Link href={postUrl} className="block w-full h-full">
              <Media
                resource={postImage}
                className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer"
              />
            </Link>
          ) : (
            <Media
              resource={postImage}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}
      
      {/* Content */}
      <div className="flex flex-col flex-1">
        <span className="font-medium">
          {getDateLabel()}: {createdAt ? formatDateTime(createdAt) : 'N/A'}
        </span>
        <span className="font-medium">
          Guests: {Array.isArray(guests) ? guests.length : 0}
        </span>
        
        {/* Estimate Request Section - Only show for booking variant */}
        {variant === 'booking' && onEstimateRequest && (
          <div className="mt-3 space-y-2">
            <Popover open={isDatePickerOpen} onOpenChange={(open) => {
              setIsDatePickerOpen(open)
              if (open) {
                loadUnavailableDates()
              }
            }}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDates?.from ? (
                    selectedDates.to ? (
                      <>
                        {format(selectedDates.from, "LLL dd, y")} -{" "}
                        {format(selectedDates.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(selectedDates.from, "LLL dd, y")
                    )
                  ) : (
                    <span>{getEstimateButtonText()}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={selectedDates?.from}
                  selected={selectedDates}
                  onSelect={(range) => {
                    setSelectedDates(range)
                    if (range?.from && range?.to) {
                      setIsDatePickerOpen(false)
                    }
                  }}
                  numberOfMonths={2}
                  disabled={(date) => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    
                    // Disable past dates
                    if (date < today) return true
                    
                    // Disable unavailable dates
                    return unavailableDates.some(unavailableDate => {
                      const unavailable = new Date(unavailableDate)
                      unavailable.setHours(0, 0, 0, 0)
                      const checkDate = new Date(date)
                      checkDate.setHours(0, 0, 0, 0)
                      return unavailable.getTime() === checkDate.getTime()
                    })
                  }}
                />
                {loadingUnavailableDates && (
                  <div className="p-2 text-xs text-muted-foreground text-center">
                    Loading availability...
                  </div>
                )}
              </PopoverContent>
            </Popover>
            
            {selectedDates?.from && selectedDates?.to && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Requesting estimate for: {format(selectedDates.from, "LLL dd, y")} to {format(selectedDates.to, "LLL dd, y")}
                </div>
                <Button 
                  onClick={handleEstimateRequest}
                  disabled={isSubmittingEstimate}
                  size="sm"
                  className="w-full"
                >
                  {isSubmittingEstimate ? 'Creating Estimate...' : 'Create New Estimate'}
                </Button>
                {estimateError && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    {estimateError}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingInfoCard
