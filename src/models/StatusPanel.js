'use strict';

const { Schema, model, Types } = require('mongoose');

const StatusPanelSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    serverId: { type: Types.ObjectId, ref: 'MinecraftServer', required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, default: null },
    style: { type: String, enum: ['default', 'compact', 'detailed'], default: 'default' },
    autoRefresh: { type: Boolean, default: true },
    refreshInterval: { type: Number, default: 30000, min: 15000 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

StatusPanelSchema.index({ guildId: 1, serverId: 1 });

module.exports = model('StatusPanel', StatusPanelSchema);
