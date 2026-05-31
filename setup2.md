# 📋 Whitelist Application System — Setup Guide

This guide explains how to set up, configure, and manage the newly implemented **Minecraft Whitelist Application System** in your CJN Gaming Discord Bot.

---

## 📋 Table of Contents
- [Requirements & Roles](#-requirements--roles)
- [Step 1 — Whitelist System Configuration](#step-1--whitelist-system-configuration)
- [Step 2 — Create the Application Panel](#step-2--create-the-application-panel)
- [Step 3 — Reviewing Applications (Staff Guide)](#step-3--reviewing-applications-staff-guide)
- [DiscordSRV Console Bridge Integration](#-discordsrv-console-bridge-integration)
- [Administrative Commands](#-administrative-commands)
- [Troubleshooting](#-troubleshooting)

---

## ⚙️ Requirements & Roles

To configure the whitelist system, you must have the **Manage Server** permission in Discord. Before starting, prepare:

| Requirement | Description |
|---|---|
| **Application Channel** | The public text channel where users can click the whitelist application button. |
| **Review Channel** | A staff-only private text channel where applications are sent for review. |
| **Console Channel** | The DiscordSRV console channel ID where the bot will send console bridge commands. |
| **Staff Role** | The Discord role representing your Whitelist Staff (authorized to review and vote on applications). |
| **Whitelist Role** | The Discord role granted to applicants upon acceptance. |

---

## Step 1 — Whitelist System Configuration

Configure your Whitelist System settings using the `/whitelist setup` slash command.

```
/whitelist setup application_channel:#apply review_channel:#staff-reviews staff_role:@Staff whitelist_role:@Whitelisted console_channel:#srv-console bedrock_prefix:.
```

### Setup Option Details:
- `application_channel`: The channel where the public application button is posted.
- `review_channel`: The private staff channel where new submissions are posted.
- `staff_role`: The Discord role required to Accept or Decline submissions.
- `whitelist_role`: The Discord role awarded to accepted players.
- `console_channel`: The channel connected to your DiscordSRV console bridge.
- `bedrock_prefix` (Optional): The prefix appended to Bedrock IGNs (choices: `.`, `_`, defaults to `.`).

Upon running this command, the bot will verify the settings and post a confirmation card using a Discord Component V2 Container listing the active configuration.

---

## Step 2 — Create the Application Panel

Once configured, post the interactive whitelist landing panel to your application channel:

```
/whitelist panel
```

The bot will post a Component V2 Container panel containing instructions and an interactive **📋 Apply for Whitelist** button:

```
┌─────────────────────────────────────────────┐
│ 🎮 CJN Gaming SMP — Minecraft Whitelisting │
├─────────────────────────────────────────────┤
│ Apply to join our premium Minecraft server  │
│ community! Click the button below to fill   │
│ out the whitelist application form.         │
├─────────────────────────────────────────────┤
│   [📋 Apply for Whitelist]                  │
└─────────────────────────────────────────────┘
```

---

## Step 3 — Reviewing Applications (Staff Guide)

When an applicant clicks the button, the bot presents them with a five-field Discord Modal:
1. **Discord Account**: Prefilled user ID (safeguarded against client modifications).
2. **Minecraft Username / IGN**: Required.
3. **Platform**: Platform selection (Java or Bedrock). Enforces case-insensitive validation.
4. **Age**: Required. Enforces number validation.
5. **YouTube Channel Link**: Optional channel input.

### The Staff Review Card
Once submitted, the bot posts a review container inside your staff **Review Channel**:

```
┌─────────────────────────────────────────────┐
│ 📋 New Whitelist Application                │
├─────────────────────────────────────────────┤
│ Applicant: @User (ID: 1234567890)           │
│ Minecraft IGN: Steve                        │
│ Platform: ☕ Java                           │
│ Age: 18                                     │
│ YouTube: Link                               │
├─────────────────────────────────────────────┤
│ Guild: UserTag · Applied at <timestamp>     │
├─────────────────────────────────────────────┤
│  [✅ Accept]              [❌ Decline]      │
└─────────────────────────────────────────────┘
```

### Staff Actions:

#### ✅ Accepting an Application
1. Click **[✅ Accept]** on the review message.
2. The bot shifts the DB application state atomically (preventing duplicate acceptance).
3. The review buttons are disabled and the card updates to: **`✅ Whitelist Application Accepted by @Staff`**.
4. The bot automatically adds the configured **Whitelist Role** to the applicant.
5. The Bedrock prefix is formatted (if bedrock platform is chosen).
6. The bot fires a console bridge message into the DiscordSRV console channel: `whitelist add <IGN>`.
7. A congratulations message is sent to the applicant's DMs.

#### ❌ Declining an Application
1. Click **[❌ Decline]** on the review message.
2. A Modal opens prompting you for a **Reason for Declining**.
3. Upon submission, the bot disables the review buttons and updates the card to: **`❌ Whitelist Application Declined by @Staff for: [Reason]`**.
4. A notification listing the decline reason is automatically DM'd to the applicant.

---

## 📡 DiscordSRV Console Bridge Integration

The Whitelist System communicates directly with your Minecraft server via the **DiscordSRV Console Channel**.
- When an application is accepted, the bot formats the command: `whitelist add <Username>`.
- If the applicant selected **Bedrock**, the configured Bedrock prefix (e.g. `.` or `_`) is automatically prepended to their username (e.g. `whitelist add .Steve` or `whitelist add _Steve`).
- The bot posts this command text directly into your configured DiscordSRV console channel.
- DiscordSRV captures the message and executes it as a console command on the Minecraft server.

---

## 🛠️ Administrative Commands

| Command | Action |
|---|---|
| `/whitelist setup` | Configures the system channels, roles, and prefixes. |
| `/whitelist panel` | Posts the whitelist landing panel into the application channel. |
| `/whitelist config` | Shows the active settings of the whitelist system. |
| `/whitelist logs` | Lists the latest 20 whitelist submissions with details and review outcomes. |

---

## 🛠️ Troubleshooting

### Review buttons are not responding
- Make sure you have the configured **Staff Role** assigned to your account or possess the **Manage Server** permission.
- Check bot logs (`logs/combined.log`) to verify if the bot is experiencing MongoDB connectivity issues.

### accepted players are not whitelisted in Minecraft
- Verify that the DiscordSRV console channel ID configured in `/whitelist setup` is correct and matches the channel monitored by DiscordSRV.
- Confirm the bot has `Send Messages` permission in the DiscordSRV console channel.

### Rejection/Congratulations DM is not sent
- This occurs when the applicant's Discord privacy settings have DMs disabled. The bot logs a warning and continues executing the whitelist/decline actions safely.

### duplicate applications / button spam
- The bot features built-in **Double-Action Guards** that make database transactions atomic. If multiple staff members click review buttons at the same time, only the first action is executed; subsequent interactions are blocked automatically.
