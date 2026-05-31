'use strict';

const Notification = require('../models/Notification');
const { buildNotificationContainer } = require('../utils/containerBuilder');
const logger = require('../utils/logger');

class NotificationService {
  /**
   * Route notifications based on what changed for a server.
   * @param {import('discord.js').Client} client
   * @param {object} server  - Updated MinecraftServer document
   * @param {object} changes - { statusChanged, versionChanged, oldVersion, newVersion }
   */
  static async notify(client, server, changes) {
    try {
      const config = await Notification.findOne({
        guildId: server.guildId,
        serverId: server._id,
      }).lean();

      if (!config) return;

      const channel = await client.channels.fetch(config.channelId).catch(() => null);
      if (!channel) return;

      const { statusChanged, versionChanged, oldVersion, newVersion } = changes;

      // Status change: online
      if (statusChanged && server.status === 'online' && config.events.online) {
        await NotificationService._send(channel, 'online', server);
      }

      // Status change: offline
      if (statusChanged && server.status === 'offline' && config.events.offline) {
        await NotificationService._send(channel, 'offline', server);
      }

      // Version change
      if (versionChanged && config.events.versionChange) {
        await NotificationService._send(channel, 'versionChange', server, { oldVersion, newVersion });
      }

      // Player peak
      if (
        config.events.playerPeak &&
        server.status === 'online' &&
        server.playerCount >= config.playerPeakThreshold &&
        !config.peakNotified
      ) {
        await NotificationService._send(channel, 'playerPeak', server, {
          peakCount: server.playerCount,
        });
        // Mark as notified so we don't spam
        await Notification.updateOne({ _id: config._id }, { peakNotified: true });
      }

      // Reset peak notified when players drop below threshold
      if (config.peakNotified && server.playerCount < config.playerPeakThreshold) {
        await Notification.updateOne({ _id: config._id }, { peakNotified: false });
      }
    } catch (err) {
      logger.error(`[NotificationService] notify error: ${err.message}`);
    }
  }

  static async _send(channel, eventType, server, extra = {}) {
    const payload = buildNotificationContainer(eventType, server, extra);
    await channel.send(payload).catch((err) =>
      logger.warn(`[NotificationService] Failed to send ${eventType}: ${err.message}`)
    );
  }
}

module.exports = NotificationService;
