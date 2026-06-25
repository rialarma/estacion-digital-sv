const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.ryfndnuyawddfbgxetqf:W0rldw1d3W3b24.@aws-0-us-west-1.pooler.supabase.com:5432/postgres?sslmode=require' });
client.connect().then(() => {
  client.query("SELECT id, delivery_status, driver_id, status FROM sales ORDER BY created_at DESC LIMIT 5").then(res => {
    console.log(res.rows);
    client.end();
  }).catch(e => {
    console.error(e);
    client.end();
  });
}).catch(e => {
  console.error("Connect error:", e);
});
