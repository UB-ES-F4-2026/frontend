import { Card, Skeleton } from "@heroui/react";

const OpportunitiesSkeleton = () => {
  // Mostraremos 6 tarjetas fantasma para rellenar la pantalla
  const skeletons = Array.from({ length: 6 });

  return (
    <div 
      data-testid="opportunities-skeleton" 
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {skeletons.map((_, index) => (
        <Card key={index} className="rounded-xl">
          
          <Card.Header className="flex flex-col items-start gap-3">
            {/* HeroUI v3: Skeleton es auto-contenido. Le damos altura (h) y anchura (w) */}
            <Skeleton className="h-6 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-1/2 rounded-lg" />
          </Card.Header>
          
          <Card.Content>
            {/* Imagen principal */}
            <Skeleton className="h-44 w-full rounded-lg" />
          </Card.Content>
          
          <Card.Footer className="flex w-full flex-col gap-3">
            {/* Barra de progreso de financiación */}
            <Skeleton className="h-2 w-full rounded-full" />
            
            <div className="flex w-full items-center justify-between gap-4">
              {/* Importes recaudados y tiempo restante */}
              <Skeleton className="h-4 w-2/5 rounded-lg" />
              <Skeleton className="h-4 w-1/4 rounded-lg" />
            </div>
          </Card.Footer>
          
        </Card>
      ))}
    </div>
  );
};

export default OpportunitiesSkeleton;