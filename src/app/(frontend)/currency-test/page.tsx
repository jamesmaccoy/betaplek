import { CurrencyTest } from '@/components/CurrencyTest'

// Force dynamic rendering to prevent static generation issues with Payload globals
export const dynamic = 'force-dynamic'

export default function CurrencyTestPage() {
  return <CurrencyTest />
} 