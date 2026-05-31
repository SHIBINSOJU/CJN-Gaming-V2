'use strict';

const { Events } = require('discord.js');
const logger = require('../../utils/logger');
const StatusMonitorService = require('../../services/StatusMonitorService');
const Guild = require('../../models/Guild');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds.`);

    // Upsert all guilds into DB
    for (const [, guild] of client.guilds.cache) {
      await Guild.findOneAndUpdate(
        { guildId: guild.id },
        { guildId: guild.id, guildName: guild.name },
        { upsert: true, new: true }
      ).catch((err) => logger.error(`Guild upsert failed: ${err.message}`));
    }

    // Start monitoring all active panels
    await StatusMonitorService.init(client);
    logger.info('Status Monitor Service started.');
  },
};
