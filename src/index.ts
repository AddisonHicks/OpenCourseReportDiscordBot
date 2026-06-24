import { loadConfig } from './config.js'
import { initDatabase, GuildSettingsStore } from './db/guildSettings.js'
import { createBotClient, registerGuildJoinHandler } from './bot/client.js'
import {
  registerCommands,
  registerInteractionHandler,
} from './bot/commands/index.js'
import { createSupabaseClient } from './services/supabase.js'
import { startReportListener } from './services/reportListener.js'

async function main(): Promise<void> {
  const config = loadConfig()

  const db = initDatabase(config.DATABASE_PATH)
  const store = new GuildSettingsStore(db)

  const supabase = createSupabaseClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY,
  )

  const client = createBotClient()
  registerGuildJoinHandler(client)
  registerInteractionHandler(
    client,
    store,
    config.DISCORD_TOKEN,
    config.DISCORD_CLIENT_ID,
  )

  client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}`)
    await registerCommands(
      config.DISCORD_TOKEN,
      config.DISCORD_CLIENT_ID,
      client,
    )
    startReportListener(supabase, client, store, config.SITE_URL)
  })

  await client.login(config.DISCORD_TOKEN)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
