'use strict';

const C = {
  CONTAINER:  17,
  TEXT:       10,
  SEPARATOR:  14,
  ACTION_ROW:  1,
  BUTTON:      2,
};

const STYLE = {
  PRIMARY: 1,
  SECONDARY: 2,
  SUCCESS: 3,
  DANGER: 4,
  LINK: 5,
};

const IS_COMPONENTS_V2 = 1 << 15;

// Primative helper generators
function text(content) {
  return { type: C.TEXT, content: String(content) };
}

function sep() {
  return { type: C.SEPARATOR, divider: true, spacing: 1 };
}

function actionRow(...components) {
  return { type: C.ACTION_ROW, components };
}

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

/**
 * Builds the static landing/application panel.
 */
function buildApplicationPanel() {
  const rows = [
    text('## 🎮 CJN Gaming — Minecraft Whitelisting'),
    sep(),
    text(
      'Apply to join our premium Minecraft server community! Click the button below to fill out the whitelist application form.\n\n' +
      '**Requirements:**\n' +
      '• A valid Minecraft username (IGN)\n' +
      '• Select your correct edition (Java or Bedrock)\n' +
      '• Meet the minimum community age threshold\n\n' +
      '*Please note that false information will lead to a permanent community ban.*'
    ),
    sep(),
    actionRow(btn('Apply for Whitelist', 'wl_apply', '📋', STYLE.PRIMARY)),
  ];

  return {
    flags: IS_COMPONENTS_V2,
    components: [{ type: C.CONTAINER, accent_color: 0x5865f2, components: rows }],
  };
}

/**
 * Builds the initial pending review card container sent to staff channels.
 */
function buildReviewMessage(application) {
  const yt = application.youtubeLink ? `[Link](${application.youtubeLink})` : '—';
  const timeTag = `<t:${Math.floor(new Date(application.createdAt).getTime() / 1000)}:F>`;

  const rows = [
    text('## 📋 New Whitelist Application'),
    sep(),
    text(
      `**Applicant:** <@${application.userId}> (ID: \`${application.userId}\`)\n` +
      `**Minecraft IGN:** \`${application.ign}\`\n` +
      `**Platform:** ${application.platform === 'java' ? '☕ Java' : '🪨 Bedrock'}\n` +
      `**Age:** \`${application.age}\`\n` +
      `**YouTube:** ${yt}`
    ),
    sep(),
    text(`-# Guild: **${application.userTag}** · Applied at ${timeTag}`),
    actionRow(
      btn('Accept', `wl_accept:${application._id}`, '✅', STYLE.SUCCESS),
      btn('Decline', `wl_decline:${application._id}`, '❌', STYLE.DANGER)
    ),
  ];

  return {
    flags: IS_COMPONENTS_V2,
    components: [{ type: C.CONTAINER, accent_color: 0xfee75c, components: rows }],
  };
}

/**
 * Re-builds the review card as Accepted, disabling buttons.
 */
function buildReviewAccepted(application, staffUser) {
  const yt = application.youtubeLink ? `[Link](${application.youtubeLink})` : '—';
  const timeTag = `<t:${Math.floor(new Date(application.createdAt).getTime() / 1000)}:F>`;
  const reviewTag = `<t:${Math.floor(Date.now() / 1000)}:R>`;

  const rows = [
    text('## ✅ Whitelist Application Accepted'),
    sep(),
    text(
      `**Applicant:** <@${application.userId}> (ID: \`${application.userId}\`)\n` +
      `**Minecraft IGN:** \`${application.ign}\`\n` +
      `**Platform:** ${application.platform === 'java' ? '☕ Java' : '🪨 Bedrock'}\n` +
      `**Age:** \`${application.age}\`\n` +
      `**YouTube:** ${yt}`
    ),
    sep(),
    text(`**Status:** Approved by <@${staffUser.id}> ${reviewTag}\n` +
         `-# Guild: **${application.userTag}** · Applied at ${timeTag}`),
    actionRow(
      btn('Accepted', 'wl_accepted_disabled', '✅', STYLE.SUCCESS, true),
      btn('Decline', 'wl_decline_disabled', '❌', STYLE.SECONDARY, true)
    ),
  ];

  return {
    flags: IS_COMPONENTS_V2,
    components: [{ type: C.CONTAINER, accent_color: 0x57f287, components: rows }],
  };
}

