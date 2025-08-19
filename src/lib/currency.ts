export function formatAmountToZAR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return 'N/A'
  try {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(amount))
  } catch {
    return `R${Number(amount).toFixed(2)}`
  }
}

export function formatFormattedPriceToZAR(formattedPrice: string | null | undefined): string {
  if (!formattedPrice || typeof formattedPrice !== 'string') return 'N/A'
  // Replace any leading currency symbol(s) with R
  // This preserves the numeric portion (e.g. "$9.99" -> "R9.99")
  return formattedPrice.replace(/^[^\d\-.,\s]+/, 'R')
}

export function getZARPriceFromProduct(product: any): string {
  // Attempts to derive a ZAR formatted price from a RevenueCat product-like object
  // Priority: numeric amount if present -> formattedPrice with symbol swap -> fallback
  const currentPrice = product?.currentPrice
  const amount = currentPrice?.amount ?? currentPrice?.price ?? product?.price
  if (typeof amount === 'number') {
    return formatAmountToZAR(amount)
  }
  const formatted = currentPrice?.formattedPrice ?? product?.priceString
  if (typeof formatted === 'string') {
    return formatFormattedPriceToZAR(formatted)
  }
  return 'N/A'
} 