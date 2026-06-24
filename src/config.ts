import { config as loadEnv } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'

function loadEnvFiles(): void {
  const root = process.cwd()
  const envPath = path.join(root, '.env')
  const localPath = path.join(root, '.env.local')

  if (fs.existsSync(envPath)) {
    loadEnv({ path: envPath })
  }
  if (fs.existsSync(localPath)) {
    loadEnv({ path: localPath, override: true })
  }
}

loadEnvFiles()
function trimEnv(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, '')
}

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1).transform(trimEnv),
  DISCORD_CLIENT_ID: z.string().min(1).transform(trimEnv),
  SUPABASE_URL: z.string().url().transform(trimEnv),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).transform(trimEnv),
  SITE_URL: z.string().url().default('https://open-course-report.vercel.app'),
  DATABASE_PATH: z.string().default('./data/bot.db'),
})

export type Env = z.infer<typeof envSchema>

export function loadConfig(): Env {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
    process.exit(1)
  }
  return {
    ...parsed.data,
    SITE_URL: parsed.data.SITE_URL.replace(/\/$/, ''),
  }
}
