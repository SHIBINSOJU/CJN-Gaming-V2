'use strict';

const { Schema, model } = require('mongoose');

const WhitelistConfigSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    appChannelId: { type: String, required: true },
    reviewChannelId: { type: String, required: true },
    staffRoleId: { type: String, required: true },
    whitelistRoleId: { type: String, required: true },
    consoleChannelId: { type: String, required: true },
    bedrockPrefix: { type: String, enum: ['.', '_'], default: '.' },
  },
  { timestamps: true }
);

module.exports = model('WhitelistConfig', WhitelistConfigSchema);
