'use strict';

const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { getFiles } = require('./commandHandler');

/**
 * Load all event files and register them on the client.
 */
async function loadEvents(client) {
  const eventsPath = path.join(__dirname, '../events');
  const files = getFiles(eventsPath, '.js');

  for (const file of files) {
    try {
      const event = require(file);
      if (!event?.name || !event?.execute) {
        logger.warn(`[EventHandler] Skipping invalid event: ${file}`);
        continue;
      }
      const fn = (...args) => event.execute(...args, client);
      if (event.once) {
        client.once(event.name, fn);
      } else {
        client.on(event.name, fn);
      }
      logger.info(`[EventHandler] Registered: ${event.name}`);
    } catch (err) {
      logger.error(`[EventHandler] Failed to load ${file}: ${err.message}`);
    }
  }
}

module.exports = { loadEvents };
