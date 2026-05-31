'use strict';

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');

const MinecraftServer = require('../models/MinecraftServer');
const StatusPanel = require('../models/StatusPanel');
const Notification = require('../models/Notification');
const MinecraftService = require('../services/MinecraftService');
const StatusMonitorService = require('../services/StatusMonitorService');
const { buildStatusPanel } = require('../utils/containerBuilder');
const { IS_COMPONENTS_V2 } = require('../utils/containerBuilder');
const {
  MAX_SERVERS_PER_GUILD,
  MAX_PANELS_PER_GUILD,
  SERVER_TYPES,
} = require('../utils/constants');
const logger = require('../utils/logger');

// ─── Slash Command Definition ────────────────────────────────────────────────

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Manage Minecraft server monitoring')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)

    // ── /server add ─────────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a Minecraft server to monitor')
        .addStringOption((o) =>
          o.setName('name').setDescription('Display name for the server').setRequired(true).setMaxLength(64)
        )
        .addStringOption((o) =>
          o.setName('ip').setDescription('Server IP address or hostname').setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName('type')
            .setDescription('Java or Bedrock edition')
            .setRequired(true)
            .addChoices(
              { name: '☕ Java Edition', value: 'java' },
              { name: '🪨 Bedrock Edition', value: 'bedrock' }
            )
        )
        .addIntegerOption((o) =>
          o.setName('port').setDescription('Server port (default: 25565 Java / 19132 Bedrock)').setMinValue(1).setMaxValue(65535)
        )
    )

    // ── /server remove ──────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a monitored server')
        .addStringOption((o) =>
          o.setName('name').setDescription('Server name').setRequired(true).setAutocomplete(true)
        )
    )

    // ── /server list ────────────────────────────────────────
    .addSubcommand((sub) => sub.setName('list').setDescription('List all monitored servers in this guild'))

    // ── /server edit ────────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('edit')
        .setDescription('Edit a server configuration')
        .addStringOption((o) =>
          o.setName('name').setDescription('Server name').setRequired(true).setAutocomplete(true)
        )
        .addStringOption((o) => o.setName('new_name').setDescription('New display name').setMaxLength(64))
        .addStringOption((o) => o.setName('new_ip').setDescription('New IP address'))
        .addIntegerOption((o) =>
          o.setName('new_port').setDescription('New port').setMinValue(1).setMaxValue(65535)
        )
    )

    // ── /server refresh ─────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('refresh')
        .setDescription('Force refresh a server status right now')
        .addStringOption((o) =>
          o.setName('name').setDescription('Server name').setRequired(true).setAutocomplete(true)
        )
    )

    // ── /server panel (subcommand group) ────────────────────
    .addSubcommandGroup((group) =>
      group
        .setName('panel')
        .setDescription('Manage status panels')

        // /server panel create
        .addSubcommand((sub) =>
          sub
            .setName('create')
            .setDescription('Create a live status panel in a channel')
            .addStringOption((o) =>
              o.setName('name').setDescription('Server name').setRequired(true).setAutocomplete(true)
            )
            .addChannelOption((o) =>
              o
                .setName('channel')
                .setDescription('Channel to post the panel in')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
            )
            .addStringOption((o) =>
              o
                .setName('style')
                .setDescription('Panel style')
                .addChoices(
                  { name: 'Default', value: 'default' },
                  { name: 'Compact', value: 'compact' },
                  { name: 'Detailed', value: 'detailed' }
                )
            )
        )

        // /server panel delete
        .addSubcommand((sub) =>
          sub
            .setName('delete')
            .setDescription('Delete a status panel')
            .addStringOption((o) =>
              o.setName('name').setDescription('Server name').setRequired(true).setAutocomplete(true)
            )
        )
    )

    // ── /server notify (subcommand group) ───────────────────
    .addSubcommandGroup((group) =>
      group
        .setName('notify')
        .setDescription('Configure status notifications')

        // /server notify setup
        .addSubcommand((sub) =>
          sub
            .setName('setup')
            .setDescription('Setup notifications for a server')
            .addStringOption((o) =>
              o.setName('name').setDescription('Server name').setRequired(true).setAutocomplete(true)
            )
            .addChannelOption((o) =>
              o
                .setName('channel')
                .setDescription('Channel to send notifications in')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
            )
            .addBooleanOption((o) =>
              o.setName('online').setDescription('Notify when server comes online (default: true)')
            )
            .addBooleanOption((o) =>
              o.setName('offline').setDescription('Notify when server goes offline (default: true)')
            )
            .addBooleanOption((o) =>
              o.setName('version_change').setDescription('Notify when version changes (default: true)')
            )
            .addBooleanOption((o) =>
              o.setName('player_peak').setDescription('Notify on player peak (default: false)')
            )
            .addIntegerOption((o) =>
              o.setName('peak_threshold').setDescription('Threshold for player peak notification (default: 50)').setMinValue(1)
            )
        )

        // /server notify disable
        .addSubcommand((sub) =>
          sub
            .setName('disable')
            .setDescription('Disable notifications for a server')
            .addStringOption((o) =>
              o.setName('name').setDescription('Server name').setRequired(true).setAutocomplete(true)
            )
        )

        // /server notify view
        .addSubcommand((sub) =>
          sub
            .setName('view')
            .setDescription('View current notification configuration for a server')
            .addStringOption((o) =>
              o.setName('name').setDescription('Server name').setRequired(true).setAutocomplete(true)
            )
        )
    ),

  // ─── Autocomplete ────────────────────────────────────────
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const servers = await MinecraftServer.find({ guildId: interaction.guildId })
      .select('name')
      .limit(25)
      .lean();

    const choices = servers
      .filter((s) => s.name.toLowerCase().includes(focused))
      .map((s) => ({ name: s.name, value: s.name }));

    await interaction.respond(choices).catch(() => {});
  },

  // ─── Execute Router ──────────────────────────────────────
  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    if (group === 'panel') {
      if (sub === 'create') return handlePanelCreate(interaction);
      if (sub === 'delete') return handlePanelDelete(interaction);
    }

    if (group === 'notify') {
      if (sub === 'setup') return handleNotifySetup(interaction);
      if (sub === 'disable') return handleNotifyDisable(interaction);
      if (sub === 'view') return handleNotifyView(interaction);
    }

    if (sub === 'add') return handleAdd(interaction);
    if (sub === 'remove') return handleRemove(interaction);
    if (sub === 'list') return handleList(interaction);
    if (sub === 'edit') return handleEdit(interaction);
    if (sub === 'refresh') return handleRefresh(interaction);
  },
};

