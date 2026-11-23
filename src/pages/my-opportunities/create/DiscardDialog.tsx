import { AlertDialog, Button } from "@heroui/react";

interface DiscardDialogProps {
  isOpen: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

// Confirmació abans de sortir del formulari: no es crea res ni es reserva cap saldo.
export default function DiscardDialog({ isOpen, onKeepEditing, onDiscard }: DiscardDialogProps) {
  return (
    <AlertDialog.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onKeepEditing(); }}>
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-md">
          <AlertDialog.Header>
            <AlertDialog.Icon status="danger" />
            <AlertDialog.Heading>¿Descartar la oportunidad?</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <p className="text-sm text-muted">Se perderán los datos introducidos.</p>
          </AlertDialog.Body>
          <AlertDialog.Footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onPress={onKeepEditing}>Seguir editando</Button>
            <Button variant="danger" onPress={onDiscard}>Descartar</Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
