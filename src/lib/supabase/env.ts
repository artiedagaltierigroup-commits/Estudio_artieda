type SupabasePublicEnv = {
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

export function getSupabasePublicKey(
  env: SupabasePublicEnv | NodeJS.ProcessEnv = process.env
) {
  const key =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error(
      "Missing Supabase public key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return key;
}
