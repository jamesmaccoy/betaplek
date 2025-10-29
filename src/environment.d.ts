declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Database configuration
      DATABASE_URI?: string // MongoDB (legacy, not used with D1)
      DB?: any // D1 Database binding (Cloudflare)
      
      // Application configuration
      NEXT_PUBLIC_SERVER_URL: string
      PAYLOAD_SECRET: string
      VERCEL_PROJECT_PRODUCTION_URL?: string
      
      // Email configuration
      SMTP_HOST?: string
      SMTP_USER?: string
      SMTP_PASS?: string
      SMTP_PORT?: string
      SMTP_SECURE?: string
      EMAIL_FROM_ADDRESS?: string
      EMAIL_FROM_NAME?: string
      
      // R2 Storage configuration
      R2_BUCKET?: string
      R2_ACCESS_KEY_ID?: string
      R2_SECRET_ACCESS_KEY?: string
      R2_REGION?: string
      R2_ENDPOINT?: string
      
      // Security
      CRON_SECRET?: string
      
      // AI/External APIs
      GEMINI_API_KEY?: string
      
      // Cloudflare-specific
      CF_PAGES?: string
      CF_PAGES_URL?: string
      CF_PAGES_BRANCH?: string
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}
