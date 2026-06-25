import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://zjbzocgtwmzqfralptaj.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqYnpvY2d0d216cWZyYWxwdGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MDQwOTcsImV4cCI6MjA5NjE4MDA5N30.vwA7ri8HGzEhSjltN49XRs0gIXIvFmHpGXq_FNCPw7w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
