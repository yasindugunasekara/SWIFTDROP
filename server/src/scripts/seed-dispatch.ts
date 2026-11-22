import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../config/database.js';
import { inMemoryDispatchStore, dispatchService } from '../modules/dispatch/dispatch.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedDispatchData() {
  console.log('\n============================================================');
  console.log('🌱 SEEDING MEMBER 5: DISPATCH, COURIER & PRICING DEMO DATA');
  console.log('============================================================\n');

  // 1. Seed In-Memory Store with rich data
  inMemoryDispatchStore.seedDefaultData();
  console.log('✅ In-Memory Dispatch Store seeded with:');
  console.log('   - 5 Registered Couriers (Sunil, Sarah, Kamal, Nuwan, Chaminda)');
  console.log('   - 4 Unassigned Queued Parcels (Pettah, Kandy, Galle, Katunayake)');
  console.log('   - 4 Delivery Zones (Colombo, Kandy, Galle, Island-wide)');
  console.log('   - Standard LKR Pricing Matrix (Base: 350.00, Per-Kg: 50.00, Per-Km: 20.00)');

  // 2. If PostgreSQL database is reachable, apply SQL seed
  try {
    const seedPath = path.join(__dirname, '../database/seeds/dispatch-demo-data.sql');
    if (fs.existsSync(seedPath)) {
      const sql = fs.readFileSync(seedPath, 'utf8');
      console.log('\n📡 Attempting to apply SQL seed to connected PostgreSQL database...');
      await db.query(sql);
      console.log('✅ PostgreSQL Database seeded successfully with dispatch demo records!');
    }
  } catch (err: any) {
    console.log('ℹ️  PostgreSQL live seed bypassed (using in-memory fallback store):', err.message);
  }

  // 3. Verify seeded counts
  const parcels = await dispatchService.getUnassignedParcels();
  const couriers = await dispatchService.getCourierWorkloads();
  const config = await dispatchService.getServiceConfig();

  console.log('\n📊 SEED VERIFICATION SUMMARY:');
  console.log(`   - Unassigned Parcels in Queue: ${parcels.length}`);
  console.log(`   - Fleet Couriers Configured  : ${couriers.length}`);
  console.log(`   - Base Delivery Fee          : LKR ${config.baseBookingFee.toFixed(2)}`);
  console.log(`   - Active Delivery Zones      : ${config.zones.length}`);
  console.log('\n============================================================\n');
}

// Run directly if invoked from CLI
if (process.argv[1] && process.argv[1].endsWith('seed-dispatch.ts')) {
  seedDispatchData().then(() => process.exit(0)).catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
