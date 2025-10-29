// Cloudflare Pages middleware for PayloadCMS
// This file handles the D1 binding for PayloadCMS in Cloudflare Pages

import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const onRequest: PagesFunction = async (context) => {
  // Make the D1 binding available to PayloadCMS
  // The binding is available as context.env.DB in Cloudflare Pages
  if (context.env.DB) {
    // Set the binding in globalThis so PayloadCMS can access it
    (globalThis as any).DB = context.env.DB
  }

  // Continue with the request
  return context.next()
}
