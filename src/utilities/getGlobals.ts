import type { Config } from 'src/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

type Global = keyof Config['globals']

async function getGlobal(slug: Global, depth = 0) {
  try {
    const payload = await getPayload({ config: configPromise })

    // Check if Payload is properly initialized
    if (!payload || typeof payload.findGlobal !== 'function') {
      // During build time, return empty/default data
      if (process.env.NODE_ENV === 'production' && !process.env.CF_PAGES) {
        console.warn(`Skipping Payload global fetch for ${slug} during build time`)
        return {} as any
      }
    }

    const global = await payload.findGlobal({
      slug,
      depth,
    })

    return global
  } catch (error) {
    // During build time, return empty/default data if Payload initialization fails
    if (process.env.NODE_ENV === 'production' && !process.env.CF_PAGES) {
      console.warn(`Failed to fetch Payload global ${slug} during build:`, error)
      return {} as any
    }
    // At runtime, re-throw the error
    throw error
  }
}

/**
 * Returns a unstable_cache function mapped with the cache tag for the slug
 */
export const getCachedGlobal = (slug: Global, depth = 0) =>
  unstable_cache(async () => getGlobal(slug, depth), [slug], {
    tags: [`global_${slug}`],
  })
