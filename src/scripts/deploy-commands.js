'use strict';

/**
 * Deploy slash commands to Discord globally.
 * Run: node src/scripts/deploy-commands.js
 */
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { loadCommands, deployCommands } = require('../handlers/commandHandler');

(async () => {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.commands = new Collection();
  await loadCommands(client);
  await deployCommands(client);
  process.exit(0);
})();
