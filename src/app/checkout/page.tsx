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
          // Pre-fill profile / user meta if available
          setFormData((prev) => ({
            ...prev,
            email: user.email || '',
            fullName: user.user_metadata?.full_name || '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingAddress: {
            fullName: formData.fullName,
            phone: formData.phone,
            addressLine1: formData.addressLine1,
            city: formData.city,
            state: formData.state,
            postalCode: formData.postalCode,
            country: formData.country,
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

      // Order created successfully
      clearCart();
      router.push(`/order-success/${result.orderNumber}`);
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
    <div className="min-h-screen bg-[#0a0e14] text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <Link
            href="/"
            className="flex items-center text-xs tracking-widest uppercase text-white/60 hover:text-[#d4af37] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Boutique
          </Link>
          <div className="flex items-center space-x-2 text-xs text-white/50 tracking-wider uppercase">
            <Lock className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>256-Bit SSL Encrypted Checkout</span>
          </div>
        </div>

        <div className="mb-10 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-[#d4af37] font-medium">
            Velora Haute Joaillerie
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif tracking-wide text-white mt-2">
            Secure Checkout
          </h1>
        </div>

        {/* Authentication Notice for Guests */}
        {!user && (
          <div className="mb-8 p-4 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-[#d4af37] flex-shrink-0" />
              <p className="text-sm text-white/90">
                You are currently not signed in. An authenticated account is required to secure your order.
              </p>
            </div>
            <Link
              href="/customer/login?next=/checkout"
              className="px-4 py-2 bg-[#d4af37] text-black text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-[#e5c158] transition-all whitespace-nowrap ml-4"
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
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left: Customer Info & Shipping Address */}
            <div className="lg:col-span-7 space-y-8">
              {/* Customer Contact */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                  <h2 className="text-lg font-serif tracking-wide text-white">
                    1. Contact Information
                  </h2>
                  {user && (
                    <span className="text-xs text-white/40 tracking-wider">
                      Signed in as {user.email}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="e.g. Lord Alistair Vance"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#d4af37] text-sm transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
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
                      className={`w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#d4af37] text-sm transition-colors ${
                        user?.email ? 'opacity-80 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#d4af37] text-sm transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                  <h2 className="text-lg font-serif tracking-wide text-white">
                    2. Luxury White-Glove Delivery Address
                  </h2>
                  <Truck className="w-4 h-4 text-[#d4af37]" />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                      Address Line *
                    </label>
                    <input
                      type="text"
                      name="addressLine1"
                      required
                      value={formData.addressLine1}
                      onChange={handleInputChange}
                      placeholder="Apartment, Suite, Unit, Street Address"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#d4af37] text-sm transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        required
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Mumbai"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#d4af37] text-sm transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        name="state"
                        required
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="Maharashtra"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#d4af37] text-sm transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                        PIN Code *
                      </label>
                      <input
                        type="text"
                        name="postalCode"
                        required
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        placeholder="400001"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[#d4af37] text-sm transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      disabled
                      value={formData.country}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Planned Payment Method */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                  <h2 className="text-lg font-serif tracking-wide text-white">
                    3. Payment Architecture
                  </h2>
                  <CreditCard className="w-4 h-4 text-[#d4af37]" />
                </div>

                <div className="p-4 rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/5 flex items-start space-x-3">
                  <div className="p-2 bg-[#d4af37]/10 rounded-lg text-[#d4af37] mt-0.5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-white">Razorpay Secure Online Payment</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-[#d4af37] text-black rounded">
                        Next Stage Ready
                      </span>
                    </div>
                    <p className="text-xs text-white/60 mt-1 leading-relaxed">
                      In this Step 13 foundation stage, your order is cryptographically verified and recorded with pending payment status. Direct Razorpay checkout integration will be initiated in the next stage without modifying database totals.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-5">
              <div className="sticky top-28 bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
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
