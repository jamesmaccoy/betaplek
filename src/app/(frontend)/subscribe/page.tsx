'use client'

import React, { useEffect, useState } from 'react'
import { useUserContext } from '@/context/UserContext'
import { useYoco } from '@/providers/Yoco'
import { useSubscription } from '@/hooks/useSubscription'
import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { yocoService, YocoProduct } from '@/lib/yocoService'

export default function SubscribePage() {
  const router = useRouter()
  const { currentUser } = useUserContext()
  const { customerInfo, isInitialized } = useYoco()
  const { isSubscribed, isLoading } = useSubscription()
  const [products, setProducts] = useState<YocoProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showProEntitlements, setShowProEntitlements] = useState(false)

  useEffect(() => {
    if (isInitialized) {
      loadProducts()
    }
  }, [isInitialized])

  useEffect(() => {
    if (!isLoading && isSubscribed) {
      console.log('User already subscribed, redirecting to /bookings from useEffect.')
      router.push('/bookings')
    }
  }, [isLoading, isSubscribed, router])

  const loadProducts = async () => {
    setLoadingProducts(true)
    try {
      const fetchedProducts = await yocoService.getProducts()
      if (fetchedProducts && fetchedProducts.length > 0) {
        setProducts(fetchedProducts)
      } else {
        console.warn("No products found.")
        setProducts([])
      }
    } catch (err) {
      console.error('Error loading products:', err)
      setError('Failed to load products: ' + (err instanceof Error ? err.message : JSON.stringify(err)))
    } finally {
      setLoadingProducts(false)
    }
  }

  const handlePurchase = async (product: YocoProduct) => {
    if (!currentUser) {
      router.push(`/login?redirect=/subscribe&productId=${product.id}`)
      return
    }
    try {
      setError(null)
      
      // Create Yoco payment link
      const paymentLink = await yocoService.createPaymentLink(
        product.id,
        product.price,
        product.description
      )
      
      // Redirect to Yoco payment page
      window.location.href = paymentLink.url
    } catch (purchaseError) {
      console.error('Yoco Payment Error:', purchaseError)
      setError('Failed to create payment. Please try again or contact support.')
    }
  }

  const formatPrice = (price: number, currency: string = 'ZAR') => {
    return `R${price.toFixed(2)}`
  }

  const getPeriodText = (period: string, periodCount: number) => {
    if (periodCount === 1) {
      return `/${period}`
    }
    return `/${periodCount} ${period}s`
  }

  // Find products by category
  const standardProducts = products.filter(p => p.entitlement === 'standard' && p.isEnabled)
  const proProducts = products.filter(p => p.entitlement === 'pro' && p.isEnabled)
  
  // Select featured products
  const virtual_wine_plan = standardProducts.find(p => p.id === 'virtual_wine')
  const monthly_subscription_plan = proProducts.find(p => p.id === 'monthly')
  const annual_subscription_plan = proProducts.find(p => p.id === 'gathering_monthly')
  const professional_plan = proProducts.find(p => p.id === 'hosted7nights')

  console.log("Products loaded:", products.length)
  console.log("Show Pro Entitlements:", showProEntitlements)
  console.log("Virtual Wine Plan exists:", !!virtual_wine_plan)
  console.log({ monthly_subscription_plan, annual_subscription_plan, professional_plan, virtual_wine_plan })

  if (!isInitialized) {
    return <div>Please log in</div>
  }

  return (
    <div className="container py-16 sm:py-24">
      {error && products.length > 0 && (
        <div className="mb-8 p-4 text-center text-sm text-destructive bg-destructive/10 rounded-md">
          <p>{error}</p>
        </div>
      )}
      <div className="mx-auto max-w-2xl text-center mb-12 sm:mb-16">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Curated Simple pleks, and access to garden community</h1>  
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
        Packages from each plek made by their hosts</p>
      </div>

      {/* Entitlement Toggle */}
      <div className="mx-auto max-w-4xl mb-8 flex justify-center">
        <div className="flex items-center space-x-4 p-4 bg-card rounded-lg border border-border">
          <Label htmlFor="entitlement-toggle" className="text-sm font-medium">
            Standard Access
          </Label>
          <Switch
            id="entitlement-toggle"
            checked={showProEntitlements}
            onCheckedChange={setShowProEntitlements}
          />
          <Label htmlFor="entitlement-toggle" className="text-sm font-medium">
            Unlock Pro Pleks
          </Label>
        </div>
      </div>

      {/* Standard Access Products */}
      {!showProEntitlements && (
        <div className="mx-auto max-w-4xl">
          {virtual_wine_plan ? (
            <div className="relative rounded-2xl border border-primary p-8 shadow-lg max-w-2xl mx-auto">
              <div className="absolute top-0 -translate-y-1/2 transform rounded-full bg-primary px-3 py-1 text-xs font-semibold tracking-wide text-primary-foreground">
                Standard Plan
              </div>
              <h2 className="text-2xl font-semibold leading-8 text-foreground text-center">{virtual_wine_plan.title}</h2>
              <p className="mt-4 text-lg leading-6 text-muted-foreground text-center">{virtual_wine_plan.description}</p>
              <div className="mt-8 text-center">
                <p className="flex items-baseline gap-x-1 justify-center">
                  <span className="text-5xl font-bold tracking-tight text-foreground">{formatPrice(virtual_wine_plan.price)}</span>
                  <span className="text-lg font-semibold leading-6 text-muted-foreground">{getPeriodText(virtual_wine_plan.period, virtual_wine_plan.periodCount)}</span>
                </p>
              </div>
              <ul role="list" className="mt-10 space-y-4 text-base leading-6 text-muted-foreground">
                {virtual_wine_plan.features.map((feature, idx) => (
                  <li key={idx} className="flex gap-x-3 items-center">
                    <span className="text-primary text-xl">{virtual_wine_plan.icon || '✓'}</span>
                    <span>{typeof feature === 'string' 
                      ? feature 
                      : feature !== null && typeof feature === 'object' && 'feature' in feature 
                        ? (feature as any).feature 
                        : String(feature || '')}</span>
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => handlePurchase(virtual_wine_plan)}
                className="mt-10 block w-full rounded-md bg-primary px-6 py-4 text-center text-lg font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-200"
              >
                Subscribe to Simple Plek
              </button>
            </div>
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground">Virtual wine package not found. Check console for details.</p>
              <p className="text-sm text-muted-foreground mt-2">Debug: virtual_wine_plan = {String(virtual_wine_plan)}</p>
            </div>
          )}
        </div>
      )}

      {/* Pro Entitlement Products */}
      {showProEntitlements && (
        <div className="mx-auto max-w-4xl grid grid-cols-1 gap-8 md:grid-cols-2 items-start">
          {monthly_subscription_plan && (
            <div className="rounded-2xl border border-border p-8 shadow-sm">
              <h2 className="text-lg font-semibold leading-8 text-foreground">{monthly_subscription_plan.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{monthly_subscription_plan.description}</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-foreground">{formatPrice(monthly_subscription_plan.price)}</span>
                <span className="text-sm font-semibold leading-6 text-muted-foreground">{getPeriodText(monthly_subscription_plan.period, monthly_subscription_plan.periodCount)}</span>
              </p>
              <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-muted-foreground xl:mt-10">
                {monthly_subscription_plan.features.map((feature, idx) => (
                  <li key={idx} className="flex gap-x-3">
                    {monthly_subscription_plan.icon || '✓'} {typeof feature === 'string' 
                      ? feature 
                      : feature !== null && typeof feature === 'object' && 'feature' in feature 
                        ? (feature as any).feature 
                        : String(feature || '')}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handlePurchase(monthly_subscription_plan)}
                className="mt-8 block w-full rounded-md bg-secondary px-3.5 py-2.5 text-center text-sm font-semibold text-secondary-foreground shadow-sm hover:bg-secondary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Subscribe to simple plek
              </button>
            </div>
          )}

          {annual_subscription_plan && (
            <div className="relative rounded-2xl border border-primary p-8 shadow-lg">
              <div className="absolute top-0 -translate-y-1/2 transform rounded-full bg-primary px-3 py-1 text-xs font-semibold tracking-wide text-primary-foreground">
                 Pro - Save 20%
              </div>
              <h2 className="text-lg font-semibold leading-8 text-foreground">{annual_subscription_plan.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{annual_subscription_plan.description}</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-foreground">{formatPrice(annual_subscription_plan.price)}</span>
                <span className="text-sm font-semibold leading-6 text-muted-foreground">{getPeriodText(annual_subscription_plan.period, annual_subscription_plan.periodCount)}</span>
              </p>
              <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-muted-foreground xl:mt-10">
                {annual_subscription_plan.features.map((feature, idx) => (
                  <li key={idx} className="flex gap-x-3">
                    {annual_subscription_plan.icon || '✓'} {typeof feature === 'string' 
                      ? feature 
                      : feature !== null && typeof feature === 'object' && 'feature' in feature 
                        ? (feature as any).feature 
                        : String(feature || '')}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handlePurchase(annual_subscription_plan)}
                className="mt-8 block w-full rounded-md bg-primary px-3.5 py-2.5 text-center text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Unlock Now - Save
              </button>
            </div>
          )}
        </div>
      )}

      {/* Professional Plan - Always visible but styled differently for Pro */}
      {showProEntitlements && professional_plan && (
        <div 
          className="mt-16 pt-16 pb-16 md:border-t border-border bg-cover bg-center relative rounded-lg shadow-md"
          style={{ backgroundImage: `url('https://www.simpleplek.co.za/api/media/file/gardencommunity%20(3).jpg')` }}
        >
          <div className="absolute inset-0 bg-black/30 rounded-lg"></div> 

          <div className="relative max-w-4xl mx-auto px-4 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12"> 
            
            <div className="text-center lg:text-left text-white">
               <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Host a masterclass at our Plek</h2>
               <p className="mt-4 text-lg leading-8 text-muted-foreground">Manage packages using our sugegsted packages with capped pricing</p>
            </div>

            <div className="w-full max-w-md">
              <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
                <h3 className="text-lg font-semibold leading-8 text-foreground">{professional_plan.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{professional_plan.description}</p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-foreground">{formatPrice(professional_plan.price)}</span>
                  <span className="text-sm font-semibold leading-6 text-muted-foreground">{getPeriodText(professional_plan.period, professional_plan.periodCount)}</span>
                </p>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-muted-foreground xl:mt-10">
                  {professional_plan.features.map((feature, idx) => (
                    <li key={idx} className="flex gap-x-3">
                      {professional_plan.icon || '✓'} {typeof feature === 'string' 
                        ? feature 
                        : feature !== null && typeof feature === 'object' && 'feature' in feature 
                          ? (feature as any).feature 
                          : String(feature || '')}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePurchase(professional_plan)}
                  className="mt-8 block w-full rounded-md bg-secondary px-3.5 py-2.5 text-center text-sm font-semibold text-secondary-foreground shadow-sm hover:bg-secondary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  Host a plek
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
