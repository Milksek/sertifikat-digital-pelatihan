import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.11.1";
import * as jwt from "https://deno.land/x/djwt@v2.9.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { address, signature } = await req.json();

    if (!address || !signature) {
      throw new Error("Address and signature are required");
    }

    // Fetch the user's nonce
    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select("id, nonce, role")
      .eq("wallet_address", address.toLowerCase())
      .single();

    if (error || !profile?.nonce) {
      throw new Error("Nonce not found for this address");
    }

    // Verify signature
    const recoveredAddress = ethers.verifyMessage(profile.nonce, signature);

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      throw new Error("Invalid signature");
    }

    // Generate JWT
    const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") ?? "";
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const payload = {
      sub: profile.id,
      role: profile.role,
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    };

    const token = await jwt.create({ alg: "HS256", typ: "JWT" }, payload, key);

    // Clear the nonce so it can't be reused
    await supabaseClient
      .from("profiles")
      .update({ nonce: null })
      .eq("id", profile.id);

    return new Response(JSON.stringify({ token, user: profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
