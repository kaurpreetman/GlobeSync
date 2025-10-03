"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css";
import "leaflet-defaulticon-compatibility";

import React from "react";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import { MapPin } from "lucide-react";

interface MapComponentProps {
  center: LatLngExpression;
  locationName: string;
}

const MapComponent: React.FC<MapComponentProps> = ({ center, locationName }) => {
  return (
    <div className="h-full w-full relative">
      <MapContainer center={center} zoom={12} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }} className="rounded-xl">
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Marker position={center}>
          <Popup>
            <div className="font-semibold">{locationName}</div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Overlay Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 left-4 z-[1000] bg-white/95 rounded-lg p-4 shadow-lg border"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{locationName}</div>
            <div className="text-xs text-gray-600">Interactive Map</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MapComponent;
