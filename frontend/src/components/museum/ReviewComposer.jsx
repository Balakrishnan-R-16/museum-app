import React, { useState } from 'react';
import { Star, Send } from 'lucide-react';
import { publicAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ReviewComposer = ({ museumId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    visitorEmail: '',
    visitorName: '',
    rating: 0,
    title: '',
    content: ''
  });
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    
    if (!formData.visitorEmail) {
      toast.error('Email is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData
      };
      
      await publicAPI.submitReview(museumId, payload);
      toast.success('Review submitted successfully!');
      if (onSuccess) onSuccess();
    } catch (error) {
      // Error handled by interceptor, but we still need to catch it here to stop loading
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-6 mb-8">
      <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100">
        <h3 className="text-lg font-bold text-indigo-900">Write a Review</h3>
        <p className="text-indigo-700 text-sm">Share your experience with other visitors.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        {/* Rating Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating *</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star 
                  className={`w-8 h-8 ${
                    star <= (hoverRating || formData.rating) 
                      ? 'fill-amber-400 text-amber-400' 
                      : 'text-gray-300'
                  }`} 
                />
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Verification Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">Verification</h4>

            <div>
              <label htmlFor="visitorEmail" className="block text-sm font-medium text-gray-700 mb-1">Booking Email *</label>
              <input
                type="email"
                id="visitorEmail"
                name="visitorEmail"
                required
                value={formData.visitorEmail}
                onChange={handleChange}
                placeholder="email@example.com"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </div>
            
            <div>
              <label htmlFor="visitorName" className="block text-sm font-medium text-gray-700 mb-1">Your Name (Optional)</label>
              <input
                type="text"
                id="visitorName"
                name="visitorName"
                value={formData.visitorName}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </div>
          </div>

          {/* Review Content */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">Your Experience</h4>
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title (Optional)</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Sum up your visit in a few words"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </div>
            
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Review *</label>
              <textarea
                id="content"
                name="content"
                required
                rows={5}
                value={formData.content}
                onChange={handleChange}
                placeholder="What did you like? What could be improved?"
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewComposer;
