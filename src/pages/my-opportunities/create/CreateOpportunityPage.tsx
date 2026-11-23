import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Alert, Button, Card, Spinner } from "@heroui/react";
import { useOpportunityStore, type OpportunityType } from "../../../store/useOpportunityStore";
import { useWalletStore } from "../../../store/useWalletStore";
import type { CreatedOpportunityNotice } from "../createdOpportunity";
import {
  buildMetadata,
  EMPTY_FUNDING,
  EMPTY_GENERAL,
  validateFunding,
  validateGeneral,
  type FundingErrors,
  type FundingField,
  type FundingValues,
  type GeneralDraft,
  type GeneralErrors,
} from "./opportunityDraft";
import { OPPORTUNITY_TYPES, type TypeStepErrors } from "./opportunityTypes";
import StepIndicator from "./StepIndicator";
import GeneralInfoStep from "./GeneralInfoStep";
import FundingStep from "./FundingStep";
import ReviewStep from "./ReviewStep";
import DiscardDialog from "./DiscardDialog";
import { PRIMARY } from "./formStyles";

interface CreateOpportunityPageProps {
  type: OpportunityType;
}

const GENERAL_STEP = 0;
const TYPE_STEP = 1;
const FUNDING_STEP = 2;
const REVIEW_STEP = 3;

const hasErrors = (errors: Partial<Record<string, string>>) => Object.values(errors).some(Boolean);

