const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://ryfndnuyawddfbgxetqf.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.argv[2]; // pasarlo como arg

if (!supabaseKey) {
  console.error("Falta la key");
  process.exit(1);
}

// Para ejecutar DDL, el anon key no funcionará. Necesitamos la service_role key o usar pg.
