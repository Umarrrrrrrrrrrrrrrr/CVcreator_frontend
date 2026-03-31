import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../config/api';
import API_CONFIG from '../../config/api';
import Navbar from '../Navbar/Navbar';

const PRODUCT_USE_IN_TEMPLATE = 'useInTemplate';
const PRODUCT_PREMIUM_TEMPLATES = 'premiumTemplates';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { upgradeToPremium, upgradeUseInTemplate } = useAuth();
  const redirectMessage = location.state?.message || '';
  const productFromState = location.state?.product;
  const [selectedPlan, setSelectedPlan] = useState(productFromState || PRODUCT_USE_IN_TEMPLATE);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentError, setPaymentError] = useState('');
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    zipCode: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const plans = [
    {
      id: PRODUCT_USE_IN_TEMPLATE,
      name: 'Use in Template',
      price: 500,
      period: 'one-time',
      currency: 'NRS',
      features: [
        'Use your AI-enhanced CV in any template',
        'One-click transfer to template builder',
        'Perfect for graded & improved resumes'
      ],
      popular: true,
      color: 'from-purple-500 to-pink-600'
    },
    {
      id: PRODUCT_PREMIUM_TEMPLATES,
      name: 'Premium Templates',
      price: 250,
      period: 'one-time',
      currency: 'NRS',
      features: [
        'Access to 6 premium templates (2, 5, 7, 11, 14, 16)',
        'Classic Elegant, Minimalist, Bold Creative',
        'Executive Two-Column, Classic Red Accent, Professional Clean'
      ],
      popular: false,
      color: 'from-blue-500 to-indigo-600'
    }
  ];

  useEffect(() => {
    if (productFromState && (productFromState === PRODUCT_USE_IN_TEMPLATE || productFromState === PRODUCT_PREMIUM_TEMPLATES)) {
      setSelectedPlan(productFromState);
    }
  }, [productFromState]);

  const applyPaymentSuccess = (productId) => {
    if (productId === PRODUCT_USE_IN_TEMPLATE) {
      localStorage.setItem('useInTemplateAccess', 'true');
      upgradeUseInTemplate();
    } else {
      localStorage.setItem('isPremium', 'true');
      upgradeToPremium();
    }
  };

  const handleCardInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'cardNumber') {
      // Format card number with spaces
      const formatted = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
      if (formatted.replace(/\s/g, '').length <= 16) {
        setCardData({ ...cardData, [name]: formatted });
      }
    } else if (name === 'expiryDate') {
      // Format expiry date MM/YY
      const formatted = value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5);
      setCardData({ ...cardData, [name]: formatted });
    } else if (name === 'cvv') {
      // Limit CVV to 3-4 digits
      if (value.length <= 4) {
        setCardData({ ...cardData, [name]: value.replace(/\D/g, '') });
      }
    } else {
      setCardData({ ...cardData, [name]: value });
    }
  };

  const getBaseUrl = () => window.location.origin;

  const payWithEsewa = async () => {
    setPaymentError('');
    setIsProcessing(true);
    try {
      const amount = Number(selectedPlanData.price); // NRS (Nepalese Rupees)
      const tax_amount = 0; // No tax for simplicity, or set if required
      const res = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.ESEWA_INITIATE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          tax_amount: tax_amount || 0,
          success_url: `${getBaseUrl()}/payment/success`,
          failure_url: `${getBaseUrl()}/payment/failure`,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || `eSewa initiate failed (${res.status})`);
      }
      const { form_url, form_data } = await res.json();
      if (!form_url || !form_data) throw new Error('Invalid response from eSewa');
      sessionStorage.setItem('paymentProduct', selectedPlan);
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = form_url;
      Object.entries(form_data).forEach(([k, v]) => {
        const input = document.createElement('input');
        input.name = k;
        input.value = v;
        input.type = 'hidden';
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setPaymentError(err.message || 'eSewa payment could not be started.');
      setIsProcessing(false);
    }
  };

  const payWithKhalti = async () => {
    setPaymentError('');
    setIsProcessing(true);
    try {
      const amountPaisa = Math.round(Number(selectedPlanData.price) * 100); // NRS 250 = 25000 paisa
      const purchase_order_id = `order-${Date.now()}`;
      const res = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.KHALTI_INITIATE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountPaisa,
          purchase_order_id,
          purchase_order_name: `${selectedPlanData.name} Plan - CV Creator`,
          return_url: `${getBaseUrl()}/payment/callback`,
          website_url: getBaseUrl(),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || `Khalti initiate failed (${res.status})`);
      }
      const { payment_url } = await res.json();
      if (!payment_url) throw new Error('Invalid response from Khalti');
      sessionStorage.setItem('paymentProduct', selectedPlan);
      window.location.href = payment_url;
    } catch (err) {
      setPaymentError(err.message || 'Khalti payment could not be started.');
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPaymentError('');
    setIsProcessing(true);
    setTimeout(() => {
      applyPaymentSuccess(selectedPlan);
      setIsProcessing(false);
      const msg = selectedPlan === PRODUCT_USE_IN_TEMPLATE
        ? 'Payment successful! You can now use your enhanced CV in templates.'
        : 'Payment successful! You now have access to premium templates.';
      alert(msg);
      if (selectedPlan === PRODUCT_USE_IN_TEMPLATE) {
        const enhancedResume = sessionStorage.getItem('pendingEnhancedResume') || '';
        sessionStorage.removeItem('pendingEnhancedResume');
        navigate('/choose_templates', { state: enhancedResume ? { enhancedResume } : {} });
      } else {
        navigate('/choose_templates');
      }
    }, 2000);
  };

  const selectedPlanData = plans.find(plan => plan.id === selectedPlan);

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-12 px-4 -mt-20">
      <div className="max-w-7xl mx-auto">
        {redirectMessage && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800">
            <svg className="w-5 h-5 flex-shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">{redirectMessage}</span>
          </div>
        )}
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600">
            Unlock premium features and create professional resumes
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Pricing Plans */}
          <div className="lg:col-span-2">
            <div className="grid md:grid-cols-1 max-w-md mx-auto gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative bg-white rounded-2xl shadow-lg p-6 cursor-pointer transform transition-all duration-300 ${
                    selectedPlan === plan.id
                      ? 'ring-4 ring-blue-500 scale-105'
                      : 'hover:shadow-xl hover:scale-[1.02]'
                  } ${plan.popular ? 'border-2 border-blue-500' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                        NRS {plan.price}
                      </span>
                      <span className="text-gray-500">/{plan.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className={`w-full h-1 rounded-full bg-gradient-to-r ${plan.color} ${
                    selectedPlan === plan.id ? 'opacity-100' : 'opacity-0'
                  } transition-opacity`}></div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-4">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Order Summary</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{selectedPlanData.name} Plan</span>
                  <span className="font-semibold text-gray-800">NRS {selectedPlanData.price}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payment</span>
                  <span className="text-gray-800">One-time</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-800">Total</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      NRS {selectedPlanData.price}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">What's included:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Cancel anytime</li>
                      <li>30-day money-back guarantee</li>
                      <li>Secure payment processing</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Payment Details</h2>

            {/* Payment Method Selection */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Select Payment Method
              </label>
              {paymentError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {paymentError}
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'card'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span className="font-semibold text-gray-700 text-sm text-center">Stripe / Card</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('esewa')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'esewa'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl font-bold text-green-600">eSewa</span>
                    <span className="text-xs text-gray-500">Nepal</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('khalti')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'khalti'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xl font-bold text-purple-600">Khalti</span>
                    <span className="text-xs text-gray-500">Nepal</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('paypal')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'paypal'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xl font-bold text-blue-600">PayPal</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('apple')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'apple'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C1.79 15.25 2.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    <span className="font-semibold text-gray-700 text-sm">Apple Pay</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Card Payment Form */}
            {paymentMethod === 'card' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="cardNumber"
                      value={cardData.cardNumber}
                      onChange={handleCardInputChange}
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                      required
                      maxLength="19"
                    />
                    <div className="absolute right-4 top-3 flex gap-2">
                      <div className="w-8 h-5 bg-blue-600 rounded"></div>
                      <div className="w-8 h-5 bg-yellow-400 rounded"></div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    name="cardName"
                    value={cardData.cardName}
                    onChange={handleCardInputChange}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      name="expiryDate"
                      value={cardData.expiryDate}
                      onChange={handleCardInputChange}
                      placeholder="MM/YY"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                      required
                      maxLength="5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      CVV
                    </label>
                    <input
                      type="text"
                      name="cvv"
                      value={cardData.cvv}
                      onChange={handleCardInputChange}
                      placeholder="123"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                      required
                      maxLength="4"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ZIP / Postal Code
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={cardData.zipCode}
                    onChange={handleCardInputChange}
                    placeholder="12345"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="terms"
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    required
                  />
                  <label htmlFor="terms" className="text-sm text-gray-600">
                    I agree to the <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg transform hover:scale-105 ${
                    isProcessing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing Payment...
                    </span>
                  ) : (
                    `Pay NRS ${selectedPlanData.price}`
                  )}
                </button>
              </form>
            )}

            {/* PayPal Payment */}
            {paymentMethod === 'paypal' && (
              <div className="text-center py-8">
                <div className="mb-6">
                  <span className="text-6xl font-bold text-blue-600">PayPal</span>
                </div>
                <p className="text-gray-600 mb-6">You will be redirected to PayPal to complete your payment</p>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setIsProcessing(true);
                    setTimeout(() => {
                      applyPaymentSuccess(selectedPlan);
                      setIsProcessing(false);
                      const msg = selectedPlan === PRODUCT_USE_IN_TEMPLATE
                        ? 'Payment successful! You can now use your enhanced CV in templates.'
                        : 'Payment successful! You now have access to premium templates.';
                      alert(msg);
                      if (selectedPlan === PRODUCT_USE_IN_TEMPLATE) {
                        const enhancedResume = sessionStorage.getItem('pendingEnhancedResume') || '';
                        sessionStorage.removeItem('pendingEnhancedResume');
                        navigate('/choose_templates', { state: enhancedResume ? { enhancedResume } : {} });
                      } else {
                        navigate('/choose_templates');
                      }
                    }, 2000);
                  }}
                  disabled={isProcessing}
                  className={`px-8 py-4 rounded-xl font-semibold transition-colors ${
                    isProcessing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isProcessing ? 'Processing...' : 'Continue with PayPal'}
                </button>
              </div>
            )}

            {/* Apple Pay Payment */}
            {paymentMethod === 'apple' && (
              <div className="text-center py-8">
                <div className="mb-6">
                  <svg className="w-20 h-20 mx-auto text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C1.79 15.25 2.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                </div>
                <p className="text-gray-600 mb-6">Complete your payment securely with Apple Pay</p>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setIsProcessing(true);
                    setTimeout(() => {
                      applyPaymentSuccess(selectedPlan);
                      setIsProcessing(false);
                      const msg = selectedPlan === PRODUCT_USE_IN_TEMPLATE
                        ? 'Payment successful! You can now use your enhanced CV in templates.'
                        : 'Payment successful! You now have access to premium templates.';
                      alert(msg);
                      if (selectedPlan === PRODUCT_USE_IN_TEMPLATE) {
                        const enhancedResume = sessionStorage.getItem('pendingEnhancedResume') || '';
                        sessionStorage.removeItem('pendingEnhancedResume');
                        navigate('/choose_templates', { state: enhancedResume ? { enhancedResume } : {} });
                      } else {
                        navigate('/choose_templates');
                      }
                    }, 2000);
                  }}
                  disabled={isProcessing}
                  className={`px-8 py-4 rounded-xl font-semibold transition-colors ${
                    isProcessing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  {isProcessing ? 'Processing...' : 'Pay with Apple Pay'}
                </button>
              </div>
            )}

            {/* eSewa Payment */}
            {paymentMethod === 'esewa' && (
              <div className="text-center py-8">
                <div className="mb-6">
                  <span className="text-4xl font-bold text-green-600">eSewa</span>
                </div>
                <p className="text-gray-600 mb-6">You will be redirected to eSewa to complete your payment securely.</p>
                <p className="text-sm text-gray-500 mb-6">Amount: NRS {selectedPlanData.price} ({selectedPlanData.name} Plan)</p>
                <button
                  type="button"
                  onClick={payWithEsewa}
                  disabled={isProcessing}
                  className={`px-8 py-4 rounded-xl font-semibold transition-colors ${
                    isProcessing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Redirecting...
                    </span>
                  ) : (
                    'Pay with eSewa'
                  )}
                </button>
              </div>
            )}

            {/* Khalti Payment */}
            {paymentMethod === 'khalti' && (
              <div className="text-center py-8">
                <div className="mb-6">
                  <span className="text-4xl font-bold text-purple-600">Khalti</span>
                </div>
                <p className="text-gray-600 mb-6">You will be redirected to Khalti to complete your payment securely.</p>
                <p className="text-sm text-gray-500 mb-6">Amount: NRS {selectedPlanData.price} ({selectedPlanData.name} Plan)</p>
                <button
                  type="button"
                  onClick={payWithKhalti}
                  disabled={isProcessing}
                  className={`px-8 py-4 rounded-xl font-semibold transition-colors ${
                    isProcessing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Redirecting...
                    </span>
                  ) : (
                    'Pay with Khalti'
                  )}
                </button>
              </div>
            )}

            {/* Security Badge */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-sm">256-bit SSL Encryption</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-sm">Secure Payment</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span className="text-sm">PCI Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Payment;
