'use strict';

const MinecraftServer = require('../../models/MinecraftServer');
const StatusPanel = require('../../models/StatusPanel');
const StatusMonitorService = require('../../services/StatusMonitorService');
const { CUSTOM_IDS, REFRESH_COOLDOWN } = require('../../utils/constants');
const logger = require('../../utils/logger');

// Per-user refresh cooldown map: userId → expiresAt timestamp
const _cooldowns = new Map();

module.exports = {
  customId: CUSTOM_IDS.REFRESH, // 'mc_refresh'

  async execute(interaction) {
    // Parse serverId from custom_id: "mc_refresh:{serverId}"
    const [, serverId] = interaction.customId.split(':');
    if (!serverId) return interaction.reply({ content: '❌ Invalid button.', flags: 64 });

    // ── Cooldown check ──────────────────────────────────────
    const cooldownKey = `${interaction.user.id}:${serverId}`;
    const now = Date.now();

    if (_cooldowns.has(cooldownKey)) {
      const expiresAt = _cooldowns.get(cooldownKey);
      if (now < expiresAt) {
        const remaining = Math.ceil((expiresAt - now) / 1000);
        return interaction.reply({
          content: `⏳ You can refresh again in **${remaining}s**.`,
          flags: 64,
        });
      }
    }

    _cooldowns.set(cooldownKey, now + REFRESH_COOLDOWN);
    setTimeout(() => _cooldowns.delete(cooldownKey), REFRESH_COOLDOWN);

    // ── Defer update (updates the existing message) ─────────
    await interaction.deferUpdate();

    try {
      const server = await MinecraftServer.findById(serverId);
      if (!server) {
        return interaction.followUp({ content: '❌ Server not found.', flags: 64 });
      }

      const panel = await StatusPanel.findOne({
        guildId: interaction.guildId,
        serverId: server._id,
        channelId: interaction.channelId,
        active: true,
      });

      if (!panel) {
        return interaction.followUp({ content: '❌ Panel not found.', flags: 64 });
      }

      await StatusMonitorService.refreshPanel(panel._id, interaction.client);
      logger.info(`[RefreshButton] Manual refresh by ${interaction.user.tag} for server ${server.name}`);
    } catch (err) {
      logger.error(`[RefreshButton] Error: ${err.message}`);
      interaction.followUp({ content: '❌ Refresh failed. Try again later.', flags: 64 }).catch(() => {});
    }
  },
};
