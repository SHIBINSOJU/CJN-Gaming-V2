'use strict';

const { PermissionFlagsBits } = require('discord.js');
const WhitelistConfig = require('../../models/WhitelistConfig');
const WhitelistApplication = require('../../models/WhitelistApplication');
const { buildReviewDeclined } = require('../../utils/whitelistBuilder');
const logger = require('../../utils/logger');

module.exports = {
  customId: 'wl_decline_modal', // Prefix matched by componentHandler.js

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

      // Parse application ID from custom_id: "wl_decline_modal:applicationId"
      const [, applicationId] = interaction.customId.split(':');
      if (!applicationId) {
        return interaction.reply({ content: '❌ Invalid review action: Missing application ID.', flags: 64 });
      }

      const reason = interaction.fields.getTextInputValue('reason').trim();

      // ── Concurrency & Double-action Guard ────────────────────
      // Atomically find the application and shift its state to declined
      const application = await WhitelistApplication.findOneAndUpdate(
        { _id: applicationId, status: 'pending' },
        {
          status: 'declined',
          staffReviewer: user.id,
          reviewTimestamp: new Date(),
          declineReason: reason,
        },
        { new: true }
      );

      if (!application) {
        return interaction.reply({
          content: '❌ This application has already been processed or is no longer pending.',
          flags: 64,
        });
      }

      // ── Update Review Card Layout (Disable review buttons) ──
      const declinedPayload = buildReviewDeclined(application, user, reason);
      await interaction.update(declinedPayload);

      logger.info(`[wlDeclineModal] Application ${applicationId} declined by staff ${user.tag}. Reason: ${reason}`);

      // ── Send Rejection DM to Applicant ──────────────────────
      const applicantUser = await interaction.client.users.fetch(application.userId).catch(() => null);
      if (applicantUser) {
        await applicantUser.send(
          `💔 **Whitelist Application Rejection Notification**\n` +
          `Hey <@${application.userId}>, unfortunately your whitelist application for **${application.ign}** has been **declined**.\n\n` +
          `**Reason:**\n` +
          `> *${reason}*`
        ).catch(() => {
          logger.warn(`[wlDeclineModal] Could not send rejection DM to ${application.userId} (DMs closed)`);
        });
      }
    } catch (err) {
      logger.error(`[wlDeclineModal] Unhandled error during rejections: ${err.message}`);
      interaction.followUp({ content: '❌ An error occurred while processing decline.', flags: 64 }).catch(() => {});
    }
  },
};
