import { redirect } from 'next/navigation'
import { getMeUser } from '@/utilities/getMeUser'

// Force dynamic rendering for Cloudflare D1 compatibility
export const dynamic = 'force-dynamic'

export default async function ManagePage() {
  const meUser = await getMeUser()
  
  // Check if user is authenticated and has host role
  if (!meUser?.user) {
    redirect('/login?redirect=/manage')
  }
  
  if (!(meUser.user as any).role?.includes('host') && !(meUser.user as any).role?.includes('admin')) {
    redirect('/')
  }
  
  // Redirect to package dashboard as the main management interface
  redirect('/manage/packages')
} 