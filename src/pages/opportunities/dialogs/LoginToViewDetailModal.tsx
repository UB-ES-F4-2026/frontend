import { Modal, Button } from "@heroui/react";
import { useNavigate } from "react-router";

interface LoginToViewDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginToViewDetailModal = ({ isOpen, onClose }: LoginToViewDetailModalProps) => {
  const navigate = useNavigate();

  const goTo = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-md">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-accent-soft text-accent-soft-foreground bg-warning/15 text-warning">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="size-5"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </Modal.Icon>
            <Modal.Heading>Inicia sesión para ver los detalles</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <p className="text-sm text-muted">
              Para consultar la información completa de esta oportunidad necesitas una cuenta.
              Inicia sesión o regístrate en unos minutos.
            </p>
          </Modal.Body>
          <Modal.Footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" className="bg-warning/15 text-warning hover:bg-warning/25" onPress={() => goTo("/register")}>
              Crear cuenta
            </Button>
            <Button className="bg-warning text-warning-foreground hover:bg-warning/90" onPress={() => goTo("/login")}>
              Iniciar sesión
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
};

export default LoginToViewDetailModal;