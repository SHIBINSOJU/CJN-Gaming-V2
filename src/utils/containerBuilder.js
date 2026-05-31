'use strict';

const { STATUS, STATUS_EMOJI, STATUS_COLOR, CUSTOM_IDS } = require('./constants');


// ─── Discord Component V2 type IDs ───────────────────────────────────────────
const C = {
  CONTAINER: 17,
  TEXT: 10,   // TextDisplay — supports markdown, multi-line
  SEPARATOR: 14,
  ACTION_ROW: 1,
  BUTTON: 2,
  MEDIA: 12,
};

// Button styles
const STYLE = { PRIMARY: 1, SECONDARY: 2, SUCCESS: 3, DANGER: 4, LINK: 5 };

// MessageFlags.IsComponentsV2  (1 << 15)
const IS_COMPONENTS_V2 = 1 << 15;

// ─── Primitive helpers ────────────────────────────────────────────────────────

/** Single markdown TextDisplay block */
function text(content) {
  return { type: C.TEXT, content: String(content) };
}

/** Horizontal divider */
function sep() {
  return { type: C.SEPARATOR, divider: true, spacing: 1 };
}

/**
 * Format milliseconds as h:mm:ss (or d:h:mm:ss for very long durations).
 * Examples: 0:45  → "0:00:45"   |   3723000 → "1:02:03"   |   86461000 → "1d 0:00:01"
 */
function _formatDuration(ms) {
  if (!ms || ms < 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const hms = `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return days > 0 ? `${days}d ${hms}` : hms;
}

/**
 * Returns raw milliseconds the server has been in its current state.
 * Walks uptimeLog from the end backwards until the state flips.
 */
function _getStateDurationMs(server) {
  const log = server.uptimeLog;
  if (!log || log.length === 0) return 0;
  const cur = log[log.length - 1].online;
  let i = log.length - 2;
  while (i >= 0 && log[i].online === cur) i--;
  const start = i >= 0 ? log[i + 1].timestamp : log[0].timestamp;
  return Date.now() - new Date(start).getTime();
}

/** ActionRow containing buttons */
function actionRow(...btns) {
  return { type: C.ACTION_ROW, components: btns };
}

/** Button component */
function btn(label, customId, emoji, style = STYLE.SECONDARY, disabled = false) {
  return {
    type: C.BUTTON,
    label,
    custom_id: customId,
    style,
    disabled,
    ...(emoji ? { emoji: { name: emoji } } : {}),
  };
}

// ─── Status Panel ─────────────────────────────────────────────────────────────
/**
 * Build the full Component V2 status panel.
 * Uses ONLY TextDisplay + Separator + ActionRow inside a Container.
 * No Section (type 9) — avoids the accessory requirement and length limits.
 *
 * @param {object} server  MinecraftServer document
 * @param {object} panel   StatusPanel document
 */
function buildStatusPanel(server, panel) {
  const isOnline = server.status === STATUS.ONLINE;

  const emoji = STATUS_EMOJI[server.status] ?? '⚫';
  const color = STATUS_COLOR[server.status] ?? 0x5865f2;
  const statusStr = server.status.charAt(0).toUpperCase() + server.status.slice(1);
  const typeStr = server.type === 'java' ? '☕ Java' : '🪨 Bedrock';

  const lastUpdated = server.lastRefreshed
    ? `<t:${Math.floor(new Date(server.lastRefreshed).getTime() / 1000)}:R>`
    : 'Never';

  const pingStr = (isOnline && server.ping != null) ? `🏓 ${server.ping}ms` : '';
  const versionStr = isOnline ? (server.version ?? 'Unknown') : '—';
  const playersStr = isOnline
    ? `**${server.playerCount}** / **${server.maxPlayers}**`
    : '—';

  // Build panel rows (all TextDisplay — multi-line markdown fully supported)
  const rows = [];

  if (panel?.style === 'compact') {
    // ── Compact Style ─────────────────────────────────────────────────────
    rows.push(
      text(`## ${emoji} ${server.name}\n${statusStr}  ·  ${playersStr} players  ${pingStr}`)
    );
    rows.push(sep());
    rows.push(
      text(`\`${server.ip}:${server.port}\`  ·  v${versionStr}`)
    );
  } else {
    // ── Default / Detailed Style ──────────────────────────────────────────
    // ── Header ─────────────────────────────────────────────────────────────
    rows.push(
      text(`## ${emoji} ${server.name}\n${typeStr}  ·  Status: **${statusStr}**  ${pingStr}`)
    );
    rows.push(sep());

    // ── Connection ──────────────────────────────────────────────────────────
    rows.push(
      text(`**📡 Connection**\n\`${server.ip}:${server.port}\`\n**Version:** ${versionStr}`)
    );
    rows.push(sep());

    // ── Players ─────────────────────────────────────────────────────────────
    rows.push(
      text(`**👥 Players**\n${playersStr} online`)
    );
    rows.push(sep());

    // ── MOTD (online only) ────────────────────────────────────────────────────
    if (isOnline && server.motd) {
      rows.push(text(`**💬 MOTD**\n> ${server.motd.slice(0, 200)}`));
      rows.push(sep());
    }

    // ── Statistics ─────────────────────────────────────────────────────────────
    // Compute how long the server has been in its current state as h:mm:ss
    const stateMs = _getStateDurationMs(server);
    const uptimeDur = _formatDuration(stateMs);

    rows.push(
      text(`**📊 Statistics**\n**${statusStr} for:** \`${uptimeDur}\`  ·  **Players:** ${playersStr}`)
    );

    // ── Image Banner (Bottom - 16:9 Ratio) ───────────────────────────────────
    rows.push(sep());
    rows.push({
      type: C.MEDIA,
      items: [
        {
          media: {
            url: 'https://cdn.discordapp.com/attachments/1431904604978675773/1509831537057861754/content.png?ex=6a1a9bb1&is=6a194a31&hm=a4de3605956e216362e25ed51b58eac9cc6d2c382595c10251c194a259f144e3',
            width: 1280,
            height: 720,
          },
        },
      ],
    });
  }

  // ── Footer subtext ──────────────────────────────────────────────────────────
  rows.push(text(`-# ${server.name}  ·  Last updated ${lastUpdated}`));

  // ── Buttons ────────────────────────────────────────────────────────────────
  rows.push(
    actionRow(
      btn('Refresh', `${CUSTOM_IDS.REFRESH}:${server._id}`, '🔄', STYLE.PRIMARY),
      btn(`Players (${server.playerCount})`, `${CUSTOM_IDS.PLAYERS}:${server._id}:0`, '👥', STYLE.SECONDARY, !isOnline)
    )
  );

  return {
    flags: IS_COMPONENTS_V2,
    components: [{ type: C.CONTAINER, accent_color: color, components: rows }],
  };
}

