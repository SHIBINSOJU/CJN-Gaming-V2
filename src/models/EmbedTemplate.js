'use strict';

const { Schema, model } = require('mongoose');

const EmbedTemplateSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    name: { type: String, required: true, maxlength: 64 },
    description: { type: String, maxlength: 256, default: '' },
    components: { type: Schema.Types.Mixed, required: true }, // raw Component V2 JSON array
    accentColor: { type: Number, default: 0x5865f2 },
    variables: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    isPublic: { type: Boolean, default: false },
    createdBy: { type: String, required: true }, // Discord user ID
  },
  { timestamps: true }
);

EmbedTemplateSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = model('EmbedTemplate', EmbedTemplateSchema);
