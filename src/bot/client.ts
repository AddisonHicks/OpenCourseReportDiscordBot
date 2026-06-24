import {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits,
} from 'discord.js'
import { buildWelcomeEmbed } from '../services/embedBuilder.js'

export function createBotClient(): Client {
  return new Client({
    intents: [GatewayIntentBits.Guilds],
  })
}

export function registerGuildJoinHandler(client: Client): void {
  client.on(Events.GuildCreate, async (guild) => {
    const embed = buildWelcomeEmbed()
    const channel = guild.channels.cache
      .filter(
        (ch) =>
          ch.type === ChannelType.GuildText &&
          ch.permissionsFor(guild.members.me!)?.has([
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
          ]),
      )
      .first()

    if (channel?.isTextBased() && !channel.isDMBased()) {
      try {
        await channel.send({ embeds: [embed] })
      } catch (err) {
        console.warn(`Could not send welcome message in guild ${guild.id}:`, err)
      }
    }
  })
}
