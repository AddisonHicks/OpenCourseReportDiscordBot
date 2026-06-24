import {
  ChannelType,
  ForumChannel,
  PermissionFlagsBits,
  type Guild,
  type GuildBasedChannel,
  type GuildMember,
  type MessageCreateOptions,
  type ThreadChannel,
} from 'discord.js'

export const SETUP_CHANNEL_TYPES = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
] as const

export function isSetupChannelType(type: ChannelType): boolean {
  return (SETUP_CHANNEL_TYPES as readonly ChannelType[]).includes(type)
}

export function validateNotificationPermissions(
  channel: GuildBasedChannel | ThreadChannel,
  me: GuildMember,
): string | null {
  const perms = channel.permissionsFor(me)
  if (!perms) {
    return 'I cannot access that channel. Check my role permissions.'
  }

  if (!perms.has(PermissionFlagsBits.EmbedLinks)) {
    return 'I need **Embed Links** permission in that channel.'
  }

  if (channel.type === ChannelType.GuildForum) {
    if (!perms.has(PermissionFlagsBits.ViewChannel)) {
      return 'I need **View Channel** permission for that forum.'
    }
    if (!perms.has(PermissionFlagsBits.SendMessagesInThreads)) {
      return 'I need **Send Messages in Threads** permission in that forum.'
    }
    return null
  }

  if (channel.isThread()) {
    if (!perms.has(PermissionFlagsBits.SendMessagesInThreads)) {
      return 'I need **Send Messages in Threads** permission in that post.'
    }
    return null
  }

  if (!perms.has(PermissionFlagsBits.SendMessages)) {
    return 'I need **Send Messages** permission in that channel.'
  }

  return null
}

async function findForumPostByName(
  forum: ForumChannel,
  postName: string,
): Promise<ThreadChannel | null> {
  const target = postName.trim().toLowerCase()
  if (!target) return null

  const active = await forum.threads.fetchActive()
  const matchActive = active.threads.find(
    (thread) => thread.name.toLowerCase() === target,
  )
  if (matchActive) return matchActive

  const archived = await forum.threads.fetchArchived({ limit: 100 })
  return (
    archived.threads.find((thread) => thread.name.toLowerCase() === target) ??
    null
  )
}

export type SetupTargetResult =
  | { ok: true; channel: ThreadChannel | GuildBasedChannel; label: string }
  | { ok: false; error: string }

/** Resolve text channel, forum post (thread), or thread selected directly. */
export async function resolveSetupTarget(
  guild: Guild,
  channel: GuildBasedChannel,
  postName: string | null,
  me: GuildMember,
): Promise<SetupTargetResult> {
  if (channel.type === ChannelType.GuildForum) {
    if (!postName?.trim()) {
      return {
        ok: false,
        error:
          'When you pick a **forum channel**, also provide the **post** name of an existing forum post to post into. The bot does not create new posts.',
      }
    }

    const forumError = validateNotificationPermissions(channel, me)
    if (forumError) return { ok: false, error: forumError }

    const forum = channel as ForumChannel
    const post = await findForumPostByName(forum, postName)
    if (!post) {
      return {
        ok: false,
        error: `No forum post named **${postName.trim()}** was found in ${forum}. Create that post first, then run \`/setup\` again.`,
      }
    }

    const postError = validateNotificationPermissions(post, me)
    if (postError) return { ok: false, error: postError }

    return {
      ok: true,
      channel: post,
      label: `post **${post.name}** in ${forum}`,
    }
  }

  const permissionError = validateNotificationPermissions(channel, me)
  if (permissionError) return { ok: false, error: permissionError }

  if (postName?.trim()) {
    return {
      ok: false,
      error:
        'The **post** option is only used when **channel** is a forum. For a text channel or thread, leave **post** empty.',
    }
  }

  if (channel.isThread()) {
    return {
      ok: true,
      channel,
      label: `forum post **${channel.name}**`,
    }
  }

  return { ok: true, channel, label: `${channel}` }
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
