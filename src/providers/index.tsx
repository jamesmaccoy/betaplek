import React from 'react'

import { HeaderThemeProvider } from './HeaderTheme'
import { ThemeProvider } from './Theme'
import { UserProvider } from '@/context/UserContext'
import { YocoProvider } from './Yoco'

// Backward compatibility alias
const RevenueCatProvider = YocoProvider

export const Providers: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  return (
    <ThemeProvider>
      <HeaderThemeProvider>
        <UserProvider>
          <RevenueCatProvider>
            {children}
          </RevenueCatProvider>
        </UserProvider>
      </HeaderThemeProvider>
    </ThemeProvider>
  )
}