// ─── Subcommand Handlers ─────────────────────────────────────────────────────

async function handleAdd(interaction) {
  await interaction.deferReply({ flags: 64 });

  const guildId = interaction.guildId;
  const name    = interaction.options.getString('name');
  const type    = interaction.options.getString('type');
  const rawPort = interaction.options.getInteger('port');

  // ── IP parsing: accept both 'host' and 'host:port' formats ──
  let rawIp = interaction.options.getString('ip').trim();
  let ip    = rawIp;
  let port  = rawPort ?? (type === SERVER_TYPES.BEDROCK ? 19132 : 25565);

  if (rawIp.includes(':')) {
    const colonIdx = rawIp.lastIndexOf(':');
    const hostPart = rawIp.slice(0, colonIdx);
    const portPart = parseInt(rawIp.slice(colonIdx + 1), 10);
    if (!isNaN(portPart) && portPart > 0 && portPart <= 65535) {
      ip   = hostPart;
      // Explicit port option takes priority over embedded port
      port = rawPort ?? portPart;
    }
  }

  // Enforce limit
  const count = await MinecraftServer.countDocuments({ guildId });
  if (count >= MAX_SERVERS_PER_GUILD) {
    return interaction.editReply(`❌ This guild has reached the maximum of **${MAX_SERVERS_PER_GUILD}** servers.`);
  }

  // Check duplicate name
  const existing = await MinecraftServer.findOne({ guildId, name });
  if (existing) {
    return interaction.editReply(`❌ A server named **${name}** already exists.`);
  }

  // Test ping before saving
  await interaction.editReply(`⏳ Testing connection to \`${ip}:${port}\`...`);
  const result = await MinecraftService.ping(type, ip, port);

  const server = await MinecraftServer.create({
    guildId,
    name,
    type,
    ip,
    port,
    status: result.online ? 'online' : 'offline',
    version: result.version,
    motd: result.motd,
    favicon: result.favicon,
    playerCount: result.playerCount,
    maxPlayers: result.maxPlayers,
    playerSamples: result.playerSamples,
    ping: result.ping,
    refreshCount: 1,
    lastRefreshed: new Date(),
  });

  await UptimeRecord(server._id, result.online);

  const statusLine = result.online
    ? `🟢 Online · ${result.playerCount}/${result.maxPlayers} players · ${result.ping}ms`
    : `🔴 Offline — could not reach server`;

  return interaction.editReply(
    `✅ **${name}** added! (\`${ip}:${port}\`)\n${statusLine}\n\nUse \`/server panel create\` to post a live status panel.`
  );
}

