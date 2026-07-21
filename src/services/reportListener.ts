import type { Client } from 'discord.js'
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { sendReportNotification } from './discordNotify.js'
import type { GuildSettingsStore } from '../db/guildSettings.js'
import { isZipWithinRadius } from './geoFilter.js'
import { buildReportEmbed } from './embedBuilder.js'
import { fetchReportWithCourse } from './supabase.js'

const RECONNECT_DELAY_MS = 5_000
const HEALTH_LOG_INTERVAL_MS = 15 * 60 * 1000

export function startReportListener(
  supabase: SupabaseClient,
  client: Client,
  store: GuildSettingsStore,
  siteUrl: string,
): void {
  let activeChannel: RealtimeChannel | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let subscriptionId = 0
  let shuttingDown = false

  const enabledCount = store.getAllEnabled().length
  console.log(`Report listener starting (${enabledCount} enabled guild(s))`)

  const clearReconnect = (): void => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const scheduleReconnect = (reason: string): void => {
    if (shuttingDown) return
    clearReconnect()
    console.warn(
      `Realtime reconnect scheduled in ${RECONNECT_DELAY_MS}ms (${reason})`,
    )
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      void subscribe()
    }, RECONNECT_DELAY_MS)
  }

  const subscribe = async (): Promise<void> => {
    if (shuttingDown) return

    if (activeChannel) {
      try {
        await supabase.removeChannel(activeChannel)
      } catch (err) {
        console.warn('Failed to remove previous Realtime channel:', err)
      }
      activeChannel = null
    }

    subscriptionId += 1
    const channelName = `reports-insert-${subscriptionId}`
    const channel = supabase
      .channel(channelName)
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

        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          scheduleReconnect(status)
        }
      })

    activeChannel = channel
  }

  void subscribe()

  const healthTimer = setInterval(() => {
    const guilds = store.getAllEnabled()
    console.log(
      `Health: Discord=${client.isReady() ? 'ready' : 'not-ready'}, enabledGuilds=${guilds.length}, realtimeChannel=${activeChannel?.state ?? 'none'}`,
    )
  }, HEALTH_LOG_INTERVAL_MS)
  healthTimer.unref?.()

  const shutdown = (): void => {
    shuttingDown = true
    clearReconnect()
    clearInterval(healthTimer)
    if (activeChannel) {
      void supabase.removeChannel(activeChannel)
    }
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
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
    console.log(
      `Report ${reportId}: no enabled guilds configured (run /setup and /settings location)`,
    )
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
      await sendReportNotification(channel, { content, embeds, components })
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
