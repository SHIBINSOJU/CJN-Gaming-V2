'use strict';

const { Schema, model, Types } = require('mongoose');

const NotificationSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    serverId: { type: Types.ObjectId, ref: 'MinecraftServer', required: true },
    channelId: { type: String, required: true },
    events: {
      online: { type: Boolean, default: true },
      offline: { type: Boolean, default: true },
      versionChange: { type: Boolean, default: true },
      playerPeak: { type: Boolean, default: false },
    },
    playerPeakThreshold: { type: Number, default: 50 },
    peakNotified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ guildId: 1, serverId: 1 }, { unique: true });

module.exports = model('Notification', NotificationSchema);
