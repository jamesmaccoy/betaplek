'use client'
import { AIAssistant } from '@/components/AIAssistant/AIAssistant'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import React, { useEffect } from 'react'

interface PageClientProps {
  post?: {
    id: string
    title: string
    content: any
    meta?: {
      title?: string | null
      image?: (string | null) | any
      description?: string | null
    }
    baseRate?: number | null
    relatedPosts?: any[]
    createdAt: string
    updatedAt: string
    authors?: any[] | any
    populatedAuthors?: Array<{
      id?: string | null
      name?: string | null
    }> | null
  }
}

const PageClient: React.FC<PageClientProps> = ({ post }) => {
  /* Force the header to be dark mode while we have an image behind it */
  const { setHeaderTheme } = useHeaderTheme()

  useEffect(() => {
    setHeaderTheme('dark')
  }, [setHeaderTheme])

  // Create post context for AI Assistant
  const getPostContext = () => {
    if (!post) return null

    // Debug: Log what we have
    console.log('[PageClient] Post data:', {
      hasCreatedAt: !!post.createdAt,
      hasUpdatedAt: !!post.updatedAt,
      hasPopulatedAuthors: !!post.populatedAuthors,
      populatedAuthorsLength: post.populatedAuthors?.length,
      hasAuthors: !!post.authors
    })

    return {
      context: 'post-article',
      post: {
        id: post.id,
        title: post.title,
        description: post.meta?.description || '',
        content: post.content,
        baseRate: post.baseRate,
        relatedPosts: post.relatedPosts || [],
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        authors: post.populatedAuthors || []
      }
    }
  }

  // Set post context for AI Assistant
  useEffect(() => {
    if (post) {
      const context = getPostContext()
      if (typeof window !== 'undefined') {
        ;(window as any).postContext = context
        console.log('[PageClient] Set post context:', context)
      }
    }
  }, [post])

  return (
    <>
      <AIAssistant />
    </>
  )
}

export default PageClient
