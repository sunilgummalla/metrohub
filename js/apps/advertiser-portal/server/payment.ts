/**
 * Provider-agnostic payment adapter.
 * Switch providers by setting PAYMENT_PROVIDER=stripe|paypal in the environment.
 * Neither provider is hardcoded in the application logic.
 */

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
  provider: string;
}

export interface PaymentAdapter {
  createCheckoutSession(params: {
    bookingId: number;
    amount: number; // in cents
    currency: string;
    description: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSessionResult>;
  handleWebhook(rawBody: string, signature: string): Promise<{ bookingId: number; status: "paid" | "failed" }>;
  refund(paymentIntentId: string, amount?: number): Promise<void>;
}

// ─── Stripe Adapter ──────────────────────────────────────────────────────────
class StripeAdapter implements PaymentAdapter {
  async createCheckoutSession(params: Parameters<PaymentAdapter["createCheckoutSession"]>[0]): Promise<CheckoutSessionResult> {
    // Production: use stripe.checkout.sessions.create()
    // Returning a mock session for now — replace with real Stripe SDK call when STRIPE_SECRET_KEY is set
    console.log("[Stripe] createCheckoutSession", params);
    return {
      sessionId: `cs_mock_${params.bookingId}_${Date.now()}`,
      checkoutUrl: `${params.successUrl}?mock_payment=stripe&booking=${params.bookingId}`,
      provider: "stripe",
    };
  }

  async handleWebhook(rawBody: string, signature: string): Promise<{ bookingId: number; status: "paid" | "failed" }> {
    // Production: stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)
    console.log("[Stripe] handleWebhook", { signature });
    const body = JSON.parse(rawBody);
    return { bookingId: body.bookingId, status: "paid" };
  }

  async refund(paymentIntentId: string, amount?: number): Promise<void> {
    // Production: stripe.refunds.create({ payment_intent: paymentIntentId, amount })
    console.log("[Stripe] refund", { paymentIntentId, amount });
  }
}

// ─── PayPal Adapter ──────────────────────────────────────────────────────────
class PayPalAdapter implements PaymentAdapter {
  async createCheckoutSession(params: Parameters<PaymentAdapter["createCheckoutSession"]>[0]): Promise<CheckoutSessionResult> {
    // Production: PayPal Orders API v2 — create order, return approve link
    console.log("[PayPal] createCheckoutSession", params);
    return {
      sessionId: `pp_mock_${params.bookingId}_${Date.now()}`,
      checkoutUrl: `${params.successUrl}?mock_payment=paypal&booking=${params.bookingId}`,
      provider: "paypal",
    };
  }

  async handleWebhook(rawBody: string, _signature: string): Promise<{ bookingId: number; status: "paid" | "failed" }> {
    // Production: verify PayPal webhook signature, parse PAYMENT.CAPTURE.COMPLETED event
    console.log("[PayPal] handleWebhook");
    const body = JSON.parse(rawBody);
    return { bookingId: body.bookingId, status: "paid" };
  }

  async refund(paymentIntentId: string, amount?: number): Promise<void> {
    // Production: PayPal Refund API
    console.log("[PayPal] refund", { paymentIntentId, amount });
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────
export function getPaymentAdapter(): PaymentAdapter {
  const provider = (process.env.PAYMENT_PROVIDER ?? "stripe").toLowerCase();
  if (provider === "paypal") return new PayPalAdapter();
  return new StripeAdapter(); // default: stripe
}

