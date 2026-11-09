const MAP_SPAN_DEGREES = 0.02;

const LocationMap = ({ latitude, longitude }: { latitude: number | null; longitude: number | null }) => {
  const numLat = Number(latitude);
  const numLon = Number(longitude);
  const hasCoordinates = !isNaN(numLat) && !isNaN(numLon);

  if (!hasCoordinates) {
    return (
      <div className="flex min-h-60 items-center justify-center rounded-medium border border-default-200 bg-default-50 min-[960px]:flex-[2]">
        <p className="rounded-full border border-default-200 bg-background px-4 py-2 text-small text-default-500">
          Mapa no disponible
        </p>
      </div>
    );
  }

  const bbox = [
    numLon - MAP_SPAN_DEGREES,
    numLat - MAP_SPAN_DEGREES,
    numLon + MAP_SPAN_DEGREES,
    numLat + MAP_SPAN_DEGREES,
  ].join(",");

  return (
    <iframe
      title="Mapa de la ubicación aproximada"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${numLat},${numLon}`}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="h-60 w-full rounded-medium border border-default-200 min-[960px]:flex-[2]"
    />
  );
};

export default LocationMap;