import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

const staySignedInStorage = {
  getItem: (key: string) => {
    const staySignedIn = localStorage.getItem('wavelength.staySignedIn') !== 'false'
    return staySignedIn ? window.localStorage.getItem(key) : window.sessionStorage.getItem(key)
  },
  setItem: (key: string, value: string) => {
    const staySignedIn = localStorage.getItem('wavelength.staySignedIn') !== 'false'
    if (staySignedIn) {
      window.localStorage.setItem(key, value)
      window.sessionStorage.removeItem(key)
    } else {
      window.sessionStorage.setItem(key, value)
      window.localStorage.removeItem(key)
    }
  },
  removeItem: (key: string) => {
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Essential for Electron since it uses file:// protocol instead of Web URLs
    storage: staySignedInStorage
  }
})

export { supabaseUrl, supabaseAnonKey }
