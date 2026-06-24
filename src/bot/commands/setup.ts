import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js'
import type { GuildSettingsStore } from '../../db/guildSettings.js'
import { resolveSetupTarget } from '../../services/discordNotify.js'

export const setupCommand = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure where OpenCourseReport posts new reports')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName('channel')
      .setDescription('Post to a text or announcement channel')
      .addChannelOption((option) =>
        option
          .setName('channel')
          .setDescription('Text or announcement channel')
          .addChannelTypes(
            ChannelType.GuildText,
            ChannelType.GuildAnnouncement,
          )
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('forum-post')
      .setDescription('Post inside an existing forum post (not the forum itself)')
      .addChannelOption((option) =>
        option
          .setName('forum')
          .setDescription('Forum channel that contains the post')
          .addChannelTypes(ChannelType.GuildForum)
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName('post')
          .setDescription('Exact title of the existing forum post')
          .setRequired(true),
      ),
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
    '`/settings location city:YourCity state:OR radius:75`',
  )
  return lines.join('\n')
}

export async function handleSetup(
  interaction: ChatInputCommandInteraction,
  store: GuildSettingsStore,
): Promise<void> {
  const sub = interaction.options.getSubcommand()
  const guild = interaction.guild
  if (!guild) {
    await interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    })
    return
  }

  const me = guild.members.me!

  if (sub === 'channel') {
    const channelOption = interaction.options.getChannel('channel', true)
    const channel = await guild.channels.fetch(channelOption.id)
    if (
      !channel ||
      (channel.type !== ChannelType.GuildText &&
        channel.type !== ChannelType.GuildAnnouncement)
    ) {
      await interaction.reply({
        content: 'Please choose a text or announcement channel.',
        ephemeral: true,
      })
      return
    }

    const resolved = await resolveSetupTarget(guild, channel, null, me)
    if (!resolved.ok) {
      await interaction.reply({ content: resolved.error, ephemeral: true })
      return
    }

    store.setChannel(guild.id, resolved.channel.id)
    await interaction.reply({
      content: setupConfirmation(resolved.label, false),
      ephemeral: true,
    })
    return
  }

  if (sub === 'forum-post') {
    const forumOption = interaction.options.getChannel('forum', true)
    const postName = interaction.options.getString('post', true)
    const forum = await guild.channels.fetch(forumOption.id)

    if (!forum || forum.type !== ChannelType.GuildForum) {
      await interaction.reply({
        content: 'Please choose a forum channel.',
        ephemeral: true,
      })
      return
    }

    const resolved = await resolveSetupTarget(guild, forum, postName, me)
    if (!resolved.ok) {
      await interaction.reply({ content: resolved.error, ephemeral: true })
      return
    }

    store.setChannel(guild.id, resolved.channel.id)
    await interaction.reply({
      content: setupConfirmation(resolved.label, true),
      ephemeral: true,
    })
  }
}
