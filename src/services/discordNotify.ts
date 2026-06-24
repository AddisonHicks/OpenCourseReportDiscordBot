import {
  ChannelType,
  PermissionFlagsBits,
  type GuildMember,
  type MessageCreateOptions,
} from 'discord.js'
import type { GuildBasedChannel } from 'discord.js'

export const SETUP_CHANNEL_TYPES = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
] as const

export function isSetupChannelType(type: ChannelType): boolean {
  return (SETUP_CHANNEL_TYPES as readonly ChannelType[]).includes(type)
}

export function validateNotificationPermissions(
  channel: GuildBasedChannel,
  me: GuildMember,
): string | null {
  const perms = channel.permissionsFor(me)
  if (!perms) {
    return 'I cannot access that channel. Check my role permissions.'
  }

  if (!perms.has(PermissionFlagsBits.EmbedLinks)) {
    return 'I need **Embed Links** permission in that channel.'
  }

  if (channel.isThread()) {
    if (!perms.has(PermissionFlagsBits.SendMessagesInThreads)) {
      return 'I need **Send Messages in Threads** permission in that thread.'
    }
    return null
  }

  if (!perms.has(PermissionFlagsBits.SendMessages)) {
    return 'I need **Send Messages** permission in that channel.'
  }

  return null
}

export async function sendReportNotification(
  channel: Awaited<ReturnType<typeof import('discord.js').Client.prototype.channels.fetch>>,
  payload: MessageCreateOptions,
): Promise<void> {
  if (!channel) {
    throw new Error('Channel not found')
  }

  if (!channel.isSendable()) {
    throw new Error('Channel is not a valid notification target')
  }

  await channel.send(payload)
}
