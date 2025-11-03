'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useUserContext } from '@/context/UserContext'

// Define types for Yoco
type CustomerInfo = any

type YocoContextType = {
  customerInfo: CustomerInfo | null
  isLoading: boolean
  isInitialized: boolean
  error: Error | null
  refreshCustomerInfo: () => Promise<CustomerInfo | void>
  restorePurchases: () => Promise<CustomerInfo | void>
}

const YocoContext = createContext<YocoContextType | undefined>(undefined)

export const YocoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useUserContext()
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return

    const initYoco = async () => {
      try {
        setIsLoading(true)
        
        // Yoco doesn't require initialization like RevenueCat
        // We just mark it as initialized
        setIsInitialized(true)

        // Only try to get customer info if user is authenticated and has valid ID
        if (!currentUser || !currentUser.id || currentUser.id === '[Not provided]' || currentUser.id === '') {
          console.log('No valid user for Yoco customer info')
          setCustomerInfo(null)
          setError(null)
          return
        }
        
        try {
          // Fetch customer info from your backend
          const response = await fetch('/api/yoco/customer-info', {
            credentials: 'include',
          })
          
          if (response.ok) {
            const info = await response.json()
            setCustomerInfo(info)
            setError(null)
          } else {
            console.error('Failed to get customer info:', response.statusText)
            setCustomerInfo(null)
            setError(null)
          }
        } catch (customerInfoError) {
          console.error('Failed to get customer info:', customerInfoError)
          setCustomerInfo(null)
          setError(null)
        }
      } catch (err) {
        console.error('Yoco initialization error:', err)
        setError(err instanceof Error ? err : new Error('Failed to initialize Yoco'))
        setCustomerInfo(null)
      } finally {
        setIsLoading(false)
      }
    }

    initYoco()
  }, [currentUser])

  const refreshCustomerInfo = async () => {
    if (typeof window === 'undefined') return

    try {
      setIsLoading(true)
      const response = await fetch('/api/yoco/customer-info', {
        credentials: 'include',
      })
      
      if (response.ok) {
        const info = await response.json()
        setCustomerInfo(info)
        return info
      }
    } catch (err) {
      console.error('Failed to refresh customer info:', err)
      setError(err instanceof Error ? err : new Error('Unknown error refreshing customer info'))
    } finally {
      setIsLoading(false)
    }
  }

  const restorePurchases = async () => {
    if (typeof window === 'undefined') return
    
    try {
      setIsLoading(true)
      // For Yoco, restoring purchases means fetching the latest customer info
      const response = await fetch('/api/yoco/customer-info', {
        credentials: 'include',
      })
      
      if (response.ok) {
        const info = await response.json()
        setCustomerInfo(info)
        return info
      }
    } catch (err) {
      console.error('Failed to restore purchases:', err)
      setError(err instanceof Error ? err : new Error('Unknown error restoring purchases'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <YocoContext.Provider
      value={{
        customerInfo,
        isLoading,
        isInitialized,
        error,
        refreshCustomerInfo,
        restorePurchases,
      }}
    >
      {children}
    </YocoContext.Provider>
  )
}

export const useYoco = () => {
  const context = useContext(YocoContext)
  if (context === undefined) {
    throw new Error('useYoco must be used within a YocoProvider')
  }
  return context
}

// Backward compatibility aliases
export const RevenueCatProvider = YocoProvider
export const useRevenueCat = useYoco

