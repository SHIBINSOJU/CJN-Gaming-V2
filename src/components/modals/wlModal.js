'use strict';

const WhitelistConfig = require('../../models/WhitelistConfig');
const WhitelistApplication = require('../../models/WhitelistApplication');
const { buildReviewMessage } = require('../../utils/whitelistBuilder');
const logger = require('../../utils/logger');

module.exports = {
  customId: 'wl_modal_submit',

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    try {
      const { guildId, user, guild } = interaction;

      // Fetch Whitelist System configuration
      const config = await WhitelistConfig.findOne({ guildId });
      if (!config) {
        return interaction.editReply('❌ The Whitelist Application System is not set up on this server yet.');
      }

      // Fetch input fields
      const ign = interaction.fields.getTextInputValue('ign').trim();
      const platformRaw = interaction.fields.getTextInputValue('platform').trim().toLowerCase();
      const ageRaw = interaction.fields.getTextInputValue('age').trim();
      const youtube = interaction.fields.getTextInputValue('youtube')?.trim() || null;

      // ── Input Validations ────────────────────────────────────

      // Platform check
      let platform;
      if (platformRaw === 'java' || platformRaw === 'java edition' || platformRaw === 'java ') {
        platform = 'java';
      } else if (platformRaw === 'bedrock' || platformRaw === 'bedrock edition' || platformRaw === 'bedrock ') {
        platform = 'bedrock';
      } else {
        return interaction.editReply('❌ Invalid platform! Please enter precisely **Java** or **Bedrock**.');
      }

      // Age check
      const age = parseInt(ageRaw, 10);
      if (isNaN(age) || age <= 0 || age > 120) {
        return interaction.editReply('❌ Invalid age! Please enter a valid number (e.g. 16).');
      }

      // IGN length check
      if (!ign || ign.length > 32) {
        return interaction.editReply('❌ Minecraft usernames must be between 1 and 32 characters long.');
      }

      // ── Duplicate Checks (Prevent double whitelist attempts - Bypass for test user) ──
      if (user.id !== '1338869759441375254') {
        // 1. Check if this IGN is already whitelisted / accepted
        const ignAccepted = await WhitelistApplication.findOne({
          guildId,
          ign: { $regex: new RegExp(`^${ign}$`, 'i') },
          status: 'accepted',
        });
        if (ignAccepted) {
          return interaction.editReply(`❌ The Minecraft IGN **${ign}** is already whitelisted on this server.`);
        }

        // 2. Check if this IGN has a pending application
        const ignPending = await WhitelistApplication.findOne({
          guildId,
          ign: { $regex: new RegExp(`^${ign}$`, 'i') },
          status: 'pending',
        });
        if (ignPending) {
          return interaction.editReply(`❌ The Minecraft IGN **${ign}** already has an application under active staff review.`);
        }

        // 3. Double-check duplicate submissions by this Discord user
        const userDuplicate = await WhitelistApplication.findOne({
          guildId,
          userId: user.id,
          status: { $in: ['pending', 'accepted'] },
        });
        if (userDuplicate) {
          return interaction.editReply('❌ You already have a pending or accepted whitelist application.');
        }
      }

      // ── Database Insertion ───────────────────────────────────
      const application = await WhitelistApplication.create({
        guildId,
        userId: user.id, // Strictly authentic (ignores any client modifications in the prefilled ID input)
        userTag: user.tag,
        ign,
        platform,
        age,
        youtubeLink: youtube,
        status: 'pending',
        whitelisted: false,
      });

      // ── Post Review Card to Staff Channel ────────────────────
      const reviewChannel = await guild.channels.fetch(config.reviewChannelId).catch(() => null);
      if (!reviewChannel) {
        // Rollback application if reviewer channel is missing
        await application.deleteOne();
        logger.error(`[wlModal] Review channel ${config.reviewChannelId} not found in guild ${guildId}`);
        return interaction.editReply('❌ Failed to process application: Review channel is missing. Please notify server administrators.');
      }

      const reviewPayload = buildReviewMessage(application);
      const msg = await reviewChannel.send(reviewPayload).catch((err) => {
        logger.error(`[wlModal] Failed to send review card: ${err.message}`);
        return null;
      });

      if (!msg) {
        await application.deleteOne();
        return interaction.editReply('❌ Failed to process application: The bot lacks permission to post in the Staff Review channel.');
      }

      logger.info(`[wlModal] Whitelist application submitted by ${user.tag} for IGN: ${ign}`);

      await interaction.editReply(
        `✅ **Application Submitted Successfully!**\n` +
        `Your application for **${ign}** (${platform === 'java' ? 'Java' : 'Bedrock'}) has been received and is currently under review by our Staff.`
      );
    } catch (err) {
      logger.error(`[wlModal] Unhandled error during application submission: ${err.message}`);
      interaction.editReply('❌ An unexpected error occurred while processing your application. Please try again.').catch(() => {});
    }
  },
};
