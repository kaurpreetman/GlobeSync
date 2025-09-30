"use client";

// ✅ Import CSS and default icon compatibility in correct order
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css";
import "leaflet-defaulticon-compatibility";

import React from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import { MapPin, Navigation, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MapComponentProps {
  center: LatLngExpression;
  locationName: string;
}

const MapComponent: React.FC<MapComponentProps> = ({
  center,
  locationName,
}) => {
  return (
    <div className="h-full w-full relative">
      {/* Map Container */}
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl"
      >
         <TileLayer
    // 💡 IMPORTANT: Changed the URL to a tile provider with English labels
    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}.png"
    // 💡 IMPORTANT: Updated the attribution to include the new provider
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  />
        <Marker position={center}>
          <Popup className="custom-popup">
            <div className="p-2">
              <div className="font-semibold">{locationName}</div>
              <div className="text-sm text-gray-600">Your current destination</div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Map Header Overlay */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border"
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

      {/* Map Controls */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute top-4 right-4 z-[1000] flex flex-col space-y-2"
      >
        <Button
          variant="outline"
          size="icon"
          className="bg-white/95 backdrop-blur-sm hover:bg-white shadow-lg"
          title="Center on location"
        >
          <Navigation className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="bg-white/95 backdrop-blur-sm hover:bg-white shadow-lg"
          title="Change map style"
        >
          <Layers className="w-4 h-4" />
        </Button>
      </motion.div>

      {/* Map Footer Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-4 left-4 z-[1000] bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2 text-white"
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Live Map Data</span>
        </div>
      </motion.div>

      {/* Location Quick Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border max-w-48"
      >
        <div className="text-sm">
          <div className="font-semibold text-gray-900 mb-1">Quick Stats</div>
          <div className="text-gray-600 space-y-1">
            <div>📍 Central Tokyo</div>
            <div>🌡️ 22°C Currently</div>
            <div>⏰ 2:30 PM Local</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MapComponent;