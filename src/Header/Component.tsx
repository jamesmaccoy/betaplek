import { HeaderClient } from './Component.client'
import { getCachedGlobal } from '@/utilities/getGlobals'
import React from 'react'

import type { Header } from '@/payload-types'

export async function Header() {
  const headerData: Header = await getCachedGlobal('header', 1)()

  // Handle empty data gracefully during build time
  if (!headerData || Object.keys(headerData).length === 0) {
    return <HeaderClient data={{} as Header} />
  }

  return <HeaderClient data={headerData} />
}
