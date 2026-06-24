import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js'
import type { GuildSettingsStore } from '../../db/guildSettings.js'
import {
  DEFAULT_RADIUS_MILES,
  normalizeStateInput,
  suggestZipFromCityState,
} from '../../services/geoFilter.js'

export const settingsCommand = new SlashCommandBuilder()
  .setName('settings')
  .setDescription('View or update OpenCourseReport bot settings')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub.setName('view').setDescription('Show current bot settings'),
  )
  .addSubcommand((sub) =>
    sub
      .setName('location')
      .setDescription('Set city, state, and radius for report filtering')
      .addStringOption((opt) =>
        opt.setName('city').setDescription('City name').setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName('state')
          .setDescription('US state code or name (e.g. OR or Oregon)')
          .setRequired(true),
      )
      .addIntegerOption((opt) =>
        opt
          .setName('radius')
          .setDescription(`Radius in miles (default ${DEFAULT_RADIUS_MILES})`)
          .setMinValue(1)
          .setMaxValue(500),
      ),
  )
  .addSubcommand((sub) =>
    sub.setName('disable').setDescription('Pause report notifications'),
  )
  .addSubcommand((sub) =>
    sub.setName('enable').setDescription('Resume report notifications'),
  )

export async function handleSettings(
  interaction: ChatInputCommandInteraction,
  store: GuildSettingsStore,
): Promise<void> {
  const sub = interaction.options.getSubcommand()
  const guildId = interaction.guildId
  if (!guildId) {
    await interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    })
    return
  }

  if (sub === 'view') {
    const settings = store.get(guildId)
    if (!settings) {
      await interaction.reply({
        content: 'Bot is not configured yet. Run `/setup` first.',
        ephemeral: true,
      })
      return
    }

    const channel = interaction.guild?.channels.cache.get(settings.channel_id)
    const channelLabel = channel ? `${channel}` : `<#${settings.channel_id}>`
    const location =
      settings.city && settings.state
        ? `${settings.city}, ${settings.state} (${settings.radius_miles} mi)`
        : '_Not set — run `/settings location`_'
    const status = settings.enabled ? 'Enabled' : 'Disabled'

    await interaction.reply({
      content: [
        '**OpenCourseReport Bot Settings**',
        `Channel: ${channelLabel}`,
        `Location: ${location}`,
        `Status: ${status}`,
      ].join('\n'),
      ephemeral: true,
    })
    return
  }

  if (sub === 'disable') {
    try {
      store.setEnabled(guildId, false)
      await interaction.reply({
        content: 'Report notifications are now **disabled**.',
        ephemeral: true,
      })
    } catch {
      await interaction.reply({
        content: 'Run `/setup` first to configure the bot.',
        ephemeral: true,
      })
    }
    return
  }

  if (sub === 'enable') {
    const settings = store.get(guildId)
    if (!settings?.center_zip) {
      await interaction.reply({
        content:
          'Set your location first with `/settings location` before enabling notifications.',
        ephemeral: true,
      })
      return
    }
    store.setEnabled(guildId, true)
    await interaction.reply({
      content: 'Report notifications are now **enabled**.',
      ephemeral: true,
    })
    return
  }

  if (sub === 'location') {
    const existing = store.get(guildId)
    if (!existing) {
      await interaction.reply({
        content: 'Run `/setup` first to choose a notification channel.',
        ephemeral: true,
      })
      return
    }

    const city = interaction.options.getString('city', true).trim()
    const stateInput = interaction.options.getString('state', true)
    const state = normalizeStateInput(stateInput)
    if (!state) {
      await interaction.reply({
        content: 'Invalid state. Use a two-letter US state code or full state name.',
        ephemeral: true,
      })
      return
    }

    const radius =
      interaction.options.getInteger('radius') ?? DEFAULT_RADIUS_MILES
    const centerZip = suggestZipFromCityState(city, state)
    if (!centerZip) {
      await interaction.reply({
        content: `Could not find a zip code for **${city}, ${state}**. Check the city spelling and try again.`,
        ephemeral: true,
      })
      return
    }

    store.setLocation(guildId, city, state, radius, centerZip)
    await interaction.reply({
      content: [
        'Location filter updated.',
        `**${city}, ${state}** within **${radius} miles**`,
        'Notifications are now **enabled**.',
      ].join('\n'),
      ephemeral: true,
    })
  }
}
