const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.qndxofpukjoxvslkmnbz:N4N@d@F$xQ@6wF!@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require' });
client.connect().then(() => {
  client.query("SELECT pg_get_functiondef('public.convert_web_order_to_sale'::regproc)").then(res => {
    console.log(res.rows[0].pg_get_functiondef);
    client.end();
  }).catch(e => {
    console.error(e);
    client.end();
  });
});
