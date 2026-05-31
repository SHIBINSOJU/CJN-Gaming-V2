'use strict';

const { Schema, model } = require('mongoose');

const GuildSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    guildName: { type: String, default: 'Unknown Guild' },
    adminRoles: { type: [String], default: [] },
    notificationChannel: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = model('Guild', GuildSchema);
