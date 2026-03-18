import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../config/api';
import API_CONFIG from '../../config/api';

const PaymentCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { upgradeToPremium } = useAuth();
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');

  const pidx = searchParams.get('pidx');
  const paymentStatus = searchParams.get('status');

  useEffect(() => {
    if (paymentStatus === 'Completed' && pidx) {
      fetch(getApiUrl(API_CONFIG.ENDPOINTS.KHALTI_VERIFY), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pidx }),
      })
        .then((res) => res.json())
        .then((data) => {
          // Khalti lookup returns status: "Completed" on success
          const isSuccess =
            data.status === 'Completed' ||
            (typeof data.status === 'string' && data.status.toLowerCase() === 'completed') ||
            data.success === true;
          if (isSuccess) {
            upgradeToPremium();
            setStatus('success');
          } else {
            setError(data.message || data.detail || 'Verification failed');
            setStatus('error');
          }
        })
        .catch(() => {
          setError('Could not verify payment');
          setStatus('error');
        });
    } else if (paymentStatus === 'Failed' || paymentStatus === 'Canceled') {
      setStatus('cancelled');
    } else {
      setError('Invalid or missing payment data');
      setStatus('error');
    }
  }, [pidx, paymentStatus, upgradeToPremium]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-6" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Verifying your payment</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50 to-orange-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment cancelled</h2>
          <p className="text-gray-600 mb-6">Your Khalti payment was not completed.</p>
          <button
            onClick={() => navigate('/payment')}
            className="w-full py-3 rounded-xl font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full mt-3 py-3 rounded-xl font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-red-50 to-rose-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/payment')}
            className="w-full py-3 rounded-xl font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            Back to payment
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full mt-3 py-3 rounded-xl font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-indigo-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank you!</h2>
        <p className="text-gray-600 mb-6">
          Your Khalti payment was successful. You now have access to premium features and templates.
        </p>
        <button
          onClick={() => navigate('/choose_templates')}
          className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-colors"
        >
          Continue to templates
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full mt-3 py-3 rounded-xl font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back to home
        </button>
      </div>
    </div>
  );
};

export default PaymentCallback;
