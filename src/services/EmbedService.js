'use strict';

const { REST, Routes, AttachmentBuilder } = require('discord.js');
const EmbedSession = require('../models/EmbedSession');
const EmbedTemplate = require('../models/EmbedTemplate');
const { IS_COMPONENTS_V2 } = require('../utils/containerBuilder');

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

// ─── Component type IDs ───────────────────────────────────────────────────────
const T = { CONTAINER: 17, SECTION: 9, TEXT: 10, MEDIA: 12, SEPARATOR: 14, ACTION_ROW: 1, BUTTON: 2 };

// ─── Sample variable values shown in live preview ─────────────────────────────
const SAMPLE_VARS = {
  user: '@CJN#0001',
  server: 'CJN Gaming',
  membercount: '1,234',
  server_ip: 'play.cjngaming.com',
  server_version: '1.21.4',
  player_count: '42',
  max_players: '100',
  uptime: '99.72%',
  date: new Date().toLocaleDateString('en-GB'),
  time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveStr(str, vars) {
  return String(str).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

function resolveComponents(components, vars) {
  return components.map((c) => {
    const clone = JSON.parse(JSON.stringify(c));
    if (clone.content) clone.content = resolveStr(clone.content, vars);
    if (clone.label) clone.label = resolveStr(clone.label, vars);
    if (Array.isArray(clone.components)) clone.components = resolveComponents(clone.components, vars);
    if (Array.isArray(clone.items)) {
      clone.items = clone.items.map((item) => ({
        ...item,
        description: item.description ? resolveStr(item.description, vars) : item.description,
      }));
    }
    return clone;
  });
}

function extractVariables(components) {
  const raw = JSON.stringify(components);
  const matches = raw.match(/\{(\w+)\}/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
}

function parseHexColor(hex) {
  const clean = hex.replace(/^#/, '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) throw new Error('Invalid hex colour. Use format: `#5865F2`');
  return parseInt(clean, 16);
}

function componentSummary(c, i) {
  const n = `\`${i + 1}.\``;
  if (c.type === T.TEXT) return `${n} 📝 Text — *"${String(c.content ?? '').slice(0, 35)}..."*`;
  if (c.type === T.SECTION) return `${n} 📦 Section — ${c.components?.length ?? 0} line(s)`;
  if (c.type === T.SEPARATOR) return `${n} 〰️ Separator`;
  if (c.type === T.MEDIA) return `${n} 🖼️ Media Gallery`;
  if (c.type === T.ACTION_ROW) {
    const btns = c.components?.map((b) => b.label).join(', ') ?? '';
    return `${n} 🔘 Button Row — [${btns}]`;
  }
  return `${n} ❓ Unknown`;
}

// ─── EmbedService ─────────────────────────────────────────────────────────────

class EmbedService {
  // ── Session Lifecycle ───────────────────────────────────────────────────────

  static async createSession(userId, guildId, channelId, interactionToken, applicationId) {
    return EmbedSession.findOneAndUpdate(
      { userId, guildId },
      {
        userId,
        guildId,
        channelId,
        components: [],
        accentColor: 0x5865f2,
        templateId: null,
        interactionToken,
        applicationId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        lastActivity: new Date(),
      },
      { upsert: true, new: true }
    );
  }

  static async getSession(userId, guildId) {
    return EmbedSession.findOne({ userId, guildId });
  }

  // ── Component Manipulation ──────────────────────────────────────────────────

  static async addComponent(userId, guildId, component) {
    return EmbedSession.findOneAndUpdate(
      { userId, guildId },
      {
        $push: { components: component },
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
      { new: true }
    );
  }

  static async removeLastComponent(userId, guildId) {
    const session = await EmbedSession.findOne({ userId, guildId });
    if (!session || !session.components.length) return session;
    session.components.pop();
    session.lastActivity = new Date();
    await session.save();
    return session;
  }

  static async clearComponents(userId, guildId) {
    return EmbedSession.findOneAndUpdate(
      { userId, guildId },
      { components: [], lastActivity: new Date() },
      { new: true }
    );
  }

  static async setAccentColor(userId, guildId, hexString) {
    const color = parseHexColor(hexString); // throws on invalid
    return EmbedSession.findOneAndUpdate(
      { userId, guildId },
      { accentColor: color, lastActivity: new Date() },
      { new: true }
    );
  }

  // ── Payload Builders ────────────────────────────────────────────────────────

  /**
   * Build the full ephemeral editor message payload.
   */
  static buildEditorPayload(session) {
    const comps = session.components ?? [];
    const color = session.accentColor ?? 0x5865f2;
    const resolved = resolveComponents(comps, SAMPLE_VARS);

    const inventory = comps.length
      ? comps.map((c, i) => componentSummary(c, i)).join('\n')
      : '*No components yet.*';

    const hexColor = `#${color.toString(16).toUpperCase().padStart(6, '0')}`;

    return {
      flags: IS_COMPONENTS_V2 | 64, // IS_COMPONENTS_V2 + ephemeral
      components: [
        // ── Live Preview ──────────────────────────────────────
        {
          type: T.CONTAINER,
          accent_color: color,
          components: resolved.length
            ? resolved
            : [{ type: T.TEXT, content: '### 🏗️ Live Preview\n*Add components using the menu below to see them here.*' }],
        },
        // ── Component Inventory ───────────────────────────────
        {
          type: T.CONTAINER,
          accent_color: 0x2b2d31,
          components: [
            {
              type: T.TEXT,
              content: `**Components (${comps.length})** · Theme: \`${hexColor}\`\n${inventory}`,
            },
          ],
        },
        // ── Add Component Select Menu ─────────────────────────
        {
          type: T.ACTION_ROW,
          components: [
            {
              type: 3, // StringSelect
              custom_id: 'embed_select',
              placeholder: '➕ Add a component...',
              min_values: 1,
              max_values: 1,
              options: [
                { label: 'Text Display', value: 'text', description: 'Markdown text block', emoji: { name: '📝' } },
                { label: 'Multi-line Block', value: 'section', description: 'Up to 3 lines grouped (uses text block)', emoji: { name: '📦' } },
                { label: 'Separator', value: 'separator', description: 'Visual divider', emoji: { name: '〰️' } },
                { label: 'Media Gallery', value: 'media', description: 'Image (direct URL)', emoji: { name: '🖼️' } },
                { label: 'Button', value: 'button', description: 'Link or custom button', emoji: { name: '🔘' } },
                { label: 'Set Theme Color', value: 'set_color', description: 'Change accent colour (hex)', emoji: { name: '🎨' } },
                { label: 'Remove Last', value: 'remove_last', description: 'Delete the last component', emoji: { name: '↩️' } },
              ],

            },
          ],
        },
        // ── Control Buttons ───────────────────────────────────
        {
          type: T.ACTION_ROW,
          components: [
            { type: T.BUTTON, style: 3, label: 'Save', custom_id: 'embed_save', emoji: { name: '💾' } },
            { type: T.BUTTON, style: 2, label: 'Load', custom_id: 'embed_load', emoji: { name: '📂' } },
            { type: T.BUTTON, style: 2, label: 'Export', custom_id: 'embed_export', emoji: { name: '📤' } },
            { type: T.BUTTON, style: 2, label: 'Import', custom_id: 'embed_import', emoji: { name: '📥' } },
            { type: T.BUTTON, style: 4, label: 'Clear', custom_id: 'embed_clear', emoji: { name: '🗑️' } },
          ],
        },
        // ── Send Row ──────────────────────────────────────────
        {
          type: T.ACTION_ROW,
          components: [
            { type: T.BUTTON, style: 1, label: 'Send to Channel', custom_id: 'embed_send', emoji: { name: '📨' } },
          ],
        },
      ],
    };
  }

  /**
   * Build a standalone container payload for posting to a channel.
   */
  static buildPostPayload(session) {
    const comps = session.components ?? [];
    const color = session.accentColor ?? 0x5865f2;
    return {
      flags: IS_COMPONENTS_V2,
      components: [
        {
          type: T.CONTAINER,
          accent_color: color,
          components: comps,
        },
      ],
    };
  }

  // ── Webhook Patch (edit original ephemeral) ─────────────────────────────────

  static async patchOriginal(session, payload) {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const body = { ...payload, flags: IS_COMPONENTS_V2 }; // no ephemeral flag on PATCH
    await rest.patch(
      Routes.webhookMessage(session.applicationId, session.interactionToken, '@original'),
      { body }
    );
  }

  // ── Send to Channel ─────────────────────────────────────────────────────────

  static async sendToChannel(userId, guildId, channel) {
    const session = await EmbedSession.findOne({ userId, guildId });
    if (!session || !session.components.length) return null;
    const payload = EmbedService.buildPostPayload(session);
    const msg = await channel.send(payload);
    return msg;
  }

  // ── Template Operations ─────────────────────────────────────────────────────

  static async saveTemplate(userId, guildId, { name, description, tags }) {
    const session = await EmbedSession.findOne({ userId, guildId });
    if (!session || !session.components.length) return null;

    const variables = extractVariables(session.components);
    const tagArr = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

    return EmbedTemplate.findOneAndUpdate(
      { guildId, name },
      {
        guildId,
        name,
        description: description ?? '',
        components: session.components,
        accentColor: session.accentColor,
        variables,
        tags: tagArr,
        createdBy: userId,
      },
      { upsert: true, new: true }
    );
  }

  static async listTemplates(guildId) {
    return EmbedTemplate.find({ guildId }).select('name description tags accentColor createdAt').lean();
  }

  static async loadTemplate(userId, guildId, templateName) {
    const tpl = await EmbedTemplate.findOne({ guildId, name: templateName }).lean();
    if (!tpl) return null;
    return EmbedSession.findOneAndUpdate(
      { userId, guildId },
      {
        components: tpl.components,
        accentColor: tpl.accentColor ?? 0x5865f2,
        templateId: tpl._id,
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
      { new: true }
    );
  }

  static async duplicateTemplate(guildId, userId, sourceName, newName) {
    const source = await EmbedTemplate.findOne({ guildId, name: sourceName }).lean();
    if (!source) return null;
    const conflict = await EmbedTemplate.findOne({ guildId, name: newName });
    if (conflict) throw new Error(`A template named **${newName}** already exists.`);
    return EmbedTemplate.create({
      guildId,
      name: newName,
      description: source.description,
      components: source.components,
      accentColor: source.accentColor,
      variables: source.variables,
      tags: source.tags,
      isPublic: false,
      createdBy: userId,
    });
  }

  static async deleteTemplate(guildId, templateName) {
    return EmbedTemplate.findOneAndDelete({ guildId, name: templateName });
  }

  static async exportJSON(userId, guildId) {
    const session = await EmbedSession.findOne({ userId, guildId }).lean();
    if (!session) return null;
    return JSON.stringify(
      { accentColor: session.accentColor, components: session.components },
      null,
      2
    );
  }

  static async importJSON(userId, guildId, jsonStr) {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed?.components)) throw new Error('Expected `{ "components": [...] }`');

    // Validate URLs in imported components
    for (const comp of parsed.components) {
      if (comp.type === 1 && Array.isArray(comp.components)) { // ACTION_ROW
        for (const sub of comp.components) {
          if (sub.type === 2 && sub.url && !isValidDiscordUrl(sub.url)) {
            throw new Error(`Invalid button URL: "${sub.url}"`);
          }
        }
      }
      if (comp.type === 12 && Array.isArray(comp.items)) { // MEDIA_GALLERY
        for (const item of comp.items) {
          if (item.media?.url && !isValidDiscordUrl(item.media.url)) {
            throw new Error(`Invalid media URL: "${item.media.url}"`);
          }
        }
      }
    }

    const color = parsed.accentColor ?? 0x5865f2;
    return EmbedSession.findOneAndUpdate(
      { userId, guildId },
      { components: parsed.components, accentColor: color, lastActivity: new Date() },
      { new: true }
    );
  }
}

module.exports = EmbedService;
