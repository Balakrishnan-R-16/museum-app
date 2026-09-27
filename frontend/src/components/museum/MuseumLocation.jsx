import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MuseumLocation = ({ museum }) => {
  const hasCoordinates = museum.latitude && museum.longitude;
  
  const handleGetDirections = () => {
    if (hasCoordinates) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${museum.latitude},${museum.longitude}`, '_blank');
    } else if (museum.address || museum.location) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(museum.address || museum.location)}`, '_blank');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Location</h2>
      
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* Map Side */}
        <div className="w-full md:w-2/3 h-64 md:h-80 relative z-0">
          {hasCoordinates ? (
            <MapContainer 
              center={[museum.latitude, museum.longitude]} 
              zoom={15} 
              scrollWheelZoom={false}
              className="w-full h-full z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[museum.latitude, museum.longitude]}>
                <Popup>
                  <strong>{museum.museumName}</strong>
                </Popup>
              </Marker>
            </MapContainer>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Map view not available</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Address Side */}
        <div className="w-full md:w-1/3 p-6 flex flex-col">
          <div className="flex items-start text-gray-700 mb-4">
            <MapPin className="w-5 h-5 mr-3 text-indigo-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-bold text-gray-900 mb-1">{museum.museumName}</p>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {museum.address ? (
                  <>
                    {museum.address}
                    {museum.landmark && <><br/>Landmark: {museum.landmark}</>}
                    <br/>
                    {museum.city && `${museum.city}, `}{museum.state} {museum.pincode}
                  </>
                ) : (
                  museum.location || 'Address not provided'
                )}
              </p>
            </div>
          </div>
          
          <div className="mt-auto pt-6">
            <button 
              onClick={handleGetDirections}
              className="w-full flex items-center justify-center px-4 py-3 border-2 border-indigo-600 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Get Directions
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default MuseumLocation;
