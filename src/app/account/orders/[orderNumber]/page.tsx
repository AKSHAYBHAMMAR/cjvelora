'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  Clock,
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  XCircle,
  RotateCcw,
  RefreshCw,
  Send,
  ExternalLink,
} from 'lucide-react';
import CancelOrderModal from '@/components/orders/CancelOrderModal';

interface TimelineStage {
  id: string;
  name: string;
  statusText: string;
  state: 'completed' | 'current' | 'upcoming' | 'alert';
  icon: React.ComponentType<{ className?: string }>;
}

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const orderNumber = params?.orderNumber as string;

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Cancellation states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleConfirmCancellation = async () => {
    if (!order) return;
    setIsCancelling(true);
    setCancelError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId: order.id, orderNumber: order.order_number }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel order.');
      }

      setOrder((prev: any) => ({
        ...prev,
        status: 'cancelled',
        order_status: 'cancelled',
        updated_at: new Date().toISOString(),
      }));
      setCancelSuccess('This order has been cancelled.');
      setShowCancelModal(false);
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      setCancelError(err.message || 'Could not cancel order. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const fetchOrderData = useCallback(async (isBackground = false) => {
    if (!orderNumber) return;

    try {
      if (!isBackground) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const { data: { user: currentUser }, error: userErr } = await supabase.auth.getUser();
      if (!isMountedRef.current) return;

      if (userErr || !currentUser) {
        if (!isBackground) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      setUser(currentUser);

      // Fetch order strictly matching order_number AND customer_id (RLS / Auth security)
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .eq('customer_id', currentUser.id)
        .single();

      if (!isMountedRef.current) return;

      if (orderErr || !orderData) {
        if (!isBackground) {
          throw new Error('Order not found or you do not have permission to view it.');
        }
        // Silently retain current order data on transient background errors
        return;
      }

      setOrder(orderData);

      // Fetch order_items snapshot on initial load or if empty
      if (!isBackground) {
        const { data: itemsData, error: itemsErr } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderData.id);

        if (!isMountedRef.current) return;

        if (itemsErr) {
          console.warn('Error fetching order items snapshot:', itemsErr);
        }

        setOrderItems(itemsData || []);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (!isBackground) {
        console.error('Error fetching order details:', err);
        setError(err.message || 'Could not locate order details.');
      }
    } finally {
      if (isMountedRef.current) {
        if (!isBackground) {
          setLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    }
  }, [orderNumber]);

  // Initial data load
  useEffect(() => {
    fetchOrderData(false);
  }, [fetchOrderData]);

  // Automatic background refresh on focus, visibility change, and 30s interval
  useEffect(() => {
    if (!user || !orderNumber) return;

    // Polling every 30 seconds while page is open
    const intervalId = setInterval(() => {
      fetchOrderData(true);
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchOrderData(true);
      }
    };

    const handleFocus = () => {
      fetchOrderData(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, orderNumber, fetchOrderData]);

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

  const shippingName = order.shipping_name || order.customer_name || 'Recipient';
  const addressLine1 =
    order.shipping_address_line1 ||
    (typeof order.shipping_address === 'string' ? order.shipping_address : '') ||
    '';
  const city = order.shipping_city || '';
  const state = order.shipping_state || '';
  const postalCode = order.shipping_postal_code || '';
  const country = order.shipping_country || 'India';
  const phone = order.shipping_phone || order.customer_phone || '';
  const displayStatus = String(order.order_status || order.status || 'pending').toLowerCase();
  const paymentStatus = String(order.payment_status || 'pending').toLowerCase();
  const isPaid = paymentStatus === 'paid';
  const isCancellable =
    (paymentStatus === 'pending' || paymentStatus === 'failed') &&
    displayStatus === 'pending';
  const discountVal = Number(order.discount_amount ?? order.discount ?? 0);

  const normStatus = displayStatus === 'completed' ? 'delivered' : displayStatus;
  const isTerminalCancelled = normStatus === 'cancelled';
  const isTerminalRefunded = normStatus === 'refunded';

  // Last updated timestamp indicator
  const formattedUpdatedAt = order.updated_at
    ? `${new Date(order.updated_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}, ${new Date(order.updated_at).toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })}`
    : null;

  // Contextual message based on fulfillment stage
  const getContextualMessage = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Your order has been received and is awaiting processing.';
      case 'processing':
        return 'Your handcrafted pieces are currently being prepared.';
      case 'shipped':
        return 'Your order has been dispatched and is on its way to you.';
      case 'out_for_delivery':
        return 'Your handcrafted parcel is out for delivery with your local courier today.';
      case 'delivered':
      case 'completed':
        return 'Your order has been delivered. We hope you enjoy your handcrafted pieces.';
      default:
        return 'Your order is currently being fulfilled.';
    }
  };

  // Timeline stage configuration for active orders
  const paymentStageState: 'completed' | 'current' | 'upcoming' | 'alert' =
    normStatus === 'shipped' || normStatus === 'delivered' || isPaid
      ? 'completed'
      : paymentStatus === 'failed' || paymentStatus === 'refunded'
      ? 'alert'
      : normStatus === 'pending'
      ? 'current'
      : 'upcoming';

  const paymentStageName =
    normStatus === 'shipped' || normStatus === 'delivered' || isPaid
      ? 'Payment Confirmed'
      : paymentStatus === 'failed'
      ? 'Payment Failed'
      : paymentStatus === 'refunded'
      ? 'Payment Refunded'
      : 'Payment Pending';

  const paymentStageText =
    normStatus === 'shipped' || normStatus === 'delivered' || isPaid
      ? 'Razorpay payment successfully verified'
      : paymentStatus === 'failed'
      ? 'Payment verification failed'
      : paymentStatus === 'refunded'
      ? 'Payment transaction refunded'
      : 'Awaiting payment confirmation';

  const stages: TimelineStage[] = [
    {
      id: 'placed',
      name: 'Order Placed',
      statusText: 'Order record received',
      state: 'completed',
      icon: ClipboardCheck,
    },
    {
      id: 'payment',
      name: paymentStageName,
      statusText: paymentStageText,
      state: paymentStageState,
      icon: ShieldCheck,
    },
    {
      id: 'processing',
      name: 'Processing',
      statusText: 'Handcrafted preparation',
      state:
        normStatus === 'shipped' || normStatus === 'out_for_delivery' || normStatus === 'delivered'
          ? 'completed'
          : normStatus === 'processing'
          ? 'current'
          : 'upcoming',
      icon: Package,
    },
    {
      id: 'shipped',
      name: 'Shipped',
      statusText: order.shipping_provider ? `Dispatched via ${order.shipping_provider}` : 'Dispatched with courier',
      state:
        normStatus === 'out_for_delivery' || normStatus === 'delivered'
          ? 'completed'
          : normStatus === 'shipped'
          ? 'current'
          : 'upcoming',
      icon: Truck,
    },
    {
      id: 'out_for_delivery',
      name: 'Out for Delivery',
      statusText: 'With local courier',
      state:
        normStatus === 'delivered'
          ? 'completed'
          : normStatus === 'out_for_delivery'
          ? 'current'
          : 'upcoming',
      icon: Send,
    },
    {
      id: 'delivered',
      name: 'Delivered',
      statusText: 'Safely arrived',
      state: normStatus === 'delivered' ? 'completed' : 'upcoming',
      icon: CheckCircle2,
    },
  ];

  const CurrentStatusIcon =
    normStatus === 'delivered'
      ? CheckCircle2
      : normStatus === 'out_for_delivery'
      ? Send
      : normStatus === 'shipped'
      ? Truck
      : normStatus === 'processing'
      ? Package
      : normStatus === 'pending' && !isPaid
      ? ShieldCheck
      : ClipboardCheck;

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white pt-24 pb-20 px-3.5 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10 gap-2">
          <Link
            href="/account/orders"
            className="flex items-center text-xs tracking-widest uppercase text-white/60 hover:text-[#d4af37] transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5 sm:mr-2 shrink-0" /> All Orders
          </Link>
          <span className="text-xs font-mono text-[#d4af37] font-semibold break-all">
            {order.order_number}
          </span>
        </div>

        {cancelSuccess && (
          <div className="mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-300">{cancelSuccess}</p>
          </div>
        )}

        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-[#d4af37] font-medium">
              Acquisition Record
            </span>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-serif tracking-wide text-white mt-1 break-all">
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

          <div className="flex flex-wrap items-center gap-2 sm:space-x-3">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                displayStatus === 'completed' || displayStatus === 'delivered'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : displayStatus === 'cancelled' || displayStatus === 'refunded'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : displayStatus === 'out_for_delivery'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : displayStatus === 'shipped'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              Order: {displayStatus.replace(/_/g, ' ')}
            </span>
            <span
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                paymentStatus === 'paid'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : paymentStatus === 'failed' || paymentStatus === 'refunded'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              Payment: {order.payment_status}
            </span>
            {isCancellable && (
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(true);
                  setCancelError(null);
                }}
                className="px-4 py-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FULFILLMENT JOURNEY / TERMINAL STATE PANEL                                */}
        {/* ========================================================================= */}
        {isTerminalCancelled ? (
          <div className="bg-rose-500/[0.03] border border-rose-500/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center space-x-4">
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-[0.25em] text-rose-400 font-semibold">
                      Fulfillment Closed
                    </span>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Terminal State
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-serif text-white tracking-wide mt-1">
                    ORDER CANCELLED
                  </h2>
                  <p className="text-sm text-white/70 mt-1">
                    This order has been cancelled and will not proceed to shipment.
                  </p>
                </div>
              </div>
              {formattedUpdatedAt && (
                <div className="text-xs text-white/40 font-mono sm:text-right shrink-0 pl-14 sm:pl-0">
                  Last updated: {formattedUpdatedAt}
                </div>
              )}
            </div>
          </div>
        ) : isTerminalRefunded ? (
          <div className="bg-amber-500/[0.03] border border-amber-500/20 rounded-2xl p-6 sm:p-8 backdrop-blur-sm mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center space-x-4">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-[0.25em] text-amber-400 font-semibold">
                      Fulfillment Closed
                    </span>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Terminal State
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-serif text-white tracking-wide mt-1">
                    ORDER REFUNDED
                  </h2>
                  <p className="text-sm text-white/70 mt-1">
                    This order has been refunded and the fulfillment journey is complete.
                  </p>
                </div>
              </div>
              {formattedUpdatedAt && (
                <div className="text-xs text-white/40 font-mono sm:text-right shrink-0 pl-14 sm:pl-0">
                  Last updated: {formattedUpdatedAt}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm mb-8">
            {/* Timeline Header */}
            <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/5 flex-wrap gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37] font-semibold">
                  Fulfillment Journey
                </span>
                <h2 className="text-base sm:text-lg font-serif text-white mt-0.5">
                  Order Tracking
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>Live Tracking</span>
                </div>
                {isRefreshing && (
                  <RefreshCw className="w-3.5 h-3.5 text-[#d4af37] animate-spin" />
                )}
              </div>
            </div>

            {/* Desktop / Tablet Horizontal Timeline (md+) */}
            <div className="hidden md:grid grid-cols-6 relative">
              {stages.map((stage, idx) => {
                const isFinalDeliveredCompleted =
                  stage.id === 'delivered' && stage.state === 'completed';

                return (
                  <div
                    key={stage.id}
                    className="relative flex flex-col items-center text-center px-1"
                  >
                    {/* Connecting line to next stage */}
                    {idx < stages.length - 1 && (
                      <div
                        className={`absolute top-5 left-1/2 w-full h-[2px] -z-0 ${
                          stages[idx + 1].state === 'completed'
                            ? 'bg-[#d4af37]'
                            : stages[idx + 1].state === 'current'
                            ? 'bg-gradient-to-r from-[#d4af37] to-[#d4af37]/30'
                            : 'bg-white/10'
                        }`}
                      />
                    )}

                    {/* Step Node */}
                    <div
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isFinalDeliveredCompleted
                          ? 'bg-[#0a0e14] border-2 border-emerald-400 text-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.3)]'
                          : stage.state === 'completed'
                          ? 'bg-[#0a0e14] border-2 border-[#d4af37] text-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                          : stage.state === 'current'
                          ? 'bg-[#0a0e14] border-2 border-[#d4af37] text-[#d4af37] ring-4 ring-[#d4af37]/20 shadow-[0_0_18px_rgba(212,175,55,0.4)]'
                          : stage.state === 'alert'
                          ? 'bg-[#0a0e14] border-2 border-rose-500 text-rose-400'
                          : 'bg-[#0a0e14] border border-white/15 text-white/30'
                      }`}
                    >
                      <stage.icon className="w-4 h-4" />
                      {stage.state === 'current' && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-[#d4af37]" />
                        </span>
                      )}
                    </div>

                    {/* Step Labels */}
                    <div className="mt-3.5 space-y-1">
                      <p
                        className={`text-xs font-serif tracking-wide ${
                          isFinalDeliveredCompleted
                            ? 'text-emerald-300 font-semibold'
                            : stage.state === 'current'
                            ? 'text-[#d4af37] font-semibold'
                            : stage.state === 'completed'
                            ? 'text-white font-medium'
                            : stage.state === 'alert'
                            ? 'text-rose-300 font-medium'
                            : 'text-white/40'
                        }`}
                      >
                        {stage.name}
                      </p>
                      <p
                        className={`text-[10px] leading-tight ${
                          stage.state === 'current'
                            ? 'text-white/70'
                            : stage.state === 'completed'
                            ? 'text-white/50'
                            : 'text-white/30'
                        }`}
                      >
                        {stage.statusText}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Vertical Timeline (< md) */}
            <div className="md:hidden space-y-5">
              {stages.map((stage, idx) => {
                const isFinalDeliveredCompleted =
                  stage.id === 'delivered' && stage.state === 'completed';

                return (
                  <div key={stage.id} className="relative flex items-start gap-4">
                    {/* Node and vertical connecting bar */}
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                          isFinalDeliveredCompleted
                            ? 'bg-[#0a0e14] border-2 border-emerald-400 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                            : stage.state === 'completed'
                            ? 'bg-[#0a0e14] border-2 border-[#d4af37] text-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                            : stage.state === 'current'
                            ? 'bg-[#0a0e14] border-2 border-[#d4af37] text-[#d4af37] ring-4 ring-[#d4af37]/20 shadow-[0_0_18px_rgba(212,175,55,0.4)]'
                            : stage.state === 'alert'
                            ? 'bg-[#0a0e14] border-2 border-rose-500 text-rose-400'
                            : 'bg-[#0a0e14] border border-white/15 text-white/30'
                        }`}
                      >
                        <stage.icon className="w-4 h-4" />
                        {stage.state === 'current' && (
                          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#d4af37]" />
                          </span>
                        )}
                      </div>
                      {idx < stages.length - 1 && (
                        <div
                          className={`w-[2px] h-9 my-1 ${
                            stages[idx + 1].state === 'completed'
                              ? 'bg-[#d4af37]'
                              : stages[idx + 1].state === 'current'
                              ? 'bg-gradient-to-b from-[#d4af37] to-[#d4af37]/30'
                              : 'bg-white/10'
                          }`}
                        />
                      )}
                    </div>

                    {/* Step Details */}
                    <div className="pt-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={`text-sm font-serif ${
                            isFinalDeliveredCompleted
                              ? 'text-emerald-300 font-semibold'
                              : stage.state === 'current'
                              ? 'text-[#d4af37] font-semibold'
                              : stage.state === 'completed'
                              ? 'text-white font-medium'
                              : stage.state === 'alert'
                              ? 'text-rose-300 font-medium'
                              : 'text-white/40'
                          }`}
                        >
                          {stage.name}
                        </p>
                        {stage.state === 'current' && (
                          <span className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-full bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30">
                            Current Stage
                          </span>
                        )}
                        {stage.state === 'completed' && (
                          <span
                            className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-full ${
                              isFinalDeliveredCompleted
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30'
                            }`}
                          >
                            Completed
                          </span>
                        )}
                        {stage.state === 'alert' && (
                          <span className="px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Action Required
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 mt-0.5">
                        {stage.statusText}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Consignment & Shipment Details Card (rendered when shipping data exists) */}
            {(order.shipping_provider || order.shipping_tracking_number || order.shipping_dispatched_at || order.shipping_estimated_delivery) && (
              <div className="mt-8 p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-[#d4af37]/30 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20 shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37] font-semibold block">
                        Courier Consignment
                      </span>
                      <h3 className="text-sm sm:text-base font-serif text-white font-medium">
                        Shipment Tracking
                      </h3>
                    </div>
                  </div>

                  {order.shipping_tracking_url && (
                    <a
                      href={order.shipping_tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#e5c158] text-black text-xs font-semibold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(212,175,55,0.25)] shrink-0 cursor-pointer"
                    >
                      <span>Track Shipment</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
                  {order.shipping_provider && (
                    <div>
                      <span className="text-white/40 block text-[10px] uppercase tracking-wider mb-0.5">
                        Shipping Provider
                      </span>
                      <span className="font-serif text-white font-semibold text-sm">
                        {order.shipping_provider}
                      </span>
                    </div>
                  )}

                  {order.shipping_tracking_number && (
                    <div>
                      <span className="text-white/40 block text-[10px] uppercase tracking-wider mb-0.5">
                        Tracking Number
                      </span>
                      <span className="font-mono text-[#d4af37] font-bold text-xs select-all">
                        {order.shipping_tracking_number}
                      </span>
                    </div>
                  )}

                  {order.shipping_dispatched_at && (
                    <div>
                      <span className="text-white/40 block text-[10px] uppercase tracking-wider mb-0.5">
                        Dispatched
                      </span>
                      <span className="text-white font-medium">
                        {new Date(order.shipping_dispatched_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}

                  {order.shipping_estimated_delivery && (
                    <div>
                      <span className="text-white/40 block text-[10px] uppercase tracking-wider mb-0.5">
                        Estimated Delivery
                      </span>
                      <span className="text-emerald-300 font-medium">
                        {new Date(order.shipping_estimated_delivery).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {order.shipping_notes && (
                  <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-white/60">
                    <span className="text-white/40 uppercase text-[9px] tracking-wider block mb-0.5">Logistics Note:</span>
                    <span>{order.shipping_notes}</span>
                  </div>
                )}
              </div>
            )}

            {/* Contextual Status Banner */}
            <div className="mt-6 pt-6 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.01] p-4 rounded-xl">
              <div className="flex items-start sm:items-center space-x-3">
                <div className="p-2 rounded-lg bg-[#d4af37]/10 text-[#d4af37] shrink-0">
                  <CurrentStatusIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37] font-semibold block">
                    Current Fulfillment Status
                  </span>
                  <p className="text-xs sm:text-sm text-white/90 font-serif mt-0.5">
                    {getContextualMessage(normStatus)}
                  </p>
                </div>
              </div>
              {formattedUpdatedAt && (
                <div className="text-[11px] text-white/40 font-mono flex items-center gap-1.5 sm:self-center shrink-0">
                  <Clock className="w-3 h-3 text-[#d4af37]/70" />
                  <span>Last updated: {formattedUpdatedAt}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main: Items Snapshot & Pricing */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items Card */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
              <h2 className="text-xs sm:text-sm uppercase tracking-wider text-white/60 mb-4 pb-3 border-b border-white/5 flex items-center">
                <Package className="w-4 h-4 mr-2 text-[#d4af37]" /> Purchased Pieces (Historical Snapshot)
              </h2>

              <div className="divide-y divide-white/5">
                {orderItems.map((item) => {
                  const itemSubtotal = Number(
                    item.subtotal ?? item.line_total ?? item.total_price ?? (Number(item.unit_price) * item.quantity)
                  );
                  return (
                    <div key={item.id} className="py-3 sm:py-4 flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 sm:gap-2">
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
                          ₹{itemSubtotal.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  );
                })}
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
                {discountVal > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount</span>
                    <span>-₹{discountVal.toLocaleString('en-IN')}</span>
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
                <p className="font-semibold text-white">{shippingName}</p>
                {addressLine1 && <p>{addressLine1}</p>}
                {(city || state || postalCode) && (
                  <p>
                    {[city, state].filter(Boolean).join(', ')}
                    {postalCode ? ` — ${postalCode}` : ''}
                  </p>
                )}
                <p className="text-white/50">{country}</p>
                {phone && <p className="text-white/60 pt-2">Contact: {phone}</p>}
              </div>
            </div>

            {/* Payment Record */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-xs uppercase tracking-wider text-white/60 mb-4 pb-3 border-b border-white/5 flex items-center">
                <CreditCard className="w-4 h-4 mr-2 text-[#d4af37]" /> Payment Record
              </h2>

              {/* Truthful Payment Confirmation Summary */}
              <div
                className={`p-3 rounded-xl border mb-4 text-xs ${
                  isPaid
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : paymentStatus === 'failed'
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                    : paymentStatus === 'refunded'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                    : 'bg-white/[0.03] border-white/10 text-white/70'
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  {isPaid ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Payment Confirmed</span>
                    </>
                  ) : paymentStatus === 'failed' ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Payment Failed</span>
                    </>
                  ) : paymentStatus === 'refunded' ? (
                    <>
                      <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Payment Refunded</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Payment Pending</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] mt-1 text-white/60">
                  {isPaid
                    ? 'Razorpay payment successfully verified.'
                    : paymentStatus === 'failed'
                    ? 'Payment could not be verified.'
                    : paymentStatus === 'refunded'
                    ? 'Payment transaction has been refunded.'
                    : 'Awaiting payment verification.'}
                </p>
              </div>

              <div className="text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-white/50">Payment Method</span>
                  <span className="text-white font-medium uppercase">
                    {order.payment_method || 'RAZORPAY'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50">Payment Status</span>
                  <span
                    className={`font-semibold uppercase text-[10px] px-2 py-0.5 rounded ${
                      isPaid
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : paymentStatus === 'failed'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : paymentStatus === 'refunded'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-white/10 text-white/80 border border-white/10'
                    }`}
                  >
                    {paymentStatus}
                  </span>
                </div>

                {order.razorpay_payment_id && (
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-white/50 block text-[11px] mb-1">Payment Reference</span>
                    <span className="font-mono text-[11px] text-[#d4af37] bg-white/[0.03] px-2 py-1 rounded block break-all select-all">
                      {order.razorpay_payment_id}
                    </span>
                  </div>
                )}

                {order.razorpay_order_id && (
                  <div className="pt-1">
                    <span className="text-white/50 block text-[11px] mb-1">Gateway Order ID</span>
                    <span className="font-mono text-[11px] text-white/70 bg-white/[0.03] px-2 py-1 rounded block break-all select-all">
                      {order.razorpay_order_id}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        <CancelOrderModal
          isOpen={showCancelModal}
          orderNumber={order.order_number}
          onClose={() => {
            if (!isCancelling) setShowCancelModal(false);
          }}
          onConfirm={handleConfirmCancellation}
          isCancelling={isCancelling}
          error={cancelError}
        />
      </div>
    </div>
  );
}
