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
      <div className="relative h-[500px] w-full rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">Map Unavailable</div>
          <div className="text-sm">Route information needed to display map</div>
        </div>
      </div>
    );
  }

  const { origin, destination, distance, travel_time, transportation_mode, route_geometry, route_type, no_route_reason, straight_distance } = routeData;

  // Calculate center point for map
  const centerLat = (origin.lat + destination.lat) / 2;
  const centerLng = (origin.lng + destination.lng) / 2;
  
  // Calculate zoom based on distance
  const calculateZoom = (dist: number) => {
    if (dist < 10) return 10;
    if (dist < 100) return 8;
    if (dist < 500) return 6;
    if (dist < 1000) return 5;
    return 4;
  };
  
  const mapDistance = distance || straight_distance || 100;
  const zoom = calculateZoom(mapDistance);

  // Only show route line if we have actual route geometry
  const shouldShowRouteLine = route_geometry && route_geometry.length > 2 && route_type !== "none";
  
  const routePoints: LatLngExpression[] = shouldShowRouteLine
    ? route_geometry.map((coord: number[]) => [coord[1], coord[0]]) // [lat, lng]
    : [];

  // Determine route type icon and color
  const getRouteTypeInfo = () => {
    switch (route_type) {
      case "road":
        return { icon: "🚗", color: "#2563eb", name: "Road" };
      case "rail":
        return { icon: "🚆", color: "#059669", name: "Rail" };
      case "flight":
        return { icon: "✈️", color: "#dc2626", name: "Flight" };
      case "none":
        return { icon: "🚫", color: "#6b7280", name: "No Route" };
      default:
        return { icon: "🗺️", color: "#6b7280", name: "Direct" };
    }
  };

  const routeTypeInfo = getRouteTypeInfo();

  return (
    <div className="relative h-[500px] w-full rounded-xl overflow-hidden">
      <MapContainer 
        center={[centerLat, centerLng]} 
        zoom={zoom} 
        scrollWheelZoom 
        style={{ height: "100%", width: "100%" }}
      >
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

        {/* Only show route line if we have actual route geometry */}
        {shouldShowRouteLine && (
          <Polyline 
            positions={routePoints} 
            color={routeTypeInfo.color}
            weight={4}
            opacity={0.8}
          />
        )}
      </MapContainer>

      {/* Compact Route Info Card - On Map */}
      <div className="absolute top-4 left-4 bg-white/95 rounded-lg p-3 shadow-lg border max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{routeTypeInfo.icon}</span>
          <div className="text-sm font-semibold text-gray-900">
            {routeTypeInfo.name} Route
          </div>
        </div>
        
        <div className="space-y-1 text-xs text-gray-700">
          <div className="flex justify-between">
            <span>Distance:</span>
            <span className="font-medium">
              {distance ? `${distance.toFixed(1)} km` : 
               straight_distance ? `~${straight_distance.toFixed(1)} km` : "N/A"}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Duration:</span>
            <span className="font-medium">{travel_time || "N/A"}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Mode:</span>
            <span className="font-medium capitalize">{transportation_mode}</span>
          </div>
        </div>
        
        {/* Route status indicators */}
        {route_type === "road" && (
          <div className="mt-2 pt-2 border-t">
            <div className="text-xs text-green-600 font-medium">
              ✅ Real-time route
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapComponent;
