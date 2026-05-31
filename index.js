'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const mongoose = require('mongoose');
const logger = require('./src/utils/logger');
const { loadCommands } = require('./src/handlers/commandHandler');
const { loadEvents } = require('./src/handlers/eventHandler');
const { loadComponents } = require('./src/handlers/componentHandler');
const StatusMonitorService = require('./src/services/StatusMonitorService');

// ─── Client Setup ───────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

// Collections
client.commands = new Collection();
client.components = new Collection();
client.cooldowns = new Collection();

// ─── Env Validation ─────────────────────────────────────────
const REQUIRED_VARS = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'MONGODB_URI'];
const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missing.length) {
  console.error(`\n❌  Missing required environment variables:\n   ${missing.join('\n   ')}\n\nCopy .env.example → .env and fill in the values.\n`);
  process.exit(1);
}

// ─── Boot Sequence ──────────────────────────────────────────
async function bootstrap() {
  try {
    // 1. Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    logger.info('MongoDB connected.');

    // 2. Load handlers
    await loadCommands(client);
    await loadEvents(client);
    await loadComponents(client);

    // 3. Login
    await client.login(process.env.DISCORD_TOKEN);
  } catch (err) {
    logger.error(`Bootstrap failed: ${err.message}`);
    process.exit(1);
  }
}

// ─── Graceful Shutdown ──────────────────────────────────────
async function shutdown(signal) {
  logger.warn(`Received ${signal}. Shutting down gracefully...`);
  try {
    StatusMonitorService.stopAll();
    await mongoose.disconnect();
    client.destroy();
    logger.info('Shutdown complete.');
  } catch (err) {
    logger.error(`Shutdown error: ${err.message}`);
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

bootstrap();
