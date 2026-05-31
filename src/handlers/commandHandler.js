'use strict';

const path = require('path');
const fs = require('fs');
const { REST, Routes } = require('discord.js');
const logger = require('../utils/logger');

/**
 * Recursively load all command files from commands/ directory.
 */
async function loadCommands(client) {
  const commandsPath = path.join(__dirname, '../commands');
  const files = getFiles(commandsPath, '.js');

  for (const file of files) {
    try {
      const command = require(file);
      if (!command?.data?.name || !command?.execute) {
        logger.warn(`[CommandHandler] Skipping invalid command: ${file}`);
        continue;
      }
      client.commands.set(command.data.name, command);
      logger.info(`[CommandHandler] Loaded: ${command.data.name}`);
    } catch (err) {
      logger.error(`[CommandHandler] Failed to load ${file}: ${err.message}`);
    }
  }

  logger.info(`[CommandHandler] ${client.commands.size} commands loaded.`);
}

/**
 * Deploy slash commands to Discord (run once via npm run deploy).
 */
async function deployCommands(client) {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  const commands = client.commands.map((cmd) => cmd.data.toJSON());

  try {
    logger.info(`Deploying ${commands.length} slash commands...`);
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
      body: commands,
    });
    logger.info('Slash commands deployed successfully.');
  } catch (err) {
    logger.error(`Deploy failed: ${err.message}`);
  }
}

/**
 * Recursively get all .js files in a directory.
 */
function getFiles(dir, ext) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getFiles(fullPath, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

module.exports = { loadCommands, deployCommands, getFiles };
