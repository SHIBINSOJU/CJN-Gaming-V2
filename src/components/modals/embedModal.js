'use strict';

const EmbedService = require('../../services/EmbedService');
const logger = require('../../utils/logger');

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

/**
 * Unified modal submit handler for ALL /embed modals.
 *
 * After updating the session it patches the original ephemeral editor
 * message via the stored interaction webhook token (15-min window).
 *
 * Handled customId prefixes:
 *   embed_modal_text
 *   embed_modal_section
 *   embed_modal_media
 *   embed_modal_button
 *   embed_modal_color
 *   embed_modal_save
 *   embed_modal_load
 *   embed_modal_import
 */
module.exports = {
  customId: 'embed_modal', // prefix-matched by componentHandler

  async execute(interaction) {
    const { customId, user, guildId } = interaction;

    const session = await EmbedService.getSession(user.id, guildId);
    if (!session) {
      return interaction.reply({
        content: '❌ Your embed session has expired. Run `/embed create` to start again.',
        flags: 64,
      });
    }

    try {
      let updated = session;

      // ── 📝 Text Display ─────────────────────────────────────
      if (customId === 'embed_modal_text') {
        const content = interaction.fields.getTextInputValue('content');
        updated = await EmbedService.addComponent(user.id, guildId, { type: 10, content });
        return _patchAndAck(interaction, updated, '✅ Text display added.');
      }

      // ── 📦 Section ──────────────────────────────────────────
      if (customId === 'embed_modal_section') {
        const l1 = interaction.fields.getTextInputValue('line1');
        const l2 = interaction.fields.getTextInputValue('line2') || null;
        const l3 = interaction.fields.getTextInputValue('line3') || null;
        // Join into one TextDisplay — Section (type 9) requires an accessory, use TextDisplay instead
        const content = [l1, l2, l3].filter(Boolean).join('\n');
        updated = await EmbedService.addComponent(user.id, guildId, { type: 10, content });
        return _patchAndAck(interaction, updated, '✅ Section added.');
      }


      // ── 🖼️ Media Gallery ─────────────────────────────────────
      if (customId === 'embed_modal_media') {
        const url = interaction.fields.getTextInputValue('url').trim();
        const description = interaction.fields.getTextInputValue('description') || undefined;
        if (!isValidDiscordUrl(url)) {
          return interaction.reply({ content: '❌ Invalid media URL! Please enter a valid URL (e.g. `https://example.com/image.png`).', flags: 64 });
        }
        updated = await EmbedService.addComponent(user.id, guildId, {
          type: 12,
          items: [{ media: { url }, description }],
        });
        return _patchAndAck(interaction, updated, '✅ Media gallery added.');
      }

      // ── 🔘 Button ────────────────────────────────────────────
      if (customId === 'embed_modal_button') {
        const label = interaction.fields.getTextInputValue('label');
        const url = interaction.fields.getTextInputValue('url')?.trim() || null;

        if (url) {
          if (!isValidDiscordUrl(url)) {
            return interaction.reply({
              content: '❌ Invalid URL format! Please enter a valid URL (e.g. `https://example.com`).',
              flags: 64,
            });
          }
        }

        const emoji = interaction.fields.getTextInputValue('emoji')?.trim() || null;
        const emojiObj = emoji ? { name: emoji } : undefined;
        const btn = url
          ? { type: 2, style: 5, label, url, ...(emojiObj && { emoji: emojiObj }) }
          : { type: 2, style: 2, label, custom_id: `embed_btn_${Date.now()}`, ...(emojiObj && { emoji: emojiObj }) };
        updated = await EmbedService.addComponent(user.id, guildId, { type: 1, components: [btn] });
        return _patchAndAck(interaction, updated, '✅ Button added.');
      }

      // ── 🎨 Theme Colour ──────────────────────────────────────
      if (customId === 'embed_modal_color') {
        const hex = interaction.fields.getTextInputValue('hex');
        try {
          updated = await EmbedService.setAccentColor(user.id, guildId, hex);
        } catch (err) {
          return interaction.reply({ content: `❌ ${err.message}`, flags: 64 });
        }
        return _patchAndAck(interaction, updated, `✅ Theme colour set to \`${hex.toUpperCase()}\`.`);
      }

      // ── 💾 Save Template ─────────────────────────────────────
      if (customId === 'embed_modal_save') {
        const name = interaction.fields.getTextInputValue('name').trim();
        const description = interaction.fields.getTextInputValue('description') || '';
        const tags = interaction.fields.getTextInputValue('tags') || '';
        const tpl = await EmbedService.saveTemplate(user.id, guildId, { name, description, tags });
        if (!tpl) {
          return interaction.reply({ content: '❌ Add some components first, then save.', flags: 64 });
        }
        return _patchAndAck(interaction, session, `✅ Template **${name}** saved! Variables: \`${tpl.variables?.join(', ') || 'none'}\``);
      }

      // ── 📂 Load Template ─────────────────────────────────────
      if (customId === 'embed_modal_load') {
        const name = interaction.fields.getTextInputValue('name').trim();
        updated = await EmbedService.loadTemplate(user.id, guildId, name);
        if (!updated) {
          return interaction.reply({ content: `❌ No template named **${name}** found.`, flags: 64 });
        }
        return _patchAndAck(interaction, updated, `✅ Template **${name}** loaded.`);
      }

      // ── 📥 Import JSON ───────────────────────────────────────
      if (customId === 'embed_modal_import') {
        const jsonStr = interaction.fields.getTextInputValue('json');
        try {
          updated = await EmbedService.importJSON(user.id, guildId, jsonStr);
        } catch (err) {
          return interaction.reply({ content: `❌ Invalid JSON: ${err.message}`, flags: 64 });
        }
        return _patchAndAck(interaction, updated, '✅ JSON imported successfully.');
      }
      // Unhandled modal — log and ack gracefully
      logger.warn(`[EmbedModal] Unhandled customId: ${customId}`);
      await interaction.reply({ content: '❌ Unknown modal action.', flags: 64 }).catch(() => {});
    } catch (err) {
      logger.error(`[EmbedModal] ${customId}: ${err.message}`);
      const reply = { content: `❌ Error: ${err.message}`, flags: 64 };
      if (interaction.replied || interaction.deferred) {
        interaction.followUp(reply).catch(() => {});
      } else {
        interaction.reply(reply).catch(() => {});
      }
    }
  },
};

// ─── Acknowledge modal first + asynchronously patch editor message ───────────────

async function _patchAndAck(interaction, session, ackMessage) {
  // Acknowledge interaction first within 3-second window
  await interaction.reply({ content: ackMessage, flags: 64 }).catch((err) => {
    logger.error(`[EmbedModal] Failed to acknowledge modal: ${err.message}`);
  });

  // Patch original message in background
  const payload = EmbedService.buildEditorPayload(session);
  try {
    await EmbedService.patchOriginal(session, payload);
  } catch (err) {
    logger.warn(`[EmbedModal] patchOriginal failed: ${err.message}`);
  }
}
