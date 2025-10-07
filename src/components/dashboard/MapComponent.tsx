"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css";
import "leaflet-defaulticon-compatibility";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { LatLngExpression, Icon } from "leaflet";
import { useMap, Marker as LeafletMarker, Tooltip } from "react-leaflet";

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

// Custom destination marker icon (larger)
const destinationIcon = new Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [40, 66], // increased size
  iconAnchor: [20, 66],
  popupAnchor: [0, -70],
  shadowSize: [50, 64],
});

interface MapComponentProps {
  center: LatLngExpression;
  locationName: string;
  destinationCoords?: LatLngExpression;
  locationType?: "city" | "country" | "landmark";
  countryName?: string;
  customZoom?: number;
  region?: string;
}

const MapComponent: React.FC<MapComponentProps> = ({
  center,
  locationName,
  destinationCoords,
  locationType = "city",
  countryName,
  customZoom,
  region
}) => {
  // 🎯 Function to control zoom level (lower = zoom out)
  const getZoomLevel = () => {
    if (customZoom) return customZoom;
    if (!destinationCoords) return 2;

    switch (locationType) {
      case "landmark":
        return 12;
      case "city":
        return 6;
      case "country":
        return 4;
      default:
        return 10;
    }
  };

  // Helper: ensures map centers on destination when available
  const SetViewOnDestination = ({ coords }: { coords: LatLngExpression }) => {
    const map = useMap();
    useEffect(() => {
      map.setView(coords, getZoomLevel());
    }, [map, coords]);
    return null;
  };

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={destinationCoords || center}
        zoom={getZoomLevel()}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
        className="rounded-xl"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {destinationCoords && (
          <>
            <Marker position={destinationCoords} icon={destinationIcon}>
              {/* Inline tooltip (always visible) */}
              <Tooltip
                direction="top"
                offset={[0, -60]}
                opacity={1}
                permanent
                className="!bg-white !text-gray-800 !rounded-lg !shadow-lg !px-3 !py-2 !border"
              >
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <div className="font-bold text-base text-gray-900">
                    {locationName}
                  </div>
                  <div className="text-xs text-gray-600">
                    Lat: {Number(destinationCoords[0]).toFixed(3)}° | Lon:{" "}
                    {Number(destinationCoords[1]).toFixed(3)}°
                  </div>
                </motion.div>
              </Tooltip>
            </Marker>
            <SetViewOnDestination coords={destinationCoords} />
          </>
        )}
      </MapContainer>

      {/* Map Controls Overlay */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute bottom-4 right-4 z-[1000] bg-white/95 rounded-lg p-3 shadow-lg border"
      >
        <div className="text-xs text-gray-600">
          Scroll to zoom • Drag to pan
        </div>
      </motion.div>
    </div>
  );
};

export default MapComponent;