// Formulari de creació en quatre passos (US06.1 i US06.1.2). Les dades viuen aquí, de manera que
// tornar enrere o «Editar» des de la revisió no en perd cap.
export default function CreateOpportunityPage({ type }: CreateOpportunityPageProps) {
  const config = OPPORTUNITY_TYPES[type];
  const TypeForm = config.step.Form;
  const steps = ["Información general", config.step.label, "Financiación", "Revisión"];
  const navigate = useNavigate();
  const headingId = useId();

  const [step, setStep] = useState(GENERAL_STEP);
  const [general, setGeneral] = useState<GeneralDraft>(EMPTY_GENERAL);
  const [generalErrors, setGeneralErrors] = useState<GeneralErrors>({});
  const [specific, setSpecific] = useState(config.step.initial);
  const [specificErrors, setSpecificErrors] = useState<TypeStepErrors>({});
  const [funding, setFunding] = useState(EMPTY_FUNDING);
  const [fundingErrors, setFundingErrors] = useState<FundingErrors>({});
  // Condicions validades en continuar des de «Financiación»; són les que es resumeixen i s'envien.
  const [fundingValues, setFundingValues] = useState<FundingValues | null>(null);
  const [declared, setDeclared] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const balance = useWalletStore((state) => state.balance);
  const walletStatus = useWalletStore((state) => state.status);
  const fetchBalance = useWalletStore((state) => state.fetchBalance);
  const createStatus = useOpportunityStore((state) => state.createStatus);
  const createDetails = useOpportunityStore((state) => state.createDetails);
  const createOpportunity = useOpportunityStore((state) => state.createOpportunity);
  const resetCreation = useOpportunityStore((state) => state.resetCreation);

  const availableCents = balance?.available_cents ?? null;
  const submitting = createStatus === "loading";

  // Cada formulari comença sense l'error d'un enviament anterior.
  useEffect(() => {
    resetCreation();
    return resetCreation;
  }, [resetCreation]);

  // El saldo es consulta en arribar a «Financiación», perquè sigui el vigent en validar l'aportació.
  useEffect(() => {
    if (step === FUNDING_STEP) void fetchBalance();
  }, [step, fetchBalance]);

  // En canviar de pas, el focus va al títol del pas nou (no en carregar la pàgina).
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  const goTo = (next: number) => {
    resetCreation();
    setStep(next);
  };

  const updateGeneral = (patch: Partial<GeneralDraft>) => {
    setGeneral((current) => ({ ...current, ...patch }));
    setGeneralErrors((current) => {
      const next = { ...current };
      for (const field of Object.keys(patch) as (keyof GeneralDraft)[]) delete next[field];
      return next;
    });
  };

  const updateFunding = (field: FundingField, text: string, keepError = false) => {
    setFunding((current) => ({ ...current, [field]: text }));
    if (!keepError) setFundingErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async () => {
    if (!declared || !fundingValues || submitting) return;
    const metadata = buildMetadata(type, general, fundingValues, config.step.toPayload(specific));
    const created = await createOpportunity(metadata, general.images);
    if (!created) return;
    // L'aportació inicial s'ha reservat del saldo: la propera consulta ha de ser la nova.
    void fetchBalance();
    const notice: CreatedOpportunityNotice = {
      title: metadata.title,
      initialContributionCents: metadata.initial_contribution_cents,
    };
    navigate("/my-opportunities", { state: { createdOpportunity: notice } });
  };

  const handleContinue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === GENERAL_STEP) {
      const errors = validateGeneral(general);
      setGeneralErrors(errors);
      if (hasErrors(errors)) return;
    } else if (step === TYPE_STEP) {
      const errors = config.step.validate(specific);
      setSpecificErrors(errors);
      if (hasErrors(errors)) return;
    } else if (step === FUNDING_STEP) {
      const result = validateFunding(funding, availableCents);
      if ("errors" in result) {
        setFundingErrors(result.errors);
        return;
      }
      setFundingErrors({});
      setFundingValues(result.values);
    } else {
      void submit();
      return;
    }
    goTo(step + 1);
  };

  const askDiscard = () => setConfirmingDiscard(true);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex max-w-3xl flex-col gap-6">
        <button
          type="button"
          className="w-fit text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
          disabled={submitting}
          onClick={askDiscard}
        >
          <span aria-hidden="true">← </span>Volver a mis oportunidades
        </button>

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{config.title}</h1>
          <p className="mt-2 text-muted">La oportunidad se enviará a revisión y se publicará cuando sea aprobada.</p>
        </div>

        <StepIndicator steps={steps} current={step} />

        <Card className="gap-0 p-5 shadow-sm sm:p-7">
          <form
            noValidate
            onSubmit={handleContinue}
            aria-labelledby={headingId}
            aria-busy={submitting}
            className="flex flex-col gap-5"
          >
            <h2 id={headingId} ref={heading} tabIndex={-1} className="text-xl font-semibold text-foreground outline-none">
              {steps[step]}
            </h2>

            {step === GENERAL_STEP && (
              <GeneralInfoStep value={general} errors={generalErrors} onChange={updateGeneral} />
            )}

            {step === TYPE_STEP && (
              <TypeForm
                value={specific}
                errors={specificErrors}
                onChange={(value) => {
                  setSpecific(value);
                  setSpecificErrors({});
                }}
              />
            )}

            {step === FUNDING_STEP && (
              <FundingStep
                value={funding}
                errors={fundingErrors}
                onChange={updateFunding}
                availableCents={availableCents}
                balanceFailed={walletStatus === "error"}
                onRetryBalance={() => void fetchBalance()}
              />
            )}

            {step === REVIEW_STEP && fundingValues && (
              <ReviewStep
                general={general}
                typeLabel={config.step.label}
                typeRows={config.step.summary(specific)}
                funding={fundingValues}
                availableCents={availableCents}
                declared={declared}
                onDeclaredChange={setDeclared}
                onEdit={goTo}
                isDisabled={submitting}
              />
            )}

            {step === REVIEW_STEP && createStatus === "error" && createDetails && (
              <div role="alert">
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{createDetails}</Alert.Description>
                  </Alert.Content>
                </Alert>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="ghost" className="w-full sm:w-auto" isDisabled={submitting} onPress={askDiscard}>
                Cancelar
              </Button>
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                {step > GENERAL_STEP && (
                  <Button variant="secondary" className="w-full sm:w-auto" isDisabled={submitting} onPress={() => goTo(step - 1)}>
                    Volver
                  </Button>
                )}
                <Button
                  type="submit"
                  className={`${PRIMARY} w-full sm:w-auto`}
                  // El saldo s'ha de conèixer per validar l'aportació inicial.
                  isDisabled={
                    step === REVIEW_STEP
                      ? !declared || submitting
                      : step === FUNDING_STEP && walletStatus === "loading"
                  }
                >
                  {step !== REVIEW_STEP ? (
                    "Continuar"
                  ) : submitting ? (
                    <>
                      <Spinner size="sm" color="current" aria-hidden="true" />
                      Enviando…
                    </>
                  ) : (
                    "Enviar a revisión"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>

      <DiscardDialog
        isOpen={confirmingDiscard}
        onKeepEditing={() => setConfirmingDiscard(false)}
        onDiscard={() => navigate("/my-opportunities")}
      />
    </div>
  );
}
