import { createClient } from "@supabase/supabase-js";

type SupabaseAdminEnv = {
  [key: string]: string | undefined;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
};

export function getSupabaseAdminKey(env: SupabaseAdminEnv = process.env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Missing Supabase server key");
  return key;
}

export function createSupabaseAdminClient(env: SupabaseAdminEnv = process.env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");

  return createClient(url, getSupabaseAdminKey(env), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
