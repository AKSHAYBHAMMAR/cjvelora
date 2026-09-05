'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Package,
  Calendar,
  CreditCard,
  Truck,
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileText,
  Clock,
} from 'lucide-react';

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const orderNumber = params?.orderNumber as string;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCustomerOrder() {
      if (!orderNumber) return;

      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !user) {
          setUser(null);
          setLoading(false);
          return;
        }

        setUser(user);

        // Fetch order strictly matching order_number AND customer_id (RLS / Auth security)
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .select('*')
          .eq('order_number', orderNumber)
          .eq('customer_id', user.id)
          .single();

        if (orderErr || !orderData) {
          throw new Error('Order not found or you do not have permission to view it.');
        }

        // Fetch order_items snapshot
        const { data: itemsData, error: itemsErr } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderData.id);

        if (itemsErr) {
          console.warn('Error fetching order items snapshot:', itemsErr);
        }

        setOrder(orderData);
        setOrderItems(itemsData || []);
      } catch (err: any) {
        console.error('Error fetching order details:', err);
        setError(err.message || 'Could not locate order details.');
      } finally {
        setLoading(false);
      }
    }

    loadCustomerOrder();
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0e14] text-white pt-32 pb-20 px-4 text-center">
        <div className="max-w-md mx-auto bg-white/[0.02] border border-white/10 p-8 rounded-2xl">
          <AlertCircle className="w-12 h-12 text-[#d4af37] mx-auto mb-4" />
          <h1 className="text-xl font-serif mb-2">Sign In Required</h1>
          <p className="text-sm text-white/60 mb-6">
            Please authenticate to review your private order records.
          </p>
          <Link
            href="/customer/login?next=/account/orders"
            className="inline-block px-8 py-3 bg-[#d4af37] text-black text-xs uppercase tracking-widest font-semibold rounded-lg hover:bg-[#e5c158] transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0a0e14] text-white pt-32 pb-20 px-4 text-center">
        <div className="max-w-md mx-auto bg-white/[0.02] border border-white/10 p-8 rounded-2xl">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h1 className="text-xl font-serif mb-2">Order Not Accessible</h1>
          <p className="text-sm text-white/50 mb-6">{error || 'Unable to retrieve this order.'}</p>
          <Link
            href="/account/orders"
            className="px-6 py-2.5 bg-[#d4af37] text-black text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-[#e5c158] transition-all"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const shipping = order.shipping_address || {};

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <Link
            href="/account/orders"
            className="flex items-center text-xs tracking-widest uppercase text-white/60 hover:text-[#d4af37] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> All Orders
          </Link>
          <span className="text-xs font-mono text-[#d4af37] font-semibold">
            {order.order_number}
          </span>
        </div>

        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-[#d4af37] font-medium">
              Acquisition Record
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif tracking-wide text-white mt-1">
              Order #{order.order_number}
            </h1>
            <p className="text-xs text-white/50 mt-1 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-[#d4af37]" />
              Placed on{' '}
              {new Date(order.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                order.status === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : order.status === 'cancelled'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              Order: {order.status}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 text-white/80 border border-white/10">
              Payment: {order.payment_status}
            </span>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main: Items Snapshot & Pricing */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items Card */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-sm uppercase tracking-wider text-white/60 mb-4 pb-3 border-b border-white/5 flex items-center">
                <Package className="w-4 h-4 mr-2 text-[#d4af37]" /> Purchased Pieces (Historical Snapshot)
              </h2>

              <div className="divide-y divide-white/5">
                {orderItems.map((item) => (
                  <div key={item.id} className="py-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-serif text-white font-medium">
                        {item.product_name}
                      </h3>
                      <p className="text-xs text-white/40 mt-1">
                        Historical Unit Price: ₹{Number(item.unit_price).toLocaleString('en-IN')} × Qty {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#d4af37]">
                        ₹{Number(item.subtotal).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Calculation Summary */}
              <div className="mt-6 pt-4 border-t border-white/10 space-y-2 text-xs">
                <div className="flex justify-between text-white/60">
                  <span>Subtotal</span>
                  <span>₹{Number(order.subtotal).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Insured Courier</span>
                  <span className="text-emerald-400">Complimentary</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount</span>
                    <span>-₹{Number(order.discount_amount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-white pt-3 border-t border-white/10">
                  <span>Total Amount</span>
                  <span className="text-base text-[#d4af37]">
                    ₹{Number(order.total_amount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar: Shipping & Payment Snapshot */}
          <div className="space-y-6">
            {/* Delivery Address */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-xs uppercase tracking-wider text-white/60 mb-4 pb-3 border-b border-white/5 flex items-center">
                <Truck className="w-4 h-4 mr-2 text-[#d4af37]" /> Delivery Destination
              </h2>
              <div className="text-xs text-white/80 space-y-1">
                <p className="font-semibold text-white">{shipping.fullName || 'Recipient'}</p>
                <p>{shipping.addressLine1}</p>
                <p>
                  {shipping.city}, {shipping.state} — {shipping.postalCode}
                </p>
                <p className="text-white/50">{shipping.country || 'India'}</p>
                <p className="text-white/60 pt-2">Contact: {shipping.phone}</p>
              </div>
            </div>

            {/* Payment Method Details */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-xs uppercase tracking-wider text-white/60 mb-4 pb-3 border-b border-white/5 flex items-center">
                <CreditCard className="w-4 h-4 mr-2 text-[#d4af37]" /> Payment Record
              </h2>
              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/50">Method</span>
                  <span className="text-white font-medium uppercase">{order.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Gateway Status</span>
                  <span className="text-amber-300 font-medium capitalize">{order.payment_status}</span>
                </div>
                <p className="text-[10px] text-white/40 pt-2 leading-relaxed">
                  * Live online gateway processing will be attached in the next development phase.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
