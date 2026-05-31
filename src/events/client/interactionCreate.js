'use strict';

const { Events, InteractionType } = require('discord.js');
const logger = require('../../utils/logger');
const { routeComponent } = require('../../handlers/componentHandler');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    try {
      // ── Slash Commands ────────────────────────────────────
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        // Cooldown check
        const cooldowns = client.cooldowns;
        const key = `${interaction.user.id}:${interaction.commandName}`;
        const now = Date.now();
        const cooldownMs = (command.cooldown ?? 3) * 1000;

        if (cooldowns.has(key)) {
          const expiresAt = cooldowns.get(key);
          if (now < expiresAt) {
            const remaining = ((expiresAt - now) / 1000).toFixed(1);
            return interaction.reply({
              content: `⏳ Please wait **${remaining}s** before using \`/${interaction.commandName}\` again.`,
              flags: 64, // ephemeral
            });
          }
        }

        cooldowns.set(key, now + cooldownMs);
        setTimeout(() => cooldowns.delete(key), cooldownMs);

        await command.execute(interaction, client);
        return;
      }

      // ── Buttons & Select Menus ────────────────────────────
      if (interaction.isButton() || interaction.isStringSelectMenu()) {
        await routeComponent(interaction, client);
        return;
      }

      // ── Autocomplete ──────────────────────────────────────
      if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (command?.autocomplete) {
          await command.autocomplete(interaction, client);
        }
        return;
      }

      // ── Modals ────────────────────────────────────────────
      if (interaction.type === InteractionType.ModalSubmit) {
        await routeComponent(interaction, client);
      }
    } catch (err) {
      logger.error(`[InteractionCreate] ${err.message}`);
      const payload = {
        content: '❌ An error occurred while processing this interaction.',
        flags: 64,
      };
      if (interaction.replied || interaction.deferred) {
        interaction.followUp(payload).catch(() => {});
      } else {
        interaction.reply(payload).catch(() => {});
      }
    }
  },
};
