import "leaflet/dist/leaflet.css";
import { useId } from "react";
import { Button } from "@heroui/react";
import { Circle, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import type { LatLng } from "leaflet";
import { formatCoordinates, type ApproximateLocation } from "./realEstateDraft";
import { HELP_CLASS, LABEL_CLASS } from "../formStyles";

interface LocationPickerProps {
  value: ApproximateLocation | null;
  onChange: (location: ApproximateLocation | null) => void;
}

// Sense punt marcat, el mapa mostra tota la península.
const SPAIN_CENTER: [number, number] = [40.2, -3.7];
const SPAIN_ZOOM = 5;
const PICKED_ZOOM = 13;
// La zona es dibuixa com un cercle: és una ubicació aproximada, no l'adreça.
const ZONE_RADIUS_METERS = 400;

// Numeric(9, 6) al backend: sis decimals.
const round = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

const toLocation = (point: LatLng): ApproximateLocation => {
  // En desplaçar el mapa, la longitud pot sortir de [-180, 180].
  const wrapped = point.wrap();
  return { latitude: round(wrapped.lat), longitude: round(wrapped.lng) };
};

const PickOnClick = ({ onPick }: { onPick: (location: ApproximateLocation) => void }) => {
  const map = useMapEvents({
    click: (event) => onPick(toLocation(event.latlng)),
    // Amb el teclat: es mou el mapa amb les fletxes i Intro marca el centre.
    keypress: (event) => {
      if (event.originalEvent.key === "Enter") onPick(toLocation(map.getCenter()));
    },
  });
  return null;
};

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={`${id}-label`} aria-describedby={`${id}-help`} className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className={LABEL_CLASS}>
        Ubicación aproximada en el mapa <span className="font-normal text-muted">(opcional)</span>
      </span>
      <div className="relative z-0 h-64 overflow-hidden rounded-xl border border-border">
        <MapContainer
          center={value ? [value.latitude, value.longitude] : SPAIN_CENTER}
          zoom={value ? PICKED_ZOOM : SPAIN_ZOOM}
          scrollWheelZoom={false}
          className="size-full cursor-crosshair"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <PickOnClick onPick={onChange} />
          {value && (
            <Circle
              center={[value.latitude, value.longitude]}
              radius={ZONE_RADIUS_METERS}
              pathOptions={{ className: "stroke-warning fill-warning", weight: 2, fillOpacity: 0.25 }}
            />
          )}
        </MapContainer>
      </div>
      <p id={`${id}-help`} className={HELP_CLASS}>
        Haz clic en el mapa para marcar una zona aproximada. Se mostrará en el detalle como ubicación aproximada.
        <span className="sr-only"> Con el teclado, mueve el mapa con las flechas y pulsa Intro para marcar el centro.</span>
      </p>
      {value && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span role="status" className="text-foreground">Zona marcada: {formatCoordinates(value)}</span>
          <Button size="sm" variant="secondary" onPress={() => onChange(null)}>
            Quitar ubicación
          </Button>
        </div>
      )}
    </div>
  );
}
