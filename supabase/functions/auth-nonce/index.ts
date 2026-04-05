import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.11.1";

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

    const { address } = await req.json();

    if (!address) {
      throw new Error("Address is required");
    }

    // Generate a random nonce
    const nonce = ethers.hexlify(ethers.randomBytes(32));

    // Store or update the nonce in the profiles table
    const { data, error } = await supabaseClient
      .from("profiles")
      .upsert({ 
        wallet_address: address.toLowerCase(), 
        nonce: nonce 
      }, { onConflict: "wallet_address" })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ nonce }), {
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
