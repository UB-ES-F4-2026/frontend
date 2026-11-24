import { createHmac, randomUUID } from "node:crypto";
import { expect, type APIRequestContext } from "@playwright/test";

// Secret d'un sol ús de l'entorn E2E (compose.e2e.yaml i workflows): no és cap secret real.
// El mateix valor per defecte que `backend/seed_e2e_testing_data.py`.
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_e2e_only_not_a_real_secret";

// Ingressa saldo com ho fa Stripe en confirmar un pagament: un `payment_intent.succeeded`
// signat (HMAC-SHA256 de «<timestamp>.<cos>») enviat a la ruta de producció del webhook.
// Així cada flux dona al seu usuari exactament el saldo que necessita, sense dades compartides.
export async function creditWallet(request: APIRequestContext, userId: number, cents: number) {
  // Identificadors nous a cada crida: un esdeveniment repetit no torna a ingressar.
  const reference = randomUUID();
  const body = JSON.stringify({
    id: `evt_e2e_${reference}`,
    object: "event",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: `pi_e2e_${reference}`,
        object: "payment_intent",
        amount_received: cents,
        currency: "eur",
        metadata: { user_id: String(userId) },
      },
    },
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest("hex");

  // S'envien els bytes signats tal qual: si Playwright tornés a serialitzar el JSON, la signatura no valdria.
  const response = await request.post("/api/webhooks/stripe", {
    data: Buffer.from(body),
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": `t=${timestamp},v1=${signature}`,
    },
  });
  expect(
    response.status(),
    `El webhook de Stripe del entorno E2E debe aceptar el pago firmado: ${await response.text()}`,
  ).toBe(200);
  expect(await response.json()).toEqual({ status: "success" });
}
