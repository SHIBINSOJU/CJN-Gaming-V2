'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const EmbedService = require('../services/EmbedService');
const logger = require('../utils/logger');

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create professional Component V2 container messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)

    // ── /embed create ──────────────────────────────────────
    .addSubcommand((sub) =>
      sub.setName('create').setDescription('Open the live container editor')
    )

    // ── /embed send ────────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('send')
        .setDescription('Post your current embed to a channel')
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('Channel to post the embed in')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )

    // ── /embed template ────────────────────────────────────
    .addSubcommandGroup((group) =>
      group
        .setName('template')
        .setDescription('Manage saved embed templates')

        .addSubcommand((sub) =>
          sub.setName('list').setDescription('List all saved templates')
        )

        .addSubcommand((sub) =>
          sub
            .setName('delete')
            .setDescription('Delete a saved template')
            .addStringOption((o) =>
              o.setName('name').setDescription('Template name').setRequired(true).setAutocomplete(true)
            )
        )

        .addSubcommand((sub) =>
          sub
            .setName('duplicate')
            .setDescription('Duplicate an existing template with a new name')
            .addStringOption((o) =>
              o.setName('name').setDescription('Source template name').setRequired(true).setAutocomplete(true)
            )
            .addStringOption((o) =>
              o.setName('new_name').setDescription('Name for the duplicated template').setRequired(true).setMaxLength(64)
            )
        )
    ),

  // ─── Autocomplete ──────────────────────────────────────────────────────────
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const templates = await EmbedService.listTemplates(interaction.guildId);
    const choices = templates
      .filter((t) => t.name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((t) => ({ name: t.name, value: t.name }));
    await interaction.respond(choices).catch(() => {});
  },

  // ─── Execute Router ────────────────────────────────────────────────────────
  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    // /embed template *
    if (group === 'template') {
      if (sub === 'list') return handleTemplateList(interaction);
      if (sub === 'delete') return handleTemplateDelete(interaction);
      if (sub === 'duplicate') return handleTemplateDuplicate(interaction);
    }

    if (sub === 'create') return handleCreate(interaction);
    if (sub === 'send') return handleSend(interaction);
  },
};

// ─── Subcommand Handlers ──────────────────────────────────────────────────────

async function handleCreate(interaction) {
  await interaction.deferReply({ flags: 64 });

  const session = await EmbedService.createSession(
    interaction.user.id,
    interaction.guildId,
    interaction.channelId,
    interaction.token,
    interaction.applicationId
  );

  const payload = EmbedService.buildEditorPayload(session);
  await interaction.editReply(payload);
  logger.info(`[Embed] Session opened by ${interaction.user.tag} in guild ${interaction.guildId}`);
}

async function handleSend(interaction) {
  await interaction.deferReply({ flags: 64 });

  const channel = interaction.options.getChannel('channel');
  const { user, guildId } = interaction;

  const session = await EmbedService.getSession(user.id, guildId);
  if (!session || !session.components.length) {
    return interaction.editReply('❌ No components in your current session. Open the editor with `/embed create` first.');
  }

  try {
    const msg = await EmbedService.sendToChannel(user.id, guildId, channel);
    if (!msg) return interaction.editReply('❌ Failed to send — no components to post.');
    return interaction.editReply(`✅ Embed posted to ${channel}! [Jump to message](${msg.url})`);
  } catch (err) {
    logger.error(`[Embed /send] ${err.message}`);
    return interaction.editReply(`❌ Could not post to ${channel}: ${err.message}`);
  }
}

async function handleTemplateList(interaction) {
  await interaction.deferReply({ flags: 64 });

  const templates = await EmbedService.listTemplates(interaction.guildId);
  if (!templates.length) {
    return interaction.editReply('📭 No templates saved. Use `/embed create` to build one, then **💾 Save**.');
  }

  const lines = templates.map((t, i) => {
    const hex = `#${(t.accentColor ?? 0x5865f2).toString(16).toUpperCase().padStart(6, '0')}`;
    const tags = t.tags?.length ? ` · \`${t.tags.join(', ')}\`` : '';
    return `**${i + 1}.** \`${t.name}\` · ${hex}${tags}\n-# ${t.description || 'No description'}`;
  });

  return interaction.editReply(`**📋 Embed Templates (${templates.length})**\n\n${lines.join('\n\n')}`);
}

async function handleTemplateDelete(interaction) {
  await interaction.deferReply({ flags: 64 });

  const name = interaction.options.getString('name');
  const deleted = await EmbedService.deleteTemplate(interaction.guildId, name);
  if (!deleted) return interaction.editReply(`❌ No template named **${name}** found.`);
  return interaction.editReply(`✅ Template **${name}** deleted.`);
}

async function handleTemplateDuplicate(interaction) {
  await interaction.deferReply({ flags: 64 });

  const name = interaction.options.getString('name');
  const newName = interaction.options.getString('new_name');

  try {
    const dup = await EmbedService.duplicateTemplate(interaction.guildId, interaction.user.id, name, newName);
    if (!dup) return interaction.editReply(`❌ Template **${name}** not found.`);
    return interaction.editReply(`✅ Template **${name}** duplicated as **${newName}**.`);
  } catch (err) {
    return interaction.editReply(`❌ ${err.message}`);
  }
}
