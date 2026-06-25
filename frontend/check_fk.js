const { Client } = require('pg'); 
const client = new Client({ connectionString: 'postgresql://postgres.qndxofpukjoxvslkmnbz:N4N@d@F$xQ@6wF!@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require' }); 

client.connect().then(() => {
  client.query("SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name FROM information_schema.key_column_usage JOIN information_schema.table_constraints USING (constraint_name) WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'sales';")
  .then(res => { console.table(res.rows); client.end(); })
  .catch(console.error);
});
