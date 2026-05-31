'use strict';

const { Schema, model } = require('mongoose');

const WhitelistApplicationSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userTag: { type: String, required: true },
    ign: { type: String, required: true },
    platform: { type: String, enum: ['java', 'bedrock'], required: true },
    age: { type: Number, required: true },
    youtubeLink: { type: String, default: null },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending', index: true },
    staffReviewer: { type: String, default: null },
    reviewTimestamp: { type: Date, default: null },
    declineReason: { type: String, default: null },
    whitelisted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Prevent duplicate pending or accepted whitelist submissions for the same IGN within a guild
WhitelistApplicationSchema.index({ guildId: 1, ign: 1, status: 1 });

module.exports = model('WhitelistApplication', WhitelistApplicationSchema);
