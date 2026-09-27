import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, IndianRupee } from 'lucide-react';
import RatingStars from '../common/RatingStars';

const MuseumCard = ({ museum }) => {
  const imageUrl = museum.displayImageUrl || museum.coverImageUrl || 'https://images.unsplash.com/photo-1518998053401-a4141508db8c?auto=format&fit=crop&q=80&w=800';
  
  return (
    <Link 
      to={`/museums/${museum.slug || museum.id}`}
      className="group flex flex-col bg-white/60 backdrop-blur-xl p-2 rounded-t-full rounded-b-[2.5rem] shadow-lg hover:shadow-2xl transition-all duration-500 border border-white/80 hover:-translate-y-2 relative overflow-hidden"
    >
      {/* Decorative subtle glow behind the card */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-full rounded-b-[2.5rem] -z-10"></div>

      {/* Arched Image Container */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-200 rounded-t-full rounded-b-3xl shadow-inner">
        <img 
          src={imageUrl} 
          alt={museum.museumName}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/20 to-transparent opacity-80"></div>
        
        {/* Badges */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-wrap gap-2 z-10 w-full justify-center px-4">
          {museum.category && (
            <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md border border-white/30 text-xs font-semibold text-white tracking-wide rounded-full shadow-lg">
              {museum.category}
            </span>
          )}
          {museum.distance != null && (
            <span className="px-4 py-1.5 bg-indigo-500/80 backdrop-blur-md border border-indigo-300/30 text-xs font-semibold text-white tracking-wide rounded-full shadow-lg flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {museum.distance.toFixed(1)} km
            </span>
          )}
        </div>
        
        {/* Bottom Info overlay (Inside Image) */}
        <div className="absolute bottom-6 left-6 right-6 text-center">
          <h3 className="text-2xl font-bold text-white mb-2 line-clamp-2 drop-shadow-md leading-tight">{museum.museumName}</h3>
          <div className="flex items-center justify-center text-stone-200 text-sm font-medium drop-shadow">
            <MapPin className="w-4 h-4 mr-1.5 opacity-80" />
            <span className="truncate">{museum.city || museum.location || 'Location TBA'}</span>
          </div>
        </div>
      </div>
      
      {/* Content Below Image */}
      <div className="px-5 pt-6 pb-5 flex flex-col flex-grow">
        <div className="flex items-center justify-between mb-4">
          <RatingStars rating={museum.averageRating || 0} count={museum.reviewCount || 0} size={16} />
          
          <div className="flex items-center font-bold text-stone-800 bg-stone-100/80 px-3 py-1 rounded-full text-sm">
            <IndianRupee className="w-4 h-4 mr-0.5" />
            {museum.adultPrice ? museum.adultPrice : 'Free'}
          </div>
        </div>
        
        <p className="text-stone-600 text-sm line-clamp-2 mb-5 flex-grow font-medium">
          {museum.tagline || 'Experience the wonders of history, art, and culture.'}
        </p>
        
        <div className="pt-4 border-t border-stone-200/60 flex items-center justify-between text-xs font-medium text-stone-500">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1.5 text-stone-400" />
            {museum.openingTime && museum.closingTime 
              ? `${museum.openingTime} - ${museum.closingTime}`
              : 'Check timings'}
          </div>
          
          <span className={`px-2.5 py-1 rounded-md ${museum.bookingStatus ? 'bg-green-100/80 text-green-700' : 'bg-red-100/80 text-red-700'}`}>
            {museum.bookingStatus ? 'Open Today' : 'Closed'}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default MuseumCard;
