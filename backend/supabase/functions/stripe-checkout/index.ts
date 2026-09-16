// stripe-checkout — create a Stripe Checkout session for the signed-in user.
//
// The app POSTs { plan: "pro" | "team" } with the user's Supabase access token
// in the Authorization header. We verify the token, find/create the user's
// Stripe customer, and return a Checkout URL to redirect to.
//
// Deploy:  supabase functions deploy stripe-checkout
// Secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_PRO, STRIPE_PRICE_TEAM,
//          SITE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import Stripe from "https://esm.sh/stripe@16.12.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const SITE_URL = Deno.env.get("SITE_URL") ?? "";
const PRICE: Record<string, string | undefined> = {
  pro: Deno.env.get("STRIPE_PRICE_PRO"),
  team: Deno.env.get("STRIPE_PRICE_TEAM"),
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    // 1. Authenticate the caller from their Supabase access token.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "missing token" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "invalid token" }, 401);
    const user = userData.user;

    // 2. Validate the requested plan.
    const { plan } = await req.json().catch(() => ({}));
    const priceId = PRICE[plan];
    if (!priceId) return json({ error: "unknown plan" }, 400);

    // 3. Reuse or create the Stripe customer for this user.
    const { data: sub } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = sub?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await admin
        .from("subscriptions")
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
    }

    // 4. Create the Checkout session.
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id, plan },
      success_url: `${SITE_URL}?checkout=success`,
      cancel_url: `${SITE_URL}?checkout=cancel`,
    });

    return json({ url: session.url });
  } catch (e) {
    console.error("stripe-checkout error", e);
    return json({ error: "server error" }, 500);
  }
});
