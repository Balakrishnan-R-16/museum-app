import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import RatingStars from '../common/RatingStars';
import { IndianRupee } from 'lucide-react';

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle auto-fitting bounds when museums or user location change
const MapBounds = ({ museums, userLocation }) => {
  const map = useMap();
  
  useEffect(() => {
    const points = [];
    if (museums && museums.length > 0) {
      museums.forEach(m => {
        if (m.latitude && m.longitude) {
          points.push([m.latitude, m.longitude]);
        }
      });
    }
    if (userLocation) {
      points.push([userLocation.lat, userLocation.lng]);
    }

    if (points.length === 0) return;

    const bounds = L.latLngBounds(points);
    
    if (points.length === 1) {
      map.setView(bounds.getCenter(), 12);
    } else {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [museums, userLocation, map]);

  return null;
};

const MapView = ({ museums, height = '600px' }) => {
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn("User location not available:", error.message);
        }
      );
    }
  }, []);

  // Default center (India)
  const defaultCenter = [20.5937, 78.9629];
  const defaultZoom = 5;

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-md border border-gray-200 z-0" style={{ height }}>
      <MapContainer 
        center={defaultCenter} 
        zoom={defaultZoom} 
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {museums.filter(m => m.latitude && m.longitude).map((museum) => (
          <Marker 
            key={museum.id} 
            position={[museum.latitude, museum.longitude]}
          >
            <Popup className="rounded-xl overflow-hidden custom-popup">
              <div className="w-48 -m-3">
                <img 
                  src={museum.displayImageUrl || museum.coverImageUrl || 'https://images.unsplash.com/photo-1518998053401-a4141508db8c?auto=format&fit=crop&q=80&w=400'} 
                  alt={museum.museumName}
                  className="w-full h-24 object-cover"
                />
                <div className="p-3">
                  <h4 className="font-bold text-gray-900 leading-tight mb-1">{museum.museumName}</h4>
                  <div className="flex items-center justify-between mb-2">
                    <RatingStars rating={museum.averageRating || 0} count={museum.reviewCount || 0} size={12} showCount={false} />
                    <div className="flex items-center text-xs font-semibold text-indigo-600">
                      <IndianRupee className="w-3 h-3 mr-0.5" />
                      {museum.adultPrice || 'Free'}
                    </div>
                  </div>
                  <Link 
                    to={`/museums/${museum.slug || museum.id}`}
                    className="block w-full text-center text-xs bg-indigo-50 text-indigo-700 font-medium py-1.5 rounded-md hover:bg-indigo-100 transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup className="rounded-xl overflow-hidden font-bold text-center">
              You are here
            </Popup>
          </Marker>
        )}
        
        <MapBounds museums={museums.filter(m => m.latitude && m.longitude)} userLocation={userLocation} />
      </MapContainer>
    </div>
  );
};

export default MapView;
