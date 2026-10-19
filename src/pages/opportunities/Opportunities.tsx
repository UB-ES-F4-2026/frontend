import { Button } from "@heroui/react";
import { useOpportunityStore } from "../../store/useOpportunityStore";
import { useEffect } from "react";
import OpportunityCard from "./OpportunityCard";
import OpportunitiesSkeleton from "./OpportunitiesSkeleton";

const Opportunities = () => {
  const { status, details, opportunities, fetchOpportunities } = useOpportunityStore();

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-foreground pb-6">
        Oportunidades
      </h1>

      {status === "loading" && (
        <OpportunitiesSkeleton />
      )}

      {status === "error" && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-danger">{details}</p>
          <Button variant="secondary" onPress={fetchOpportunities}> Reintentar</Button>
        </div>
      )}

      {status === "success" && (
        opportunities.length === 0 ? (
          <p className="text-muted">¡Aún no hay oportunidades publicadas!</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((item) => (
              < OpportunityCard opportunity={item}/>
            ))}
          </div>
        )
      )}
    </div>
  );
}

export default Opportunities;