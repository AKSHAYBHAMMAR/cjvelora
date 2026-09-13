'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import {
  ShieldCheck,
  CreditCard,
  Truck,
  ArrowLeft,
  Lock,
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart } = useStore();

  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
  });

  // Check auth session
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          // Pre-fill profile from available metadata or phone
          setFormData((prev) => ({
            ...prev,
            email: user.email || prev.email,
            phone: user.phone || prev.phone,
            fullName:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              prev.fullName,
          }));
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        setLoadingUser(false);
      }
    }
    checkAuth();
  }, []);

  // Pricing calculations (display only, server validates authoritative pricing)
  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const shipping = 0; // Complimentary luxury shipping
  const total = subtotal + shipping;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Verify session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      router.push('/customer/login?next=/checkout');
      return;
    }

    if (cart.length === 0) {
      setError('Your shopping bag is empty.');
      return;
    }

    // Basic client validation
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.addressLine1.trim() || !formData.city.trim() || !formData.state.trim() || !formData.postalCode.trim()) {
      setError('Please fill in all required shipping fields.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          customerId: session.user.id,
          shippingAddress: {
            fullName: formData.fullName.trim(),
            email: (formData.email || session.user.email || '').trim(),
            phone: (formData.phone || session.user.phone || '').trim(),
            addressLine1: formData.addressLine1.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            postalCode: formData.postalCode.trim(),
            country: formData.country.trim() || 'India',
          },
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to place order. Please try again.');
      }

      // Live Razorpay payment gateway handling
      if (result.razorpayConfigured && result.razorpayOrderId && result.razorpayKeyId) {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error('Failed to connect with secure payment gateway. Please check your network connection.');
        }

        const options = {
          key: result.razorpayKeyId,
          amount: result.amountInPaise,
          currency: result.currency || 'INR',
          name: 'Velora Haute Joaillerie',
          description: `Order Reference #${result.orderNumber}`,
          order_id: result.razorpayOrderId,
          prefill: {
            name: formData.fullName.trim(),
            email: (formData.email || session.user.email || '').trim(),
            contact: (formData.phone || session.user.phone || '').trim(),
          },
          theme: {
            color: '#d4af37',
          },
          handler: async function (paymentResponse: any) {
            try {
              const verifyRes = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  orderId: result.orderId,
                  razorpay_order_id: paymentResponse.razorpay_order_id,
                  razorpay_payment_id: paymentResponse.razorpay_payment_id,
                  razorpay_signature: paymentResponse.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();
              if (!verifyRes.ok || !verifyData.success) {
                throw new Error(verifyData.error || 'Payment signature verification failed.');
              }

              clearCart();
              router.push(`/order-success/${result.orderNumber}`);
            } catch (vErr: any) {
              console.error('Payment verification error:', vErr);
              setError(vErr.message || 'Payment confirmation could not be verified.');
              setSubmitting(false);
            }
          },
          modal: {
            ondismiss: function () {
              setSubmitting(false);
              setError('Payment window closed. Your items remain in your bag.');
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          console.error('Razorpay payment failed:', resp.error);
          setError(`Payment failed: ${resp.error?.description || 'Transaction declined.'}`);
          setSubmitting(false);
        });
        rzp.open();
      } else {
        // Fallback when Razorpay credentials are not yet entered in environment
        clearCart();
        router.push(`/order-success/${result.orderNumber}`);
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'An unexpected error occurred during checkout.');
      setSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-[#0d1217] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white pt-24 pb-20 px-3.5 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10 gap-2">
          <Link
            href="/"
            className="flex items-center text-xs tracking-widest uppercase text-white/60 hover:text-[#d4af37] transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5 sm:mr-2 shrink-0" /> Back to Boutique
          </Link>
          <div className="flex items-center space-x-1.5 text-[10px] sm:text-xs text-white/50 tracking-wider uppercase shrink-0">
            <Lock className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
            <span className="hidden xs:inline">256-Bit SSL Encrypted</span>
            <span className="xs:hidden">SSL Secure</span>
          </div>
        </div>

        <div className="mb-8 sm:mb-10 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-[#d4af37] font-medium">
            Velora Haute Joaillerie
          </span>
          <h1 className="text-2xl sm:text-4xl font-serif tracking-wide text-white mt-1 sm:mt-2">
            Secure Checkout
          </h1>
        </div>

        {/* Authentication Notice for Guests */}
        {!user && (
          <div className="mb-6 sm:mb-8 p-4 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-[#d4af37] flex-shrink-0" />
              <p className="text-xs sm:text-sm text-white/90">
                You are currently not signed in. An authenticated account is required to secure your order.
              </p>
            </div>
            <Link
              href="/customer/login?next=/checkout"
              className="px-4 py-2 bg-[#d4af37] text-black text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-[#e5c158] transition-all whitespace-nowrap self-end xs:self-auto"
            >
              Sign In
            </Link>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        )}

        {cart.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-2xl p-8 max-w-xl mx-auto">
            <h2 className="text-2xl font-serif text-white/80 mb-3">Your Shopping Bag is Empty</h2>
            <p className="text-sm text-white/50 mb-6">
              Discover our signature high jewelry collections and add your desired pieces to begin.
            </p>
            <Link
              href="/"
              className="inline-block px-8 py-3 bg-[#d4af37] text-black text-xs uppercase tracking-widest font-semibold rounded-lg hover:bg-[#c29e2e] transition-all"
            >
              Explore Collections
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
            {/* Left: Customer Info & Shipping Address */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8">
              {/* Customer Contact */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 sm:p-8 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-white/5">
                  <h2 className="text-base sm:text-lg font-serif tracking-wide text-white">
                    1. Contact Information
                  </h2>
                  {user && (
                    <span className="text-[11px] sm:text-xs text-white/40 tracking-wider truncate max-w-[140px] sm:max-w-none">
                      {user.email}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] sm:text-xs uppercase tracking-wider text-white/60 mb-1.5 sm:mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="e.g. Lord Alistair Vance"
                      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#d4af37] text-sm transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] sm:text-xs uppercase tracking-wider text-white/60 mb-1.5 sm:mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      readOnly={Boolean(user?.email)}
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="client@velora.com"
                      className={`w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#d4af37] text-sm transition-colors ${
                        user?.email ? 'opacity-80 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] sm:text-xs uppercase tracking-wider text-white/60 mb-1.5 sm:mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#d4af37] text-sm transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 sm:p-8 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-white/5">
                  <h2 className="text-base sm:text-lg font-serif tracking-wide text-white">
                    2. Luxury White-Glove Delivery Address
                  </h2>
                  <Truck className="w-4 h-4 text-[#d4af37]" />
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-[11px] sm:text-xs uppercase tracking-wider text-white/60 mb-1.5 sm:mb-2">
                      Address Line *
                    </label>
                    <input
                      type="text"
                      name="addressLine1"
                      required
                      value={formData.addressLine1}
                      onChange={handleInputChange}
                      placeholder="Apartment, Suite, Unit, Street Address"
                      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#d4af37] text-sm transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-[11px] sm:text-xs uppercase tracking-wider text-white/60 mb-1.5 sm:mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        required
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Mumbai"
                        className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#d4af37] text-sm transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] sm:text-xs uppercase tracking-wider text-white/60 mb-1.5 sm:mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        name="state"
                        required
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="Maharashtra"
                        className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#d4af37] text-sm transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] sm:text-xs uppercase tracking-wider text-white/60 mb-1.5 sm:mb-2">
                        PIN Code *
                      </label>
                      <input
                        type="text"
                        name="postalCode"
                        required
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        placeholder="400001"
                        className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#d4af37] text-sm transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs uppercase tracking-wider text-white/60 mb-1.5 sm:mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      disabled
                      value={formData.country}
                      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Planned Payment Method */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 sm:p-8 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                  <h2 className="text-base sm:text-lg font-serif tracking-wide text-white">
                    3. Payment Architecture
                  </h2>
                  <CreditCard className="w-4 h-4 text-[#d4af37]" />
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/5 flex flex-col xs:flex-row items-start xs:items-center gap-3">
                  <div className="p-2 bg-[#d4af37]/10 rounded-lg text-[#d4af37] shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs sm:text-sm font-semibold text-white">Razorpay Secure Online Payment</span>
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#d4af37] text-black rounded">
                        UPI • Cards • NetBanking
                      </span>
                    </div>
                    <p className="text-xs text-white/60 mt-1 leading-relaxed">
                      Transactions are protected by 256-bit bank-grade encryption with instant cryptographic signature verification upon capture.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-5">
              <div className="sticky top-28 bg-white/[0.02] border border-white/10 rounded-2xl p-4 sm:p-8 backdrop-blur-sm">
                <h2 className="text-lg font-serif tracking-wide text-white mb-6 pb-4 border-b border-white/5">
                  Bag Summary ({cart.reduce((a, b) => a + b.quantity, 0)} Items)
                </h2>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center space-x-4 py-2 border-b border-white/5">
                      <div className="w-14 h-14 rounded-lg bg-black/40 overflow-hidden flex-shrink-0 border border-white/10">
                        <img
                          src={item.product.images?.[0] || item.product.image || '/images/products/ring-1.jpg'}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-serif text-white truncate">{item.product.name}</h3>
                        <p className="text-xs text-white/50 mt-0.5">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-[#d4af37]">
                          ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotals & Total */}
                <div className="mt-6 pt-4 space-y-3 text-xs border-t border-white/10">
                  <div className="flex justify-between text-white/70">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>White-Glove Insured Delivery</span>
                    <span className="text-emerald-400 uppercase tracking-wider text-[10px] font-semibold">
                      Complimentary
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-white pt-3 border-t border-white/10">
                    <span>Estimated Total</span>
                    <span className="text-base text-[#d4af37]">
                      ₹{total.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 text-center italic mt-1">
                    * Authoritative prices & stock are cryptographically re-validated server-side upon order creation.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="w-full mt-6 py-4 px-6 rounded-xl bg-[#d4af37] text-black font-semibold text-xs tracking-widest uppercase hover:bg-[#e5c158] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-[#d4af37]/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Securing Order...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Place Secure Order</span>
                    </>
                  )}
                </button>

                <div className="mt-6 grid grid-cols-2 gap-3 text-[10px] text-white/50 pt-4 border-t border-white/5 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>Hallmarked 100% Pure</span>
                  </div>
                  <div className="flex items-center justify-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>Discreet Packaging</span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
