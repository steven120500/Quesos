import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujehmcitkgdspowmygaa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZWhtY2l0a2dkc3Bvd215Z2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNTI4ODgsImV4cCI6MjEwNDcyODg4OH0.mL66H6aBq_e79P5RMoxRFL2VaKeQeZ4BJy0Kaine9Do';

export const supabase = createClient(supabaseUrl, supabaseKey);