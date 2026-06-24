import { REST, Routes } from 'discord.js'
import { setupCommand, handleSetup } from './setup.js'
import { settingsCommand, handleSettings } from './settings.js'
import type { GuildSettingsStore } from '../../db/guildSettings.js'

const commands = [setupCommand.toJSON(), settingsCommand.toJSON()]

export async function registerCommands(
  token: string,
  clientId: string,
): Promise<void> {
  const rest = new REST().setToken(token)
  console.log('Registering slash commands...')
  await rest.put(Routes.applicationCommands(clientId), { body: commands })
  console.log('Slash commands registered.')
}

export function registerInteractionHandler(
  client: import('discord.js').Client,
  store: GuildSettingsStore,
): void {
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
