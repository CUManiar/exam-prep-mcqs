'use client';

export interface RazorpayCheckoutOptions {
  amountPaise: number; // e.g. 99900 for ₹999
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, any>;
  onSuccess?: (response: { paymentId: string; orderId: string; signature: string }) => void;
  onDismiss?: () => void;
  onError?: (error: Error) => void;
}

const PRO_STORAGE_KEY = 'exam_prep_is_pro_v1';

// Check if current user is Pro
export function isUserPro(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(PRO_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

// Mark current user as Pro
export function setUserPro(isPro: boolean = true): void {
  if (typeof window === 'undefined') return;
  try {
    if (isPro) {
      localStorage.setItem(PRO_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(PRO_STORAGE_KEY);
    }
    // Dispatch custom event so UI updates across components immediately
    window.dispatchEvent(new Event('pro-status-changed'));
  } catch (err) {
    console.error('Failed to update Pro status in storage:', err);
  }
}

// Load the Razorpay Checkout script dynamically
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// Open Razorpay Standard Checkout modal
export async function openRazorpayCheckout({
  amountPaise,
  name = 'Upsc-Practice',
  description = 'Lifetime Pro Access - Complete UPSC Prelims & Mains Vault',
  prefill,
  notes,
  onSuccess,
  onDismiss,
  onError,
}: RazorpayCheckoutOptions): Promise<void> {
  try {
    // 1. Ensure script is loaded
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      throw new Error('Could not load Razorpay payment gateway. Please check your internet connection.');
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!keyId) {
      throw new Error('Razorpay public key (NEXT_PUBLIC_RAZORPAY_KEY_ID) is not configured.');
    }

    // 2. Create order on server
    const orderRes = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        notes: notes || { plan: 'lifetime_pro' },
      }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.ok || !orderData.order_id) {
      throw new Error(orderData.error || 'Failed to initialize payment order on server.');
    }

    // 3. Configure Razorpay modal options
    const options = {
      key: keyId,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name,
      description,
      order_id: orderData.order_id,
      prefill: {
        name: prefill?.name || '',
        email: prefill?.email || '',
        contact: prefill?.contact || '',
      },
      theme: {
        color: '#4f46e5', // Brand Indigo
      },
      handler: async function (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) {
        try {
          // 4. Verify payment signature on backend
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.verified) {
            // Unlock Pro in storage
            setUserPro(true);
            if (onSuccess) {
              onSuccess({
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
              });
            }
          } else {
            throw new Error(verifyData.error || 'Payment signature verification failed.');
          }
        } catch (verifyErr: any) {
          console.error('[Verification Error]:', verifyErr);
          if (onError) onError(verifyErr);
        }
      },
      modal: {
        ondismiss: function () {
          if (onDismiss) onDismiss();
        },
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', function (response: any) {
      console.error('[Payment Failed]:', response.error);
      const err = new Error(response.error?.description || 'Payment was unsuccessful or failed.');
      if (onError) onError(err);
    });

    rzp.open();
  } catch (err: any) {
    console.error('[Razorpay Checkout Error]:', err);
    if (onError) onError(err);
  }
}
