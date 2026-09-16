// stripe-webhook — sync Stripe subscription state into the subscriptions table.
//
// Stripe POSTs events here. We verify the signature, then map the customer
// back to the Supabase user and write their plan + status. This function must
// be deployed with --no-verify-jwt (Stripe does not send a Supabase JWT); the
// Stripe signature check below is what authenticates the request.
//
// Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO,
//          STRIPE_PRICE_TEAM, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import Stripe from "https://esm.sh/stripe@16.12.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Map a Stripe price ID back to our plan name.
const PLAN_BY_PRICE: Record<string, string> = {};
const pro = Deno.env.get("STRIPE_PRICE_PRO");
const team = Deno.env.get("STRIPE_PRICE_TEAM");
if (pro) PLAN_BY_PRICE[pro] = "pro";
if (team) PLAN_BY_PRICE[team] = "team";

// Stripe status → our status enum.
function mapStatus(s: string): string {
  switch (s) {
    case "trialing": return "trial";
    case "past_due":
    case "unpaid": return "past_due";
    case "canceled":
    case "incomplete_expired": return "cancelled";
    default: return "active"; // active, incomplete, etc.
  }
}

async function upsertFromSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const priceId = sub.items.data[0]?.price?.id ?? "";
  const plan = PLAN_BY_PRICE[priceId] ?? "pro";
  const status = sub.status === "canceled" ? "cancelled" : mapStatus(sub.status);
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  // Find the user by their stored Stripe customer id.
  const { data: row } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (!row?.user_id) {
    console.warn("no user for customer", customerId);
    return;
  }

  await admin
    .from("subscriptions")
    .update({
      plan: sub.status === "canceled" ? "free" : plan,
      status,
      stripe_subscription_id: sub.id,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", row.user_id);
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, WEBHOOK_SECRET);
  } catch (e) {
    console.error("signature verification failed", e);
    return new Response("bad signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string,
          );
          await upsertFromSubscription(sub);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await upsertFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        // ignore other events
        break;
    }
  } catch (e) {
    console.error("webhook handler error", e);
    return new Response("handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
