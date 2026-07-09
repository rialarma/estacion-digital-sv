import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('c:/Users/raam2/.gemini/antigravity-ide/scratch/estacion-digital-sv/frontend/.env', 'utf-8');
const lines = envFile.split('\n');
let url = '';
let key = '';
for (const line of lines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/"/g, '');
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/"/g, '');
}

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('clients').select('id, name, tenant_id').order('name');
  if (error) console.error(error);
  else {
    const counts = {};
    for (const row of data) {
      const k = row.name;
      counts[k] = (counts[k] || 0) + 1;
    }
    const dups = Object.entries(counts).filter(e => e[1] > 1);
    console.log(`Total clients: ${data.length}`);
    console.log(`Duplicates:`, dups);
  }
}

check();
