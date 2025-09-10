'use client'

import React from 'react'

interface SimplePageRendererProps {
  page: any
}

export default function SimplePageRenderer({ page }: SimplePageRendererProps) {
  if (!page.layout || !Array.isArray(page.layout)) {
    return (
      <div className="text-sm text-muted-foreground">
        <p>No content available for this page.</p>
      </div>
    )
  }

  return (
    <div className="prose prose-sm max-w-none">
      {page.layout.map((block: any, index: number) => {
        switch (block.blockType) {
          case 'content':
            return (
              <div key={index} className="mb-4">
                {block.richText && (
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: typeof block.richText === 'string' 
                        ? block.richText 
                        : JSON.stringify(block.richText) 
                    }}
                  />
                )}
              </div>
            )
          
          case 'mediaBlock':
            return (
              <div key={index} className="mb-4">
                {block.media && (
                  <div className="text-sm text-muted-foreground">
                    <p>📷 Media content available</p>
                    {block.media.alt && (
                      <p className="text-xs">Alt: {block.media.alt}</p>
                    )}
                  </div>
                )}
              </div>
            )
          
          case 'callToAction':
            return (
              <div key={index} className="mb-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">{block.heading || 'Call to Action'}</h3>
                {block.richText && (
                  <div 
                    className="text-sm"
                    dangerouslySetInnerHTML={{ 
                      __html: typeof block.richText === 'string' 
                        ? block.richText 
                        : JSON.stringify(block.richText) 
                    }}
                  />
                )}
              </div>
            )
          
          default:
            return (
              <div key={index} className="mb-4 p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  📄 {block.blockType || 'Content'} block
                </p>
                {block.heading && (
                  <p className="font-medium mt-1">{block.heading}</p>
                )}
              </div>
            )
        }
      })}
    </div>
  )
}
