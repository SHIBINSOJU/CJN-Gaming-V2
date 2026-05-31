'use strict';

module.exports = {
  // ─── Server Types ──────────────────────────────────────────
  SERVER_TYPES: {
    JAVA: 'java',
    BEDROCK: 'bedrock',
  },

  // ─── Status States ─────────────────────────────────────────
  STATUS: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    MAINTENANCE: 'maintenance',
  },

  // ─── Status Emoji/Colors ───────────────────────────────────
  STATUS_EMOJI: {
    online: '🟢',
    offline: '🔴',
    maintenance: '🟡',
  },

  STATUS_COLOR: {
    online: 0x57f287,   // Discord green
    offline: 0xed4245,  // Discord red
    maintenance: 0xfee75c, // Discord yellow
  },

  // ─── Notification Events ───────────────────────────────────
  NOTIFY_EVENTS: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    VERSION_CHANGE: 'versionChange',
    PLAYER_PEAK: 'playerPeak',
  },

  // ─── Timing ────────────────────────────────────────────────
  DEFAULT_REFRESH_INTERVAL: parseInt(process.env.DEFAULT_REFRESH_INTERVAL) || 30_000,
  REFRESH_COOLDOWN: parseInt(process.env.REFRESH_COOLDOWN) || 10_000,
  BUILDER_SESSION_TTL: 15 * 60 * 1000, // 15 minutes
  MINECRAFT_PING_TIMEOUT: 5000,
  MINECRAFT_PING_RETRIES: 2,

  // ─── Limits ────────────────────────────────────────────────
  MAX_SERVERS_PER_GUILD: 25,
  MAX_PANELS_PER_GUILD: 25,
  PLAYERS_PER_PAGE: 10,

  // ─── Custom IDs ────────────────────────────────────────────
  CUSTOM_IDS: {
    REFRESH: 'mc_refresh',
    PLAYERS: 'mc_players',
    EMBED_SELECT: 'embed_select',
    EMBED_SAVE: 'embed_save',
    EMBED_EXPORT: 'embed_export',
    EMBED_CLEAR: 'embed_clear',
    EMBED_LOAD: 'embed_load',
    EMBED_IMPORT: 'embed_import',
    EMBED_SEND: 'embed_send',
  },
};
