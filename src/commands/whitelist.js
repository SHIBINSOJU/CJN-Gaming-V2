'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const WhitelistConfig = require('../models/WhitelistConfig');
const WhitelistApplication = require('../models/WhitelistApplication');
const { buildApplicationPanel, buildConfigPanel, buildLogsPanel } = require('../utils/whitelistBuilder');
const logger = require('../utils/logger');

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Manage the Minecraft Whitelist Application System')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)

    // ── /whitelist setup ────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Configure channels and roles for the Whitelist Application System')
        .addChannelOption((o) =>
          o
            .setName('application_channel')
            .setDescription('Channel where users can apply')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addChannelOption((o) =>
          o
            .setName('review_channel')
            .setDescription('Channel where staff review submissions')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addRoleOption((o) =>
          o
            .setName('staff_role')
            .setDescription('Staff Role ID authorized to review applications')
            .setRequired(true)
        )
        .addRoleOption((o) =>
          o
            .setName('whitelist_role')
            .setDescription('Role awarded to accepted applicants')
            .setRequired(true)
        )
        .addChannelOption((o) =>
          o
            .setName('console_channel')
            .setDescription('DiscordSRV Console Bridge channel for whitelist command transmission')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption((o) =>
          o
            .setName('bedrock_prefix')
            .setDescription('Prefix character applied to Bedrock IGNs (default: .)')
            .addChoices(
              { name: '. (dot)', value: '.' },
              { name: '_ (underscore)', value: '_' }
            )
        )
    )

    // ── /whitelist panel ────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Post the Minecraft Whitelist Application Panel to the configured channel')
    )

    // ── /whitelist config ───────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('config')
        .setDescription('View the active configuration of the Whitelist Application System')
    )

    // ── /whitelist logs ─────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('logs')
        .setDescription('View the latest 20 whitelist application submissions')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') return handleSetup(interaction);
    if (sub === 'panel') return handlePanel(interaction);
    if (sub === 'config') return handleConfig(interaction);
    if (sub === 'logs') return handleLogs(interaction);
  },
};

// ─── Subcommand Handlers ─────────────────────────────────────────────────────

async function handleSetup(interaction) {
  await interaction.deferReply({ flags: 64 });

  try {
    const { guildId } = interaction;
    const appChannel = interaction.options.getChannel('application_channel');
    const reviewChannel = interaction.options.getChannel('review_channel');
    const consoleChannel = interaction.options.getChannel('console_channel');
    const staffRole = interaction.options.getRole('staff_role');
    const whitelistRole = interaction.options.getRole('whitelist_role');
    const bedrockPrefix = interaction.options.getString('bedrock_prefix') ?? '.';

    const config = await WhitelistConfig.findOneAndUpdate(
      { guildId },
      {
        appChannelId: appChannel.id,
        reviewChannelId: reviewChannel.id,
        consoleChannelId: consoleChannel.id,
        staffRoleId: staffRole.id,
        whitelistRoleId: whitelistRole.id,
        bedrockPrefix,
      },
      { upsert: true, new: true }
    );

    logger.info(`[WhitelistSetup] Configured successfully for guild ${guildId}`);

    const panelPayload = buildConfigPanel(config);
    return interaction.editReply(panelPayload);
  } catch (err) {
    logger.error(`[WhitelistSetup] Error: ${err.message}`);
    return interaction.editReply('❌ Failed to save setup configurations. Please check database connectivity.');
  }
}

async function handlePanel(interaction) {
  await interaction.deferReply({ flags: 64 });

  try {
    const { guildId, guild } = interaction;

    const config = await WhitelistConfig.findOne({ guildId });
    if (!config) {
      return interaction.editReply('❌ The Whitelist system has not been set up yet. Run `/whitelist setup` first.');
    }

    const appChannel = await guild.channels.fetch(config.appChannelId).catch(() => null);
    if (!appChannel) {
      return interaction.editReply(`❌ Configured application channel (<#${config.appChannelId}>) could not be resolved.`);
    }

    const panelPayload = buildApplicationPanel();
    const sent = await appChannel.send(panelPayload).catch((err) => {
      logger.error(`[WhitelistPanel] Send failed: ${err.message}`);
      return null;
    });

    if (!sent) {
      return interaction.editReply('❌ Failed to post panel: The bot lacks permission to send messages in the Application channel.');
    }

    return interaction.editReply(`✅ Whitelist application panel posted successfully in ${appChannel}!`);
  } catch (err) {
    logger.error(`[WhitelistPanel] Error: ${err.message}`);
    return interaction.editReply('❌ An unexpected error occurred while posting the application panel.');
  }
}

async function handleConfig(interaction) {
  await interaction.deferReply({ flags: 64 });

  try {
    const { guildId } = interaction;

    const config = await WhitelistConfig.findOne({ guildId });
    if (!config) {
      return interaction.editReply('ℹ️ Whitelist system has not been configured. Run `/whitelist setup` to begin.');
    }

    const configPayload = buildConfigPanel(config);
    return interaction.editReply(configPayload);
  } catch (err) {
    logger.error(`[WhitelistConfig] Error: ${err.message}`);
    return interaction.editReply('❌ Failed to fetch configurations.');
  }
}

async function handleLogs(interaction) {
  await interaction.deferReply({ flags: 64 });

  try {
    const { guildId } = interaction;

    const logs = await WhitelistApplication.find({ guildId }).sort({ createdAt: -1 }).limit(20).lean();
    const logsPayload = buildLogsPanel(logs);
    return interaction.editReply(logsPayload);
  } catch (err) {
    logger.error(`[WhitelistLogs] Error: ${err.message}`);
    return interaction.editReply('❌ Failed to retrieve application logs from the database.');
  }
}
