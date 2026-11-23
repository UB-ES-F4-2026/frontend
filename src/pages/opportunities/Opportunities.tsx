import { Button, Label } from "@heroui/react";
import { useOpportunityStore, type OpportunityType } from "../../store/useOpportunityStore";
import OpportunityCard from "./common/OpportunityCard";
import { useEffect, useState } from "react";
import OpportunitiesSkeleton from "./OpportunitiesSkeleton";
import SearchOpportunities from "./SearchOpportunities";
import OpportunityTypeFilter from "./OpportunityTypeFilter";

const Opportunities = () => {
  const { 
    status, 
    details, 
    opportunities, 
    fetchOpportunities,
  } = useOpportunityStore();

  // La cerca aplicada és l'última que s'ha llançat, no el text que hi ha escrit al camp.
  const [appliedTerm, setAppliedTerm] = useState("");
  // null: «Todos».
  const [type, setType] = useState<OpportunityType | null>(null);
  const isFiltered = appliedTerm.length > 0 || type !== null;

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  // Cercar conserva el tipus seleccionat.
  const onSearchHandler = (term: string) => {
    setAppliedTerm(term);
    fetchOpportunities(term, type);
  };

  // Canviar el tipus aplica el filtre de seguida i conserva la cerca aplicada.
  const onTypeChange = (nextType: OpportunityType | null) => {
    setType(nextType);
    fetchOpportunities(appliedTerm, nextType);
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-10 sm:px-10">
      <div className="mb-8 flex flex-col justify-between gap-4 pb-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand sm:text-4xl">
            Oportunidades
          </h1>
          <p className="mt-2 text-sm text-muted">
            Explora proyectos de inversión colectiva en fase de financiación.
          </p>
        </div>
      </div>

      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start">
        <SearchOpportunities onSearchHandler={onSearchHandler} />
        <OpportunityTypeFilter value={type} onChange={onTypeChange} />
      </div>

      <Label>{opportunities.length} oportunidades encontradas</Label>

      {status === "loading" && <OpportunitiesSkeleton />}

      {status === "error" && (
        <div className="flex flex-col items-start gap-3 rounded-[12px] border border-line bg-white p-6 mt-3">
          <p className="text-sm text-danger">{details}</p>
          <Button variant="secondary" onPress={() => fetchOpportunities()}>
            Reintentar
          </Button>
        </div>
      )}

      {status === "success" &&
        (opportunities.length === 0 ? (
          <div className="rounded-[12px] border border-line bg-white p-8 text-center mt-3">
            <p className="text-sm text-muted">
              {isFiltered ? 
                "No se encontraron oportunidades que coincidan con los criterios de búsqueda." : 
                "¡Aún no hay oportunidades publicadas!"}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-3">
            {opportunities.map((item) => (
              <OpportunityCard key={item.id} opportunity={item} />
            ))}
          </div>
        ))}
    </div>
  );
};

export default Opportunities;