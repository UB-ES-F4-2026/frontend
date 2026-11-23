import type { ReactNode } from "react";

// react-leaflet simulat: jsdom no pot dibuixar el mapa. Els tests fan clic «al mapa» amb
// clickMap() i premen Intro amb pressEnterOnMap(), com faria Leaflet amb els seus esdeveniments.

interface Point {
  lat: number;
  lng: number;
  wrap: () => { lat: number; lng: number };
}

type Handlers = {
  click?: (event: { latlng: Point }) => void;
  keypress?: (event: { originalEvent: { key: string } }) => void;
};

const point = (lat: number, lng: number): Point => ({
  lat,
  lng,
  wrap: () => ({ lat, lng: ((((lng + 180) % 360) + 360) % 360) - 180 }),
});

export const leaflet = {
  handlers: {} as Handlers,
  center: { lat: 40.2, lng: -3.7 },
};

export const clickMap = (lat: number, lng: number) => leaflet.handlers.click?.({ latlng: point(lat, lng) });

export const pressEnterOnMap = () => leaflet.handlers.keypress?.({ originalEvent: { key: "Enter" } });

export const reactLeafletMock = {
  MapContainer: ({ children, center, zoom }: { children: ReactNode; center: [number, number]; zoom: number }) => (
    <div data-testid="mapa" data-center={center.join(",")} data-zoom={zoom}>
      {children}
    </div>
  ),
  TileLayer: () => null,
  Circle: ({ center }: { center: [number, number] }) => <div data-testid="zona-marcada" data-center={center.join(",")} />,
  useMapEvents: (handlers: Handlers) => {
    leaflet.handlers = handlers;
    return { getCenter: () => point(leaflet.center.lat, leaflet.center.lng) };
  },
};
