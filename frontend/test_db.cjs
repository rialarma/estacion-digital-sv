const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k) acc[k.trim()] = v.join('=').trim().replace(/['"]/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY); // if no service key, we'll try something else
async function test() {
  const { data, error } = await supabase.from('store_cart_items').select('quantity, products(*)');
  console.log('Items:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}
test();
