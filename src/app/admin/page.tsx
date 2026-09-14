'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Sparkles,
  RefreshCw,
  IndianRupee,
  ClipboardList,
  Users,
  Boxes,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Package,
  TrendingUp,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';

interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  cancelledOrdersCount: number;
  totalCustomers: number;
  availableInventory: number;
  totalTrackedSkus: number;
}

interface LowStockProduct {
  productId: string;
  productName: string;
  productSlug?: string;
  productImage?: string;
  availableQuantity: number;
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  price?: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
}

interface DashboardSummary {
  revenue7d: number;
  orders7d: number;
  revenue30d: number;
  orders30d: number;
  avgOrderValue: number;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    totalOrders: 0,
    paidOrdersCount: 0,
    pendingOrdersCount: 0,
    cancelledOrdersCount: 0,
    totalCustomers: 0,
    availableInventory: 0,
    totalTrackedSkus: 0,
  });

  const [lowStockItems, setLowStockItems] = useState<LowStockProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    revenue7d: 0,
    orders7d: 0,
    revenue30d: 0,
    orders30d: 0,
    avgOrderValue: 0,
  });

  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const res = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Unable to load dashboard data.');
      }

      const { metrics, lowStockItems, recentOrders, summary } = json.data;
      setMetrics(metrics);
      setLowStockItems(lowStockItems || []);
      setRecentOrders(recentOrders || []);
      setSummary(summary || {
        revenue7d: 0,
        orders7d: 0,
        revenue30d: 0,
        orders30d: 0,
        avgOrderValue: 0,
      });
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Error fetching admin dashboard data:', err);
      setError(err.message || 'Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="space-y-8 max-w-[1400px] animate-pulse">
        {/* Header Skeleton */}
        <div className="p-8 rounded-3xl bg-[#14171A] border border-white/10 flex justify-between items-center">
          <div className="space-y-3">
            <div className="w-36 h-5 bg-white/10 rounded-full" />
            <div className="w-64 h-8 bg-white/10 rounded-lg" />
            <div className="w-80 h-4 bg-white/5 rounded" />
          </div>
          <div className="w-24 h-10 bg-white/10 rounded-xl" />
        </div>

        {/* KPI Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6 rounded-2xl bg-[#14171A] border border-white/10 space-y-4">
              <div className="flex justify-between items-center">
                <div className="w-24 h-3 bg-white/10 rounded" />
                <div className="w-8 h-8 rounded-xl bg-white/10" />
              </div>
              <div className="w-32 h-7 bg-white/15 rounded" />
              <div className="w-28 h-3 bg-white/5 rounded" />
            </div>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 p-6 rounded-2xl bg-[#14171A] border border-white/10 h-96" />
          <div className="lg:col-span-4 p-6 rounded-2xl bg-[#14171A] border border-white/10 h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1400px]">
      {/* 1. Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#171B1F] to-[#121517] border border-soft-gold/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-soft-gold/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 mb-2.5 px-3 py-1 rounded-full bg-soft-gold/10 border border-soft-gold/30">
              <Sparkles className="w-3.5 h-3.5 text-soft-gold" />
              <span className="font-tech text-[10px] uppercase tracking-[0.25em] text-soft-gold font-bold">
                VELORA Admin
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
              Dashboard
            </h1>
            <p className="font-sans text-xs sm:text-sm text-ivory/70 mt-1 max-w-xl leading-relaxed">
              Overview of your store performance and activity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {lastRefreshed && (
              <span className="text-[11px] font-tech text-ivory/40">
                Refreshed {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}

            <button
              type="button"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-medium uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-soft-gold' : ''}`} />
              <span>Refresh</span>
            </button>

            <Link
              href="/"
              target="_blank"
              className="px-4 py-2.5 rounded-xl bg-soft-gold text-charcoal hover:bg-[#e5c158] text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 shadow-luxury"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Storefront</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-xs sm:text-sm text-rose-300">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchDashboardData(false)}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold uppercase tracking-wider transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {/* KPI 1: Total Revenue */}
        <div className="p-6 rounded-2xl bg-[#14171A] border border-white/10 hover:border-soft-gold/40 transition-all duration-300 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="font-tech text-xs uppercase tracking-wider text-ivory/60 font-semibold">
              Total Revenue
            </span>
            <div className="p-2.5 rounded-xl bg-soft-gold/10 text-soft-gold">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-white mb-1">
            ₹{metrics.totalRevenue.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center justify-between text-xs text-ivory/50">
            <span>Verified Paid Revenue</span>
            <span className="text-emerald-400 font-tech font-semibold">
              {metrics.paidOrdersCount} Paid
            </span>
          </div>
        </div>

        {/* KPI 2: Total Orders */}
        <div className="p-6 rounded-2xl bg-[#14171A] border border-white/10 hover:border-soft-gold/40 transition-all duration-300 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="font-tech text-xs uppercase tracking-wider text-ivory/60 font-semibold">
              Total Orders
            </span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-white mb-1">
            {metrics.totalOrders}
          </div>
          <div className="flex items-center justify-between text-xs text-ivory/50">
            <span>{metrics.paidOrdersCount} Paid</span>
            <span className="text-amber-400 font-tech font-semibold">
              {metrics.pendingOrdersCount} Pending
            </span>
          </div>
        </div>

        {/* KPI 3: Total Customers */}
        <div className="p-6 rounded-2xl bg-[#14171A] border border-white/10 hover:border-soft-gold/40 transition-all duration-300 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="font-tech text-xs uppercase tracking-wider text-ivory/60 font-semibold">
              Total Customers
            </span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-white mb-1">
            {metrics.totalCustomers}
          </div>
          <div className="flex items-center justify-between text-xs text-ivory/50">
            <span>Client Accounts</span>
            <span className="text-purple-300 font-tech font-semibold">Verified</span>
          </div>
        </div>

        {/* KPI 4: Available Inventory */}
        <div className="p-6 rounded-2xl bg-[#14171A] border border-white/10 hover:border-soft-gold/40 transition-all duration-300 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="font-tech text-xs uppercase tracking-wider text-ivory/60 font-semibold">
              Available Inventory
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-white mb-1">
            {metrics.availableInventory}
          </div>
          <div className="flex items-center justify-between text-xs text-ivory/50">
            <span>Available Stock Units</span>
            <span className="text-ivory/60 font-tech">
              {metrics.totalTrackedSkus} SKUs
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Sections: Recent Orders (Left) & Low Stock + Summary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Recent Orders Table */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 rounded-2xl bg-[#14171A] border border-white/10 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-white tracking-wide flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-soft-gold" />
                  <span>Recent Orders</span>
                </h2>
                <p className="font-sans text-xs text-ivory/50 mt-0.5">
                  Latest customer purchases and order state progression.
                </p>
              </div>

              <Link
                href="/admin/orders"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-soft-gold hover:text-white uppercase tracking-wider transition-colors self-start sm:self-auto"
              >
                <span>View All Orders</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Package className="w-10 h-10 text-white/20 mx-auto" />
                <h3 className="font-serif text-base text-white/80">No Orders Placed Yet</h3>
                <p className="text-xs text-ivory/40 max-w-sm mx-auto">
                  When customers complete checkout on the boutique, their orders will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-left text-xs min-w-[620px]">
                  <thead>
                    <tr className="border-b border-white/10 text-ivory/50 font-tech uppercase tracking-wider text-[10px]">
                      <th className="pb-3 font-semibold">Order</th>
                      <th className="pb-3 font-semibold">Customer</th>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold text-right">Amount</th>
                      <th className="pb-3 font-semibold text-center">Payment</th>
                      <th className="pb-3 font-semibold text-center">Order Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {recentOrders.map((ord) => {
                      const isPaid = ord.paymentStatus === 'paid';
                      const isPendingPayment = ord.paymentStatus === 'pending';
                      const isCompleted = ord.orderStatus === 'completed' || ord.orderStatus === 'delivered';
                      const isCancelled = ord.orderStatus === 'cancelled';

                      return (
                        <tr
                          key={ord.id}
                          className="hover:bg-white/[0.02] transition-colors group"
                        >
                          <td className="py-3.5 pr-3 font-mono font-medium text-white">
                            <Link
                              href="/admin/orders"
                              className="text-white hover:text-soft-gold transition-colors font-semibold"
                            >
                              {ord.orderNumber}
                            </Link>
                          </td>
                          <td className="py-3.5 pr-3 max-w-[160px]">
                            <p className="font-medium text-white truncate">{ord.customerName}</p>
                            {ord.customerEmail && (
                              <p className="text-[11px] text-ivory/40 truncate">{ord.customerEmail}</p>
                            )}
                          </td>
                          <td className="py-3.5 pr-3 text-ivory/60 whitespace-nowrap">
                            {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3.5 pr-3 text-right font-semibold text-white">
                            ₹{ord.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-tech text-[10px] font-bold uppercase tracking-wider ${
                                isPaid
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : isPendingPayment
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {ord.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3.5 pl-2 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-tech text-[10px] font-bold uppercase tracking-wider ${
                                isCompleted
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : isCancelled
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : ord.orderStatus === 'processing' || ord.orderStatus === 'shipped'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {ord.orderStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Revenue & Period Summary Widget */}
          <div className="p-6 rounded-2xl bg-[#14171A] border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-soft-gold" />
                <span>Sales & Volume Summary</span>
              </h3>
              <span className="text-[11px] font-tech text-ivory/40">Real-time Calculated</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-tech tracking-wider text-ivory/50">
                  Last 7 Days
                </span>
                <p className="font-serif text-lg font-bold text-white">
                  ₹{summary.revenue7d.toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-ivory/50">
                  {summary.orders7d} total orders
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-tech tracking-wider text-ivory/50">
                  Last 30 Days
                </span>
                <p className="font-serif text-lg font-bold text-white">
                  ₹{summary.revenue30d.toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-ivory/50">
                  {summary.orders30d} total orders
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-tech tracking-wider text-ivory/50">
                  Avg. Order Value
                </span>
                <p className="font-serif text-lg font-bold text-soft-gold">
                  ₹{summary.avgOrderValue.toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-ivory/50">
                  On completed purchases
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Low Stock Alert Widget */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-2xl bg-[#14171A] border border-white/10 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-serif text-base font-bold text-white tracking-wide">
                    Low Stock Alert
                  </h2>
                  <p className="font-sans text-[11px] text-ivory/50">
                    At or below low-stock threshold
                  </p>
                </div>
              </div>

              <Link
                href="/admin/inventory"
                className="text-[11px] font-semibold text-soft-gold hover:text-white uppercase tracking-wider transition-colors"
              >
                View Inventory
              </Link>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400/50 mx-auto" />
                <h3 className="font-serif text-sm font-semibold text-white">Stock Levels Healthy</h3>
                <p className="text-xs text-ivory/40 max-w-xs mx-auto leading-relaxed">
                  All catalog pieces are currently above their configured low-stock threshold.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div
                    key={item.productId}
                    className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-black/40 overflow-hidden shrink-0 border border-white/10">
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-serif text-xs font-medium text-white truncate">
                          {item.productName}
                        </h4>
                        <p className="text-[10px] text-ivory/40 font-tech">
                          Threshold: {item.lowStockThreshold} units
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-tech text-[10px] font-bold ${
                          item.availableQuantity === 0
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {item.availableQuantity === 0 ? 'Out of Stock' : `${item.availableQuantity} left`}
                      </span>
                    </div>
                  </div>
                ))}

                <Link
                  href="/admin/inventory"
                  className="w-full mt-3 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-ivory hover:text-white text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Manage Inventory Levels</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Quick Shortcuts Card */}
          <div className="p-6 rounded-2xl bg-[#14171A] border border-white/10 space-y-4">
            <h3 className="font-serif text-base font-bold text-white">Management Shortcuts</h3>
            <div className="space-y-2 text-xs">
              <Link
                href="/admin/orders"
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-white/5 text-ivory hover:text-white transition-colors group"
              >
                <span>Orders Management</span>
                <ArrowRight className="w-3.5 h-3.5 text-ivory/40 group-hover:text-soft-gold transition-colors" />
              </Link>
              <Link
                href="/admin/inventory"
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-white/5 text-ivory hover:text-white transition-colors group"
              >
                <span>Inventory & Stock Adjustments</span>
                <ArrowRight className="w-3.5 h-3.5 text-ivory/40 group-hover:text-soft-gold transition-colors" />
              </Link>
              <Link
                href="/admin/products"
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-white/5 text-ivory hover:text-white transition-colors group"
              >
                <span>Products Catalog</span>
                <ArrowRight className="w-3.5 h-3.5 text-ivory/40 group-hover:text-soft-gold transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
