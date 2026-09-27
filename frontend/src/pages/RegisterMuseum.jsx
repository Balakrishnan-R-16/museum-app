import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Building2, MapPin, Mail, Lock, Users, IndianRupee, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '../services/api';

// InputField component extracted to module level to prevent focus issues
const InputField = ({ icon: Icon, label, name, type = 'text', placeholder, value, onChange, error, loading, ...props }) => (
  <div className="space-y-2">
    <label className="text-sm font-semibold text-gray-700">{label}</label>
    <div className="relative group">
      <Icon className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-primary-600 transition-colors" />
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={loading}
        className={`input-modern w-full pl-11 ${error ? 'border-danger-500 focus:ring-danger-500' : ''}`}
        placeholder={placeholder}
        {...props}
      />
    </div>
    {error && (
      <p className="text-danger-600 text-sm flex items-center">
        <span className="inline-block w-1 h-1 bg-danger-600 rounded-full mr-2"></span>
        {error}
      </p>
    )}
  </div>
);

const RegisterMuseum = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = sessionStorage.getItem('registerMuseum_step');
    return saved ? JSON.parse(saved) : 1;
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isGoogleAuth, setIsGoogleAuth] = useState(() => {
    const saved = sessionStorage.getItem('registerMuseum_isGoogleAuth');
    return saved ? JSON.parse(saved) : false;
  });
  const [googleToken, setGoogleToken] = useState(() => {
    const saved = sessionStorage.getItem('registerMuseum_googleToken');
    return saved ? JSON.parse(saved) : null;
  });
  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem('registerMuseum_formData');
    return saved ? JSON.parse(saved) : {
      museumName: '',
      location: '',
      email: '',
      password: '',
      confirmPassword: '',
      seatCapacity: '',
      adultPrice: '',
      childPrice: ''
    };
  });

  useEffect(() => {
    sessionStorage.setItem('registerMuseum_step', JSON.stringify(currentStep));
    sessionStorage.setItem('registerMuseum_formData', JSON.stringify(formData));
    sessionStorage.setItem('registerMuseum_isGoogleAuth', JSON.stringify(isGoogleAuth));
    sessionStorage.setItem('registerMuseum_googleToken', JSON.stringify(googleToken));
  }, [currentStep, formData, isGoogleAuth, googleToken]);
  const [errors, setErrors] = useState({});

  const steps = [
    { number: 1, title: 'Museum Info', description: 'Basic details' },
    { number: 2, title: 'Contact', description: 'Email address' },
    { number: 3, title: 'Security', description: 'Password' },
    { number: 4, title: 'Pricing', description: 'Ticket prices' }
  ];

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.museumName.trim()) {
        newErrors.museumName = 'Museum name is required';
      }
      if (!formData.location.trim()) {
        newErrors.location = 'Location is required';
      }
      if (!formData.seatCapacity || Number(formData.seatCapacity) <= 0) {
        newErrors.seatCapacity = 'Seat capacity must be greater than 0';
      }
    } else if (step === 2) {
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
    } else if (step === 3) {
      if (!isGoogleAuth) {
        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        }
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
      }
    } else if (step === 4) {
      if (!formData.adultPrice || Number(formData.adultPrice) < 0) {
        newErrors.adultPrice = 'Adult price is required and must be positive';
      }
      if (!formData.childPrice || Number(formData.childPrice) < 0) {
        newErrors.childPrice = 'Child price is required and must be positive';
      }
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleNext = () => {
    const stepErrors = validateStep(currentStep);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setCurrentStep(currentStep + 1);
    setErrors({});
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
    setErrors({});
  };

  useEffect(() => {
    if (currentStep === 2 && window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        callback: (response) => {
          try {
            // Simple JWT decode for payload
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            if (payload.email) {
              setFormData((prev) => ({ ...prev, email: payload.email, password: '', confirmPassword: '' }));
              setErrors((prev) => ({ ...prev, email: '', password: '', confirmPassword: '' }));
              setIsGoogleAuth(true);
              setGoogleToken(response.credential);
              toast.success('Signed in with Google! Password not required.');
            }
          } catch (err) {
            toast.error('Failed to import from Google');
          }
        },
      });
      const btnContainer = document.getElementById("google-signup-button");
      if (btnContainer) {
        window.google.accounts.id.renderButton(
          btnContainer,
          { theme: "outline", size: "large", shape: "rectangular", width: "100%", text: "continue_with" }
        );
      }
    }
  }, [currentStep, isGoogleAuth]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const stepErrors = validateStep(4);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    try {
      setLoading(true);
      const registrationData = {
        museumName: formData.museumName,
        email: formData.email,
        password: (isGoogleAuth || !formData.password) ? null : formData.password,
        location: formData.location,
        seatCapacity: parseInt(formData.seatCapacity),
        adultTicketPrice: parseFloat(formData.adultPrice),
        childTicketPrice: parseFloat(formData.childPrice)
      };
      
      if (isGoogleAuth && googleToken) {
        registrationData.idToken = googleToken;
      }

      await api.museumAPI.register(registrationData);
      
      // Clear session storage on success
      sessionStorage.removeItem('registerMuseum_step');
      sessionStorage.removeItem('registerMuseum_formData');
      sessionStorage.removeItem('registerMuseum_isGoogleAuth');
      sessionStorage.removeItem('registerMuseum_googleToken');
      
      toast.success('🎉 Museum registered successfully!');
      navigate('/admin-login');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center px-4 py-12 pt-20">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-200 rounded-full blur-3xl opacity-10 -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary-200 rounded-full blur-3xl opacity-10 -ml-20 -mb-20"></div>
      </div>

      <div className="w-full max-w-2xl">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {steps.map((step, idx) => (
              <div key={step.number} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full font-bold transition-all ${
                    step.number < currentStep
                      ? 'bg-success-500 text-white'
                      : step.number === currentStep
                      ? 'bg-primary-600 text-white ring-4 ring-primary-200'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step.number < currentStep ? <Check className="h-6 w-6" /> : step.number}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                      step.number < currentStep ? 'bg-success-500' : 'bg-gray-200'
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl bg-opacity-95 border border-white/50">
          {/* Header */}
          <div className="h-1 bg-gradient-to-r from-primary-600 to-secondary-600"></div>

          <div className="p-8">
            {/* Form Title */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {currentStep === 1
                  ? '🏛️ Museum Information'
                  : currentStep === 2
                  ? '📞 Contact Details'
                  : currentStep === 3
                  ? '🔐 Security Setup'
                  : '💰 Pricing Setup'}
              </h1>
              <p className="text-gray-600">
                {currentStep === 1
                  ? 'Tell us about your museum'
                  : currentStep === 2
                  ? 'How can we reach you?'
                  : currentStep === 3
                  ? 'Create your admin account password'
                  : 'Set your ticket prices'}
              </p>
            </div>

            <form onSubmit={currentStep === 4 ? handleSubmit : (e) => e.preventDefault()} className="space-y-6">
              {/* Step 1: Museum Info */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <InputField
                    icon={Building2}
                    label="Museum Name"
                    name="museumName"
                    placeholder="Enter your museum name"
                    value={formData.museumName}
                    error={errors.museumName}
                    onChange={handleChange}
                    loading={loading}
                  />
                  <InputField
                    icon={MapPin}
                    label="Location"
                    name="location"
                    placeholder="Enter city or address"
                    value={formData.location}
                    error={errors.location}
                    onChange={handleChange}
                    loading={loading}
                  />
                  <InputField
                    icon={Users}
                    label="Seat Capacity"
                    name="seatCapacity"
                    type="number"
                    placeholder="Total number of seats"
                    value={formData.seatCapacity}
                    error={errors.seatCapacity}
                    min="1"
                    onChange={handleChange}
                    loading={loading}
                  />
                </div>
              )}

              {/* Step 2: Contact Details */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  {/* Google Auto-fill */}
                  {!isGoogleAuth && (
                    <div>
                      <div id="google-signup-button" className="flex justify-center"></div>
                      <div className="flex items-center gap-3 mt-4 mb-2">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-gray-400 text-xs font-medium">OR ENTER MANUALLY</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                    </div>
                  )}
                  
                  <InputField
                    icon={Mail}
                    label="Email Address"
                    name="email"
                    type="email"
                    placeholder="admin@museum.com"
                    value={formData.email}
                    error={errors.email}
                    onChange={handleChange}
                    loading={loading || isGoogleAuth}
                  />

                  {isGoogleAuth && (
                    <div className="text-right">
                      <button 
                        type="button" 
                        onClick={() => { setIsGoogleAuth(false); setGoogleToken(null); }}
                        className="text-xs text-primary-600 font-medium hover:underline"
                      >
                        Use a different email
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Security */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  {isGoogleAuth ? (
                    <div className="bg-green-50 text-green-700 p-6 rounded-2xl border border-green-200 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                        <Check className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">Password Not Required</h3>
                      <p className="text-sm">Since you authenticated with Google, you don't need a password right now. A password can be set later in your museum dashboard if you wish.</p>
                      <button 
                        type="button" 
                        onClick={() => { setIsGoogleAuth(false); setGoogleToken(null); }}
                        className="text-primary-600 font-semibold mt-4 hover:underline text-sm"
                      >
                        Set a password manually instead
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-semibold text-gray-700">Password</label>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            {showPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-primary-600 transition-colors" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            disabled={loading}
                            className={`input-modern w-full pl-11 pr-12 ${
                              errors.password ? 'border-danger-500 focus:ring-danger-500' : ''
                            }`}
                            placeholder="Min. 8 characters"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="text-danger-600 text-sm flex items-center">
                            <span className="inline-block w-1 h-1 bg-danger-600 rounded-full mr-2"></span>
                            {errors.password}
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-semibold text-gray-700">Confirm Password</label>
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            {showConfirmPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-primary-600 transition-colors" />
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            disabled={loading}
                            className={`input-modern w-full pl-11 pr-12 ${
                              errors.confirmPassword ? 'border-danger-500 focus:ring-danger-500' : ''
                            }`}
                            placeholder="Confirm your password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {errors.confirmPassword && (
                          <p className="text-danger-600 text-sm flex items-center">
                            <span className="inline-block w-1 h-1 bg-danger-600 rounded-full mr-2"></span>
                            {errors.confirmPassword}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 4: Pricing */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <InputField
                    icon={IndianRupee}
                    label="Adult Ticket Price (₹)"
                    name="adultPrice"
                    type="number"
                    placeholder="Enter adult ticket price"
                    value={formData.adultPrice}
                    error={errors.adultPrice}
                    min="0"
                    step="0.01"
                    onChange={handleChange}
                    loading={loading}
                  />
                  <InputField
                    icon={IndianRupee}
                    label="Child Ticket Price (₹)"
                    name="childPrice"
                    type="number"
                    placeholder="Enter child ticket price"
                    value={formData.childPrice}
                    error={errors.childPrice}
                    min="0"
                    step="0.01"
                    onChange={handleChange}
                    loading={loading}
                  />

                  {/* Summary */}
                  <div className="bg-gradient-to-br from-primary-50 to-secondary-50 p-4 rounded-xl border border-primary-200">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Registration Summary:</p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• Museum: <span className="font-semibold text-gray-900">{formData.museumName}</span></p>
                      <p>• Location: <span className="font-semibold text-gray-900">{formData.location}</span></p>
                      <p>• Capacity: <span className="font-semibold text-gray-900">{formData.seatCapacity} seats</span></p>
                      <p>• Adult Price: <span className="font-semibold text-gray-900">₹{formData.adultPrice}</span></p>
                      <p>• Child Price: <span className="font-semibold text-gray-900">₹{formData.childPrice}</span></p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex space-x-3 pt-6">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={loading}
                    className="flex-1 py-3 flex items-center justify-center space-x-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    <span>Previous</span>
                  </button>
                )}
                {currentStep < 4 && (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={loading}
                    className="flex-1 btn-primary py-3 flex items-center justify-center space-x-2"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
                {currentStep === 4 && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 btn-primary py-3 disabled:opacity-60 transition-all"
                  >
                    {loading ? 'Registering...' : 'Complete Registration'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-6">
          By registering, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default RegisterMuseum;
