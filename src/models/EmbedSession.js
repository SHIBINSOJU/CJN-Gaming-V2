'use strict';

const { Schema, model, Types } = require('mongoose');

const EmbedSessionSchema = new Schema(
  {
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, default: null },
    interactionToken: { type: String, default: null }, // for webhook PATCH of original ephemeral
    applicationId: { type: String, default: null },
    components: { type: Schema.Types.Mixed, default: [] }, // live Component V2 array
    accentColor: { type: Number, default: 0x5865f2 },      // container accent colour
    templateId: { type: Types.ObjectId, ref: 'EmbedTemplate', default: null },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 15 * 60 * 1000),
      index: { expireAfterSeconds: 0 }, // MongoDB TTL auto-expire
    },
    lastActivity: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

EmbedSessionSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = model('EmbedSession', EmbedSessionSchema);
