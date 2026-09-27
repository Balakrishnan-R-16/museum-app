import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Lock, Eye, EyeOff, Shield, ArrowLeft, Loader2, CheckCircle, LogOut,
  Star, Edit3, MessageSquare, Building2, Calendar, X, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useVisitorAuth } from '../context/VisitorAuthContext';
import { visitorProfileAPI, visitorReviewAPI } from '../services/api';

const VisitorSettings = () => {
  const navigate = useNavigate();
  const { visitor, isAuthenticated, updateProfile, logout } = useVisitorAuth();

  const [displayName, setDisplayName] = useState(visitor?.displayName || visitor?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ rating: 5, title: '', content: '' });
  const [savingReview, setSavingReview] = useState(false);

  useEffect(() => {
    if (isAuthenticated && visitor?.email) {
      fetchMyReviews();
    }
  }, [isAuthenticated, visitor]);

  const fetchMyReviews = async () => {
    setLoadingReviews(true);
    try {
      let res;
      try {
        res = await visitorReviewAPI.getMyReviews();
      } catch (e) {
        // Fallback to email endpoint if needed
        res = await visitorReviewAPI.getReviewsByEmail(visitor.email);
      }
      const data = res?.data || res || [];
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const startEdit = (review) => {
    setEditingId(review.id);
    setEditForm({
      rating: review.rating || 5,
      title: review.title || '',
      content: review.content || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ rating: 5, title: '', content: '' });
  };

  const handleSaveReview = async (reviewId) => {
    if (!editForm.title.trim() && !editForm.content.trim()) {
      toast.error('Please enter a title or content for your review');
      return;
    }
    setSavingReview(true);
    try {
      let updated;
      try {
        const res = await visitorReviewAPI.updateReview(reviewId, editForm);
        updated = res?.data || res;
      } catch (e) {
        const res = await visitorReviewAPI.updateReviewPublic(reviewId, {
          ...editForm,
          visitorEmail: visitor.email
        });
        updated = res?.data || res;
      }
      toast.success('Review updated successfully!');
      setEditingId(null);
      fetchMyReviews();
    } catch (err) {
      toast.error(err?.message || 'Failed to update review');
    } finally {
      setSavingReview(false);
    }
  };

  if (!isAuthenticated) {
    navigate('/visitor/login', { state: { from: '/visitor/settings' } });
    return null;
  }

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) { toast.error('Name cannot be empty'); return; }
    setSaving(true);
    try {
      await updateProfile({ displayName: displayName.trim() });
      toast.success('Display name updated');
    } catch (err) {
      toast.error(err?.message || 'Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error('New password must be at least 8 characters'); return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    if (visitor?.authProvider === 'LOCAL' && !currentPassword) {
      toast.error('Current password is required'); return;
    }
    setSavingPassword(true);
    try {
      await updateProfile({
        currentPassword: currentPassword || undefined,
        newPassword,
      });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Signed out');
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12 px-4">
      <div className="max-w-xl mx-auto">
        <button onClick={() => navigate('/visitor/tickets')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to My Tickets
        </button>

        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2 mb-8">
          <User className="h-6 w-6 text-indigo-600" />
          Account Settings
        </h1>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
          <div className="flex items-center gap-4 mb-6">
            {visitor?.avatarUrl ? (
              <img src={visitor.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-indigo-200" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                {(visitor?.name || visitor?.email || 'V').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-bold text-gray-900">{visitor?.name || visitor?.email}</p>
              <p className="text-sm text-gray-500">{visitor?.email}</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium mt-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Shield className="h-3 w-3" />
                {visitor?.authProvider === 'GOOGLE' ? 'Google Account' : 'Email Account'}
              </span>
            </div>
          </div>

          {/* Display Name */}
          <form onSubmit={handleUpdateName}>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Display Name</label>
            <div className="flex gap-2">
              <input
                type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Your display name"
              />
              <button type="submit" disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Save
              </button>
            </div>
          </form>
        </div>

        {/* My Museum Reviews Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-600" />
            My Museum Reviews
          </h3>

          {loadingReviews ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
              <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">No reviews submitted yet</p>
              <p className="text-xs text-gray-400 mt-1">Visit museums and share your experience with other visitors!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => {
                const isEditing = editingId === rev.id;

                return (
                  <div key={rev.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-all">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                          <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {rev.museumName || `Museum #${rev.museumId}`}
                          </span>
                          <span className="text-[10px] text-gray-400">Editing Review</span>
                        </div>

                        {/* Rating stars picker */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Rating</label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setEditForm(prev => ({ ...prev, rating: star }))}
                                className="p-1 hover:scale-110 transition-transform focus:outline-none"
                              >
                                <Star
                                  className={`h-5 w-5 ${
                                    star <= editForm.rating
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Title input */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Headline / Title</label>
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                            placeholder="Summarize your visit..."
                          />
                        </div>

                        {/* Content textarea */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Review</label>
                          <textarea
                            rows={3}
                            value={editForm.content}
                            onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                            placeholder="Write your review here..."
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={savingReview}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 flex items-center gap-1"
                          >
                            <X className="h-3.5 w-3.5" /> Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveReview(rev.id)}
                            disabled={savingReview}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                          >
                            {savingReview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-900">
                              <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                              {rev.museumName || `Museum #${rev.museumId}`}
                            </span>
                            <div className="flex items-center gap-1 mt-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3.5 w-3.5 ${
                                    star <= rev.rating
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-gray-200 fill-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => startEdit(rev)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                            title="Edit Review"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                        </div>

                        {rev.title && (
                          <h4 className="text-sm font-semibold text-gray-800 mt-2">{rev.title}</h4>
                        )}
                        {rev.content && (
                          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{rev.content}</p>
                        )}
                        <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Password Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4 text-gray-600" />
            {visitor?.authProvider === 'GOOGLE' ? 'Set a Password' : 'Change Password'}
          </h3>

          {visitor?.authProvider === 'GOOGLE' && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-3 text-xs mb-4">
              Your account uses Google Sign-In. You can optionally set a password to also sign in with email/password.
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            {visitor?.authProvider !== 'GOOGLE' && (
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Current Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'} value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter current password"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">New Password</label>
              <input
                type={showPasswords ? 'text' : 'password'} value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Minimum 8 characters"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm New Password</label>
              <input
                type={showPasswords ? 'text' : 'password'} value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Re-enter new password"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={showPasswords} onChange={e => setShowPasswords(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                Show passwords
              </label>
              <button type="submit" disabled={savingPassword}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5">
                {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {savingPassword ? 'Saving...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
          <h3 className="font-bold text-gray-900 mb-3">Account Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Email</span>
              <span className="font-medium text-gray-900">{visitor?.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Auth Method</span>
              <span className="font-medium text-gray-900">{visitor?.authProvider === 'GOOGLE' ? 'Google OAuth' : 'Email/Password'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Visitor ID</span>
              <span className="font-mono text-gray-600 text-xs">{visitor?.id}</span>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <button onClick={handleLogout}
          className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default VisitorSettings;
