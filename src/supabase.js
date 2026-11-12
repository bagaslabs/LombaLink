const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
let clientPromise;

export async function getSupabaseClient() {
  if (!supabaseUrl || !publishableKey) return null;

  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) => createClient(supabaseUrl, publishableKey, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }));
  return clientPromise;
}
