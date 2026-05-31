'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const logger = require('../utils/logger');

// Discord V2 Component constants
const C = {
  CONTAINER: 17,
  SECTION: 9,
  TEXT: 10,
  THUMBNAIL: 11,
  MEDIA: 12,
  SEPARATOR: 14,
};

const IS_COMPONENTS_V2 = 1 << 15;

function isValidDiscordUrl(urlString) {
  try {
    if (!urlString.startsWith('http://') && !urlString.startsWith('https://') && !urlString.startsWith('discord://')) {
      return false;
    }
    const parsed = new URL(urlString);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      const hostname = parsed.hostname;
      if (!hostname || !hostname.includes('.') || hostname.startsWith('.') || hostname.endsWith('.') || hostname.includes('..')) {
        return false;
      }
      if (/[^a-zA-Z0-9.-]/.test(hostname)) {
        return false;
      }
    }
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('announcement')
    .setDescription('Send clean, minimal Discord-native announcements using Component V2')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addStringOption((o) =>
      o
        .setName('title')
        .setDescription('The title of the announcement')
        .setRequired(true)
        .setMaxLength(256)
    )
    .addStringOption((o) =>
      o
        .setName('description')
        .setDescription('The announcement description/content (supports markdown)')
        .setRequired(true)
        .setMaxLength(4000)
    )
    .addStringOption((o) =>
      o
        .setName('image')
        .setDescription('Optional image URL to attach at the bottom')
        .setRequired(false)
    )
    .addChannelOption((o) =>
      o
        .setName('channel')
        .setDescription('The channel to send the announcement to (defaults to current)')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const imageUrl = interaction.options.getString('image')?.trim();
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    // Validate optional image URL
    if (imageUrl) {
      if (!isValidDiscordUrl(imageUrl)) {
        return interaction.editReply('❌ Invalid image URL! Please enter a valid HTTP/HTTPS URL (e.g. `https://example.com/image.png`).');
      }
    }

    try {
      const rows = [];

      // ── 1. Author Section (No 'Posted by', avatar first, name beside avatar) ────────────────
      const authorAvatar = interaction.user.displayAvatarURL({ extension: 'png', size: 128 });
      const authorName = interaction.member?.displayName || interaction.user.username;

      rows.push({
        type: C.SECTION,
        components: [
          {
            type: C.TEXT,
            content: `### ${authorName}`
          }
        ],
        accessory: {
          type: C.THUMBNAIL,
          media: {
            url: authorAvatar
          }
        }
      });

      // ── 2. Announcement Title & Description ────────────────────────────────────────────────
      rows.push({
        type: C.TEXT,
        content: `## ${title}\n\n${description}`
      });

      // ── 3. Optional Image ──────────────────────────────────────────────────────────────────
      if (imageUrl) {
        rows.push({
          type: C.MEDIA,
          items: [
            {
              media: {
                url: imageUrl
              }
            }
          ]
        });
      }

      // ── 4. Separator ───────────────────────────────────────────────────────────────────────
      rows.push({
        type: C.SEPARATOR,
        divider: true,
        spacing: 1
      });

      // ── 5. Footer (Server Name + Bot Avatar) ───────────────────────────────────────────────
      const botAvatar = interaction.client.user.displayAvatarURL({ extension: 'png', size: 128 });
      rows.push({
        type: C.SECTION,
        components: [
          {
            type: C.TEXT,
            content: `**${interaction.guild.name}**`
          }
        ],
        accessory: {
          type: C.THUMBNAIL,
          media: {
            url: botAvatar
          }
        }
      });

      // Construct the V2 Container payload
      const payload = {
        flags: IS_COMPONENTS_V2,
        components: [
          {
            type: C.CONTAINER,
            accent_color: 0x2b2d31, // Colorless/minimal dark gray
            components: rows,
          }
        ]
      };

      // Post announcement to target channel
      const msg = await channel.send(payload);
      
      logger.info(`[Announcement] Sent by ${interaction.user.tag} in #${channel.name}`);
      return interaction.editReply(`✅ Announcement posted successfully in <#${channel.id}>! [Jump to message](${msg.url})`);
    } catch (err) {
      logger.error(`[Announcement] Failed to send: ${err.message}`);
      return interaction.editReply(`❌ Failed to send announcement: ${err.message}`);
    }
  }
};
