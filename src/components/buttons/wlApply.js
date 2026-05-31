'use strict';

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const WhitelistConfig = require('../../models/WhitelistConfig');
const WhitelistApplication = require('../../models/WhitelistApplication');
const logger = require('../../utils/logger');

module.exports = {
  customId: 'wl_apply',

  async execute(interaction) {
    try {
      const { guildId, user } = interaction;

      // Check if whitelist system is configured
      const config = await WhitelistConfig.findOne({ guildId });
      if (!config) {
        return interaction.reply({
          content: '❌ The Whitelist Application System is not set up on this server yet.',
          flags: 64,
        });
      }

      // Check if applicant already has a pending or accepted whitelist application (Bypass for test user)
      if (user.id !== '1338869759441375254') {
        const existing = await WhitelistApplication.findOne({
          guildId,
          userId: user.id,
          status: { $in: ['pending', 'accepted'] },
        });

        if (existing) {
          const stateText = existing.status === 'accepted' ? 'whitelisted' : 'under review';
          return interaction.reply({
            content: `❌ You already have an active application that is **${stateText}**!`,
            flags: 64,
          });
        }
      }

      // Build the Whitelist Application Modal Form
      const modal = new ModalBuilder()
        .setCustomId('wl_modal_submit')
        .setTitle('Minecraft Whitelist Application');

      // Field 1: Discord ID (pre-filled, ignores inputs on submit for tamper safety)
      const discordInput = new TextInputBuilder()
        .setCustomId('discord_id')
        .setLabel('Discord Account (tamper-proof)')
        .setStyle(TextInputStyle.Short)
        .setValue(`${user.tag} (${user.id})`)
        .setRequired(true);

      // Field 2: Minecraft IGN
      const ignInput = new TextInputBuilder()
        .setCustomId('ign')
        .setLabel('Minecraft Username / IGN')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter your exact Minecraft name')
        .setMaxLength(32)
        .setRequired(true);

      // Field 3: Platform
      const platformInput = new TextInputBuilder()
        .setCustomId('platform')
        .setLabel('Platform (Java or Bedrock)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Type "Java" or "Bedrock"')
        .setMaxLength(16)
        .setRequired(true);

      // Field 4: Age
      const ageInput = new TextInputBuilder()
        .setCustomId('age')
        .setLabel('Your Age')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Must be a number')
        .setMaxLength(3)
        .setRequired(true);

      // Field 5: YouTube Link
      const youtubeInput = new TextInputBuilder()
        .setCustomId('youtube')
        .setLabel('YouTube Channel Link (Optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://youtube.com/@channel')
        .setRequired(false);

      // Add to action rows (max 1 input per row in Discord Modals)
      const r1 = new ActionRowBuilder().addComponents(discordInput);
      const r2 = new ActionRowBuilder().addComponents(ignInput);
      const r3 = new ActionRowBuilder().addComponents(platformInput);
      const r4 = new ActionRowBuilder().addComponents(ageInput);
      const r5 = new ActionRowBuilder().addComponents(youtubeInput);

      modal.addComponents(r1, r2, r3, r4, r5);

      // Present the modal to the user
      await interaction.showModal(modal);
    } catch (err) {
      logger.error(`[wlApply] Error opening whitelist modal: ${err.message}`);
      interaction.reply({ content: '❌ Failed to open application form. Please try again.', flags: 64 }).catch(() => {});
    }
  },
};
