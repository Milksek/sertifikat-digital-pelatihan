import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (input, init) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("ssdp_token");
        if (token) {
          try {
            const base64Url = token.split(".")[1];
            let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
            const pad = base64.length % 4;
            if (pad) {
              base64 += "=".repeat(4 - pad);
            }
            const payload = JSON.parse(atob(base64));
            const isExpired = payload.exp * 1000 < Date.now();
            if (isExpired) {
              localStorage.removeItem("ssdp_token");
            } else {
              init = init || {};
              const headers = new Headers(init.headers);
              headers.set("Authorization", `Bearer ${token}`);
              init.headers = headers;
            }
          } catch {
            localStorage.removeItem("ssdp_token");
          }
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


