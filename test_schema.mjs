import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// I will read .env file to get these
import fs from 'fs';
const envFile = fs.readFileSync('c:/Users/raam2/.gemini/antigravity-ide/scratch/estacion-digital-sv/frontend/.env', 'utf-8');
const lines = envFile.split('\n');
let url = '';
let key = '';
for (const line of lines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
}

const supabase = createClient(url, key);

async function check() {
  const { data: drivers, error: err1 } = await supabase.from('drivers').select('*').limit(1);
  console.log('Drivers:', drivers);
  
  const { data: users, error: err2 } = await supabase.from('user_profiles').select('*').limit(1);
  console.log('Users:', users);
}

check();
