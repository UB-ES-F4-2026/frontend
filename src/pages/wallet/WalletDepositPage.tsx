import { Button } from "@heroui/react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import WalletDepositForm, { getStripePromise } from "./WalletDepositForm";

export default function WalletDepositPage() {
  const navigate = useNavigate();
  const [stripePromise] = useState(getStripePromise);
  const returnToBalance = () => navigate("/my-balance");

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="w-full max-w-2xl">
        <Link
          className="mb-6 inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-foreground"
          to="/my-balance"
        >
          Volver a mi saldo
        </Link>
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Ingresar fondos
          </h1>
          <p className="mt-2 text-muted">
            El pago se procesará de forma segura mediante Stripe.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background p-5 shadow-sm sm:p-6">
          <WalletDepositForm
            stripePromise={stripePromise}
            onCancel={returnToBalance}
            onSuccess={returnToBalance}
          />
        </div>
        <Button className="sr-only" onPress={returnToBalance}>
          Volver a mi saldo
        </Button>
      </section>
    </div>
  );
}