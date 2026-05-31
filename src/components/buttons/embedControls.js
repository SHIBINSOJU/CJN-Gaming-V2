'use strict';

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, AttachmentBuilder } = require('discord.js');
const EmbedService = require('../../services/EmbedService');
const logger = require('../../utils/logger');

/**
 * Handles all /embed editor control buttons.
 * Prefix-matched on 'embed_' by componentHandler.
 *
 * Handled customIds:
 *   embed_save    → Show Save Template modal
 *   embed_load    → Show Load Template modal
 *   embed_export  → Send current JSON (ephemeral, file if large)
 *   embed_import  → Show Import JSON modal
 *   embed_clear   → Clear all components (immediate)
 *   embed_send    → Show channel ID modal to post embed
 */
module.exports = {
  customId: 'embed_',  // prefix match

  async execute(interaction) {
    const { customId, user, guildId } = interaction;

    const session = await EmbedService.getSession(user.id, guildId);
    if (!session) {
      return interaction.reply({
        content: '❌ Session expired. Run `/embed create` to start a new one.',
        flags: 64,
      });
    }

    // ── 💾 Save ──────────────────────────────────────────────
    if (customId === 'embed_save') {
      return interaction.showModal(
        new ModalBuilder()
          .setCustomId('embed_modal_save')
          .setTitle('💾 Save Template')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('name')
                .setLabel('Template Name')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g. Welcome Card')
                .setRequired(true)
                .setMaxLength(64)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('description')
                .setLabel('Description (optional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(256)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('tags')
                .setLabel('Tags (comma-separated, optional)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g. welcome, status, compact')
                .setRequired(false)
                .setMaxLength(200)
            )
          )
      );
    }

    // ── 📂 Load ──────────────────────────────────────────────
    if (customId === 'embed_load') {
      const templates = await EmbedService.listTemplates(guildId);
      if (!templates.length) {
        return interaction.reply({
          content: '📭 No saved templates yet. Use **💾 Save** to create one.',
          flags: 64,
        });
      }
      return interaction.showModal(
        new ModalBuilder()
          .setCustomId('embed_modal_load')
          .setTitle('📂 Load Template')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('name')
                .setLabel(`Template Name — available: ${templates.slice(0, 3).map((t) => t.name).join(', ')}${templates.length > 3 ? '...' : ''}`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(templates[0]?.name ?? 'Enter exact name')
                .setRequired(true)
                .setMaxLength(64)
            )
          )
      );
    }

    // ── 📤 Export ─────────────────────────────────────────────
    if (customId === 'embed_export') {
      await interaction.deferReply({ flags: 64 });
      const json = await EmbedService.exportJSON(user.id, guildId);

      // Check via session components length — JSON.stringify formatting makes string-check unreliable
      if (!json || !session.components?.length) {
        return interaction.editReply('❌ Nothing to export — add some components first.');
      }

      if (json.length > 1800) {
        const file = new AttachmentBuilder(Buffer.from(json, 'utf-8'), { name: 'embed.json' });
        return interaction.editReply({ content: '📤 Exported as file (too large for a code block):', files: [file] });
      }

      return interaction.editReply({ content: `📤 **Exported JSON:**\n\`\`\`json\n${json}\n\`\`\`` });
    }

    // ── 📥 Import ─────────────────────────────────────────────
    if (customId === 'embed_import') {
      return interaction.showModal(
        new ModalBuilder()
          .setCustomId('embed_modal_import')
          .setTitle('📥 Import Component V2 JSON')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('json')
                .setLabel('Paste JSON')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('{ "accentColor": 5856498, "components": [ { "type": 10, "content": "Hello!" } ] }')
                .setRequired(true)
                .setMaxLength(4000)
            )
          )
      );
    }

    // ── 🗑️ Clear ─────────────────────────────────────────────
    if (customId === 'embed_clear') {
      await interaction.deferUpdate();
      const cleared = await EmbedService.clearComponents(user.id, guildId);
      return interaction.editReply(EmbedService.buildEditorPayload(cleared));
    }

    // ── 📨 Send to Channel ────────────────────────────────────
    if (customId === 'embed_send') {
      if (!session.components?.length) {
        return interaction.reply({
          content: '❌ No components to send. Add content first, then use **📨 Send to Channel**.',
          flags: 64,
        });
      }
      return interaction.reply({
        content: '📨 Use the slash command `/embed send channel:#your-channel` to post your embed.',
        flags: 64,
      });
    }
  },
};
