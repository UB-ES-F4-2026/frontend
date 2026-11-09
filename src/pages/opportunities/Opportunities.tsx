import { Button } from "@heroui/react";
import { useOpportunityStore } from "../../store/useOpportunityStore";
import { useEffect } from "react";
import OpportunityCard from "./OpportunityCard";
import OpportunitiesSkeleton from "./OpportunitiesSkeleton";
import SearchOpportunities from "./SearchOpportunities";

const Opportunities = () => {
  const { 
    status, 
    details, 
    opportunities, 
    fetchOpportunities,
  } = useOpportunityStore();

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const onSearchHandler = (term: string) => {
    alert("A implementar en la siguiente tarea");
  }

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

      <SearchOpportunities onSearchHandler={onSearchHandler} />

      {status === "loading" && <OpportunitiesSkeleton />}

      {status === "error" && (
        <div className="flex flex-col items-start gap-3 rounded-[12px] border border-line bg-white p-6">
          <p className="text-sm text-danger">{details}</p>
          <Button variant="secondary" onPress={fetchOpportunities}>
            Reintentar
          </Button>
        </div>
      )}

      {status === "success" &&
        (opportunities.length === 0 ? (
          <div className="rounded-[12px] border border-line bg-white p-8 text-center">
            <p className="text-sm text-muted">¡Aún no hay oportunidades publicadas!</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((item) => (
              <OpportunityCard key={item.id} opportunity={item} />
            ))}
          </div>
        ))}
    </div>
  );
};

export default Opportunities;