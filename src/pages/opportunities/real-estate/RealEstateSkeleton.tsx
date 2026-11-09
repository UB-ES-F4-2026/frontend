import type { ReactNode } from "react";
import { Card, Skeleton } from "@heroui/react";

/**
 * Esqueleto de RealEstateDetail. Replica la estructura, los tamaños y los
 * puntos de corte (640 / 960 px) del contenido real para evitar saltos de
 * layout cuando llegan los datos.
 */

const SkeletonSection = ({ children }: { children: ReactNode }) => (
  <Card className="gap-0 border border-border p-5 shadow-none sm:p-6">{children}</Card>
);

const SkeletonTitle = () => (
  <div className="mb-[22px] flex items-center gap-3">
    <Skeleton className="size-[22px] shrink-0 rounded-md" />
    <Skeleton className="h-6 w-56 max-w-full rounded-md" />
  </div>
);

const SkeletonFact = ({ className = "" }: { className?: string }) => (
  <div className={`min-w-0 ${className}`}>
    <Skeleton className="h-3.5 w-24 rounded-md" />
    <Skeleton className="mt-2 h-5 w-32 max-w-full rounded-md" />
  </div>
);

const RealEstateSkeleton = () => (
  <div
    role="status"
    aria-busy="true"
    aria-live="polite"
    className="mx-auto w-full max-w-[1240px] px-5 pt-5 pb-14 sm:px-10"
  >
    <span className="sr-only">Cargando la oportunidad…</span>

    <div aria-hidden="true">
      {/* Enlace "Volver" */}
      <div className="flex min-h-12 items-center">
        <Skeleton className="h-4 w-44 rounded-md" />
      </div>

      {/* Hero + financiación */}
      <div className="mt-6 flex flex-col gap-6 min-[960px]:flex-row min-[960px]:items-stretch min-[960px]:gap-8">
        <div className="min-w-0 min-[960px]:flex-[1.9]">
          <div className="pb-5">
            <Skeleton className="h-9 w-3/4 max-w-md rounded-md" />
            <Skeleton className="mt-3 h-4 w-48 max-w-full rounded-md" />
            <Skeleton className="mt-3 h-4 w-full max-w-[65ch] rounded-md" />
            <Skeleton className="mt-2 h-4 w-2/3 max-w-[43ch] rounded-md" />
          </div>
          <Skeleton className="h-[280px] w-full rounded-[10px] min-[960px]:h-[355px]" />
          <div className="mt-2.5 flex gap-2.5 overflow-hidden">
            <Skeleton className="h-[84px] w-[128px] shrink-0 rounded-lg" />
            <Skeleton className="h-[84px] w-[128px] shrink-0 rounded-lg" />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-3 w-48 rounded-md" />
          </div>
        </div>

        <Card className="min-w-0 gap-0 border border-border p-7 shadow-sm min-[960px]:flex-1">
          <Skeleton className="h-[34px] w-36 rounded-full" />
          <Skeleton className="mt-5 h-3 w-32 rounded-md" />
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
            <Skeleton className="h-9 w-44 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-3 w-40 rounded-md" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
          <Skeleton className="my-2 h-2.5 w-full rounded-full" />
          <Skeleton className="h-4 w-32 rounded-md" />

          <div className="mt-7 flex flex-col gap-7 border-t border-border pt-7">
            {[0, 1].map((item) => (
              <div key={item} className="relative pl-[34px]">
                <Skeleton className="absolute top-0.5 left-0 size-[22px] rounded-md" />
                <Skeleton className="h-3 w-40 max-w-full rounded-md" />
                <Skeleton className="mt-2 h-4 w-48 max-w-full rounded-md" />
                {item === 0 && <Skeleton className="mt-1 h-3 w-36 max-w-full rounded-md" />}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Aviso de riesgo */}
      <div className="mt-7 mb-[18px] flex items-start gap-3 rounded-xl border border-border bg-surface px-[22px] py-[18px]">
        <Skeleton className="mt-0.5 size-[22px] shrink-0 rounded-md" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-4/5 rounded-md" />
        </div>
      </div>

      <div className="flex flex-col gap-[18px]">
        {/* Entidad promotora */}
        <SkeletonSection>
          <SkeletonTitle />
          <div className="flex flex-col gap-6 min-[960px]:flex-row min-[960px]:items-center">
            <div className="flex min-w-0 items-center gap-4 min-[960px]:flex-[1.2]">
              <Skeleton className="size-11 shrink-0 rounded-full" />
              <Skeleton className="h-5 w-48 max-w-full rounded-md" />
            </div>
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:gap-6 min-[960px]:flex-[2]">
              {[0, 1, 2].map((item) => (
                <SkeletonFact
                  key={item}
                  className="sm:flex-1 min-[960px]:border-l min-[960px]:border-border min-[960px]:pl-6"
                />
              ))}
            </div>
          </div>
        </SkeletonSection>

        {/* Resumen del proyecto */}
        <SkeletonSection>
          <SkeletonTitle />
          <div className="flex flex-col gap-6 min-[960px]:flex-row min-[960px]:gap-10">
            <div className="min-w-0 space-y-2.5 min-[960px]:flex-1">
              <Skeleton className="h-4 w-full max-w-[65ch] rounded-md" />
              <Skeleton className="h-4 w-full max-w-[65ch] rounded-md" />
              <Skeleton className="h-4 w-3/4 max-w-[49ch] rounded-md" />
              <div className="h-3" />
              <Skeleton className="h-4 w-full max-w-[65ch] rounded-md" />
              <Skeleton className="h-4 w-2/3 max-w-[43ch] rounded-md" />
            </div>
            <div className="flex flex-col gap-3 min-[960px]:w-[210px] min-[960px]:shrink-0">
              <Skeleton className="h-[74px] w-full rounded-lg" />
              <Skeleton className="h-[74px] w-full rounded-lg" />
            </div>
          </div>
        </SkeletonSection>

        {/* Características del inmueble */}
        <SkeletonSection>
          <SkeletonTitle />
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="relative min-w-0 pl-10 sm:flex-1">
              <Skeleton className="absolute top-1 left-0 size-[22px] rounded-md" />
              <SkeletonFact />
            </div>
            <div className="relative min-w-0 pl-10 sm:flex-1 sm:border-l sm:border-border sm:pl-16">
              <Skeleton className="absolute top-1 left-0 size-[22px] rounded-md sm:left-6" />
              <SkeletonFact />
            </div>
          </div>
        </SkeletonSection>

        {/* Fechas del proyecto */}
        <SkeletonSection>
          <SkeletonTitle />
          <div className="mt-6 ml-3 space-y-[26px] border-l border-border pl-[22px]">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex flex-col gap-1.5 pl-3 min-[960px]:flex-row min-[960px]:items-center min-[960px]:gap-6"
              >
                <Skeleton className="h-4 w-56 max-w-full rounded-md min-[960px]:w-[300px] min-[960px]:shrink-0" />
                <Skeleton className="h-4 w-40 rounded-md min-[960px]:flex-1" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            ))}
          </div>
        </SkeletonSection>

        {/* Ubicación aproximada */}
        <SkeletonSection>
          <div className="flex flex-col gap-6 min-[960px]:flex-row min-[960px]:items-center">
            <div className="min-w-0 min-[960px]:flex-1">
              <SkeletonTitle />
              <Skeleton className="h-4 w-56 max-w-full rounded-md" />
            </div>
            <Skeleton className="h-36 w-full rounded-lg min-[960px]:flex-[2]" />
          </div>
        </SkeletonSection>
      </div>
    </div>
  </div>
);

export default RealEstateSkeleton;