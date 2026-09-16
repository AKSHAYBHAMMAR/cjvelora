'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getAdminCustomerById,
  formatINR,
  formatCustomerDate,
} from '@/lib/customers';
import { AdminCustomerDetail, OrderStatus, PaymentStatus } from '@/types';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  IndianRupee,
  ShoppingBag,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Package,
  Award,
  CreditCard,
  Truck,
  RefreshCw,
} from 'lucide-react';

function getOrderStatusBadge(status: OrderStatus | string) {
  switch (String(status).toLowerCase()) {
    case 'delivered':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'shipped':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'processing':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'cancelled':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    case 'refunded':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    case 'pending':
    default:
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
  }
}

function getPaymentStatusBadge(status: PaymentStatus | string) {
  switch (String(status).toLowerCase()) {
    case 'paid':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'refunded':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    case 'failed':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    case 'pending':
    default:
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
  }
}

export default function AdminCustomerDetailPage({
  params,
}: {
  params: { customerId: string };
}) {
  const router = useRouter();
  const customerId = params.customerId;

  const [customer, setCustomer] = useState<AdminCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustomer = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await getAdminCustomerById(customerId);
        if (!res.success || !res.customer) {
          setError(res.error || 'Customer record not found.');
        } else {
          setCustomer(res.customer);
        }
      } catch (err: any) {
        console.error('Error fetching customer profile:', err);
        setError(err?.message || 'Failed to load customer profile.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [customerId]
  );

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0D0F] text-ivory/90 p-6 lg:p-10 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-soft-gold/20 border-t-soft-gold rounded-full animate-spin" />
        <p className="text-xs font-tech uppercase tracking-widest text-ivory/50">
          Loading Patron Portfolio...
        </p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-[#0A0D0F] text-ivory/90 p-6 lg:p-10 space-y-6">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-2 text-xs font-tech uppercase tracking-wider text-ivory/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Customers</span>
        </Link>

        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 max-w-xl mx-auto text-center space-y-4">
          <XCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="font-serif text-xl text-white">Patron Not Found</h2>
          <p className="text-xs text-rose-300/80">
            {error || 'Unable to retrieve records for the requested customer identity.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => loadCustomer()}
              className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-tech uppercase tracking-wider transition-all"
            >
              Retry Query
            </button>
            <Link
              href="/admin/customers"
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ivory/80 text-xs font-tech uppercase tracking-wider transition-all"
            >
              Return to Registry
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isHighValue = customer.totalSpent >= 5000;
  const isRepeat = customer.totalOrders > 1;

  return (
    <div className="min-h-screen bg-[#0A0D0F] text-ivory/90 p-4 sm:p-6 lg:p-10 space-y-8">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/customers"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-ivory/60 hover:text-white transition-all"
            title="Return to Patron Directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-tech uppercase text-soft-gold tracking-widest">
                Patron Dossier
              </span>
              <span className="text-white/20">•</span>
              <span className="text-xs font-mono text-ivory/40 truncate max-w-[200px] sm:max-w-xs">
                {customer.id}
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-white font-light mt-0.5 flex items-center gap-3">
              {customer.name}
              {isHighValue && (
                <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase tracking-wider bg-soft-gold/20 text-soft-gold border border-soft-gold/40">
                  VIP Patron
                </span>
              )}
              {isRepeat && (
                <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Repeat Client
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadCustomer(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-tech uppercase text-ivory/80 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-soft-gold' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Lifetime Revenue */}
        <div className="p-5 rounded-2xl bg-[#121518] border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-tech uppercase tracking-wider text-ivory/50">Lifetime Spend</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-serif text-2xl lg:text-3xl text-white font-medium">
              {formatINR(customer.totalSpent)}
            </h3>
            <p className="text-[11px] text-ivory/50 font-sans mt-1">Paid receipts across all orders</p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-5 rounded-2xl bg-[#121518] border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-tech uppercase tracking-wider text-ivory/50">Total Orders</span>
            <div className="w-8 h-8 rounded-xl bg-soft-gold/10 border border-soft-gold/20 flex items-center justify-center text-soft-gold">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h3 className="font-serif text-2xl lg:text-3xl text-white font-medium">
                {customer.totalOrders}
              </h3>
              <span className="text-xs font-tech text-emerald-400">
                ({customer.paidOrdersCount} completed)
              </span>
            </div>
            <p className="text-[11px] text-ivory/50 font-sans mt-1">
              {customer.pendingOrdersCount} pending • {customer.cancelledOrdersCount} cancelled
            </p>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="p-5 rounded-2xl bg-[#121518] border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-tech uppercase tracking-wider text-ivory/50">Avg Order Value</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-serif text-2xl lg:text-3xl text-white font-medium">
              {customer.avgOrderValue > 0 ? formatINR(customer.avgOrderValue) : '—'}
            </h3>
            <p className="text-[11px] text-ivory/50 font-sans mt-1">Per paid boutique transaction</p>
          </div>
        </div>

        {/* Patron Timeline */}
        <div className="p-5 rounded-2xl bg-[#121518] border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-tech uppercase tracking-wider text-ivory/50">Client Engagement</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="text-xs">
              <span className="text-ivory/50 font-tech">Since: </span>
              <span className="text-white font-mono">{formatCustomerDate(customer.customerSince)}</span>
            </div>
            <div className="text-xs">
              <span className="text-ivory/50 font-tech">Latest: </span>
              <span className="text-white font-mono">{formatCustomerDate(customer.lastOrderDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile & Addresses Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information Card */}
        <div className="p-6 rounded-2xl bg-[#121518] border border-white/10 space-y-5">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <h3 className="font-serif text-base text-white flex items-center gap-2">
              <User className="w-4 h-4 text-soft-gold" />
              <span>Contact Profile</span>
            </h3>
            <span className="text-[10px] font-tech uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Verified Identity</span>
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <p className="text-[10px] font-tech uppercase text-ivory/40">Full Legal Name</p>
              <p className="font-serif text-sm text-white font-medium mt-0.5">{customer.name}</p>
            </div>

            <div>
              <p className="text-[10px] font-tech uppercase text-ivory/40">Registered Email</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-ivory/40" />
                <a
                  href={`mailto:${customer.email}`}
                  className="font-mono text-white hover:text-soft-gold transition-colors break-all"
                >
                  {customer.email}
                </a>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-tech uppercase text-ivory/40">Primary Contact Phone</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-ivory/40" />
                {customer.phone ? (
                  <a
                    href={`tel:${customer.phone}`}
                    className="font-mono text-white hover:text-soft-gold transition-colors"
                  >
                    {customer.phone}
                  </a>
                ) : (
                  <span className="text-ivory/30">No contact number provided</span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 space-y-1">
              <p className="text-[10px] font-tech uppercase text-ivory/40">Atelier ID</p>
              <p className="font-mono text-[11px] text-ivory/60 break-all">{customer.id}</p>
            </div>
          </div>
        </div>

        {/* Recorded Shipping Addresses */}
        <div className="p-6 rounded-2xl bg-[#121518] border border-white/10 space-y-5 lg:col-span-2">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <h3 className="font-serif text-base text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-soft-gold" />
              <span>Recorded Delivery Addresses</span>
            </h3>
            <span className="text-[11px] font-tech text-ivory/50">
              {customer.shippingAddresses.length} {customer.shippingAddresses.length === 1 ? 'address' : 'addresses'}
            </span>
          </div>

          {customer.shippingAddresses.length === 0 ? (
            <div className="py-8 text-center text-xs text-ivory/40">
              No delivery addresses have been recorded for this patron yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {customer.shippingAddresses.map((addr, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-tech uppercase text-soft-gold tracking-wider">
                      Address #{idx + 1}
                    </span>
                    {idx === 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-tech uppercase bg-white/10 text-ivory/80">
                        Primary
                      </span>
                    )}
                  </div>
                  {addr.name && <p className="font-semibold text-white">{addr.name}</p>}
                  <p className="text-ivory/70 leading-relaxed font-sans">{addr.address}</p>
                  <p className="text-ivory/50 font-tech text-[11px]">
                    {[addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean).join(', ')}
                  </p>
                  {addr.phone && (
                    <p className="text-ivory/40 font-mono text-[10px] pt-1">Contact: {addr.phone}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historical Orders Section */}
      <div className="rounded-2xl bg-[#121518] border border-white/10 overflow-hidden shadow-2xl space-y-0">
        <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-lg text-white font-medium flex items-center gap-2">
              <Package className="w-4 h-4 text-soft-gold" />
              <span>Boutique Order History</span>
            </h2>
            <p className="text-xs text-ivory/50 mt-0.5">
              Complete transaction log for this patron, with direct links to atelier order fulfillment.
            </p>
          </div>
          <span className="text-xs font-tech text-ivory/60">
            {customer.orders.length} total orders recorded
          </span>
        </div>

        {customer.orders.length === 0 ? (
          <div className="py-16 text-center text-xs text-ivory/40 space-y-2">
            <ShoppingBag className="w-8 h-8 mx-auto text-ivory/20" />
            <p>This patron has not placed any orders yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-black/20 text-ivory/50 font-tech uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 font-normal">Order #</th>
                  <th className="py-3 px-4 font-normal">Date</th>
                  <th className="py-3 px-4 font-normal">Items</th>
                  <th className="py-3 px-4 font-normal">Status</th>
                  <th className="py-3 px-4 font-normal">Payment</th>
                  <th className="py-3 px-4 font-normal text-right">Total</th>
                  <th className="py-3 px-4 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {customer.orders.map((order) => {
                  const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);

                  return (
                    <tr
                      key={order.id}
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Order Number */}
                      <td className="py-3.5 px-4 font-mono font-medium text-white">
                        <Link
                          href={`/admin/orders/${encodeURIComponent(order.id)}`}
                          className="hover:text-soft-gold transition-colors underline-offset-2 hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-ivory/60 whitespace-nowrap">
                        {formatCustomerDate(order.createdAt)}
                      </td>

                      {/* Line Items Summary */}
                      <td className="py-3.5 px-4 text-ivory/80">
                        <div className="max-w-xs truncate">
                          {order.items.length > 0
                            ? order.items.map((it) => `${it.quantity}x ${it.productName}`).join(', ')
                            : `${itemCount} items`}
                        </div>
                      </td>

                      {/* Order Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-tech uppercase font-semibold border ${getOrderStatusBadge(
                            order.orderStatus
                          )}`}
                        >
                          {order.orderStatus}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-tech uppercase font-semibold border ${getPaymentStatusBadge(
                              order.paymentStatus
                            )}`}
                          >
                            {order.paymentStatus}
                          </span>
                          <span className="text-[10px] font-tech text-ivory/40 uppercase">
                            ({order.paymentMethod})
                          </span>
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-white whitespace-nowrap">
                        {formatINR(order.total)}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/orders/${encodeURIComponent(order.id)}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-soft-gold hover:text-rich-black border border-white/10 hover:border-soft-gold text-[11px] font-tech uppercase tracking-wider text-ivory/80 transition-all"
                        >
                          <span>Inspect Order</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
