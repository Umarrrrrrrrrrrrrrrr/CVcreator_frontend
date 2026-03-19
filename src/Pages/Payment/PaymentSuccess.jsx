import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../config/api';
import API_CONFIG from '../../config/api';

const PRODUCT_USE_IN_TEMPLATE = 'useInTemplate';
const PRODUCT_PREMIUM_TEMPLATES = 'premiumTemplates';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { upgradeToPremium, upgradeUseInTemplate } = useAuth();
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  // eSewa sends data as Base64 JSON in ?data= param, OR as direct params
  const transactionUuid = searchParams.get('transaction_uuid') || searchParams.get('oid');
  const totalAmount = searchParams.get('total_amount') || searchParams.get('amt');
  const dataParam = searchParams.get('data');

  useEffect(() => {
    let uuid = transactionUuid;
    let amount = totalAmount;

    if (dataParam && (!uuid || !amount)) {
      try {
        const decoded = JSON.parse(atob(dataParam));
        uuid = uuid || decoded.transaction_uuid || decoded.transaction_code;
        amount = amount || String(decoded.total_amount || '').replace(/,/g, '');
        if (decoded.status === 'COMPLETE' || decoded.status === 'complete') {
          const product = sessionStorage.getItem('paymentProduct') || PRODUCT_USE_IN_TEMPLATE;
          if (product === PRODUCT_PREMIUM_TEMPLATES) {
            localStorage.setItem('isPremium', 'true');
            upgradeToPremium();
          } else {
            localStorage.setItem('useInTemplateAccess', 'true');
            upgradeUseInTemplate();
          }
          sessionStorage.removeItem('paymentProduct');
          setVerified(true);
          return;
        }
      } catch (e) {
        console.warn('Could not decode eSewa data param', e);
      }
    }

    if (uuid && amount) {
      setVerifying(true);
      fetch(
        `${getApiUrl(API_CONFIG.ENDPOINTS.ESEWA_VERIFY)}?total_amount=${encodeURIComponent(amount)}&transaction_uuid=${encodeURIComponent(uuid)}`,
        { method: 'GET' }
      )
        .then((res) => res.json())
        .then((data) => {
          // eSewa returns status: "COMPLETE" on success; also support success/verified for compatibility
          const isSuccess =
            data.status === 'COMPLETE' ||
            data.status === 'complete' ||
            data.status === 'success' ||
            data.verified === true;
          if (isSuccess) {
            const product = sessionStorage.getItem('paymentProduct') || PRODUCT_USE_IN_TEMPLATE;
            if (product === PRODUCT_PREMIUM_TEMPLATES) {
              localStorage.setItem('isPremium', 'true');
              upgradeToPremium();
            } else {
              localStorage.setItem('useInTemplateAccess', 'true');
              upgradeUseInTemplate();
            }
            sessionStorage.removeItem('paymentProduct');
            setVerified(true);
          } else {
            setError(data.message || data.detail || 'Verification failed');
          }
        })
        .catch(() => setError('Could not verify payment'))
        .finally(() => setVerifying(false));
    } else {
      setError('No payment data received. Click "Continue to templates" below to restore access if you were charged.');
      setVerified(true);
    }
  }, [transactionUuid, totalAmount, dataParam, upgradeToPremium, upgradeUseInTemplate]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-emerald-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-6" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Verifying your payment</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-emerald-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {error ? (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Payment received</h2>
            <p className="text-gray-600 mb-2">Verification could not be completed: {error}</p>
            <p className="text-sm text-gray-500 mb-6">If you were charged, your premium access may still be active.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank you!</h2>
            <p className="text-gray-600 mb-6">
              Your payment was successful. You now have access to premium features and templates.
            </p>
          </>
        )}
        <button
          onClick={() => {
            const product = sessionStorage.getItem('paymentProduct') || PRODUCT_USE_IN_TEMPLATE;
            if (product === PRODUCT_PREMIUM_TEMPLATES) {
              localStorage.setItem('isPremium', 'true');
              upgradeToPremium();
              navigate('/choose_templates');
            } else {
              localStorage.setItem('useInTemplateAccess', 'true');
              upgradeUseInTemplate();
              const enhancedResume = sessionStorage.getItem('pendingEnhancedResume') || '';
              sessionStorage.removeItem('pendingEnhancedResume');
              navigate('/choose_templates', { state: enhancedResume ? { enhancedResume } : {} });
            }
            sessionStorage.removeItem('paymentProduct');
          }}
          className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transition-colors"
        >
          Continue
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

export default PaymentSuccess;
