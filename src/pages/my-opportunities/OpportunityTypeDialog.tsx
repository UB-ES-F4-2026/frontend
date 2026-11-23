import { Link } from "react-router";
import { Modal } from "@heroui/react";
import Icon from "../opportunities/common/OpportunityIcon";

interface OpportunityTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const OPTIONS = [
  {
    to: "/my-opportunities/new/real-estate",
    icon: "building",
    title: "Inmobiliaria",
    description: "Compra, construcción o rehabilitación de un inmueble.",
  },
  {
    to: "/my-opportunities/new/equity",
    icon: "briefcase",
    title: "Empresarial",
    description: "Financiación de una empresa a cambio de una participación.",
  },
] as const;

// Primer pas de «Crear oportunidad»: el tipus decideix quin formulari s'obre.
export default function OpportunityTypeDialog({ isOpen, onClose }: OpportunityTypeDialogProps) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-xl">
          <Modal.CloseTrigger aria-label="Cerrar diálogo" />
          <Modal.Header>
            <Modal.Heading>¿Qué tipo de oportunidad quieres crear?</Modal.Heading>
            <p className="text-sm text-muted">Podrás revisar todos los datos antes de enviarla.</p>
          </Modal.Header>
          <Modal.Body>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {OPTIONS.map((option) => (
                <li key={option.to}>
                  <Link
                    to={option.to}
                    className="flex h-full flex-col gap-2 rounded-xl border border-border p-4 transition-colors hover:border-warning focus-visible:border-warning focus-visible:outline-none"
                  >
                    <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-lg bg-warning/15 text-warning">
                      <Icon name={option.icon} size={20} />
                    </span>
                    <span className="font-semibold text-foreground">{option.title}</span>
                    <span className="text-sm text-muted">{option.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
