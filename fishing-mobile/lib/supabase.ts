import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://knfluntktiajnzfmiwtp.supabase.co';  // Replace with your URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuZmx1bnRrdGlham56Zm1pd3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzkzMjMsImV4cCI6MjA4MTQxNTMyM30.CDY52N11dHa6BPERSAnF-v2bsQGVxbUozpC21_4KgOg';  // Replace with your anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});