// ─── Player List ──────────────────────────────────────────────────────────────
/**
 * Build the 👥 player list panel (ephemeral).
 */
function buildPlayerList(server, page = 0, pageSize = 10) {
  const players = server.playerSamples ?? [];
  const total = players.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(page, totalPages - 1);
  const slice = players.slice(cur * pageSize, (cur + 1) * pageSize);

  let listText;
  if (total === 0) {
    listText = server.playerCount > 0
      ? `*${server.playerCount} player(s) online — the server did not share player names.*`
      : '> No players are currently online.';
  } else {
    listText = slice.map((name, i) => `\`${cur * pageSize + i + 1}.\` ${name}`).join('\n');
  }

  const navBtns = [];
  if (cur > 0) navBtns.push(btn('◀ Prev', `${CUSTOM_IDS.PLAYERS}:${server._id}:${cur - 1}`, null, STYLE.SECONDARY));
  if (cur < totalPages - 1) navBtns.push(btn('Next ▶', `${CUSTOM_IDS.PLAYERS}:${server._id}:${cur + 1}`, null, STYLE.SECONDARY));

  const rows = [
    text(`**👥 ${server.name} — Online Players**\nPage **${cur + 1}** / **${totalPages}**  ·  **${server.playerCount}** total`),
    sep(),
    text(listText),
  ];

  if (navBtns.length) rows.push(actionRow(...navBtns));

  return {
    flags: IS_COMPONENTS_V2 | 64, // ephemeral
    components: [{ type: C.CONTAINER, accent_color: STATUS_COLOR.online, components: rows }],
  };
}

// ─── Notification Alert ───────────────────────────────────────────────────────
/**
 * Build a notification alert Container for status/version/peak events.
 */
function buildNotificationContainer(eventType, server, extra = {}) {
  const configs = {
    online: {
      color: STATUS_COLOR.online,
      title: `${STATUS_EMOJI.online} Server Online`,
      body: `**${server.name}** is back **online**!\n\`${server.ip}:${server.port}\`  ·  ${server.playerCount}/${server.maxPlayers} players`,
    },
    offline: {
      color: STATUS_COLOR.offline,
      title: `${STATUS_EMOJI.offline} Server Offline`,
      body: `**${server.name}** has gone **offline**.\nLast seen: <t:${Math.floor(Date.now() / 1000)}:R>`,
    },
    versionChange: {
      color: 0x5865f2,
      title: '🔄 Version Updated',
      body: `**${server.name}** updated\n**${extra.oldVersion}** → **${extra.newVersion}**`,
    },
    playerPeak: {
      color: 0xfee75c,
      title: '🏆 Player Peak Reached',
      body: `**${server.name}** hit a new peak: **${extra.peakCount}** players online!`,
    },
  };

  const cfg = configs[eventType] ?? configs.online;

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: C.CONTAINER,
        accent_color: cfg.color,
        components: [
          text(`## ${cfg.title}`),
          sep(),
          text(cfg.body),
          sep(),
          text(`-# <t:${Math.floor(Date.now() / 1000)}:F>`),
        ],
      },
    ],
  };
}

module.exports = {
  buildStatusPanel,
  buildPlayerList,
  buildNotificationContainer,
  IS_COMPONENTS_V2,
  C,
  STYLE,
};
