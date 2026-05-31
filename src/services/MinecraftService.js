'use strict';

const { status, statusBedrock } = require('minecraft-server-util');
const logger = require('../utils/logger');
const { SERVER_TYPES, MINECRAFT_PING_TIMEOUT, MINECRAFT_PING_RETRIES } = require('../utils/constants');

/**
 * Ping result shape:
 * {
 *   online: boolean,
 *   version: string | null,
 *   motd: string | null,
 *   favicon: string | null,
 *   playerCount: number,
 *   maxPlayers: number,
 *   playerSamples: string[],
 *   ping: number | null,
 *   error: string | null,
 * }
 */

class MinecraftService {
  /**
   * Ping a Minecraft server (Java or Bedrock) with retry logic.
   * @param {string} type - 'java' | 'bedrock'
   * @param {string} ip
   * @param {number} port
   * @returns {Promise<object>}
   */
  /**
   * Parse a raw IP string that may include an embedded port (e.g. "host:25592").
   * The explicit `port` argument always wins over any embedded port.
   * @param {string} rawIp
   * @param {number} explicitPort
   * @returns {{ host: string, port: number }}
   */
  static _parseHost(rawIp, explicitPort) {
    let host = String(rawIp).trim();
    let resolvedPort = explicitPort;

    // Only parse host:port if NOT an IPv6 address (IPv6 uses brackets: [::1]:port)
    if (!host.startsWith('[') && host.includes(':')) {
      const lastColon = host.lastIndexOf(':');
      const possiblePort = parseInt(host.slice(lastColon + 1), 10);
      if (!isNaN(possiblePort) && possiblePort > 0 && possiblePort <= 65535) {
        // Explicit port arg takes priority
        resolvedPort = explicitPort ?? possiblePort;
        host = host.slice(0, lastColon);
      }
    }

    return { host, port: resolvedPort };
  }

  static async ping(type, rawIp, rawPort) {
    // Always sanitise — handles stored 'host:port' strings gracefully
    const { host, port } = MinecraftService._parseHost(rawIp, rawPort);

    const options = {
      timeout: MINECRAFT_PING_TIMEOUT,
      enableSRV: true,
    };

    let lastError = null;

    for (let attempt = 1; attempt <= MINECRAFT_PING_RETRIES; attempt++) {
      try {
        if (type === SERVER_TYPES.JAVA) {
          return await MinecraftService._pingJava(host, port, options);
        } else if (type === SERVER_TYPES.BEDROCK) {
          return await MinecraftService._pingBedrock(host, port, options);
        } else {
          throw new Error(`Unknown server type: ${type}`);
        }
      } catch (err) {
        lastError = err;
        logger.warn(`[MinecraftService] Attempt ${attempt}/${MINECRAFT_PING_RETRIES} failed for ${host}:${port} — ${err.message}`);
        if (attempt < MINECRAFT_PING_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    return MinecraftService._offlineResult(lastError?.message ?? 'Unknown error');
  }

  static async _pingJava(ip, port, options) {
    const res = await status(ip, port, options);

    return {
      online: true,
      version: res.version?.name ?? null,
      motd: res.motd?.clean ?? null,
      favicon: res.favicon ?? null,
      playerCount: res.players?.online ?? 0,
      maxPlayers: res.players?.max ?? 0,
      playerSamples: (res.players?.sample ?? []).map((p) => p.name).filter(Boolean),
      ping: res.roundTripLatency ?? null,
      error: null,
    };
  }

  static async _pingBedrock(ip, port, options) {
    const res = await statusBedrock(ip, port, options);

    return {
      online: true,
      version: res.version?.name ?? null,
      motd: res.motd?.clean ?? null,
      favicon: null, // Bedrock doesn't provide favicons
      playerCount: res.players?.online ?? 0,
      maxPlayers: res.players?.max ?? 0,
      playerSamples: [], // Bedrock doesn't expose player lists
      ping: res.roundTripLatency ?? null,
      error: null,
    };
  }

  static _offlineResult(errorMessage) {
    return {
      online: false,
      version: null,
      motd: null,
      favicon: null,
      playerCount: 0,
      maxPlayers: 0,
      playerSamples: [],
      ping: null,
      error: errorMessage,
    };
  }
}

module.exports = MinecraftService;
