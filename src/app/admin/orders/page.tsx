'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  getAdminOrders,
  updateOrderStatus,
  VALID_STATUS_TRANSITIONS,
} from '@/lib/orders';
import { getAdminProfile, AdminProfile } from '@/lib/auth';
import { AdminOrder, OrderStatus, PaymentStatus } from '@/types';
import {
  ClipboardList,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  Eye,
  Calendar,
  Clock,
  User,
  MapPin,
  CreditCard,
  Package,
  ArrowRight,
  ShieldCheck,
  Loader2,
  IndianRupee,
  FileText,
  Truck,
  CheckCircle,
  XCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Check,
} from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');

  // Order Details Modal State
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Status Change State
  const [pendingNewStatus, setPendingNewStatus] = useState<OrderStatus | null>(null);
  const [statusUpdateReason, setStatusUpdateReason] = useState<string>('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);

  // Load Real Orders from Supabase
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [ordersData, profile] = await Promise.all([
        getAdminOrders(),
        getAdminProfile(),
      ]);

      setOrders(ordersData);
      setAdminProfile(profile);

      // If details modal is open for an order, refresh it
      if (selectedOrder) {
        const fresh = ordersData.find((o) => o.id === selectedOrder.id);
        if (fresh) setSelectedOrder(fresh);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
      setNotification({ type: 'error', message: 'Failed to query orders database.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-dismiss notification after 5s
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Open Order Details
  const handleOpenDetails = (order: AdminOrder) => {
    setSelectedOrder(order);
    setPendingNewStatus(null);
    setStatusUpdateReason('');
    setStatusUpdateError(null);
    setShowStatusConfirm(false);
    setIsDetailsOpen(true);
  };

  // Status update initiation
  const handleSelectNewStatus = (status: OrderStatus) => {
    setPendingNewStatus(status);
    setStatusUpdateError(null);
    // If destructive/terminal transition, require confirmation modal
    if (status === 'cancelled' || status === 'refunded') {
      setShowStatusConfirm(true);
    } else {
      setShowStatusConfirm(false);
    }
  };

  // Submit Order Status Change
  const handleExecuteStatusUpdate = async () => {
    if (!selectedOrder || !pendingNewStatus || !adminProfile) return;

    setStatusUpdating(true);
    setStatusUpdateError(null);

    try {
      const res = await updateOrderStatus({
        orderId: selectedOrder.id,
        newStatus: pendingNewStatus,
        reason: statusUpdateReason || `Order status updated to ${pendingNewStatus}`,
        adminProfile,
      });

      if (!res.success) {
        setStatusUpdateError(res.error || 'Failed to update order status.');
        setStatusUpdating(false);
        return;
      }

      setNotification({
        type: 'success',
        message: `Order #${selectedOrder.orderNumber} status updated to "${pendingNewStatus}".`,
      });

      setShowStatusConfirm(false);
      setPendingNewStatus(null);
      await loadData(true);
    } catch (err: any) {
      setStatusUpdateError(err?.message || 'Error occurred while updating status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Filter & Search Logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Search (number, name, email)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNumber = order.orderNumber.toLowerCase().includes(q);
        const matchName = order.customerName.toLowerCase().includes(q);
        const matchEmail = order.customerEmail.toLowerCase().includes(q);
        if (!matchNumber && !matchName && !matchEmail) return false;
      }

      // 2. Order Status
      if (selectedOrderStatus !== 'all' && order.orderStatus !== selectedOrderStatus) {
        return false;
      }

      // 3. Payment Status
      if (selectedPaymentStatus !== 'all' && order.paymentStatus !== selectedPaymentStatus) {
        return false;
      }

      // 4. Payment Method
      if (selectedPaymentMethod !== 'all' && order.paymentMethod.toLowerCase() !== selectedPaymentMethod.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [orders, searchQuery, selectedOrderStatus, selectedPaymentStatus, selectedPaymentMethod]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedOrderStatus('all');
    setSelectedPaymentStatus('all');
    setSelectedPaymentMethod('all');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedOrderStatus !== 'all' ||
    selectedPaymentStatus !== 'all' ||
    selectedPaymentMethod !== 'all';

  // Summary Metrics
  const summary = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => o.orderStatus !== 'cancelled' && o.orderStatus !== 'refunded')
      .reduce((acc, o) => acc + o.total, 0);
    const pendingFulfillment = orders.filter(
      (o) => o.orderStatus === 'pending' || o.orderStatus === 'processing'
    ).length;
    const deliveredCount = orders.filter((o) => o.orderStatus === 'delivered').length;

    return { totalOrders, totalRevenue, pendingFulfillment, deliveredCount };
  }, [orders]);

  // Status Badge Styling Helper
  const getOrderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'shipped':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'processing':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'pending':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'cancelled':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'refunded':
        return 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30';
      default:
        return 'bg-white/10 text-ivory/60 border-white/10';
    }
  };

  // Payment Status Badge Styling Helper
  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'pending':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'failed':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'refunded':
      case 'partially_refunded':
        return 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30';
      default:
        return 'bg-white/10 text-ivory/60 border-white/10';
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header & Summary Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-wide">
              Order Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-tech font-bold uppercase tracking-wider bg-soft-gold/20 text-soft-gold border border-soft-gold/30">
              {orders.length} Orders
            </span>
          </div>
          <p className="font-sans text-xs sm:text-sm text-ivory/60 mt-1">
            Fulfillment dispatch tracking, customer shipping records, and historical order snapshot audit.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ivory text-xs font-sans font-medium flex items-center gap-2 border border-white/10 transition-colors cursor-pointer"
            title="Refresh orders from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-soft-gold' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Order Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <p className="font-tech text-[10px] uppercase tracking-wider text-ivory/50">Total Orders</p>
          <p className="font-tech text-2xl font-bold text-white">{summary.totalOrders}</p>
          <p className="font-sans text-[11px] text-ivory/40">Lifetime orders placed</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <p className="font-tech text-[10px] uppercase tracking-wider text-ivory/50">Total Revenue</p>
          <p className="font-tech text-2xl font-bold text-soft-gold">₹{summary.totalRevenue.toLocaleString('en-IN')}</p>
          <p className="font-sans text-[11px] text-ivory/40">Net completed sales</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <p className="font-tech text-[10px] uppercase tracking-wider text-amber-400">Pending Fulfillment</p>
          <p className="font-tech text-2xl font-bold text-amber-400">{summary.pendingFulfillment}</p>
          <p className="font-sans text-[11px] text-ivory/40">Requires packing & dispatch</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <p className="font-tech text-[10px] uppercase tracking-wider text-emerald-400">Delivered</p>
          <p className="font-tech text-2xl font-bold text-emerald-400">{summary.deliveredCount}</p>
          <p className="font-sans text-[11px] text-ivory/40">Successfully completed orders</p>
        </div>
      </div>

      {/* 3. Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-medium border transition-all duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-ivory/40 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Filter & Search Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-ivory/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order #, customer name, or email..."
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder-ivory/30 focus:outline-none focus:border-soft-gold text-xs transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ivory/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Order Status Filter */}
          <div>
            <select
              value={selectedOrderStatus}
              onChange={(e) => setSelectedOrderStatus(e.target.value)}
              className="w-full px-3 py-2 bg-[#14171A] border border-white/10 rounded-xl text-ivory text-xs focus:outline-none focus:border-soft-gold"
            >
              <option value="all">All Order Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="w-full px-3 py-2 bg-[#14171A] border border-white/10 rounded-xl text-ivory text-xs focus:outline-none focus:border-soft-gold"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="partially_refunded">Partially Refunded</option>
            </select>
          </div>
        </div>

        {/* Filter Count & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
          <span className="font-tech text-xs text-ivory/50">
            Showing <span className="text-soft-gold font-bold">{filteredOrders.length}</span> of{' '}
            {orders.length} orders
          </span>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="font-tech text-xs text-soft-gold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Orders Table / Empty State */}
      {loading ? (
        <div className="p-16 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3 text-ivory/60">
          <Loader2 className="w-6 h-6 animate-spin text-soft-gold" />
          <p className="font-sans text-xs">Querying orders records from Supabase database...</p>
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-ivory/50 font-tech uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-6">Order</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Fulfillment Status</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                  {/* Order Number */}
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span className="font-tech font-bold text-white group-hover:text-soft-gold transition-colors">
                      {order.orderNumber}
                    </span>
                  </td>

                  {/* Customer */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="space-y-0.5">
                      <p className="font-sans font-semibold text-white truncate max-w-[160px]">
                        {order.customerName}
                      </p>
                      <p className="font-tech text-[10px] text-ivory/40 truncate max-w-[160px]">
                        {order.customerEmail || '—'}
                      </p>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="font-tech text-xs text-ivory/70">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </td>

                  {/* Total Amount */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="font-tech font-bold text-sm text-white">
                      ₹{order.total.toLocaleString('en-IN')}
                    </span>
                  </td>

                  {/* Payment Status */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-tech uppercase font-bold border ${getPaymentStatusBadge(
                        order.paymentStatus
                      )}`}
                    >
                      {order.paymentStatus}
                    </span>
                  </td>

                  {/* Order Status */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-tech uppercase font-bold border ${getOrderStatusBadge(
                        order.orderStatus
                      )}`}
                    >
                      {order.orderStatus}
                    </span>
                  </td>

                  {/* Payment Method */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="font-tech text-[11px] text-ivory/60">
                      {order.paymentMethod}
                    </span>
                  </td>

                  {/* Action Button */}
                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleOpenDetails(order)}
                      className="px-3 py-1.5 rounded-lg bg-soft-gold/10 hover:bg-soft-gold/20 text-soft-gold text-xs font-sans font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Clean Professional Empty State */
        <div className="py-24 text-center space-y-4 bg-white/[0.02] rounded-3xl border border-dashed border-white/10 p-8">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-ivory/40">
            <ClipboardList className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="font-serif text-xl font-bold text-white">No orders yet</h3>
            <p className="font-sans text-xs text-ivory/50 leading-relaxed">
              When clients place handcrafted orders on the storefront, they will be registered in real-time in this console.
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-soft-gold text-charcoal font-sans text-xs font-bold shadow-luxury cursor-pointer"
            >
              Reset Search Filters
            </button>
          )}
        </div>
      )}

      {/* 6. Order Details Slide-Over / Modal */}
      {isDetailsOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !statusUpdating && setIsDetailsOpen(false)}
          />

          <div className="relative w-full max-w-2xl h-full bg-[#14171A] border-l border-white/15 p-6 sm:p-8 shadow-2xl z-10 flex flex-col justify-between overflow-y-auto space-y-6">
            <div className="space-y-6">
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                      Order #{selectedOrder.orderNumber}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-tech uppercase font-bold border ${getOrderStatusBadge(
                        selectedOrder.orderStatus
                      )}`}
                    >
                      {selectedOrder.orderStatus}
                    </span>
                  </div>
                  <p className="font-tech text-xs text-ivory/50 mt-1 flex items-center gap-2">
                    <Clock className="w-3 h-3 text-soft-gold" />
                    <span>
                      Placed on{' '}
                      {new Date(selectedOrder.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="p-2 rounded-xl text-ivory/40 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Update Alert / Error */}
              {statusUpdateError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{statusUpdateError}</span>
                </div>
              )}

              {/* Status Progression Timeline */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <span className="font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-bold">
                  Fulfillment Status Progression
                </span>

                {selectedOrder.orderStatus === 'cancelled' ? (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>This order was marked as <strong>Cancelled</strong>. Terminal status.</span>
                  </div>
                ) : selectedOrder.orderStatus === 'refunded' ? (
                  <div className="p-3 rounded-xl bg-neutral-500/10 border border-neutral-500/20 text-neutral-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-neutral-400" />
                    <span>This order was marked as <strong>Refunded</strong>. Terminal status.</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs pt-1">
                    {['pending', 'processing', 'shipped', 'delivered'].map((step, idx, arr) => {
                      const orderSteps = ['pending', 'processing', 'shipped', 'delivered'];
                      const currentIdx = orderSteps.indexOf(selectedOrder.orderStatus);
                      const isComplete = currentIdx >= idx;
                      const isCurrent = currentIdx === idx;

                      return (
                        <React.Fragment key={step}>
                          <div className="flex flex-col items-center gap-1.5">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-tech text-[10px] font-bold ${
                                isComplete
                                  ? 'bg-soft-gold text-charcoal'
                                  : 'bg-white/10 text-ivory/40'
                              } ${isCurrent ? 'ring-2 ring-soft-gold/50' : ''}`}
                            >
                              {isComplete ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                            </div>
                            <span
                              className={`font-tech text-[10px] uppercase ${
                                isCurrent ? 'text-soft-gold font-bold' : isComplete ? 'text-white' : 'text-ivory/40'
                              }`}
                            >
                              {step}
                            </span>
                          </div>
                          {idx < arr.length - 1 && (
                            <div
                              className={`flex-1 h-0.5 mx-2 ${
                                currentIdx > idx ? 'bg-soft-gold' : 'bg-white/10'
                              }`}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}

                {/* State Machine Transition Selector */}
                <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                  <span className="font-sans text-xs text-ivory/70">Update Status:</span>

                  {VALID_STATUS_TRANSITIONS[selectedOrder.orderStatus]?.length > 0 ? (
                    <div className="flex items-center gap-2">
                      {VALID_STATUS_TRANSITIONS[selectedOrder.orderStatus].map((nextState) => (
                        <button
                          key={nextState}
                          onClick={() => handleSelectNewStatus(nextState)}
                          className={`px-3 py-1 rounded-lg text-xs font-sans font-bold capitalize transition-all cursor-pointer ${
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
                    <span className="text-[11px] font-tech text-ivory/40 italic">
                      Order is in terminal state ({selectedOrder.orderStatus}).
                    </span>
                  )}
                </div>
              </div>

              {/* Status Change Confirmation Section */}
              {pendingNewStatus && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-sans text-xs font-bold text-amber-300">
                        Confirm Status Transition
                      </h4>
                      <p className="font-sans text-[11px] text-amber-200/80 mt-0.5">
                        Transitioning order from <strong>{selectedOrder.orderStatus}</strong> to{' '}
                        <strong>{pendingNewStatus}</strong>.
                      </p>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Audit reason / note for this status change..."
                    value={statusUpdateReason}
                    onChange={(e) => setStatusUpdateReason(e.target.value)}
                    className="w-full px-3 py-1.5 bg-black/40 border border-white/15 rounded-lg text-ivory text-xs placeholder-ivory/30 focus:outline-none focus:border-amber-400"
                  />

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setPendingNewStatus(null)}
                      disabled={statusUpdating}
                      className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-ivory text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExecuteStatusUpdate}
                      disabled={statusUpdating}
                      className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-charcoal text-xs font-sans font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
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

              {/* Customer & Shipping Split Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Info Card */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-ivory/60 font-tech text-[10px] uppercase tracking-wider font-bold">
                    <User className="w-3.5 h-3.5 text-soft-gold" />
                    <span>Customer Details</span>
                  </div>
                  <p className="font-serif text-sm font-semibold text-white">
                    {selectedOrder.customerName}
                  </p>
                  <p className="font-tech text-xs text-ivory/70">
                    {selectedOrder.customerEmail || 'No email provided'}
                  </p>
                  {selectedOrder.customerPhone && (
                    <p className="font-tech text-xs text-ivory/50">
                      Tel: {selectedOrder.customerPhone}
                    </p>
                  )}
                </div>

                {/* Shipping Info Card */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-ivory/60 font-tech text-[10px] uppercase tracking-wider font-bold">
                    <MapPin className="w-3.5 h-3.5 text-soft-gold" />
                    <span>Shipping Address</span>
                  </div>
                  <p className="font-sans text-xs text-white font-medium">
                    {selectedOrder.shippingName || selectedOrder.customerName}
                  </p>
                  <p className="font-sans text-xs text-ivory/70 leading-relaxed">
                    {selectedOrder.shippingAddress || 'No street address provided'}
                  </p>
                  <p className="font-tech text-xs text-ivory/50">
                    {[
                      selectedOrder.shippingCity,
                      selectedOrder.shippingState,
                      selectedOrder.shippingPostalCode,
                      selectedOrder.shippingCountry,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </div>

              {/* Order Items Snapshot Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-bold">
                    Historical Snapshot Items ({selectedOrder.items.length})
                  </span>
                  <span className="font-tech text-[10px] text-ivory/40 italic">
                    Historical prices preserved
                  </span>
                </div>

                {selectedOrder.items.length > 0 ? (
                  <div className="rounded-xl border border-white/10 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/[0.02] border-b border-white/10 text-ivory/50 font-tech text-[10px] uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Item</th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {selectedOrder.items.map((item) => (
                          <tr key={item.id}>
                            <td className="py-3 px-3">
                              <span className="font-serif font-semibold text-white">
                                {item.productName}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-tech text-ivory/80">
                              {item.quantity}
                            </td>
                            <td className="py-3 px-3 text-right font-tech text-ivory/70">
                              ₹{item.unitPrice.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3 text-right font-tech font-bold text-white">
                              ₹{item.lineTotal.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-ivory/40">
                    No individual snapshot line items recorded for this order.
                  </div>
                )}
              </div>

              {/* Financial Snapshot Breakdown */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs font-sans">
                <div className="flex items-center justify-between text-ivory/60">
                  <span>Subtotal:</span>
                  <span className="font-tech">₹{selectedOrder.subtotal.toLocaleString('en-IN')}</span>
                </div>

                {selectedOrder.discount > 0 && (
                  <div className="flex items-center justify-between text-emerald-400">
                    <span>Discount:</span>
                    <span className="font-tech">-₹{selectedOrder.discount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-ivory/60">
                  <span>Shipping Fee:</span>
                  <span className="font-tech">
                    {selectedOrder.shipping > 0
                      ? `₹${selectedOrder.shipping.toLocaleString('en-IN')}`
                      : 'Free (Complimentary)'}
                  </span>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between font-bold text-sm text-white">
                  <span>Grand Total:</span>
                  <span className="font-tech text-soft-gold text-base">
                    ₹{selectedOrder.total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Payment References & Safety Placeholders */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-bold flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-soft-gold" />
                    <span>Payment Gateway References</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-tech uppercase font-bold border ${getPaymentStatusBadge(
                      selectedOrder.paymentStatus
                    )}`}
                  >
                    Payment: {selectedOrder.paymentStatus}
                  </span>
                </div>

                <div className="space-y-1 text-xs font-tech text-ivory/70">
                  <p>
                    Method: <span className="text-white">{selectedOrder.paymentMethod}</span>
                  </p>
                  {selectedOrder.razorpayOrderId && (
                    <p>
                      Razorpay Order ID:{' '}
                      <code className="text-soft-gold bg-black/40 px-1.5 py-0.5 rounded">
                        {selectedOrder.razorpayOrderId}
                      </code>
                    </p>
                  )}
                  {selectedOrder.razorpayPaymentId && (
                    <p>
                      Razorpay Payment ID:{' '}
                      <code className="text-soft-gold bg-black/40 px-1.5 py-0.5 rounded">
                        {selectedOrder.razorpayPaymentId}
                      </code>
                    </p>
                  )}
                  {!selectedOrder.razorpayOrderId && !selectedOrder.razorpayPaymentId && (
                    <p className="text-ivory/40 italic font-sans text-[11px]">
                      Live Razorpay payment credentials and webhooks will be connected in Step 13.
                    </p>
                  )}
                </div>

                {/* Safe Placeholders for Invoice & Refund */}
                <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                  <button
                    disabled
                    className="px-3 py-1.5 rounded-lg bg-white/5 text-ivory/40 text-xs font-sans font-medium flex items-center gap-1.5 cursor-not-allowed border border-white/5"
                    title="Invoice generation module will be activated in upcoming financial billing release"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Invoice Generation — Coming Soon</span>
                  </button>

                  <span className="text-[10px] font-tech text-ivory/40 italic">
                    Real Razorpay refunds will be implemented with verified server credentials.
                  </span>
                </div>
              </div>
            </div>

            {/* Slide-Over Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="font-tech text-[10px] text-ivory/40">
                Atelier Order Audit · Database verified
              </span>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-sans font-semibold cursor-pointer"
              >
                Close Order Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