async function handleRemove(interaction) {
  await interaction.deferReply({ flags: 64 });

  const guildId = interaction.guildId;
  const name = interaction.options.getString('name');

  const server = await MinecraftServer.findOne({ guildId, name });
  if (!server) return interaction.editReply(`❌ No server named **${name}** found.`);

  // Remove all panels for this server
  const panels = await StatusPanel.find({ guildId, serverId: server._id });
  for (const panel of panels) {
    StatusMonitorService.stopPanel(panel._id);
    if (panel.messageId) {
      const channel = await interaction.client.channels.fetch(panel.channelId).catch(() => null);
      if (channel) {
        const msg = await channel.messages.fetch(panel.messageId).catch(() => null);
        await msg?.delete().catch(() => {});
      }
    }
  }

  await StatusPanel.deleteMany({ guildId, serverId: server._id });
  await server.deleteOne();

  return interaction.editReply(`✅ **${name}** and all its panels have been removed.`);
}

async function handleList(interaction) {
  await interaction.deferReply({ flags: 64 });

  const servers = await MinecraftServer.find({ guildId: interaction.guildId }).lean();
  if (!servers.length) {
    return interaction.editReply('📭 No servers added yet. Use `/server add` to get started.');
  }

  const lines = servers.map((s, i) => {
    const emoji = s.status === 'online' ? '🟢' : s.status === 'maintenance' ? '🟡' : '🔴';
    const type = s.type === 'java' ? '☕' : '🪨';
    return `**${i + 1}.** ${emoji} ${type} **${s.name}** · \`${s.ip}:${s.port}\` · ${s.playerCount}/${s.maxPlayers}`;
  });

  return interaction.editReply(`**Minecraft Servers (${servers.length})**\n\n${lines.join('\n')}`);
}

async function handleEdit(interaction) {
  await interaction.deferReply({ flags: 64 });

  const guildId  = interaction.guildId;
  const name     = interaction.options.getString('name');
  const newName  = interaction.options.getString('new_name');
  const newIpRaw = interaction.options.getString('new_ip');
  const newPort  = interaction.options.getInteger('new_port');

  if (!newName && !newIpRaw && !newPort) {
    return interaction.editReply('❌ Provide at least one field to update: `new_name`, `new_ip`, or `new_port`.');
  }

  const server = await MinecraftServer.findOne({ guildId, name });
  if (!server) return interaction.editReply(`❌ No server named **${name}** found.`);

  if (newName) {
    const conflict = await MinecraftServer.findOne({ guildId, name: newName });
    if (conflict) return interaction.editReply(`❌ A server named **${newName}** already exists.`);
    server.name = newName;
  }

  if (newIpRaw) {
    // Also parse host:port format in edit
    let newIp   = newIpRaw.trim();
    let parsedPort = newPort;
    if (newIp.includes(':')) {
      const colonIdx = newIp.lastIndexOf(':');
      const portPart = parseInt(newIp.slice(colonIdx + 1), 10);
      if (!isNaN(portPart) && portPart > 0 && portPart <= 65535) {
        parsedPort = newPort ?? portPart;
        newIp = newIp.slice(0, colonIdx);
      }
    }
    server.ip   = newIp;
    if (parsedPort) server.port = parsedPort;
  } else if (newPort) {
    server.port = newPort;
  }

  await server.save();
  return interaction.editReply(`✅ **${name}** updated → \`${server.ip}:${server.port}\``);
}

