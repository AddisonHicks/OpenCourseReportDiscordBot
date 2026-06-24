import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js'
import type { GuildSettingsStore } from '../../db/guildSettings.js'
import {
  isSetupChannelType,
  SETUP_CHANNEL_TYPES,
  validateNotificationPermissions,
} from '../../services/discordNotify.js'

export const setupCommand = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure the OpenCourseReport notification channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription('Text channel or an existing forum thread for new reports')
      .addChannelTypes(...SETUP_CHANNEL_TYPES)
      .setRequired(true),
  )

function setupConfirmation(channelName: string, channelType: ChannelType): string {
  const lines = [`Notification target set to ${channelName}.`]

  if (
    channelType === ChannelType.PublicThread ||
    channelType === ChannelType.PrivateThread ||
    channelType === ChannelType.AnnouncementThread
  ) {
    lines.push('', 'New reports will be posted in that **thread**.')
  }

  lines.push('', 'Next, configure your area filter:', '`/settings city:YourCity state:OR radius:75`')
  return lines.join('\n')
}

export async function handleSetup(
  interaction: ChatInputCommandInteraction,
  store: GuildSettingsStore,
): Promise<void> {
  const channelOption = interaction.options.getChannel('channel', true)
  const guild = interaction.guild
  if (!guild) {
    await interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    })
    return
  }

  const channel = await guild.channels.fetch(channelOption.id)
  if (!channel || !isSetupChannelType(channel.type)) {
    await interaction.reply({
      content:
        'Please choose a text channel or an existing thread inside a forum.',
      ephemeral: true,
    })
    return
  }

  const me = guild.members.me
  const permissionError = validateNotificationPermissions(channel, me!)
  if (permissionError) {
    await interaction.reply({
      content: permissionError,
      ephemeral: true,
    })
    return
  }

  store.setChannel(guild.id, channel.id)

  await interaction.reply({
    content: setupConfirmation(`${channel}`, channel.type),
    ephemeral: true,
  })
}
