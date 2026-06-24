import type { Client, TextChannel } from 'discord.js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { GuildSettingsStore } from '../db/guildSettings.js'
import { isZipWithinRadius } from './geoFilter.js'
import { buildReportEmbed } from './embedBuilder.js'
import { fetchReportWithCourse } from './supabase.js'

export function startReportListener(
  supabase: SupabaseClient,
  client: Client,
  store: GuildSettingsStore,
  siteUrl: string,
): void {
  const channel = supabase
    .channel('reports-insert')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'reports' },
      async (payload) => {
        const reportId = (payload.new as { id?: string })?.id
        if (!reportId) {
          console.warn('Realtime payload missing report id')
          return
        }
        console.log(`New report received via Realtime: ${reportId}`)
        await handleNewReport(reportId, client, supabase, store, siteUrl)
      },
    )
    .subscribe((status, err) => {
      console.log(`Supabase Realtime subscription: ${status}`)
      if (err) console.error('Realtime subscription error:', err)
    })

  process.on('SIGINT', () => {
    void supabase.removeChannel(channel)
  })
  process.on('SIGTERM', () => {
    void supabase.removeChannel(channel)
  })
}

async function handleNewReport(
  reportId: string,
  client: Client,
  supabase: SupabaseClient,
  store: GuildSettingsStore,
  siteUrl: string,
): Promise<void> {
  const report = await fetchReportWithCourse(supabase, reportId)
  if (!report?.courses) {
    console.warn(`Could not load report ${reportId} with course`)
    return
  }

  const guilds = store.getAllEnabled()
  if (guilds.length === 0) {
    console.log(`Report ${reportId}: no enabled guilds configured`)
    return
  }

  const courseZip = report.courses.zipcode
  const { content, embeds, components } = buildReportEmbed(report, siteUrl)

  for (const settings of guilds) {
    if (store.hasPosted(settings.guild_id, reportId)) {
      console.log(`Report ${reportId}: already posted to guild ${settings.guild_id}`)
      continue
    }

    if (!isZipWithinRadius(settings.center_zip, courseZip, settings.radius_miles)) {
      console.log(
        `Report ${reportId}: skipped guild ${settings.guild_id} (outside ${settings.radius_miles}mi of ${settings.city}, ${settings.state})`,
      )
      continue
    }

    try {
      const channel = await client.channels.fetch(settings.channel_id)
      if (!channel?.isTextBased() || channel.isDMBased()) {
        console.warn(
          `Channel ${settings.channel_id} not found or not text-based for guild ${settings.guild_id}`,
        )
        continue
      }

      await (channel as TextChannel).send({ content, embeds, components })
      store.markPosted(settings.guild_id, reportId)
      console.log(
        `Posted report ${reportId} to guild ${settings.guild_id} channel ${settings.channel_id}`,
      )
    } catch (err) {
      console.error(
        `Failed to post report ${reportId} to guild ${settings.guild_id}:`,
        err,
      )
    }
  }
}
