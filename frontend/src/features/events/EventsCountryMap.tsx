import { VectorMap } from "@react-jvectormap/core";
import { worldMill } from "@react-jvectormap/world";
import ComponentCard from "../../components/common/ComponentCard";
import TableLoader from "../../components/common/TableLoader";

const COUNTRY_COORDS: Record<string, [number, number]> = {
  cameroon: [7.36, 12.35],
  cameroun: [7.36, 12.35],
  france: [46.23, 2.21],
  senegal: [14.5, -14.45],
  sénégal: [14.5, -14.45],
  "united states": [37.09, -95.71],
  "united kingdom": [55.38, -3.44],
  germany: [51.17, 10.45],
  allemagne: [51.17, 10.45],
  belgium: [50.5, 4.47],
  belgique: [50.5, 4.47],
  morocco: [31.79, -7.09],
  maroc: [31.79, -7.09],
  "ivory coast": [7.54, -5.55],
  "côte d'ivoire": [7.54, -5.55],
  congo: [-4.04, 21.76],
  gabon: [-0.8, 11.61],
  chad: [15.45, 18.73],
  tchad: [15.45, 18.73],
};

function resolveCoords(country: string): [number, number] | null {
  const key = country.trim().toLowerCase();
  return COUNTRY_COORDS[key] ?? null;
}

interface EventsCountryMapProps {
  byCountry: Record<string, number>;
  isLoading?: boolean;
}

export default function EventsCountryMap({ byCountry, isLoading = false }: EventsCountryMapProps) {
  const markers = Object.entries(byCountry)
    .map(([country, count]) => {
      const latLng = resolveCoords(country);
      if (!latLng) return null;
      return {
        latLng,
        name: `${country} (${count})`,
        style: { fill: "#465FFF", borderWidth: 1, borderColor: "white" },
      };
    })
    .filter(Boolean) as Array<{ latLng: [number, number]; name: string; style: object }>;

  return (
    <ComponentCard title="Événements par pays" desc="Carte des implantations Traumatec">
      {isLoading ? (
        <TableLoader message="Chargement de la carte…" />
      ) : markers.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
          Aucun pays renseigné sur les événements.
        </p>
      ) : (
        <div className="h-[320px] w-full">
          <VectorMap
            map={worldMill}
            backgroundColor="transparent"
            markersSelectable={false}
            zoomOnScroll={false}
            zoomMax={8}
            zoomMin={1}
            markers={markers}
            regionStyle={{
              initial: {
                fill: "#D0D5DD",
                fillOpacity: 1,
                stroke: "none",
              },
              hover: { fillOpacity: 0.8, fill: "#465fff" },
            }}
            markerStyle={{
              initial: { fill: "#465FFF", r: 5 },
            }}
          />
        </div>
      )}
    </ComponentCard>
  );
}
