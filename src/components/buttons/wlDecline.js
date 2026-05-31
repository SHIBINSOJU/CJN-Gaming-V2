'use strict';

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const WhitelistConfig = require('../../models/WhitelistConfig');
const WhitelistApplication = require('../../models/WhitelistApplication');
const logger = require('../../utils/logger');

module.exports = {
  customId: 'wl_decline',

  async execute(interaction) {
    try {
      const { guildId, user, guild } = interaction;

      // Fetch Whitelist System configuration
      const config = await WhitelistConfig.findOne({ guildId });
      if (!config) {
        return interaction.reply({ content: '❌ Whitelist system configuration not found.', flags: 64 });
      }

      // ── Staff Authorization Check ───────────────────────────
      const staffMember = await guild.members.fetch(user.id).catch(() => null);
      if (!staffMember) {
        return interaction.reply({ content: '❌ Failed to fetch your server membership.', flags: 64 });
      }

      const isStaff =
        staffMember.roles.cache.has(config.staffRoleId) ||
        staffMember.permissions.has(PermissionFlagsBits.ManageGuild);

      if (!isStaff) {
        return interaction.reply({
          content: '❌ You must be a configured Whitelist Staff member to decline applications.',
          flags: 64,
        });
      }

      // Parse application ID from custom_id: "wl_decline:applicationId"
      const [, applicationId] = interaction.customId.split(':');
      if (!applicationId) {
        return interaction.reply({ content: '❌ Invalid review action: Missing application ID.', flags: 64 });
      }

      // ── Concurrency & Double-action Guard ────────────────────
      const application = await WhitelistApplication.findOne({ _id: applicationId });
      if (!application || application.status !== 'pending') {
        return interaction.reply({
          content: '❌ This application has already been processed or is no longer pending.',
          flags: 64,
        });
      }

      // ── Open Decline Reason Modal ────────────────────────────
      const modal = new ModalBuilder()
        .setCustomId(`wl_decline_modal:${applicationId}`)
        .setTitle('Decline Whitelist Application');

      const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Reason for Declining')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Provide a reason for rejection (this will be DM\'d to the applicant)')
        .setMaxLength(300)
        .setRequired(true);

      const actionRow = new ActionRowBuilder().addComponents(reasonInput);
      modal.addComponents(actionRow);

      await interaction.showModal(modal);
    } catch (err) {
      logger.error(`[wlDecline] Error opening decline modal: ${err.message}`);
      interaction.reply({ content: '❌ Failed to open decline form. Please try again.', flags: 64 }).catch(() => {});
    }
  },
};
