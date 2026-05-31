'use strict';

/**
 * One-time migration: split any stored 'host:port' IP values into
 * separate ip + port fields across the minecraft_servers collection.
 *
 * Run once: node src/scripts/fix-ip-ports.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const MinecraftServer = require('../models/MinecraftServer');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB connected');

  const servers = await MinecraftServer.find({});
  let fixed = 0;

  for (const srv of servers) {
    const ip = String(srv.ip || '').trim();

    if (ip.includes(':')) {
      const lastColon = ip.lastIndexOf(':');
      const possiblePort = parseInt(ip.slice(lastColon + 1), 10);

      if (!isNaN(possiblePort) && possiblePort > 0 && possiblePort <= 65535) {
        const cleanHost = ip.slice(0, lastColon);
        console.log(`  🔧 Fixing "${srv.name}" → ip: "${ip}" → host: "${cleanHost}", port: ${possiblePort}`);
        srv.ip   = cleanHost;
        srv.port = possiblePort;
        await srv.save();
        fixed++;
      }
    }
  }

  console.log(`\n✅ Done. Fixed ${fixed} / ${servers.length} server(s).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
