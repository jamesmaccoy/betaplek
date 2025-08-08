'use client'

import React, { useState, useEffect, useRef } from 'react'
import { cn } from '@/utilities/cn'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Bot, Send, Calendar, Package, Sparkles, Mic, MicOff, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { useUserContext } from '@/context/UserContext'
import { useSubscription } from '@/hooks/useSubscription'
import { getCustomerEntitlement, type CustomerEntitlement } from '@/utils/packageSuggestions'
import { calculateTotal } from '@/lib/calculateTotal'
import { useRevenueCat } from '@/providers/RevenueCat'
import { Purchases, type Package as RevenueCatPackage, ErrorCode } from '@revenuecat/purchases-js'
import { useRouter } from 'next/navigation'

interface Package {
  id: string
  name: string
  description: string
  multiplier: number
  category: string
  minNights: number
  maxNights: number
  revenueCatId?: string
  baseRate?: number
  isEnabled: boolean
  features: string[]
  source: 'database' | 'revenuecat'
}

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  type?: 'text' | 'package_suggestion' | 'booking_summary' | 'quick_action' | 'date_selection'
  data?: any
}

interface SmartEstimateBlockProps {
  className?: string
  postId: string
  baseRate: number
  postTitle?: string
  postDescription?: string
}

const QuickActions = ({ onAction }: { onAction: (action: string, data?: any) => void }) => (
  <div className="flex flex-wrap gap-2 mb-4">
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => onAction('select_dates')}
      className="text-xs"
    >
      <Calendar className="h-3 w-3 mr-1" />
      Select Dates
    </Button>
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => onAction('suggest_duration')}
      className="text-xs"
    >
      <Calendar className="h-3 w-3 mr-1" />
      When should I visit?
    </Button>
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => onAction('show_packages')}
      className="text-xs"
    >
      <Package className="h-3 w-3 mr-1" />
      What packages are available?
    </Button>
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => onAction('get_recommendation')}
      className="text-xs"
    >
      <Sparkles className="h-3 w-3 mr-1" />
      Recommend something for me
    </Button>
  </div>
)

