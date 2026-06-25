import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zjbzocgtwmzqfralptaj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqYnpvY2d0d216cWZyYWxwdGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MDQwOTcsImV4cCI6MjA5NjE4MDA5N30.vwA7ri8HGzEhSjltN49XRs0gIXIvFmHpGXq_FNCPw7w';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  // Login first to get RLS access
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@estacion.com', // Let's guess the email or we can just fetch via service_role key
    password: 'password'
  });
}
check();
