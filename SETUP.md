# 🎮 CJN Gaming — MC Status Bot Setup Guide

---

## 📋 Table of Contents

- [Requirements](#-requirements)
- [Step 1 — Create the Discord Bot](#step-1--create-the-discord-bot)
- [Step 2 — Install & Configure](#step-2--install--configure)
- [Step 3 — Deploy Commands](#step-3--deploy-slash-commands)
- [Step 4 — Run the Bot](#step-4--run-the-bot)
- [Command Reference](#-command-reference)
- [Quick Start — First Server Panel](#-quick-start--your-first-status-panel)
- [Notification Setup](#-notification-setup)
- [Troubleshooting](#-troubleshooting)

---

## ✅ Requirements

| Requirement | Where to get it |
|---|---|
| **Node.js v18+** | https://nodejs.org |
| **MongoDB** | https://mongodb.com/atlas (free cloud) or local install |
| **Discord Account** | https://discord.com |
| **A Discord Server** | Where you want the bot to run |

---

## Step 1 — Create the Discord Bot

### 1.1 Create the Application

1. Go to → https://discord.com/developers/applications
2. Click **New Application**
3. Give it a name (e.g. `CJN MC Status`) → **Create**

### 1.2 Create the Bot

1. In the left sidebar click **Bot**
2. Click **Add Bot** → **Yes, do it!**
3. Under **Token** click **Reset Token** → copy the token (save it — you only see it once)
4. Scroll down and enable these **Privileged Gateway Intents**:
   - ✅ **Server Members Intent**
   - ✅ **Message Content Intent**
5. Click **Save Changes**

### 1.3 Copy the Client ID

1. In the left sidebar click **General Information**
2. Copy the **Application ID** (this is your `DISCORD_CLIENT_ID`)

### 1.4 Invite the Bot to Your Server

1. In the left sidebar click **OAuth2 → URL Generator**
2. Under **Scopes** check:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Under **Bot Permissions** check:
   - ✅ Send Messages
   - ✅ Read Message History
   - ✅ View Channels
   - ✅ Embed Links
   - ✅ Attach Files
   - ✅ Manage Messages
4. Copy the generated URL at the bottom → open it in your browser
5. Select your server → **Authorize**

---

## Step 2 — Install & Configure

### 2.1 Install Dependencies

```bash
cd "cjn gaming"
npm install
```

### 2.2 Set Up Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# ─── Discord ───────────────────────────────────────────────
DISCORD_TOKEN=paste_your_bot_token_here
DISCORD_CLIENT_ID=paste_your_application_id_here

# ─── MongoDB ────────────────────────────────────────────────
MONGODB_URI=paste_your_mongodb_connection_string_here

# ─── Bot Config ─────────────────────────────────────────────
NODE_ENV=production
LOG_LEVEL=info
DEFAULT_REFRESH_INTERVAL=30000
REFRESH_COOLDOWN=10000
```

### 2.3 Getting Your MongoDB URI

**Option A — MongoDB Atlas (Free Cloud, Recommended)**
1. Go to → https://mongodb.com/atlas
2. Create a free account → Create a free **M0** cluster
3. Click **Connect** → **Drivers**
4. Copy the connection string — it looks like:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/cjn-mc-bot
   ```
5. Replace `<password>` with your actual password
6. Paste it as `MONGODB_URI` in your `.env`

**Option B — Local MongoDB**
```env
MONGODB_URI=mongodb://localhost:27017/cjn-mc-bot
```

---

## Step 3 — Deploy Slash Commands

This registers all `/server` and `/embed` commands with Discord.
**Run this once** (or whenever you add new commands).

```bash
npm run deploy
```

You should see:
```
[info]: Deploying 2 slash commands...
[info]: Slash commands deployed successfully.
```

> ⚠️ Global commands can take up to **1 hour** to appear in Discord after first deploy.
> For instant testing, commands usually appear within a few minutes.

---

## Step 4 — Run the Bot

**Development** (auto-restarts on file changes):
```bash
npm run dev
```

**Production**:
```bash
npm start
```

**With PM2** (keeps running after terminal closes):
```bash
npm install -g pm2
pm2 start index.js --name cjn-mc-bot
pm2 save
pm2 startup
```

**Successful startup looks like:**
```
[info]: Connecting to MongoDB...
[info]: MongoDB connected.
[info]: [CommandHandler] Loaded: server
[info]: [CommandHandler] Loaded: embed
[info]: [EventHandler] Registered: ready
[info]: [ComponentHandler] Loaded: mc_refresh
[info]: Logged in as CJN MC Status#1234
[info]: Serving 1 guilds.
[info]: Status Monitor Service started.
```

---

## 📖 Command Reference

> All commands require **Manage Server** permission.

---

### `/server` — Minecraft Server Management

#### `/server add`
Add a Minecraft server to monitor.

| Option | Required | Description | Example |
|---|---|---|---|
| `name` | ✅ | Display name for the server | `CJN SMP` |
| `ip` | ✅ | Server IP or hostname | `play.cjngaming.com` |
| `type` | ✅ | Edition: `java` or `bedrock` | `java` |
| `port` | ❌ | Port (default: 25565 Java / 19132 Bedrock) | `25565` |

**Example:**
```
/server add name:CJN SMP ip:play.cjngaming.com type:java
```

---

#### `/server panel create`
Create a live auto-updating status panel in a channel.

| Option | Required | Description |
|---|---|---|
| `name` | ✅ | Server name (from your added servers) |
| `channel` | ✅ | Text channel to post the panel in |
| `style` | ❌ | `default`, `compact`, or `detailed` |

**Example:**
```
/server panel create name:CJN SMP channel:#server-status
```

The panel will:
- Post immediately with the current status
- Auto-refresh every **30 seconds**
- Edit the **same message** (no spam)
- Show 🟢 green when online, 🔴 red when offline

---

#### `/server remove`
Remove a server and delete all its panels.

```
/server remove name:CJN SMP
```

---

#### `/server list`
Show all monitored servers in this guild with their current status.

```
/server list
```

---

#### `/server edit`
Edit a server's name, IP, or port.

| Option | Required | Description |
|---|---|---|
| `name` | ✅ | Current server name |
| `new_name` | ❌ | New display name |
| `new_ip` | ❌ | New IP/hostname |
| `new_port` | ❌ | New port number |

**Example:**
```
/server edit name:CJN SMP new_ip:new.cjngaming.com
```

---

#### `/server refresh`
Force an immediate refresh of a server's status panel.

```
/server refresh name:CJN SMP
```

---

#### `/server panel delete`
Delete a server's status panel from Discord and stop monitoring.

```
/server panel delete name:CJN SMP
```

---

### `/embed` — Container Builder

#### `/embed create`
Open the live interactive container editor (only visible to you).

```
/embed create
```

**Inside the editor you can add:**

| Component | What it does |
|---|---|
| 📝 Text Display | A block of markdown text |
| 📦 Section | Up to 3 lines of text grouped together |
| 〰️ Separator | A visual divider line |
| 🖼️ Media Gallery | An image from a direct URL |
| 🔘 Button | A link or custom button |
| 🎨 Set Theme Color | Change the container's accent colour |
| ↩️ Remove Last | Undo — delete the last component |

**Control buttons:**

| Button | Action |
|---|---|
| 💾 Save | Save as a reusable template |
| 📂 Load | Load a saved template |
| 📤 Export | Get the raw JSON |
| 📥 Import | Paste JSON to load it |
| 🗑️ Clear | Remove all components |
| 📨 Send to Channel | (see `/embed send`) |

**Supported variables** (replaced with real values at send time):

| Variable | Replaced with |
|---|---|
| `{user}` | The user who triggered it |
| `{server}` | Your Discord server name |
| `{membercount}` | Number of members |
| `{server_ip}` | Minecraft server IP |
| `{server_version}` | Server version |
| `{player_count}` | Players online |
| `{max_players}` | Max players |
| `{uptime}` | Server uptime % |
| `{date}` | Today's date |
| `{time}` | Current time |

---

#### `/embed send`
Post your current embed to any channel.

| Option | Required | Description |
|---|---|---|
| `channel` | ✅ | The channel to post in |

```
/embed send channel:#announcements
```

---

#### `/embed template list`
Show all saved embed templates.

```
/embed template list
```

---

#### `/embed template delete`
Delete a saved template.

```
/embed template delete name:Welcome Card
```

---

#### `/embed template duplicate`
Copy a template with a new name.

| Option | Required | Description |
|---|---|---|
| `name` | ✅ | Source template to copy |
| `new_name` | ✅ | Name for the copy |

```
/embed template duplicate name:Welcome Card new_name:Welcome Card v2
```

---

## ⚡ Quick Start — Your First Status Panel

Follow these steps in order after the bot is running:

```
Step 1:  /server add name:My Server  ip:play.yourserver.com  type:java

Step 2:  /server panel create  name:My Server  channel:#server-status

         ✅ Done! The bot will now post a live panel in #server-status
            and auto-refresh it every 30 seconds.
```

**What the panel looks like:**

```
┌─────────────────────────────────────────────┐
│ 🟢 My Server                                │
│ ☕ Java Edition · Status: Online            │
├─────────────────────────────────────────────┤
│ 📡 Connection                               │
│ play.yourserver.com:25565                  │
│ Version: 1.21.4  ·  Ping: 18ms            │
├─────────────────────────────────────────────┤
│ 👥 Players                                  │
│ 12 / 100 online                            │
├─────────────────────────────────────────────┤
│ 📊 Statistics                               │
│ Uptime: 99.72%  ·  Online for: 2h 15m     │
│ Last Updated: just now · Refresh #1,247    │
├─────────────────────────────────────────────┤
│  [🔄 Refresh]       [👥 Players (12)]       │
└─────────────────────────────────────────────┘
```

**Panel buttons:**
- **🔄 Refresh** — Force refresh right now (10 second cooldown per user)
- **👥 Players (N)** — See who's online (paginated list, only visible to you)

---

## 🔔 Notification Setup

> Coming soon via `/server notify` command.
> Currently configured directly in MongoDB's `notifications` collection.

**Supported alert types:**
| Alert | When it fires |
|---|---|
| 🟢 Server Online | Server comes back up after being down |
| 🔴 Server Offline | Server goes down |
| 🔄 Version Changed | Server updates its Minecraft version |
| 🏆 Player Peak | Player count hits a set threshold |

---

## 🛠️ Troubleshooting

### Bot doesn't come online
- Double-check `DISCORD_TOKEN` in `.env` — must be the **bot token**, not the client secret
- Make sure the bot was invited with the correct permissions (see Step 1.4)

### Commands don't appear in Discord
- Run `npm run deploy` again
- Wait up to 1 hour for global command propagation
- Check the bot has `applications.commands` scope

### `Bootstrap failed: uri undefined`
- Make sure `.env` exists and has `MONGODB_URI` filled in
- Run: `node -e "require('dotenv').config({path:'.env'}); console.log(process.env.MONGODB_URI)"`
- Should print your connection string — if it prints `undefined`, the `.env` file is missing or empty

### MongoDB connection timeout
- If using Atlas: whitelist your IP in **Network Access → Add IP Address → Allow from Anywhere** (`0.0.0.0/0`)
- If using local MongoDB: make sure `mongod` is running

### Panel not auto-refreshing
- Make sure the bot has **Read Message History** and **Send Messages** permissions in the panel channel
- Check `logs/combined.log` for errors

### `Missing Permissions` error on panel create
- The bot needs **Send Messages** in the target channel
- Right-click the channel → **Edit Channel → Permissions** → add the bot

---

## 📁 Log Files

| File | Contains |
|---|---|
| `logs/combined.log` | All log levels |
| `logs/error.log` | Errors only |

View live logs:
```bash
tail -f logs/combined.log
```

---

## 🔁 Updating the Bot

```bash
git pull
npm install
npm run deploy   # only if commands changed
npm run dev      # or pm2 restart cjn-mc-bot
```

---

*CJN Gaming MC Status Bot — Built with Discord.js v14 + MongoDB*
