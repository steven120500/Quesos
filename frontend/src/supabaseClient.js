import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujehmcitkgdspowmygaa.supabase.co';
const supabaseKey = 'pega_aqui_tu_clave_larga_que_empieza_por_eyJ';

export const supabase = createClient(supabaseUrl, supabaseKey);