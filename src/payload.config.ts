// storage-adapter-import-placeholder
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { s3Storage } from '@payloadcms/storage-s3'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'

import sharp from 'sharp' // sharp-import
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'
import { Booking } from './collections/Bookings'
import { Estimate } from './collections/Estimates'
import Packages from './collections/Packages'
import { AuthRequests } from './collections/AuthRequests'
//import analyticsRouter from '@/app/api/analytics/route'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      afterDashboard: ['@/components/AnalyticsDashboardData/AnalyticsDashboard'],
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeLogin` statement on line 15.
      //beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below and the import `BeforeDashboard` statement on line 15.
      //beforeDashboard: ['@/components/BeforeDashboard'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: (() => {
    // Check if we're in a build context where D1 binding might not be available
    const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.CF_PAGES
    const isCloudflarePages = process.env.CF_PAGES === '1'
    
    // For Cloudflare Pages, we need to handle the binding differently
    if (isCloudflarePages) {
      // In Cloudflare Pages, the binding will be available at runtime through the middleware
      // Return a mock binding for build time that will be replaced at runtime
      return sqliteD1Adapter({
        binding: {
          prepare: () => Promise.resolve({ run: () => Promise.resolve(), all: () => Promise.resolve([]) }),
          run: () => Promise.resolve(),
          all: () => Promise.resolve([]),
          batch: () => Promise.resolve([]),
          exec: () => Promise.resolve()
        } as any
      })
    }
    
    // For local development or when binding is available
    try {
      // Try to get binding from Cloudflare runtime context
      let binding = null
      
      if (typeof process !== 'undefined' && (process.env as any).DB) {
        binding = (process.env as any).DB
      } else if (typeof globalThis !== 'undefined' && (globalThis as any).DB) {
        binding = (globalThis as any).DB
      }
      
      if (binding) {
        return sqliteD1Adapter({ binding })
      }
      
      // If no binding found and not in build context, throw error
      if (!isBuildTime) {
        throw new Error(
          'D1 database binding not found. ' +
          'For local development, run: npm run dev:cloudflare ' +
          'For Cloudflare deployment, ensure the DB binding is configured in your Cloudflare settings.'
        )
      }
      
      // For build time, return a mock adapter
      return sqliteD1Adapter({
        binding: {
          prepare: () => Promise.resolve({ run: () => Promise.resolve(), all: () => Promise.resolve([]) }),
          run: () => Promise.resolve(),
          all: () => Promise.resolve([]),
          batch: () => Promise.resolve([]),
          exec: () => Promise.resolve()
        } as any
      })
    } catch (error) {
      // If we're in build context, return a mock adapter
      if (isBuildTime) {
        return sqliteD1Adapter({
          binding: {
            prepare: () => Promise.resolve({ run: () => Promise.resolve(), all: () => Promise.resolve([]) }),
            run: () => Promise.resolve(),
            all: () => Promise.resolve([]),
            batch: () => Promise.resolve([]),
            exec: () => Promise.resolve()
          } as any
        })
      }
      throw error
    }
  })(),
  email: process.env.SMTP_HOST
    ? nodemailerAdapter({
        defaultFromAddress: process.env.EMAIL_FROM_ADDRESS || 'no-reply@localhost',
        defaultFromName: process.env.EMAIL_FROM_NAME || 'Betaplek',
        transportOptions: {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        },
      })
    : nodemailerAdapter(),
  collections: [Booking, Estimate, Pages, Posts, Media, Categories, Users, Packages, AuthRequests],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer],
  plugins: [
    ...plugins,
    s3Storage({
      bucket: process.env.R2_BUCKET || '',
      config: {
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
        region: process.env.R2_REGION || '',
        endpoint: process.env.R2_ENDPOINT, // Optional: for S3-compatible storage like Cloudflare R2
        forcePathStyle: true, // Optional: often needed for S3-compatible storage
      },
      collections: {
        media: true,
      },
    }),
  ],
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${process.env.CRON_SECRET}`
      },
    },
    tasks: [],
  },
})