const PackageCard = ({ 
  package: pkg, 
  duration, 
  baseRate, 
  isSelected, 
  onSelect 
}: { 
  package: Package
  duration: number
  baseRate: number
  isSelected: boolean
  onSelect: () => void 
}) => {
  const total = calculateTotal(baseRate, duration, pkg.multiplier)
  
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected ? "border-primary bg-primary/5" : "border-border"
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm">{pkg.name}</CardTitle>
          <Badge variant={pkg.category === 'special' ? 'default' : 'secondary'}>
            {pkg.category}
          </Badge>
        </div>
        <CardDescription className="text-xs">{pkg.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xs text-muted-foreground mb-2">
          {pkg.features.slice(0, 3).join(' • ')}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">
            {pkg.multiplier === 1 ? 'Base rate' : `${pkg.multiplier > 1 ? '+' : ''}${((pkg.multiplier - 1) * 100).toFixed(0)}%`}
          </span>
          <span className="font-bold">R{total.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export const SmartEstimateBlock: React.FC<SmartEstimateBlockProps> = ({
  className,
  postId,
  baseRate,
  postTitle = "this property",
  postDescription = ""
}) => {
  const { currentUser } = useUserContext()
  const isLoggedIn = !!currentUser
  const router = useRouter()
  const { isInitialized } = useRevenueCat()
  
  // Session storage key for this specific post
  const sessionKey = `booking_journey_${postId}_${currentUser?.id || 'guest'}`
  
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [packages, setPackages] = useState<Package[]>([])
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [duration, setDuration] = useState(1)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [isListening, setIsListening] = useState(false)
  
  // Booking states
  const [isBooking, setIsBooking] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [offerings, setOfferings] = useState<RevenueCatPackage[]>([])
  
  const subscriptionStatus = useSubscription()
  const [customerEntitlement, setCustomerEntitlement] = useState<CustomerEntitlement>('none')
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  
  // Initialize booking journey on component mount
  useEffect(() => {
    const restored = loadBookingJourney()
    
    if (!restored) {
      // Set initial welcome message if no journey was restored
      const initialMessage: Message = {
        role: 'assistant',
        content: isLoggedIn 
          ? `Hi! I'm here to help you book ${postTitle}. I can help you find the perfect dates, recommend packages based on your needs, and handle your booking. What would you like to know?`
          : `Welcome to ${postTitle}! I can show you available packages and help you get started. Please log in to access the full AI booking experience and complete your reservation.`,
        type: 'text'
      }
      setMessages([initialMessage])
    }
  }, [isLoggedIn, postTitle])

  // Save booking journey when state changes
  useEffect(() => {
    if (messages.length > 0) {
      saveBookingJourney()
    }
  }, [messages, selectedPackage, duration, startDate, endDate])

  // Update customer entitlement when subscription status changes
  useEffect(() => {
    const entitlement = getCustomerEntitlement(subscriptionStatus)
    setCustomerEntitlement(entitlement)
  }, [subscriptionStatus])

  // Load RevenueCat offerings when initialized
  useEffect(() => {
    if (isInitialized) {
      loadOfferings()
    }
  }, [isInitialized])

  const loadOfferings = async () => {
    try {
      const fetchedOfferings = await Purchases.getSharedInstance().getOfferings()
      console.log('Offerings:', fetchedOfferings)
      
      // Collect all packages from all offerings
      const allPackages: RevenueCatPackage[] = []
      
      if (fetchedOfferings.current && fetchedOfferings.current.availablePackages.length > 0) {
        allPackages.push(...fetchedOfferings.current.availablePackages)
      }
      
      Object.values(fetchedOfferings.all).forEach(offering => {
        if (offering && offering.availablePackages.length > 0) {
          allPackages.push(...offering.availablePackages)
        }
      })
      
      const uniquePackages = allPackages.filter((pkg, index, self) => 
        index === self.findIndex(p => p.webBillingProduct?.identifier === pkg.webBillingProduct?.identifier)
      )
      
      setOfferings(uniquePackages)
    } catch (err) {
      console.error('Error loading offerings:', err)
    }
  }

  const handleBooking = async () => {
    if (!selectedPackage || !isLoggedIn) return
    
    setIsBooking(true)
    setBookingError(null)
    
    try {
      console.log('=== BOOKING PROCESS DEBUG ===')
      console.log('Selected package:', {
        id: selectedPackage.id,
        name: selectedPackage.name,
        revenueCatId: selectedPackage.revenueCatId,
        source: selectedPackage.source
      })
      
      const total = calculateTotal(baseRate, duration, selectedPackage.multiplier)
      
      // Create estimate first
      const estimateData = {
        postId,
        fromDate: startDate?.toISOString() || new Date().toISOString(),
        toDate: endDate?.toISOString() || new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString(),
        guests: [],
        baseRate: total,
        duration,
        customer: currentUser?.id,
        packageType: selectedPackage.revenueCatId || selectedPackage.id,
      }
      
      console.log('Creating estimate with data:', estimateData)
      
      const estimateResponse = await fetch('/api/estimates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(estimateData),
      })
      
      if (!estimateResponse.ok) {
        const errorData = await estimateResponse.json()
        throw new Error(errorData.error || 'Failed to create estimate')
      }
      
      const estimate = await estimateResponse.json()
      console.log('Estimate created:', estimate)
      
      // Find the package in RevenueCat offerings
      const revenueCatPackage = offerings.find((pkg) => 
        pkg.webBillingProduct?.identifier === selectedPackage.revenueCatId
      )
      
      if (revenueCatPackage) {
        console.log('Found package in RevenueCat, proceeding with payment')
        
        try {
          const purchaseResult = await Purchases.getSharedInstance().purchase({
            rcPackage: revenueCatPackage,
          })
          
          console.log('Purchase successful:', purchaseResult)
          
          // Confirm the estimate after successful purchase
          const confirmResponse = await fetch(`/api/estimates/${estimate.id}/confirm`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              postId,
              fromDate: estimateData.fromDate,
              toDate: estimateData.toDate,
              guests: [],
              baseRate: total,
              duration,
              customer: currentUser?.id,
              packageType: selectedPackage.revenueCatId || selectedPackage.id,
            }),
          })
          
          if (!confirmResponse.ok) {
            const errorData = await confirmResponse.json()
            throw new Error(errorData.error || 'Failed to confirm estimate')
          }
          
          const confirmedEstimate = await confirmResponse.json()
          console.log('Estimate confirmed:', confirmedEstimate)
          
          // Clear booking journey after successful booking
          clearBookingJourney()
          
          // Redirect to booking confirmation
          router.push(`/booking-confirmation?total=${total}&duration=${duration}`)
          
        } catch (purchaseError: any) {
          console.error('RevenueCat Purchase Error:', purchaseError)
          if (purchaseError.code === ErrorCode.UserCancelledError) {
            console.log('User cancelled the purchase flow.')
            return
          }
          throw new Error('Failed to complete purchase. Please try again.')
        }
      } else {
        console.log('Package not found in RevenueCat, using fallback')
        
        // Fallback: confirm estimate without payment (for testing)
        const confirmResponse = await fetch(`/api/estimates/${estimate.id}/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            postId,
            fromDate: estimateData.fromDate,
            toDate: estimateData.toDate,
            guests: [],
            baseRate: total,
            duration,
            customer: currentUser?.id,
            packageType: selectedPackage.revenueCatId || selectedPackage.id,
          }),
        })
        
        if (!confirmResponse.ok) {
          const errorData = await confirmResponse.json()
          throw new Error(errorData.error || 'Failed to confirm estimate')
        }
        
        const confirmedEstimate = await confirmResponse.json()
        console.log('Estimate confirmed (fallback):', confirmedEstimate)
        
        // Clear booking journey after successful booking
        clearBookingJourney()
        
        // Redirect to booking confirmation
        router.push(`/booking-confirmation?total=${total}&duration=${duration}`)
      }
      
    } catch (error) {
      console.error('Booking Error:', error)
      setBookingError(error instanceof Error ? error.message : 'An unknown error occurred')
    } finally {
      setIsBooking(false)
    }
  }
  
  // Load packages
  useEffect(() => {
    fetch(`/api/packages/post/${postId}`)
      .then(res => res.json())
      .then(data => {
        const filteredPackages = (data.packages || []).filter((pkg: Package) => {
          if (!pkg.isEnabled) return false
          // Filter out pro-only packages for non-pro users
          if (pkg.revenueCatId === 'gathering_monthly' && customerEntitlement !== 'pro') {
            return false
          }
          return true
        })
        setPackages(filteredPackages)
      })
      .catch(console.error)
  }, [postId, customerEntitlement])
  
  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])
  
  const handleQuickAction = (action: string, data?: any) => {
    let message = ''
    
    switch (action) {
      case 'select_dates':
        const dateMessage: Message = {
          role: 'assistant',
          content: 'Please select your check-in and check-out dates:',
          type: 'date_selection'
        }
        setMessages(prev => [...prev, dateMessage])
        return
      case 'suggest_duration':
        message = `For ${postTitle}, I'd recommend considering these durations:\n\n` +
          `• 1-2 nights: Perfect for a quick getaway\n` +
          `• 3-5 nights: Ideal for a relaxing break\n` +
          `• 7+ nights: Great for a longer vacation\n\n` +
          `What duration are you thinking of? I can help you find the perfect package.`
        break
      case 'show_packages':
        showAvailablePackages()
        return
      case 'get_recommendation':
        message = `Based on ${postTitle}, here are my top recommendations:\n\n` +
          `• For couples: Romantic packages with premium amenities\n` +
          `• For families: Spacious options with kid-friendly features\n` +
          `• For business: Professional packages with work amenities\n\n` +
          `What type of experience are you looking for?`
        break
      default:
        message = 'I can help you with that! What would you like to know?'
    }
    
    const assistantMessage: Message = { role: 'assistant', content: message, type: 'text' }
    setMessages(prev => [...prev, assistantMessage])
  }

  const showAvailablePackages = () => {
    // Load packages from API
    fetch(`/api/packages/post/${postId}`)
      .then(res => res.json())
      .then(data => {
        const availablePackages = (data.packages || []).filter((pkg: any) => pkg.isEnabled)
        setPackages(availablePackages)
        
        const packageMessage: Message = {
          role: 'assistant',
          content: `Here are the available packages for ${postTitle}:`,
          type: 'package_suggestion',
          data: { packages: availablePackages }
        }
        setMessages(prev => [...prev, packageMessage])
      })
      .catch(err => {
        console.error('Error loading packages:', err)
        const errorMessage: Message = {
          role: 'assistant',
          content: 'Sorry, I encountered an error loading packages. Please try again.',
          type: 'text'
        }
        setMessages(prev => [...prev, errorMessage])
      })
  }
  
  const handleAIRequest = async (message: string) => {
    if (!message.trim()) return
    
    const userMessage: Message = { role: 'user', content: message }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    
    try {
      // If user is not logged in, provide basic responses without API call
      if (!isLoggedIn) {
        let response = ''
        const lowerMessage = message.toLowerCase()
        
        if (lowerMessage.includes('package') || lowerMessage.includes('option')) {
          response = `Here are the available packages for ${postTitle}. Please log in for personalized recommendations and to complete your booking.`
          const assistantMessage: Message = { 
            role: 'assistant', 
            content: response,
            type: 'text'
          }
          setMessages(prev => [...prev, assistantMessage])
          setTimeout(() => showAvailablePackages(), 500)
        } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
          response = `Pricing starts at R${baseRate} per night, with different packages offering various multipliers. Log in to see personalized pricing and complete your booking.`
        } else if (lowerMessage.includes('book') || lowerMessage.includes('reserve')) {
          response = `To complete a booking, please log in first. I'll be able to help you through the entire process once you're logged in!`
        } else {
          response = `I'd love to help you with that! For the full AI assistant experience and personalized recommendations, please log in. I can show you available packages without logging in if you'd like.`
        }
        
        const assistantMessage: Message = { 
          role: 'assistant', 
          content: response,
          type: 'text'
        }
        setMessages(prev => [...prev, assistantMessage])
        setIsLoading(false)
        return
      }
      
      // For logged-in users, use the full AI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message,
          bookingContext: {
            postId,
            postTitle,
            postDescription,
            baseRate,
            duration,
            packages: packages.length,
            customerEntitlement,
            selectedPackage: selectedPackage?.name
          }
        })
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to use the AI assistant.')
        }
        throw new Error(`Server error: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.message) {
        throw new Error('No response from AI assistant.')
      }
      
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.message,
        type: 'text'
      }
      setMessages(prev => [...prev, assistantMessage])
      
      // Check if AI suggests showing packages (with null check)
      if (data.message && typeof data.message === 'string' && 
          (data.message.toLowerCase().includes('package') || data.message.toLowerCase().includes('option'))) {
        setTimeout(() => showAvailablePackages(), 1000)
      }
      
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again or use the quick actions above.',
        type: 'text'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleAIRequest(input)
  }
  
  const renderMessage = (message: Message, index: number) => {
    if (message.type === 'package_suggestion') {
      const { packages: suggestedPackages } = message.data || { packages: [] }
      return (
        <div key={index} className="space-y-4">
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm">{message.content || 'Here are the available packages:'}</p>
          </div>
          <div className="grid gap-2">
            {suggestedPackages.map((pkg: Package) => (
              <PackageCard
                key={pkg.id}
                package={pkg}
                duration={duration}
                baseRate={baseRate}
                isSelected={selectedPackage?.id === pkg.id}
                onSelect={() => {
                  setSelectedPackage(pkg)
                  const confirmMessage: Message = {
                    role: 'assistant',
                    content: `Great choice! You've selected "${pkg.name}". This package includes: ${pkg.features.join(', ')}. Would you like to proceed with booking or do you have any questions?`,
                    type: 'text'
                  }
                  setMessages(prev => [...prev, confirmMessage])
                }}
              />
            ))}
          </div>
        </div>
      )
    }
    
    if (message.type === 'date_selection') {
      return (
        <div key={index} className="space-y-4">
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm">{message.content}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Start Date</label>
              <Input
                type="date"
                value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const date = new Date(e.target.value)
                  setStartDate(date)
                  if (endDate && date > endDate) {
                    setEndDate(new Date(date.getTime() + duration * 24 * 60 * 60 * 1000))
                  }
                }}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">End Date</label>
              <Input
                type="date"
                value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const date = new Date(e.target.value)
                  setEndDate(date)
                  if (startDate && date < startDate) {
                    setStartDate(new Date(date.getTime() - duration * 24 * 60 * 60 * 1000))
                  }
                }}
                className="text-xs"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                const today = new Date()
                const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
                const endDate = new Date(today.getTime() + duration * 24 * 60 * 60 * 1000)
                setStartDate(tomorrow)
                setEndDate(endDate)
              }}
            >
              Quick Select
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                const today = new Date()
                const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
                const endDate = new Date(nextWeek.getTime() + duration * 24 * 60 * 60 * 1000)
                setStartDate(nextWeek)
                setEndDate(endDate)
              }}
            >
              Next Week
            </Button>
          </div>
        </div>
      )
    }
    
    return (
      <div
        key={index}
        className={cn(
          'p-3 rounded-lg break-words max-w-[85%]',
          message.role === 'user'
            ? 'bg-primary text-primary-foreground ml-auto'
            : 'bg-muted'
        )}
      >
        <p className="text-sm" dangerouslySetInnerHTML={{ 
          __html: (message.content || 'No content').replace(/\n/g, '<br />') 
        }} />
      </div>
    )
  }
  
  // Save booking journey to session storage
  const saveBookingJourney = () => {
    if (typeof window === 'undefined') return
    
    const journeyData = {
      messages,
      selectedPackage,
      duration,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      timestamp: Date.now()
    }
    
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify(journeyData))
      console.log('Saved booking journey:', journeyData)
    } catch (error) {
      console.error('Error saving booking journey:', error)
    }
  }

  // Load booking journey from session storage
  const loadBookingJourney = () => {
    if (typeof window === 'undefined') return
    
    try {
      const savedData = sessionStorage.getItem(sessionKey)
      if (savedData) {
        const journeyData = JSON.parse(savedData)
        const now = Date.now()
        const oneHour = 60 * 60 * 1000 // 1 hour in milliseconds
        
        // Only restore if data is less than 1 hour old
        if (now - journeyData.timestamp < oneHour) {
          console.log('Restoring booking journey:', journeyData)
          
          setMessages(journeyData.messages || [])
          setSelectedPackage(journeyData.selectedPackage || null)
          setDuration(journeyData.duration || 1)
          setStartDate(journeyData.startDate ? new Date(journeyData.startDate) : null)
          setEndDate(journeyData.endDate ? new Date(journeyData.endDate) : null)
          
          // Show welcome back message if we have a selected package
          if (journeyData.selectedPackage) {
            const welcomeBackMessage: Message = {
              role: 'assistant',
              content: `Welcome back! I see you were looking at the "${journeyData.selectedPackage.name}" package. Your selected dates are ${journeyData.startDate ? format(new Date(journeyData.startDate), 'MMM dd') : 'not set'} to ${journeyData.endDate ? format(new Date(journeyData.endDate), 'MMM dd, yyyy') : 'not set'}. Would you like to continue with your booking?`,
              type: 'text'
            }
            setMessages(prev => [...prev, welcomeBackMessage])
          }
          
          return true
        } else {
          console.log('Booking journey expired, starting fresh')
          sessionStorage.removeItem(sessionKey)
        }
      }
    } catch (error) {
      console.error('Error loading booking journey:', error)
      sessionStorage.removeItem(sessionKey)
    }
    
    return false
  }

  // Clear booking journey
  const clearBookingJourney = () => {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(sessionKey)
    console.log('Cleared booking journey')
  }
  
  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle>AI Booking Assistant</CardTitle>
          </div>
          {messages.length > 1 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                clearBookingJourney()
                setMessages([{
                  role: 'assistant',
                  content: `Hi! I'm here to help you book ${postTitle}. I can help you find the perfect dates, recommend packages based on your needs, and handle your booking. What would you like to know?`,
                  type: 'text'
                }])
                setSelectedPackage(null)
                setStartDate(null)
                setEndDate(null)
                setDuration(1)
                setBookingError(null)
              }}
              className="text-xs"
            >
              Start Over
            </Button>
          )}
        </div>
        <CardDescription>
          Get personalized recommendations and book your perfect stay
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea ref={scrollRef} className="h-[400px] p-4">
          <QuickActions onAction={handleQuickAction} />
          
          <div className="space-y-4">
            {messages.map(renderMessage)}
            
            {isLoading && (
              <div className="flex w-fit max-w-[85%] rounded-lg bg-muted px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="border-t p-4">
          {!isLoggedIn && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 mb-2">
                To use the AI assistant and complete bookings, please log in.
              </p>
              <Button size="sm" asChild>
                <a href="/login">Log In</a>
              </Button>
            </div>
          )}
          
          {selectedPackage && (
            <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{selectedPackage.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {duration} {duration === 1 ? 'night' : 'nights'} • {selectedPackage.features.slice(0, 2).join(', ')}
                  </p>
                  {startDate && endDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(startDate, 'MMM dd')} - {format(endDate, 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold">R{calculateTotal(baseRate, duration, selectedPackage.multiplier).toFixed(2)}</p>
                  {isLoggedIn ? (
                    <Button 
                      size="sm" 
                      className="mt-1" 
                      onClick={handleBooking}
                      disabled={isBooking || !startDate || !endDate}
                    >
                      {isBooking ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Processing...
                        </>
                      ) : !startDate || !endDate ? (
                        'Select Dates'
                      ) : (
                        'Book Now'
                      )}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="mt-1" asChild>
                      <a href="/login">Log In to Book</a>
                    </Button>
                  )}
                </div>
              </div>
              {bookingError && (
                <div className="mt-2 p-2 text-xs text-destructive bg-destructive/10 rounded">
                  {bookingError}
                </div>
              )}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isListening 
                  ? "I'm listening..." 
                  : isLoggedIn 
                    ? "Ask me anything about booking..."
                    : "Ask about packages (log in for full AI assistance)..."
              }
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
} 