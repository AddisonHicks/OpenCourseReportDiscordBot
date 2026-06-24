import { loadConfig } from '../src/config.js'
import { initDatabase, GuildSettingsStore } from '../src/db/guildSettings.js'
import { createBotClient } from '../src/bot/client.js'
import { createSupabaseClient } from '../src/services/supabase.js'
import { isZipWithinRadius } from '../src/services/geoFilter.js'
import { buildReportEmbed } from '../src/services/embedBuilder.js'
import { sendReportNotification } from '../src/services/discordNotify.js'

async function main(): Promise<void> {
  const config = loadConfig()
  const db = initDatabase(config.DATABASE_PATH)
  const store = new GuildSettingsStore(db)
  const supabase = createSupabaseClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY,
  )

  const { data: report, error } = await supabase
    .from('reports')
    .select(
      `id, slug, date_played, first_name, last_initial, course_id, time_of_day,
       transport_mode, walkability_notes, price_paid, holes_played, pace_of_play,
       greens_report, fairways_tees_report, maintenance_notes, other_conditions_notes,
       helpful_votes, created_at,
       courses (id, course_name, city, state, zipcode, slug, holes, course_type,
                is_user_submitted, is_approved, created_at)`,
    )
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !report) {
    console.error('Could not fetch latest report:', error)
    process.exit(1)
  }

  const guilds = store.getAllEnabled()
  console.log(`Enabled guilds: ${guilds.length}`)
  console.log(`Latest report: ${report.id} — ${report.courses.course_name}`)

  const client = createBotClient()
  await client.login(config.DISCORD_TOKEN)

  const { content, embeds, components } = buildReportEmbed(report, config.SITE_URL)

  for (const settings of guilds) {
    const inRadius = isZipWithinRadius(
      settings.center_zip,
      report.courses.zipcode,
      settings.radius_miles,
    )
    console.log(
      `Guild ${settings.guild_id}: center_zip=${settings.center_zip}, course_zip=${report.courses.zipcode}, inRadius=${inRadius}`,
    )
    if (!inRadius) continue

    const channel = await client.channels.fetch(settings.channel_id)
    await sendReportNotification(channel, { content, embeds, components })
    store.markPosted(settings.guild_id, report.id)
    console.log(`Posted to channel ${settings.channel_id}`)
  }

  await client.destroy()
  db.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
