'use strict';

const path = require('path');
const { getFiles } = require('./commandHandler');
const logger = require('../utils/logger');

/**
 * Load all button/menu component handlers from components/ directory.
 * Each file must export: { customId, execute }
 * customId can be a string prefix (matched with startsWith).
 */
async function loadComponents(client) {
  const componentsPath = path.join(__dirname, '../components');
  const files = getFiles(componentsPath, '.js');

  for (const file of files) {
    try {
      const component = require(file);
      if (!component?.customId || !component?.execute) {
        logger.warn(`[ComponentHandler] Skipping invalid component: ${file}`);
        continue;
      }
      client.components.set(component.customId, component);
      logger.info(`[ComponentHandler] Loaded: ${component.customId}`);
    } catch (err) {
      logger.error(`[ComponentHandler] Failed to load ${file}: ${err.message}`);
    }
  }

  logger.info(`[ComponentHandler] ${client.components.size} components loaded.`);
}

/**
 * Route an interaction to its component handler.
 *
 * Priority order:
 *   1. Exact match           'embed_select'     → embed_select handler
 *   2. Colon-prefix match    'mc_refresh:id'    → mc_refresh handler
 *   3. Longest-prefix match  'embed_modal_text' → embed_modal handler (beats embed_)
 */
async function routeComponent(interaction, client) {
  const id = interaction.customId;

  // 1. Exact match
  if (client.components.has(id)) {
    return client.components.get(id).execute(interaction, client);
  }

  // 2. Colon-delimited prefix: 'mc_refresh:serverId:page' → try 'mc_refresh'
  const colonPart = id.split(':')[0];
  if (colonPart !== id && client.components.has(colonPart)) {
    return client.components.get(colonPart).execute(interaction, client);
  }

  // 3. Longest matching prefix (prevents 'embed_' stealing 'embed_modal_text')
  let bestKey = null;
  let bestLen = 0;
  for (const key of client.components.keys()) {
    if (id.startsWith(key) && key.length > bestLen) {
      bestKey = key;
      bestLen = key.length;
    }
  }
  if (bestKey) {
    return client.components.get(bestKey).execute(interaction, client);
  }

  logger.warn(`[ComponentHandler] No handler found for customId: ${id}`);
}

module.exports = { loadComponents, routeComponent };
