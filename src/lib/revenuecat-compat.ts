/**
 * RevenueCat Compatibility Layer
 * 
 * This file provides type definitions and mock implementations for RevenueCat
 * to maintain backward compatibility during the migration to Yoco.
 * 
 * These types allow old code to compile without the @revenuecat/purchases-js package.
 */

// Type definitions for RevenueCat (extracted from the package)
export interface Product {
  identifier: string
  description: string
  priceString: string
  price: number
  currencyCode: string
}

export interface Package {
  identifier: string
  webBillingProduct?: Product
}

export interface CustomerInfo {
  entitlements: {
    active: Record<string, any>
  }
  activeSubscriptions: string[]
  allPurchasedProductIdentifiers: string[]
}

export enum ErrorCode {
  UnknownError = 0,
  PurchaseCancelledError = 1,
  StoreProblemError = 2,
  PurchaseNotAllowedError = 3,
  PurchaseInvalidError = 4,
  ProductNotAvailableForPurchaseError = 5,
  ProductAlreadyPurchasedError = 6,
  ReceiptAlreadyInUseError = 7,
  InvalidReceiptError = 8,
  MissingReceiptFileError = 9,
  NetworkError = 10,
}

export interface PurchasesError extends Error {
  errorCode: ErrorCode
  underlyingErrorMessage?: string
}

// Mock Purchases class
export class Purchases {
  static async configure(options: any): Promise<Purchases> {
    console.warn('RevenueCat compatibility mode - using Yoco instead')
    return new Purchases()
  }

  static async getSharedInstance(): Promise<Purchases> {
    console.warn('RevenueCat compatibility mode - using Yoco instead')
    return new Purchases()
  }

  async getOfferings(): Promise<{ all: Record<string, any>; current: any }> {
    console.warn('RevenueCat compatibility mode - returning empty offerings')
    return { all: {}, current: null }
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    console.warn('RevenueCat compatibility mode - returning empty customer info')
    return {
      entitlements: { active: {} },
      activeSubscriptions: [],
      allPurchasedProductIdentifiers: [],
    }
  }

  async purchasePackage(pkg: Package): Promise<any> {
    console.warn('RevenueCat compatibility mode - purchase not implemented')
    throw new Error('RevenueCat is deprecated. Please use Yoco payment flow.')
  }
}

// Re-export for named imports
export type { Package as RevenueCatPackage }

