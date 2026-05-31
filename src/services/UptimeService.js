'use strict';

const MinecraftServer = require('../models/MinecraftServer');
const { calcUptimePercent } = require('../utils/helpers');

const MAX_LOG_ENTRIES = 2880; // 24h @ 30s intervals

class UptimeService {
  /**
   * Record a status snapshot into the server's embedded uptimeLog.
   * Caps the array at MAX_LOG_ENTRIES using a $slice push.
   * @param {string} serverId - Mongoose _id
   * @param {boolean} online
   */
  static async record(serverId, online) {
    await MinecraftServer.updateOne(
      { _id: serverId },
      {
        $push: {
          uptimeLog: {
            $each: [{ timestamp: new Date(), online }],
            $slice: -MAX_LOG_ENTRIES,
          },
        },
      }
    );
  }

  /**
   * Calculate uptime percentage for a server document.
   * @param {object} server - Mongoose document with uptimeLog
   * @returns {string} e.g. "99.72"
   */
  static getUptimePercent(server) {
    return calcUptimePercent(server.uptimeLog);
  }

  /**
   * Get uptime percentage with human-readable label.
   * @param {object} server
   * @returns {string} e.g. "99.72%"
   */
  static getFormattedUptime(server) {
    const pct = UptimeService.getUptimePercent(server);
    return `${pct}%`;
  }

  /**
   * Determine how long the server has been in its current state.
   * Walks the log backwards from the most recent entry.
   * @param {object} server
   * @returns {string} e.g. "2h 15m"
   */
  static getCurrentStateDuration(server) {
    const log = server.uptimeLog;
    if (!log || log.length === 0) return 'N/A';

    const currentState = log[log.length - 1].online;
    let i = log.length - 2;
    while (i >= 0 && log[i].online === currentState) i--;

    const startTime = i >= 0 ? log[i + 1].timestamp : log[0].timestamp;
    const ms = Date.now() - new Date(startTime).getTime();
    return UptimeService._formatMs(ms);
  }

  static _formatMs(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (!parts.length) parts.push(`${totalSeconds % 60}s`);
    return parts.join(' ');
  }
}

module.exports = UptimeService;
