#!/usr/bin/env node
/**
 * scripts/seed_supabase.js
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your_service_key NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co node scripts/seed_supabase.js
 *
 * This script inserts sample rooms (idempotent by room number) and sample payments if they don't already exist.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const seedPath = path.join(__dirname, '..', 'db', 'seed_rooms.json');
  if (!fs.existsSync(seedPath)) {
    console.error('Seed file not found:', seedPath);
    process.exit(1);
  }
  const rooms = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  for (const r of rooms) {
    try {
      // check if room with same number exists
      const { data: existing, error: selErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('number', r.number)
        .limit(1);

      if (selErr) {
        console.error('Select error', selErr);
        continue;
      }

      if (existing && existing.length > 0) {
        // update existing
        const id = existing[0].id;
        const { error: updErr } = await supabase
          .from('rooms')
          .update({
            title: r.title,
            description: r.description,
            price: r.price,
            is_available: r.is_available,
            images: r.images || []
          })
          .eq('id', id);

        if (updErr) console.error('Update error for', r.number, updErr);
        else console.log('Updated room', r.number);
      } else {
        // insert new
        const { error: insErr } = await supabase
          .from('rooms')
          .insert([{
            number: r.number,
            title: r.title,
            description: r.description,
            price: r.price,
            is_available: r.is_available,
            images: r.images || []
          }]);

        if (insErr) console.error('Insert error for', r.number, insErr);
        else console.log('Inserted room', r.number);
      }
    } catch (e) {
      console.error('Error processing', r.number, e);
    }
  }

  // Optionally insert a sample payment if none exists
  try {
    const { data: payData } = await supabase.from('payments').select('*').limit(1);
    if (!payData || payData.length === 0) {
      const sample = {
        tenant_name: 'Uji Penghuni',
        phone: '+6281234567890',
        month: '2025-09',
        message: 'Pembayaran awal - sample',
        receipt_url: '',
        status: 'pending'
      };
      const { error: pErr } = await supabase.from('payments').insert([sample]);
      if (pErr) console.error('Insert sample payment error', pErr);
      else console.log('Inserted sample payment');
    } else {
      console.log('Payments exist - skipping sample payment insertion');
    }
  } catch (e) {
    console.error('Payment seed error', e);
  }

  console.log('Seeding finished.');
  process.exit(0);
}

main();
