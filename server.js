'use strict';

const express = require('express');
const path = require('path');

const app = express();

// ─── View Engine ────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Static Assets ──────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Routes ─────────────────────────────────────────────────
app.get('/', (_req, res) => {
  const data = {
    botName: 'CJN Gaming Bot',
    botDescription:
      'A powerful Minecraft Server Status bot for the CJN Gaming Discord community. ' +
      'Get live server stats, player counts, and status updates right inside Discord.',
    botAvatarUrl:
      `https://cdn.discordapp.com/avatars/${process.env.DISCORD_CLIENT_ID}/` +
      // Fall back to a generic robot avatar if the bot avatar is not set
      'default.png',
    serverCount: '—',          // placeholder – replace with live count via Discord client if needed
    inviteUrl:
      `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}` +
      '&permissions=2048&scope=bot%20applications.commands',
    supportUrl: process.env.SUPPORT_SERVER_URL || 'https://discord.gg/your-support-server',
  };

  res.render('index', data);
});

app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// ─── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

function startWebServer() {
  app.listen(PORT, () => {
    console.log(`[Web] Express server listening on port ${PORT}`);
  });
}

module.exports = { startWebServer };
