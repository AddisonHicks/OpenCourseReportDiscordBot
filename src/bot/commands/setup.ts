import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js'
import type { GuildSettingsStore } from '../../db/guildSettings.js'
import {
  isSetupChannelType,
  resolveSetupTarget,
  SETUP_CHANNEL_TYPES,
} from '../../services/discordNotify.js'

export const setupCommand = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure where OpenCourseReport posts new reports')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription(
        'Text channel, forum channel, or an existing forum post (thread)',
      )
      .addChannelTypes(...SETUP_CHANNEL_TYPES)
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('post')
      .setDescription(
        'Name of an existing forum post (required when channel is a forum)',
      )
      .setRequired(false),
  )

function setupConfirmation(label: string, isForumPost: boolean): string {
  const lines = [`Notification target set to ${label}.`]

  if (isForumPost) {
    lines.push(
      '',
      'New reports will be posted as **messages inside that forum post**.',
    )
  }

  lines.push(
    '',
    'Next, configure your area filter:',
    '`/settings city:YourCity state:OR radius:75`',
  )
  return lines.join('\n')
}

export async function handleSetup(
  interaction: ChatInputCommandInteraction,
  store: GuildSettingsStore,
): Promise<void> {
  const channelOption = interaction.options.getChannel('channel', true)
  const postName = interaction.options.getString('post')
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
        'Please choose a text channel, forum channel, or existing forum post.',
      ephemeral: true,
    })
    return
  }

  const me = guild.members.me!
  const resolved = await resolveSetupTarget(guild, channel, postName, me)
  if (!resolved.ok) {
    await interaction.reply({
      content: resolved.error,
      ephemeral: true,
    })
    return
  }

  store.setChannel(guild.id, resolved.channel.id)

  const isForumPost =
    resolved.channel.isThread() || channel.type === ChannelType.GuildForum

  await interaction.reply({
    content: setupConfirmation(resolved.label, isForumPost),
    ephemeral: true,
  })
}
