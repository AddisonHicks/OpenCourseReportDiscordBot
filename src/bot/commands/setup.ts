import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js'
import type { GuildSettingsStore } from '../../db/guildSettings.js'

export const setupCommand = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure the OpenCourseReport notification channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription('Channel where new reports will be posted')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true),
  )

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
  if (
    !channel ||
    (channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.GuildAnnouncement)
  ) {
    await interaction.reply({
      content: 'Please choose a text channel.',
      ephemeral: true,
    })
    return
  }

  const me = guild.members.me
  const perms = channel.permissionsFor(me!)
  if (
    !perms?.has(PermissionFlagsBits.SendMessages) ||
    !perms?.has(PermissionFlagsBits.EmbedLinks)
  ) {
    await interaction.reply({
      content:
        'I need **Send Messages** and **Embed Links** permissions in that channel.',
      ephemeral: true,
    })
    return
  }

  store.setChannel(guild.id, channel.id)

  await interaction.reply({
    content: [
      `Notification channel set to ${channel}.`,
      '',
      'Next, configure your area filter:',
      '`/settings city:YourCity state:OR radius:75`',
    ].join('\n'),
    ephemeral: true,
  })
}
