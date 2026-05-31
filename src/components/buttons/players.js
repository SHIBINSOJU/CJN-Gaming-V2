'use strict';

const MinecraftServer = require('../../models/MinecraftServer');
const { buildPlayerList } = require('../../utils/containerBuilder');
const { CUSTOM_IDS, PLAYERS_PER_PAGE } = require('../../utils/constants');
const logger = require('../../utils/logger');

module.exports = {
  customId: CUSTOM_IDS.PLAYERS, // 'mc_players'

  async execute(interaction) {
    // Parse: "mc_players:{serverId}:{page}"
    const parts = interaction.customId.split(':');
    const serverId = parts[1];
    const page = parseInt(parts[2] ?? '0', 10) || 0;

    if (!serverId) return interaction.reply({ content: '❌ Invalid button.', flags: 64 });

    await interaction.deferReply({ flags: 64 });

    try {
      const server = await MinecraftServer.findById(serverId).lean();
      if (!server) {
        return interaction.editReply({ content: '❌ Server not found.' });
      }

      const payload = buildPlayerList(server, page, PLAYERS_PER_PAGE);
      return interaction.editReply(payload);
    } catch (err) {
      logger.error(`[PlayersButton] Error: ${err.message}`);
      return interaction.editReply({ content: '❌ Failed to fetch player list.' });
    }
  },
};
