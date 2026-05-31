'use strict';

const StatusPanel = require('../models/StatusPanel');
const MinecraftServer = require('../models/MinecraftServer');
const MinecraftService = require('./MinecraftService');
const UptimeService = require('./UptimeService');
const NotificationService = require('./NotificationService');
const { buildStatusPanel } = require('../utils/containerBuilder');
const logger = require('../utils/logger');

// Active polling intervals: Map<panelId (string), NodeJS.Timeout>
const _intervals = new Map();

class StatusMonitorService {
  /**
   * Called once on bot ready — loads all active panels and starts polling.
   * @param {import('discord.js').Client} client
   */
  static async init(client) {
    const panels = await StatusPanel.find({ active: true }).populate('serverId').lean();
    logger.info(`[Monitor] Loading ${panels.length} active panels...`);

    for (const panel of panels) {
      if (!panel.serverId) continue;
      StatusMonitorService.startPanel(panel, client);
    }
  }

  /**
   * Start polling interval for a single panel.
   * @param {object} panel  - populated StatusPanel document
   * @param {import('discord.js').Client} client
   */
  static startPanel(panel, client) {
    const panelId = panel._id.toString();

    // Clear any existing interval for this panel
    if (_intervals.has(panelId)) {
      clearInterval(_intervals.get(panelId));
    }

    // Run immediately on start, then on interval
    StatusMonitorService.refreshPanel(panel._id, client);

    const interval = setInterval(async () => {
      await StatusMonitorService.refreshPanel(panel._id, client);
    }, panel.refreshInterval ?? 30_000);

    _intervals.set(panelId, interval);
    logger.info(`[Monitor] Started panel ${panelId} (interval: ${panel.refreshInterval ?? 30000}ms)`);
  }

  /**
   * Stop polling for a single panel.
   * @param {string} panelId
   */
  static stopPanel(panelId) {
    const id = panelId.toString();
    if (_intervals.has(id)) {
      clearInterval(_intervals.get(id));
      _intervals.delete(id);
      logger.info(`[Monitor] Stopped panel ${id}`);
    }
  }

  /**
   * Stop ALL polling intervals (called on graceful shutdown).
   */
  static stopAll() {
    for (const [id, interval] of _intervals) {
      clearInterval(interval);
      logger.info(`[Monitor] Stopped panel ${id}`);
    }
    _intervals.clear();
  }

  /**
   * Perform one full refresh cycle for a panel.
   * @param {import('mongoose').Types.ObjectId|string} panelId
   * @param {import('discord.js').Client} client
   */
  static async refreshPanel(panelId, client) {
    try {
      // Fresh DB fetch each cycle to get latest config
      const panel = await StatusPanel.findById(panelId).lean();
      if (!panel || !panel.active) {
        StatusMonitorService.stopPanel(panelId);
        return;
      }

      const server = await MinecraftServer.findById(panel.serverId);
      if (!server) return;

      const prevStatus = server.status;
      const prevVersion = server.version;

      // ── Ping the server ─────────────────────────────────
      const result = await MinecraftService.ping(server.type, server.ip, server.port);

      // ── Update server document ───────────────────────────
      server.status = result.online ? 'online' : 'offline';
      server.version = result.version ?? server.version;
      server.motd = result.motd ?? server.motd;
      server.favicon = result.favicon ?? server.favicon;
      server.playerCount = result.playerCount;
      server.maxPlayers = result.maxPlayers;
      server.playerSamples = result.playerSamples;
      server.ping = result.ping;
      server.refreshCount = (server.refreshCount ?? 0) + 1;
      server.lastRefreshed = new Date();
      await server.save();

      // ── Record uptime ────────────────────────────────────
      await UptimeService.record(server._id, result.online);

      // ── Fire notifications if state changed ──────────────
      const statusChanged = prevStatus !== server.status;
      const versionChanged = result.online && prevVersion && prevVersion !== result.version;

      if (statusChanged || versionChanged) {
        await NotificationService.notify(client, server, {
          statusChanged,
          versionChanged,
          oldVersion: prevVersion,
          newVersion: result.version,
        });
      }

      // ── Build & edit Discord message ─────────────────────
      await StatusMonitorService._updatePanelMessage(panel, server, client);
    } catch (err) {
      logger.error(`[Monitor] refreshPanel error for ${panelId}: ${err.message}`);
    }
  }

  /**
   * Edit the existing panel message with fresh Component V2 payload.
   * If the message doesn't exist yet, send a new one and save its ID.
   * @param {object} panel
   * @param {object} server
   * @param {import('discord.js').Client} client
   */
  static async _updatePanelMessage(panel, server, client) {
    try {
      const channel = await client.channels.fetch(panel.channelId).catch(() => null);
      if (!channel) return;

      const payload = buildStatusPanel(server, panel);

      if (panel.messageId) {
        // Try to edit existing message
        const message = await channel.messages.fetch(panel.messageId).catch(() => null);
        if (message) {
          await message.edit(payload);
          return;
        }
      }

      // No existing message — send new one and persist its ID
      const sent = await channel.send(payload);
      await StatusPanel.findByIdAndUpdate(panel._id, { messageId: sent.id });
      logger.info(`[Monitor] Created new panel message ${sent.id} in channel ${panel.channelId}`);
    } catch (err) {
      logger.error(`[Monitor] _updatePanelMessage error: ${err.message}`);
    }
  }
}

module.exports = StatusMonitorService;