async function handleRefresh(interaction) {
  await interaction.deferReply({ flags: 64 });

  const guildId = interaction.guildId;
  const name = interaction.options.getString('name');

  const server = await MinecraftServer.findOne({ guildId, name });
  if (!server) return interaction.editReply(`❌ No server named **${name}** found.`);

  const panel = await StatusPanel.findOne({ guildId, serverId: server._id, active: true });
  if (!panel) return interaction.editReply(`❌ No active panel found for **${name}**.`);

  await interaction.editReply('⏳ Refreshing...');
  await StatusMonitorService.refreshPanel(panel._id, interaction.client);
  return interaction.editReply(`✅ **${name}** status panel refreshed.`);
}

async function handlePanelCreate(interaction) {
  await interaction.deferReply({ flags: 64 });

  const guildId = interaction.guildId;
  const name = interaction.options.getString('name');
  const channel = interaction.options.getChannel('channel');
  const style = interaction.options.getString('style') ?? 'default';

  // Limit check
  const panelCount = await StatusPanel.countDocuments({ guildId });
  if (panelCount >= MAX_PANELS_PER_GUILD) {
    return interaction.editReply(`❌ Maximum of **${MAX_PANELS_PER_GUILD}** panels reached.`);
  }

  const server = await MinecraftServer.findOne({ guildId, name });
  if (!server) return interaction.editReply(`❌ No server named **${name}** found.`);

  // Check no existing panel for this server in this channel
  const existingPanel = await StatusPanel.findOne({ guildId, serverId: server._id, channelId: channel.id });
  if (existingPanel) {
    return interaction.editReply(`❌ A panel for **${name}** already exists in ${channel}.`);
  }

  // Send initial panel
  const payload = buildStatusPanel(server, { style });
  const msg = await channel.send(payload).catch((err) => {
    logger.error(`[Panel Create] Failed to send: ${err.message}`);
    return null;
  });

  if (!msg) {
    return interaction.editReply(`❌ Failed to send panel to ${channel}. Check bot permissions.`);
  }

  // Save to DB
  const panel = await StatusPanel.create({
    guildId,
    serverId: server._id,
    channelId: channel.id,
    messageId: msg.id,
    style,
    autoRefresh: true,
  });

  // Start monitoring
  StatusMonitorService.startPanel({ ...panel.toObject(), serverId: server }, interaction.client);

  return interaction.editReply(`✅ Status panel for **${name}** created in ${channel}!`);
}

async function handlePanelDelete(interaction) {
  await interaction.deferReply({ flags: 64 });

  const guildId = interaction.guildId;
  const name = interaction.options.getString('name');

  const server = await MinecraftServer.findOne({ guildId, name });
  if (!server) return interaction.editReply(`❌ No server named **${name}** found.`);

  const panels = await StatusPanel.find({ guildId, serverId: server._id });
  if (!panels.length) return interaction.editReply(`❌ No panels found for **${name}**.`);

  for (const panel of panels) {
    StatusMonitorService.stopPanel(panel._id);
    if (panel.messageId) {
      const ch = await interaction.client.channels.fetch(panel.channelId).catch(() => null);
      if (ch) {
        const msg = await ch.messages.fetch(panel.messageId).catch(() => null);
        await msg?.delete().catch(() => {});
      }
    }
    await panel.deleteOne();
  }

  return interaction.editReply(`✅ Deleted **${panels.length}** panel(s) for **${name}**.`);
}

// Helper to record uptime on add
async function UptimeRecord(serverId, online) {
  const UptimeService = require('../services/UptimeService');
  await UptimeService.record(serverId, online);
}