/**
 * Re-builds the review card as Declined, disabling buttons.
 */
function buildReviewDeclined(application, staffUser, reason) {
  const yt = application.youtubeLink ? `[Link](${application.youtubeLink})` : '—';
  const timeTag = `<t:${Math.floor(new Date(application.createdAt).getTime() / 1000)}:F>`;
  const reviewTag = `<t:${Math.floor(Date.now() / 1000)}:R>`;

  const rows = [
    text('## ❌ Whitelist Application Declined'),
    sep(),
    text(
      `**Applicant:** <@${application.userId}> (ID: \`${application.userId}\`)\n` +
      `**Minecraft IGN:** \`${application.ign}\`\n` +
      `**Platform:** ${application.platform === 'java' ? '☕ Java' : '🪨 Bedrock'}\n` +
      `**Age:** \`${application.age}\`\n` +
      `**YouTube:** ${yt}`
    ),
    sep(),
    text(`**Status:** Declined by <@${staffUser.id}> ${reviewTag}\n` +
         `**Reason:** *${reason}*\n` +
         `-# Guild: **${application.userTag}** · Applied at ${timeTag}`),
    actionRow(
      btn('Accept', 'wl_accept_disabled', '✅', STYLE.SECONDARY, true),
      btn('Declined', 'wl_declined_disabled', '❌', STYLE.DANGER, true)
    ),
  ];

  return {
    flags: IS_COMPONENTS_V2,
    components: [{ type: C.CONTAINER, accent_color: 0xed4245, components: rows }],
  };
}

/**
 * Re-builds the config settings as Component V2 Container.
 */
function buildConfigPanel(config) {
  const rows = [
    text('## ⚙️ Whitelist System Configuration'),
    sep(),
    text(
      `📢 **Application Channel:** <#${config.appChannelId}>\n` +
      `📥 **Review Channel:** <#${config.reviewChannelId}>\n` +
      `📡 **DiscordSRV Console:** <#${config.consoleChannelId}>\n` +
      `🛡️ **Staff Role:** <@&${config.staffRoleId}>\n` +
      `🟢 **Whitelist Role:** <@&${config.whitelistRoleId}>\n` +
      `🪨 **Bedrock Prefix:** \`${config.bedrockPrefix}\``
    ),
  ];

  return {
    flags: IS_COMPONENTS_V2,
    components: [{ type: C.CONTAINER, accent_color: 0x5865f2, components: rows }],
  };
}

/**
 * Re-builds the history log as Component V2 Container.
 */
function buildLogsPanel(logs) {
  const rows = [
    text('## 📋 Whitelist Applications Log (Last 20)'),
    sep(),
  ];

  if (!logs.length) {
    rows.push(text('*No whitelist applications found in database.*'));
  } else {
    const lines = logs.map((log) => {
      const emoji = log.status === 'accepted' ? '🟢' : log.status === 'declined' ? '🔴' : '🟡';
      const reviewer = log.staffReviewer ? `by <@${log.staffReviewer}>` : '';
      const time = `<t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>`;
      const details = log.status === 'declined' ? `\n> *Reason: ${log.declineReason}*` : '';
      return `${emoji} **${log.ign}** (${log.platform === 'java' ? 'Java' : 'Bedrock'}) · State: **${log.status}** ${reviewer} · ${time}${details}`;
    });
    rows.push(text(lines.slice(0, 10).join('\n'))); // slice to avoid text limit overflow
  }

  return {
    flags: IS_COMPONENTS_V2,
    components: [{ type: C.CONTAINER, accent_color: 0x5865f2, components: rows }],
  };
}

module.exports = {
  buildApplicationPanel,
  buildReviewMessage,
  buildReviewAccepted,
  buildReviewDeclined,
  buildConfigPanel,
  buildLogsPanel,
  C,
  STYLE,
  IS_COMPONENTS_V2,
};
