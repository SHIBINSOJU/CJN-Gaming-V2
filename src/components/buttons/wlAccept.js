'use strict';

const { PermissionFlagsBits } = require('discord.js');
const WhitelistConfig = require('../../models/WhitelistConfig');
const WhitelistApplication = require('../../models/WhitelistApplication');
const { buildReviewAccepted } = require('../../utils/whitelistBuilder');
const logger = require('../../utils/logger');

module.exports = {
  customId: 'wl_accept',

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
          content: '❌ You must be a configured Whitelist Staff member to accept applications.',
          flags: 64,
        });
      }

      // Parse application ID from custom_id: "wl_accept:applicationId"
      const [, applicationId] = interaction.customId.split(':');
      if (!applicationId) {
        return interaction.reply({ content: '❌ Invalid review action: Missing application ID.', flags: 64 });
      }

      // ── Concurrency & Double-action Guard ────────────────────
      // Atomically find the application and shift its state to accepted
      const application = await WhitelistApplication.findOneAndUpdate(
        { _id: applicationId, status: 'pending' },
        {
          status: 'accepted',
          staffReviewer: user.id,
          reviewTimestamp: new Date(),
          whitelisted: true,
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
      const acceptedPayload = buildReviewAccepted(application, user);
      await interaction.update(acceptedPayload);

      // ── applicant Discord Role Assignment ───────────────────
      const applicantMember = await guild.members.fetch(application.userId).catch(() => null);
      if (applicantMember) {
        await applicantMember.roles.add(config.whitelistRoleId).catch((err) => {
          logger.warn(`[wlAccept] Failed to add whitelist role ${config.whitelistRoleId} to user ${application.userId}: ${err.message}`);
        });
      } else {
        logger.warn(`[wlAccept] Applicant member ${application.userId} not found in guild to assign role.`);
      }

      // ── Minecraft Server Whitelist Execution (DiscordSRV) ────
      let formattedIgn = application.ign;
      if (application.platform === 'bedrock') {
        const prefix = config.bedrockPrefix ?? '.';
        formattedIgn = `${prefix}${application.ign}`;
      }

      const consoleChannel = await interaction.client.channels.fetch(config.consoleChannelId).catch(() => null);
      if (consoleChannel) {
        // Send command to the DiscordSRV console bridge channel
        await consoleChannel.send(`whitelist add ${formattedIgn}`).then(() => {
          logger.info(`[wlAccept] Whitelist command sent to DiscordSRV channel for IGN: ${formattedIgn}`);
        }).catch((err) => {
          logger.error(`[wlAccept] Failed to send whitelist command to console channel ${config.consoleChannelId}: ${err.message}`);
        });
      } else {
        logger.error(`[wlAccept] DiscordSRV console channel ${config.consoleChannelId} not found in client cache.`);
      }

      // ── Send Whitelisting Announcement to Application Channel ──────────────────
      const appChannel = await interaction.client.channels.fetch('1506973086572871740').catch(() => null);
      if (appChannel) {
        await appChannel.send(
          `🎉 **Whitelist Approved!**\n` +
          `Hey <@${application.userId}>, you have been whitelisted to **Kalki SMP**!`
        ).catch((err) => {
          logger.warn(`[wlAccept] Failed to send whitelist announcement to channel 1506973086572871740: ${err.message}`);
        });
      }

      // ── Send DM notification to applicant ───────────────────
      const applicantUser = await interaction.client.users.fetch(application.userId).catch(() => null);
      if (applicantUser) {
        const typeStr = application.platform === 'java' ? 'Java Edition' : 'Bedrock Edition';
        await applicantUser.send(
          `🎉 **Congratulations!**\n` +
          `Your whitelist application for **${application.ign}** (${typeStr}) has been **accepted**!\n` +
          `You have been whitelisted on the Minecraft server and assigned the server role in Discord.\n\n` +
          `*Please log in using your configured IGN: \`${formattedIgn}\`*`
        ).catch(() => {
          logger.warn(`[wlAccept] Could not send congratulations DM to ${application.userId} (DMs closed)`);
        });
      }
    } catch (err) {
      logger.error(`[wlAccept] Unhandled error during acceptance: ${err.message}`);
      interaction.followUp({ content: '❌ An error occurred while processing acceptance.', flags: 64 }).catch(() => {});
    }
  },
};