async function handleNotifySetup(interaction) {
  await interaction.deferReply({ flags: 64 });

  const guildId = interaction.guildId;
  const name = interaction.options.getString('name');
  const channel = interaction.options.getChannel('channel');

  const server = await MinecraftServer.findOne({ guildId, name });
  if (!server) return interaction.editReply(`❌ No server named **${name}** found.`);

  const online = interaction.options.getBoolean('online') ?? true;
  const offline = interaction.options.getBoolean('offline') ?? true;
  const versionChange = interaction.options.getBoolean('version_change') ?? true;
  const playerPeak = interaction.options.getBoolean('player_peak') ?? false;
  const playerPeakThreshold = interaction.options.getInteger('peak_threshold') ?? 50;

  await Notification.findOneAndUpdate(
    { guildId, serverId: server._id },
    {
      channelId: channel.id,
      events: { online, offline, versionChange, playerPeak },
      playerPeakThreshold,
    },
    { upsert: true, new: true }
  );

  const statusOnline = online ? '🟢 Enabled' : '⚪ Disabled';
  const statusOffline = offline ? '🔴 Enabled' : '⚪ Disabled';
  const statusVersion = versionChange ? '🔄 Enabled' : '⚪ Disabled';
  const statusPeak = playerPeak ? `🏆 Enabled (Threshold: ${playerPeakThreshold})` : '⚪ Disabled';

  return interaction.editReply(
    `✅ **Notifications configured for ${name}!**\n` +
    `📢 **Channel:** ${channel}\n\n` +
    `**Configured Alerts:**\n` +
    `- **Server Online:** ${statusOnline}\n` +
    `- **Server Offline:** ${statusOffline}\n` +
    `- **Version Changed:** ${statusVersion}\n` +
    `- **Player Peak:** ${statusPeak}`
  );
}

async function handleNotifyDisable(interaction) {
  await interaction.deferReply({ flags: 64 });

  const guildId = interaction.guildId;
  const name = interaction.options.getString('name');

  const server = await MinecraftServer.findOne({ guildId, name });
  if (!server) return interaction.editReply(`❌ No server named **${name}** found.`);

  const result = await Notification.deleteOne({ guildId, serverId: server._id });

  if (result.deletedCount === 0) {
    return interaction.editReply(`❌ Notifications are not enabled for **${name}**.`);
  }

  return interaction.editReply(`✅ Disabled all notifications for **${name}**.`);
}

async function handleNotifyView(interaction) {
  await interaction.deferReply({ flags: 64 });

  const guildId = interaction.guildId;
  const name = interaction.options.getString('name');

  const server = await MinecraftServer.findOne({ guildId, name });
  if (!server) return interaction.editReply(`❌ No server named **${name}** found.`);

  const config = await Notification.findOne({ guildId, serverId: server._id }).lean();

  if (!config) {
    return interaction.editReply(`ℹ️ Notifications are currently **disabled** for **${name}**.`);
  }

  const channel = await interaction.client.channels.fetch(config.channelId).catch(() => null);
  const channelMention = channel ? `${channel}` : `\`ID: ${config.channelId}\` (Unknown/Deleted Channel)`;

  const statusOnline = config.events?.online ? '🟢 Enabled' : '⚪ Disabled';
  const statusOffline = config.events?.offline ? '🔴 Enabled' : '⚪ Disabled';
  const statusVersion = config.events?.versionChange ? '🔄 Enabled' : '⚪ Disabled';
  const statusPeak = config.events?.playerPeak ? `🏆 Enabled (Threshold: ${config.playerPeakThreshold ?? 50})` : '⚪ Disabled';

  return interaction.editReply(
    `🔔 **Notification Configuration for ${name}**\n` +
    `📢 **Alert Channel:** ${channelMention}\n\n` +
    `**Active Alerts:**\n` +
    `- **Server Online:** ${statusOnline}\n` +
    `- **Server Offline:** ${statusOffline}\n` +
    `- **Version Changed:** ${statusVersion}\n` +
    `- **Player Peak:** ${statusPeak}`
  );
}
