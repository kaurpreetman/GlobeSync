"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css";
import "leaflet-defaulticon-compatibility";

import React from "react";
import dynamic from "next/dynamic";
import { LatLngExpression, Icon } from "leaflet";
import { Polyline, Tooltip } from "react-leaflet";

const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });

const originIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [40, 66],
  iconAnchor: [20, 66],
});

const destinationIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [40, 66],
  iconAnchor: [20, 66],
});

interface MapComponentProps {
  routeData: any;
}

const MapComponent: React.FC<MapComponentProps> = ({ routeData }) => {
  if (!routeData?.origin || !routeData?.destination) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 text-gray-500">
        Waiting for route data...
      </div>
    );
  }

  const { origin, destination, distance, travel_time, transportation_mode, route_geometry } = routeData;

  // 🟢 Use decoded route path if available, else fallback to straight line
  const routePoints: LatLngExpression[] = route_geometry
    ? route_geometry.map((coord: number[]) => [coord[1], coord[0]]) // [lat, lng]
    : [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ];

  return (
    <div className="relative h-[500px] w-full rounded-xl overflow-hidden">
      <MapContainer center={routePoints[0]} zoom={7} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
          <Tooltip direction="top" offset={[0, -60]} opacity={1} permanent>
            <div>
              <b>Origin:</b> {origin.city} <br />
              {origin.address}
            </div>
          </Tooltip>
        </Marker>

        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
          <Tooltip direction="top" offset={[0, -60]} opacity={1} permanent>
            <div>
              <b>Destination:</b> {destination.city} <br />
              {destination.address}
            </div>
          </Tooltip>
        </Marker>

        <Polyline positions={routePoints} color="#2563eb" weight={5} opacity={0.8} />
      </MapContainer>

      <div className="absolute top-4 right-4 bg-white/95 rounded-lg p-3 shadow-lg border max-w-xs">
        <div className="text-sm font-semibold text-gray-900 mb-2">Route Info</div>
        <div className="text-xs text-gray-600 space-y-1">
          <div>Distance: {distance?.toFixed(1)} km</div>
          <div>Duration: {travel_time}</div>
          <div>Mode: {transportation_mode}</div>
          {routeData.mock_data && (
            <div className="text-xs text-amber-600 mt-2 font-medium">
              🎭 Demo Mode (Backend offline)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
