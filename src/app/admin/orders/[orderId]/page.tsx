'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAdminOrderById, updateOrderStatus, VALID_STATUS_TRANSITIONS } from '@/lib/orders';
import { getAdminProfile, AdminProfile } from '@/lib/auth';
import { AdminOrder, OrderStatus } from '@/types';
import {
  ClipboardList,
  ArrowLeft,
  User,
  MapPin,
  CreditCard,
  Package,
  Clock,
  Check,
  AlertTriangle,
  Loader2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  IndianRupee,
} from 'lucide-react';

export default function AdminOrderDetailsPage({
  params,
}: {
  params: { orderId: string };
}) {
  const router = useRouter();
  const orderId = params.orderId;

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status update state
  const [pendingNewStatus, setPendingNewStatus] = useState<OrderStatus | null>(null);
  const [statusUpdateReason, setStatusUpdateReason] = useState<string>('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);
  const [statusSuccessMessage, setStatusSuccessMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderData, profile] = await Promise.all([
        getAdminOrderById(orderId),
        getAdminProfile(),
      ]);

      if (!orderData) {
        setError('Order could not be found in atelier database.');
      } else {
        setOrder(orderData);
      }
      setAdminProfile(profile);
    } catch (err: any) {
      console.error('Error loading order details:', err);
      setError(err?.message || 'Failed to query order details.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectNewStatus = (status: OrderStatus) => {
    setPendingNewStatus(status);
    setStatusUpdateError(null);
    setStatusSuccessMessage(null);
  };

  const handleExecuteStatusUpdate = async () => {
    if (!order || !pendingNewStatus || !adminProfile) return;

    setStatusUpdating(true);
    setStatusUpdateError(null);

    try {
      const res = await updateOrderStatus({
        orderId: order.id,
        newStatus: pendingNewStatus,
        reason: statusUpdateReason || `Status transition to ${pendingNewStatus} via admin order console`,
        adminProfile,
      });

      if (!res.success) {
        setStatusUpdateError(res.error || 'Failed to update order status.');
        setStatusUpdating(false);
        return;
      }

      setStatusSuccessMessage(`Order #${order.orderNumber} successfully marked as ${pendingNewStatus}.`);
      setPendingNewStatus(null);
      setStatusUpdateReason('');
      await loadData();
    } catch (err: any) {
      setStatusUpdateError(err?.message || 'Error occurred while updating status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const getOrderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'shipped':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'processing':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'cancelled':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'refunded':
        return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
      case 'pending':
      default:
        return 'bg-soft-gold/10 text-soft-gold border-soft-gold/20';
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'failed':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'refunded':
        return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
      case 'pending':
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-8">
        <div className="h-6 w-48 bg-white/5 rounded animate-pulse" />
        <div className="h-32 rounded-3xl bg-[#14171A] border border-white/10 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 rounded-3xl bg-[#14171A] border border-white/10 animate-pulse" />
          <div className="h-96 rounded-3xl bg-[#14171A] border border-white/10 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-white">Order Not Found</h2>
        <p className="font-sans text-xs text-ivory/60">{error || 'This order does not exist or has been removed.'}</p>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-soft-gold text-charcoal font-sans text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Orders</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* 1. Breadcrumbs & Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-sans text-ivory/60">
          <Link href="/admin/orders" className="hover:text-soft-gold transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Orders</span>
          </Link>
          <span>/</span>
          <span className="text-white font-mono">{order.orderNumber}</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-ivory text-xs font-semibold border border-white/10 inline-flex items-center gap-1.5 transition-colors"
          >
            <ClipboardList className="w-3.5 h-3.5 text-ivory/60" />
            <span>All Orders</span>
          </Link>
        </div>
      </div>

      {/* 2. Order Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#14171A] border border-white/10 shadow-luxury space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Order #{order.orderNumber}
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-tech uppercase font-bold border ${getOrderStatusBadge(order.orderStatus)}`}>
                {order.orderStatus}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-tech uppercase font-bold border ${getPaymentStatusBadge(order.paymentStatus)}`}>
                Payment: {order.paymentStatus}
              </span>
            </div>
            <p className="font-tech text-xs text-ivory/50 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-soft-gold" />
              <span>
                Placed on{' '}
                {new Date(order.createdAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </p>
          </div>

          <div className="text-right">
            <p className="font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-bold">Total Amount</p>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-soft-gold mt-1">
              ₹{order.total.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Status Alerts */}
        {statusSuccessMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{statusSuccessMessage}</span>
          </div>
        )}

        {statusUpdateError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{statusUpdateError}</span>
          </div>
        )}

        {/* Fulfillment Progression Stepper */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-tech text-[10px] uppercase tracking-wider text-ivory/60 font-bold">
              Fulfillment Progression
            </span>
            <span className="font-tech text-[10px] text-ivory/40">Current: {order.orderStatus}</span>
          </div>

          {order.orderStatus === 'cancelled' ? (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>This order was marked as <strong>Cancelled</strong>. Terminal status.</span>
            </div>
          ) : order.orderStatus === 'refunded' ? (
            <div className="p-3.5 rounded-xl bg-neutral-500/10 border border-neutral-500/20 text-neutral-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-neutral-400" />
              <span>This order was marked as <strong>Refunded</strong>. Terminal status.</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs pt-2">
              {['pending', 'processing', 'shipped', 'delivered'].map((step, idx, arr) => {
                const orderSteps = ['pending', 'processing', 'shipped', 'delivered'];
                const currentIdx = orderSteps.indexOf(order.orderStatus);
                const isComplete = currentIdx >= idx;
                const isCurrent = currentIdx === idx;

                return (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-tech text-xs font-bold transition-all ${
                          isComplete ? 'bg-soft-gold text-charcoal' : 'bg-white/10 text-ivory/40'
                        } ${isCurrent ? 'ring-2 ring-soft-gold ring-offset-2 ring-offset-[#14171A]' : ''}`}
                      >
                        {isComplete ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className={`font-tech text-[11px] uppercase tracking-wider ${isCurrent ? 'text-soft-gold font-bold' : isComplete ? 'text-white' : 'text-ivory/40'}`}>
                        {step}
                      </span>
                    </div>
                    {idx < arr.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-3 ${currentIdx > idx ? 'bg-soft-gold' : 'bg-white/10'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* State Machine Transition Actions */}
          <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
            <span className="font-sans text-xs text-ivory/70">Change Order Status:</span>
            {VALID_STATUS_TRANSITIONS[order.orderStatus]?.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {VALID_STATUS_TRANSITIONS[order.orderStatus].map((nextState) => (
                  <button
                    key={nextState}
                    onClick={() => handleSelectNewStatus(nextState)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-sans font-bold capitalize transition-all cursor-pointer ${
                      nextState === 'cancelled' || nextState === 'refunded'
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-soft-gold/20 hover:bg-soft-gold/30 text-soft-gold border border-soft-gold/40'
                    }`}
                  >
                    Mark as {nextState}
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-xs font-tech text-ivory/40 italic">
                Order is in terminal state ({order.orderStatus}).
              </span>
            )}
          </div>

          {/* Confirmation Box */}
          {pendingNewStatus && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 mt-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-sans text-xs font-bold text-amber-300">
                    Confirm Transition to {pendingNewStatus.toUpperCase()}
                  </h4>
                  <p className="font-sans text-[11px] text-amber-200/80 mt-0.5">
                    Transitioning order from <strong>{order.orderStatus}</strong> to{' '}
                    <strong>{pendingNewStatus}</strong>.
                  </p>
                </div>
              </div>

              <input
                type="text"
                placeholder="Audit reason or note for this transition..."
                value={statusUpdateReason}
                onChange={(e) => setStatusUpdateReason(e.target.value)}
                className="w-full px-3.5 py-2 bg-black/40 border border-white/15 rounded-lg text-ivory text-xs placeholder-ivory/30 focus:outline-none focus:border-amber-400"
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setPendingNewStatus(null)}
                  disabled={statusUpdating}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-ivory text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteStatusUpdate}
                  disabled={statusUpdating}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-charcoal text-xs font-sans font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {statusUpdating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Confirm Transition</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Main Split Grid: Items & Customer/Delivery Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-[#14171A] border border-white/10 shadow-luxury space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-soft-gold" />
                <span>Handcrafted Creations ({order.items.length})</span>
              </h2>
            </div>

            <div className="divide-y divide-white/5">
              {order.items.map((item, idx) => (
                <div key={item.id || idx} className="py-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-ivory/30" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-serif text-sm font-semibold text-white truncate">
                      {item.productName}
                    </p>
                    <p className="font-tech text-xs text-ivory/50">
                      Quantity: <span className="text-white font-semibold">{item.quantity}</span> × ₹{item.unitPrice.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="text-right whitespace-nowrap">
                    <p className="font-serif text-sm font-bold text-white">
                      ₹{item.subtotal.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary Breakdown */}
            <div className="pt-4 border-t border-white/10 space-y-2 text-xs">
              <div className="flex justify-between text-ivory/60">
                <span>Subtotal</span>
                <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount</span>
                  <span>-₹{order.discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-ivory/60">
                <span>Shipping Fee</span>
                <span>{order.shipping > 0 ? `₹${order.shipping.toLocaleString('en-IN')}` : 'Complimentary'}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-white/5">
                <span>Grand Total</span>
                <span className="text-soft-gold">₹{order.total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer & Delivery Details */}
        <div className="space-y-6">
          {/* Customer Details Card */}
          <div className="p-6 rounded-3xl bg-[#14171A] border border-white/10 shadow-luxury space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-soft-gold" />
                <span>Customer</span>
              </h3>
              {order.customerEmail && (
                <Link
                  href={`/admin/customers/${encodeURIComponent(order.customerEmail)}`}
                  className="font-tech text-[11px] text-soft-gold hover:underline inline-flex items-center gap-1"
                >
                  <span>View Customer</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-ivory/50 font-tech text-[10px] uppercase">Name</p>
                <p className="font-serif text-sm font-semibold text-white mt-0.5">{order.customerName}</p>
              </div>

              <div>
                <p className="text-ivory/50 font-tech text-[10px] uppercase">Email</p>
                <p className="font-mono text-xs text-ivory/80 mt-0.5 break-all">{order.customerEmail || 'Not provided'}</p>
              </div>

              <div>
                <p className="text-ivory/50 font-tech text-[10px] uppercase">Phone</p>
                <p className="font-mono text-xs text-ivory/80 mt-0.5">{order.customerPhone || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Shipping Address Card */}
          <div className="p-6 rounded-3xl bg-[#14171A] border border-white/10 shadow-luxury space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-soft-gold" />
                <span>Delivery Address</span>
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-semibold text-white">{order.shippingName || order.customerName}</p>
              <p className="text-ivory/70 leading-relaxed">
                {order.shippingAddress || order.shippingAddressLine1 || 'No address line provided'}
              </p>
              <p className="text-ivory/60 font-tech text-[11px]">
                {[order.shippingCity, order.shippingState, order.shippingPostalCode, order.shippingCountry]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              {order.shippingPhone && (
                <p className="text-ivory/50 font-tech text-[11px] pt-1">
                  Delivery Contact: {order.shippingPhone}
                </p>
              )}
            </div>
          </div>

          {/* Payment & Security Card */}
          <div className="p-6 rounded-3xl bg-[#14171A] border border-white/10 shadow-luxury space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-soft-gold" />
                <span>Payment Details</span>
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ivory/50 font-tech text-[10px] uppercase">Method</span>
                <span className="text-white font-medium">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ivory/50 font-tech text-[10px] uppercase">Payment Status</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-tech uppercase font-bold border ${getPaymentStatusBadge(order.paymentStatus)}`}>
                  {order.paymentStatus}
                </span>
              </div>
              {order.razorpayOrderId && (
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <p className="text-ivory/40 font-tech text-[10px] uppercase">Razorpay Order ID</p>
                  <p className="font-mono text-[11px] text-ivory/70 truncate">{order.razorpayOrderId}</p>
                </div>
              )}
              {order.razorpayPaymentId && (
                <div className="space-y-1">
                  <p className="text-ivory/40 font-tech text-[10px] uppercase">Razorpay Payment ID</p>
                  <p className="font-mono text-[11px] text-ivory/70 truncate">{order.razorpayPaymentId}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
