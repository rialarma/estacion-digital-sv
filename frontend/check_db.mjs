import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: sales } = await supabase.from('sales').select('*').limit(1);
  if (sales && sales.length > 0) {
    console.log("Sales columns:", Object.keys(sales[0]));
  } else {
    console.log("No data in sales");
  }

  const { data: purchases } = await supabase.from('purchases').select('*').limit(1);
  if (purchases && purchases.length > 0) {
    console.log("Purchases columns:", Object.keys(purchases[0]));
  } else {
    console.log("No data in purchases");
  }
}

check();
