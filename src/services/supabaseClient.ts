import { createClient } from '@supabase/supabase-js'

// Interface para evitar errores de TypeScript con import.meta.env en Vite
const env = (import.meta as any).env || {}

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://etphoblrrojvpievbinb.supabase.co'
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0cGhvYmxycm9qdnBpZXZiaW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwODg3OTEsImV4cCI6MjEwMjY2NDc5MX0.GA1R1cPA3SYZeS4uAZ4xsN9UtZYAfT05H50VWang3-s'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
