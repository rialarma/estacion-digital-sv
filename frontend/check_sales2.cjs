const url = 'https://zjbzocgtwmzqfralptaj.supabase.co/rest/v1/sales?select=id,tenant_id,delivery_status,driver_id,status,created_at&order=created_at.desc&limit=5';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqYnpvY2d0d216cWZyYWxwdGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MDQwOTcsImV4cCI6MjA5NjE4MDA5N30.vwA7ri8HGzEhSjltN49XRs0gIXIvFmHpGXq_FNCPw7w';

fetch(url, {
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key
  }
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(console.error);
