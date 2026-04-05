import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (input, init) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("kompetenid_token");
        if (token) {
          init = init || {};
          const headers = new Headers(init.headers);
          headers.set("Authorization", `Bearer ${token}`);
          init.headers = headers;
        }
      }
      return fetch(input, init);
    },
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
export const getAuthenticatedClient = (accessToken: string) => {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
