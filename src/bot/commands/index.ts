import { REST, Routes, type Client } from 'discord.js'
import { setupCommand, handleSetup } from './setup.js'
import { settingsCommand, handleSettings } from './settings.js'
import type { GuildSettingsStore } from '../../db/guildSettings.js'

const commands = [setupCommand.toJSON(), settingsCommand.toJSON()]

async function registerGuildCommands(
  rest: REST,
  clientId: string,
  guildId: string,
): Promise<void> {
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: commands,
  })
}

/** Guild commands update instantly; global commands can take up to an hour. */
export async function registerCommands(
  token: string,
  clientId: string,
  client: Client,
): Promise<void> {
  const rest = new REST().setToken(token)
  console.log('Registering slash commands...')

  // Remove stale global commands so Discord does not show outdated /setup.
  await rest.put(Routes.applicationCommands(clientId), { body: [] })

  const guildIds = [...client.guilds.cache.keys()]
  for (const guildId of guildIds) {
    await registerGuildCommands(rest, clientId, guildId)
  }

  console.log(`Slash commands registered for ${guildIds.length} server(s).`)
}

export async function registerCommandsForGuild(
  token: string,
  clientId: string,
  guildId: string,
): Promise<void> {
  const rest = new REST().setToken(token)
  await registerGuildCommands(rest, clientId, guildId)
  console.log(`Slash commands registered for guild ${guildId}.`)
}

export function registerInteractionHandler(
  client: Client,
  store: GuildSettingsStore,
  token: string,
  clientId: string,
): void {
  client.on('guildCreate', async (guild) => {
    try {
      await registerCommandsForGuild(token, clientId, guild.id)
    } catch (err) {
      console.error(`Failed to register commands for guild ${guild.id}:`, err)
    }
  })

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return

    try {
      if (interaction.commandName === 'setup') {
        await handleSetup(interaction, store)
      } else if (interaction.commandName === 'settings') {
        await handleSettings(interaction, store)
      }
    } catch (err) {
      console.error('Command error:', err)
      const msg = 'Something went wrong processing that command.'
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: msg, ephemeral: true })
      } else {
        await interaction.reply({ content: msg, ephemeral: true })
      }
    }
  })
}
