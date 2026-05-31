<div align="center">

# 🎮 CJN Gaming — Minecraft Status Bot

**A professional Discord.js v14 Minecraft Server Status Bot**
Built with Node.js · MongoDB · Discord Component V2

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=flat-square&logo=discord)](https://discord.js.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb)](https://mongoosejs.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## ✨ Features

- 🟢 **Live Minecraft Status Panels** — Auto-refreshing every 30 seconds, editing the same message in-place
- ☕ **Java & 🪨 Bedrock** — Both editions supported via pure-JS ping
- 📊 **Uptime Tracking** — Persistent across bot restarts with percentage & duration
- 🔔 **Smart Notifications** — Status change, version update, and player peak alerts
- 🏗️ **`/embed` Builder** — Live interactive Component V2 container creator with template system
- ❌ **No Traditional Embeds** — 100% Discord Component V2 (`Container`, `Section`, `TextDisplay`, `MediaGallery`)
- ⚡ **Queue-based Updates** — Cooldown-protected, no message spam

---

## 🗂️ Project Structure

```
cjn-mc-bot/
├── index.js                        # Entry point + graceful shutdown
├── .env.example                    # Environment variable template
├── package.json
└── src/
    ├── commands/
    │   ├── server.js               # /server add|remove|list|edit|refresh|panel
    │   └── embed.js                # /embed create|send|template
    ├── components/
    │   ├── buttons/
    │   │   ├── refresh.js          # 🔄 Refresh button (with cooldown)
    │   │   ├── players.js          # 👥 Online players (paginated)
    │   │   └── embedControls.js    # /embed editor control buttons
    │   ├── menus/
    │   │   └── embedSelect.js      # /embed add-component select menu
    │   └── modals/
    │       └── embedModal.js       # All /embed modal submissions
    ├── events/
    │   └── client/
    │       ├── ready.js            # Bot startup + monitor init
    │       └── interactionCreate.js
    ├── handlers/
    │   ├── commandHandler.js       # Auto-loads commands/
    │   ├── eventHandler.js         # Auto-loads events/
    │   └── componentHandler.js     # Prefix-based interaction routing
    ├── models/
    │   ├── Guild.js
    │   ├── MinecraftServer.js      # Server data + embedded uptime log
    │   ├── StatusPanel.js          # Panel ↔ Discord message mapping
    │   ├── Notification.js         # Per-server alert config
    │   ├── EmbedTemplate.js        # Saved /embed templates
    │   └── EmbedSession.js         # Active editor sessions (TTL: 15min)
    ├── services/
    │   ├── MinecraftService.js     # Java + Bedrock ping with retry
    │   ├── StatusMonitorService.js # Polling engine + message updater
    │   ├── UptimeService.js        # Uptime % + state duration
    │   ├── NotificationService.js  # Alert dispatcher
    │   └── EmbedService.js         # /embed session + template engine
    ├── scripts/
    │   └── deploy-commands.js      # Register slash commands with Discord
    └── utils/
        ├── containerBuilder.js     # Component V2 layout builders
        ├── constants.js            # App-wide constants + custom IDs
        ├── helpers.js              # Shared utilities
        └── logger.js               # Winston logger
```

---

## ⚙️ Setup

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | `>= 18.0.0` |
| MongoDB | `>= 6.0` (local or Atlas) |
| Discord Bot | Application with `bot` + `applications.commands` scopes |

### 1. Clone & Install

```bash
git clone https://github.com/your-org/cjn-mc-bot.git
cd cjn-mc-bot
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here

MONGODB_URI=mongodb://localhost:27017/cjn-mc-bot

NODE_ENV=production
LOG_LEVEL=info
DEFAULT_REFRESH_INTERVAL=30000
REFRESH_COOLDOWN=10000
```

### 3. Deploy Slash Commands

```bash
npm run deploy
```

> Run this once, or any time you add/change commands.

### 4. Start the Bot

```bash
# Production
npm start

# Development (auto-restart)
npm run dev
```

---

## 🤖 Commands

### `/server` — Minecraft Server Management

| Command | Description |
|---|---|
| `/server add` | Add a Java or Bedrock server to monitor |
| `/server remove` | Remove a server and all its panels |
| `/server list` | List all monitored servers |
| `/server edit` | Edit server name, IP, or port |
| `/server refresh` | Force-refresh a server's status now |
| `/server panel create` | Create a live status panel in a channel |
| `/server panel delete` | Delete a status panel |

**`/server add` options:**

| Option | Required | Description |
|---|---|---|
| `name` | ✅ | Display name (max 64 chars) |
| `ip` | ✅ | Server hostname or IP |
| `type` | ✅ | `java` or `bedrock` |
| `port` | ❌ | Defaults: Java=25565, Bedrock=19132 |

---

### `/embed` — Container Builder

| Command | Description |
|---|---|
| `/embed create` | Open the live interactive editor |
| `/embed send #channel` | Post your current embed to a channel |
| `/embed template list` | List all saved templates |
| `/embed template delete` | Delete a template |
| `/embed template duplicate` | Copy a template with a new name |

**Editor components you can add:**

| Component | Description |
|---|---|
| 📝 Text Display | Markdown text block with variable support |
| 📦 Section | Multi-line content section (up to 3 lines) |
| 〰️ Separator | Visual divider |
| 🖼️ Media Gallery | Image from a direct URL |
| 🔘 Button | Link or custom action button |
| 🎨 Set Theme Color | Change accent colour via hex code |
| ↩️ Remove Last | Delete the last added component |

**Supported variables:**

| Variable | Resolves To |
|---|---|
| `{user}` | Interaction user mention |
| `{server}` | Guild name |
| `{membercount}` | Guild member count |
| `{server_ip}` | Minecraft server IP |
| `{server_version}` | Server version |
| `{player_count}` | Current online players |
| `{max_players}` | Max player cap |
| `{uptime}` | Uptime percentage |
| `{date}` | Current date |
| `{time}` | Current time |

---

## 🟢 How the Minecraft Status System Works

```
Bot Starts (ready.js)
│
├── Load all StatusPanels from MongoDB (active: true)
│
└── For each panel → StatusMonitorService.startPanel()
      │
      └── setInterval every 30 seconds:
            │
            ├── 1. MinecraftService.ping(type, ip, port)
            │         └── minecraft-server-util (pure JS, no native deps)
            │               ├── Java: status() → version, players, motd, favicon, ping
            │               └── Bedrock: statusBedrock() → version, players, motd, ping
            │               (retries up to 2 times, 5s timeout per attempt)
            │
            ├── 2. Update MinecraftServer document in MongoDB
            │         └── status, version, playerCount, ping, lastRefreshed, refreshCount++
            │
            ├── 3. UptimeService.record(serverId, online)
            │         └── $push { timestamp, online } into uptimeLog[]
            │               (capped at 2880 entries = 24h @ 30s)
            │
            ├── 4. Detect state changes
            │         ├── Status changed? (offline→online or online→offline)
            │         └── Version changed?
            │
            ├── 5. NotificationService.notify() [if changed]
            │         └── Sends Component V2 alert Container to notification channel
            │
            └── 6. Build + Edit Discord message
                      ├── containerBuilder.buildStatusPanel(server, panel)
                      │     └── Returns raw Component V2 JSON
                      │           flags: IsComponentsV2 (1 << 15)
                      │           └── Container (accent: 🟢green/🔴red/🟡yellow)
                      │                 ├── Section: Server name + status
                      │                 ├── Separator
                      │                 ├── Section: IP, Port, Version, Ping
                      │                 ├── Separator
                      │                 ├── Section: Players online/max
                      │                 ├── Separator
                      │                 ├── Section: MOTD
                      │                 ├── Separator
                      │                 ├── Section: Uptime %, duration, refresh count
                      │                 └── ActionRow: [🔄 Refresh] [👥 Players (N)]
                      │
                      └── channel.messages.fetch(messageId) → message.edit(payload)
                            (if no messageId → channel.send() + save new ID to DB)
```

### Status Panel Layout (Component V2)

```
┌─────────────────────────────────────────────┐  ← Container (green/red/yellow accent)
│ 🟢 CJN Gaming SMP                           │
│ ☕ Java Edition · Status: Online            │
├─────────────────────────────────────────────┤  ← Separator
│ 📡 Connection                               │
│ play.cjngaming.com:25565                   │
│ Version: 1.21.4  ·  Ping: 18ms            │
├─────────────────────────────────────────────┤
│ 👥 Players                                  │
│ 42 / 100 online                            │
├─────────────────────────────────────────────┤
│ 💬 MOTD                                     │
│ > Welcome to CJN Gaming!                   │
├─────────────────────────────────────────────┤
│ 📊 Statistics                               │
│ Uptime: 99.72%  ·  Online for: 2h 15m     │
│ Last Updated: 3 seconds ago                │
│ Refresh #1,247                             │
├─────────────────────────────────────────────┤
│  [🔄 Refresh]        [👥 Players (42)]      │  ← ActionRow
└─────────────────────────────────────────────┘
```

### Button Interactions

**🔄 Refresh Button**
- Per-user cooldown (default 10s)
- Triggers `StatusMonitorService.refreshPanel()` immediately
- Updates the panel in-place — no new message

**👥 Players Button**
- Ephemeral response (only visible to clicker)
- Paginated list (10 players per page)
- If server didn't send player names: shows count with a note
- Navigation buttons for large servers

---

## 🗄️ MongoDB Collections

| Collection | Model | Purpose |
|---|---|---|
| `guilds` | `Guild` | Guild registry, admin roles |
| `minecraft_servers` | `MinecraftServer` | Server config + embedded uptime log |
| `status_panels` | `StatusPanel` | Panel ↔ Discord message ID mapping |
| `notifications` | `Notification` | Per-server notification channel config |
| `embed_templates` | `EmbedTemplate` | Saved `/embed` templates |
| `embed_sessions` | `EmbedSession` | Active editor sessions (TTL: 15min) |

### Key Schema: MinecraftServer

```js
{
  guildId, name, type,         // 'java' | 'bedrock'
  ip, port,
  status,                       // 'online' | 'offline' | 'maintenance'
  version, motd, favicon,
  playerCount, maxPlayers,
  playerSamples: [String],      // player names from last ping
  ping,
  refreshCount,
  lastRefreshed: Date,
  uptimeLog: [                  // capped at 2880 entries
    { timestamp: Date, online: Boolean }
  ]
}
```

---

## 🔔 Notification System

Configure per-server alerts with MongoDB's `notifications` collection.

**Supported events:**

| Event | Trigger |
|---|---|
| `online` | Server comes back online |
| `offline` | Server goes offline |
| `versionChange` | Server updates its version |
| `playerPeak` | Player count hits configured threshold |

Each event sends a Component V2 alert Container to the configured channel.

---

## 🏗️ `/embed` Builder Flow

```
/embed create
  └── Creates/resets EmbedSession in MongoDB
        └── Sends ephemeral editor message with:
              ├── Live Preview Container (resolved with sample variables)
              ├── Component inventory list
              ├── "Add Component" select menu
              ├── Control buttons: [💾 Save] [📂 Load] [📤 Export] [📥 Import] [🗑️ Clear]
              └── [📨 Send to Channel] button → use /embed send #channel

User selects component type:
  ├── Text/Section/Media/Button/Color → showModal()
  │     └── On submit → addComponent() → webhook PATCH original ephemeral → live preview updates
  └── Separator/Remove Last → deferUpdate() → editReply() → instant update

/embed send #channel
  └── Reads current EmbedSession
        └── Posts Container to channel (non-ephemeral)
              └── Confirms with jump-to-message link
```

> **Note on live preview:** The editor is an ephemeral Discord message. After each modal submit, the bot uses the stored interaction token (Discord Webhook API) to PATCH the original ephemeral message — giving a true live-update feel without extra messages.

---

## 🛡️ Permissions

The bot requires the following Discord permissions:

| Permission | Reason |
|---|---|
| `Send Messages` | Posting status panels |
| `Read Message History` | Fetching panel messages to edit |
| `Embed Links` | Component V2 messages |
| `View Channel` | Reading channels |
| `Manage Messages` | Deleting old panels on `/server panel delete` |

All slash commands require `Manage Server` permission by default.

---

## 🚀 Deployment

### PM2 (Recommended)

```bash
npm install -g pm2
pm2 start index.js --name cjn-mc-bot
pm2 save
pm2 startup
```

### Environment

```bash
NODE_ENV=production
LOG_LEVEL=warn        # Reduces log noise in production
```

Logs are written to:
- `logs/combined.log` (all levels)
- `logs/error.log` (errors only)

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| `discord.js` | Discord API client |
| `mongoose` | MongoDB ODM |
| `minecraft-server-util` | Java + Bedrock server ping (pure JS) |
| `dotenv` | Environment variable loading |
| `winston` | Structured logging with file rotation |
| `node-cron` | Cron scheduling |
| `p-queue` | Async queue for rate-limit-safe updates |
| `node-cache` | In-memory caching |

---

## 📄 License

MIT © CJN Gaming
