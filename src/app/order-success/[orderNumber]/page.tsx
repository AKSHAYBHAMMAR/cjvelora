'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function OrderSuccessPage() {
  const params = useParams();
  const orderNumber = params?.orderNumber as string;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      if (!orderNumber) return;

      try {
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .select('*')
          .eq('order_number', orderNumber)
          .single();

        if (orderErr || !orderData) {
          throw new Error('Order not found or access restricted.');
        }

        const { data: itemsData, error: itemsErr } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderData.id);

        if (itemsErr) {
          console.warn('Error fetching order items:', itemsErr);
        }

        setOrder(orderData);
        setOrderItems(itemsData || []);
      } catch (err: any) {
        console.error('Error fetching order:', err);
        setError(err.message || 'Could not locate order details.');
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0a0e14] text-white pt-32 pb-20 px-4 text-center">
        <div className="max-w-md mx-auto bg-white/[0.02] border border-white/10 p-8 rounded-2xl">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h1 className="text-xl font-serif mb-2">Order Not Found</h1>
          <p className="text-sm text-white/50 mb-6">{error || 'Unable to display order details.'}</p>
          <Link
            href="/"
            className="px-6 py-2.5 bg-[#d4af37] text-black text-xs uppercase tracking-wider font-semibold rounded-lg hover:bg-[#e5c158] transition-all"
          >
            Return to Boutique
          </Link>
        </div>
      </div>
    );
  }

  const shipping = order.shipping_address || {};

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header Confirmation Banner */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-[#d4af37]" />
          </div>
          <span className="text-xs uppercase tracking-[0.3em] text-[#d4af37] font-medium">
            Order Securely Registered
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif text-white mt-2">
            Thank You for Choosing Velora
          </h1>
          <p className="text-sm text-white/60 mt-2">
            Your high jewelry order reference is{' '}
            <span className="font-mono font-bold text-white">{order.order_number}</span>
          </p>
        </div>

        {/* Payment Notice Callout (Explicitly clarifying payment is pending for Step 14) */}
        <div className="mb-8 p-5 rounded-2xl bg-white/[0.02] border border-[#d4af37]/30 backdrop-blur-sm">
          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-[#d4af37] mt-0.5 flex-shrink-0" />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold text-white">Payment Architecture Notice</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                  Pending Gateway Integration
                </span>
              </div>
              <p className="text-xs text-white/70 mt-1 leading-relaxed">
                Your order foundation has been securely created in our database. Live payment capture via Razorpay will be initialized in the upcoming stage. No payment has been debited yet, and the order is in <span className="text-white font-medium">Pending</span> state.
              </p>
            </div>
          </div>
        </div>

        {/* Order Details Card */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-white/10 text-xs">
            <div>
              <span className="text-white/40 uppercase tracking-wider block mb-1">Order Date</span>
              <span className="text-white font-medium">
                {new Date(order.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div>
              <span className="text-white/40 uppercase tracking-wider block mb-1">Order Status</span>
              <span className="inline-block px-2 py-0.5 bg-white/10 text-white/90 rounded text-[11px] font-medium capitalize">
                {order.status}
              </span>
            </div>
            <div>
              <span className="text-white/40 uppercase tracking-wider block mb-1">Payment Status</span>
              <span className="inline-block px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded text-[11px] font-medium capitalize">
                {order.payment_status}
              </span>
            </div>
            <div>
              <span className="text-white/40 uppercase tracking-wider block mb-1">Total Amount</span>
              <span className="text-sm font-bold text-[#d4af37]">
                ₹{Number(order.total_amount).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Item Snapshots */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-white/50 mb-3 flex items-center">
              <Package className="w-3.5 h-3.5 mr-1.5 text-[#d4af37]" /> Ordered Pieces
            </h3>
            <div className="space-y-3">
              {orderItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-white/5 text-sm"
                >
                  <div>
                    <p className="font-serif text-white">{item.product_name}</p>
                    <p className="text-xs text-white/40">
                      Qty: {item.quantity} × ₹{Number(item.unit_price).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white/90">
                      ₹{Number(item.subtotal).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address Snapshot */}
          <div className="pt-4 border-t border-white/10">
            <h3 className="text-xs uppercase tracking-wider text-white/50 mb-2 flex items-center">
              <Truck className="w-3.5 h-3.5 mr-1.5 text-[#d4af37]" /> Delivery Information
            </h3>
            <div className="text-xs text-white/80 space-y-1 bg-white/5 p-4 rounded-xl">
              <p className="font-semibold text-white">{shipping.fullName}</p>
              <p>{shipping.addressLine1}</p>
              <p>
                {shipping.city}, {shipping.state} — {shipping.postalCode}
              </p>
              <p className="text-white/60">Phone: {shipping.phone}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/account/orders"
              className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-xs uppercase tracking-widest font-semibold rounded-xl text-center transition-all"
            >
              View Order History
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 bg-[#d4af37] hover:bg-[#e5c158] text-black text-xs uppercase tracking-widest font-semibold rounded-xl text-center transition-all flex items-center justify-center space-x-2"
            >
              <span>Continue Exploring</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
