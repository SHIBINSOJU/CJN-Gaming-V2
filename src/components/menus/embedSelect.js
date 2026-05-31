'use strict';

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const EmbedService = require('../../services/EmbedService');
const logger = require('../../utils/logger');

/**
 * Handles the "Add Component" select menu inside the /embed editor.
 * customId: 'embed_select'
 *
 * No-input types (separator, remove_last, set_color) → deferUpdate + editReply
 * Text-input types (text, section, media, button) → showModal
 */
module.exports = {
  customId: 'embed_select',

  async execute(interaction) {
    const value = interaction.values[0];
    const { user, guildId } = interaction;

    // ── Immediate (no modal) ────────────────────────────────
    if (value === 'separator') {
      await interaction.deferUpdate();
      const session = await EmbedService.addComponent(user.id, guildId, {
        type: 14, divider: true, spacing: 1,
      });
      return interaction.editReply(EmbedService.buildEditorPayload(session));
    }

    if (value === 'remove_last') {
      await interaction.deferUpdate();
      const session = await EmbedService.removeLastComponent(user.id, guildId);
      return interaction.editReply(EmbedService.buildEditorPayload(session));
    }

    // ── Modal flows ─────────────────────────────────────────
    const modal = buildModal(value);
    if (modal) return interaction.showModal(modal);

    // Fallback: unknown value
    await interaction.deferUpdate();
  },
};

// ─── Modal Definitions ───────────────────────────────────────────────────────

function buildModal(type) {
  switch (type) {
    case 'text':
      return new ModalBuilder()
        .setCustomId('embed_modal_text')
        .setTitle('📝 Add Text Display')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('content')
              .setLabel('Content — supports markdown & {variables}')
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder('e.g. **Server:** {server_ip} | 👥 {player_count}/{max_players} players')
              .setRequired(true)
              .setMaxLength(2000)
          )
        );

    case 'section':
      return new ModalBuilder()
        .setCustomId('embed_modal_section')
        .setTitle('📦 Add Section')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('line1')
              .setLabel('Line 1 (required)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('e.g. **📡 Connection Info**')
              .setRequired(true)
              .setMaxLength(256)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('line2')
              .setLabel('Line 2 (optional)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('e.g. IP: {server_ip}')
              .setRequired(false)
              .setMaxLength(256)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('line3')
              .setLabel('Line 3 (optional)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('e.g. Version: {server_version}')
              .setRequired(false)
              .setMaxLength(256)
          )
        );

    case 'media':
      return new ModalBuilder()
        .setCustomId('embed_modal_media')
        .setTitle('🖼️ Add Media Gallery')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('url')
              .setLabel('Image URL (must be a direct image link)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('https://example.com/banner.png')
              .setRequired(true)
              .setMaxLength(500)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('description')
              .setLabel('Alt description (optional)')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setMaxLength(100)
          )
        );

    case 'button':
      return new ModalBuilder()
        .setCustomId('embed_modal_button')
        .setTitle('🔘 Add Button')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('label')
              .setLabel('Button Label')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('e.g. Visit Website')
              .setRequired(true)
              .setMaxLength(80)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('url')
              .setLabel('Link URL (leave blank for non-link button)')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('https://example.com')
              .setRequired(false)
              .setMaxLength(512)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('emoji')
              .setLabel('Emoji (optional, e.g. 🌐)')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setMaxLength(16)
          )
        );

    case 'set_color':
      return new ModalBuilder()
        .setCustomId('embed_modal_color')
        .setTitle('🎨 Set Theme Colour')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('hex')
              .setLabel('Hex colour code')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('#5865F2')
              .setRequired(true)
              .setMinLength(6)
              .setMaxLength(7)
          )
        );

    default:
      return null;
  }
}
