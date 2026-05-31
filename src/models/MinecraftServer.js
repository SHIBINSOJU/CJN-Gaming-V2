'use strict';

const { Schema, model } = require('mongoose');

const UptimeRecordSchema = new Schema(
  {
    timestamp: { type: Date, default: Date.now },
    online: { type: Boolean, required: true },
  },
  { _id: false }
);

const MinecraftServerSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    name: { type: String, required: true, maxlength: 64 },
    type: { type: String, enum: ['java', 'bedrock'], required: true },
    ip: { type: String, required: true },
    port: { type: Number, required: true },

    // Latest poll data
    status: { type: String, enum: ['online', 'offline', 'maintenance'], default: 'offline' },
    version: { type: String, default: null },
    motd: { type: String, default: null },
    favicon: { type: String, default: null },
    playerCount: { type: Number, default: 0 },
    maxPlayers: { type: Number, default: 0 },
    playerSamples: { type: [String], default: [] },
    ping: { type: Number, default: null },

    // Stats
    refreshCount: { type: Number, default: 0 },
    lastRefreshed: { type: Date, default: null },

    // Uptime tracking (capped at 2880 records = 24h @ 30s)
    uptimeLog: { type: [UptimeRecordSchema], default: [] },
  },
  { timestamps: true }
);

// Compound index for guild + name uniqueness
MinecraftServerSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = model('MinecraftServer', MinecraftServerSchema);
