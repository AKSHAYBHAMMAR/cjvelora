'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  IndianRupee,
  ShoppingBag,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  Tag,
  AlertTriangle,
  ArrowUpDown,
  ExternalLink,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { getAdminAnalytics, formatINR, formatPercentChange } from '@/lib/analytics';
import {
  AnalyticsTimeframe,
  AnalyticsData,
  TopProduct,
  CategorySale,
} from '@/types/analytics';

export default function AdminAnalyticsPage() {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('30d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Top products sort state
  const [productSortBy, setProductSortBy] = useState<'unitsSold' | 'revenue' | 'orders' | 'name'>('unitsSold');
  const [productSortOrder, setProductSortOrder] = useState<'asc' | 'desc'>('desc');

  // Chart Metric Toggle: 'revenue' | 'orders'
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue');

  // Hovered data point for chart tooltip
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Initialize default custom dates (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setCustomEnd(end.toISOString().slice(0, 10));
    setCustomStart(start.toISOString().slice(0, 10));
  }, []);

  const loadAnalytics = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await getAdminAnalytics({
          timeframe,
          startDate: timeframe === 'custom' ? customStart : undefined,
          endDate: timeframe === 'custom' ? customEnd : undefined,
        });

        if (!res.success || !res.data) {
          throw new Error(res.error || 'Failed to retrieve store analytics.');
        }

        setData(res.data);
      } catch (err: any) {
        console.error('Error in AdminAnalyticsPage:', err);
        setError(err.message || 'An error occurred while loading analytics.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [timeframe, customStart, customEnd]
  );

  useEffect(() => {
    if (timeframe !== 'custom' || (customStart && customEnd)) {
      loadAnalytics();
    }
  }, [loadAnalytics, timeframe]);

  // Handle custom range submit
  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError(null);

    if (!customStart || !customEnd) {
      setCustomError('Please choose both start and end dates.');
      return;
    }

    const start = new Date(customStart);
    const end = new Date(customEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setCustomError('Invalid date values.');
      return;
    }

    if (start > end) {
      setCustomError('Start date cannot be after end date.');
      return;
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (end > today) {
      setCustomError('End date cannot be in the future.');
      return;
    }

    setShowCustomPicker(false);
    loadAnalytics();
  };

  // Sorted top products
  const sortedProducts = useMemo(() => {
    if (!data?.topProducts) return [];
    return [...data.topProducts].sort((a, b) => {
      let comparison = 0;
      if (productSortBy === 'unitsSold') comparison = a.unitsSold - b.unitsSold;
      else if (productSortBy === 'revenue') comparison = a.revenue - b.revenue;
      else if (productSortBy === 'orders') comparison = a.orders - b.orders;
      else if (productSortBy === 'name') comparison = a.name.localeCompare(b.name);

      return productSortOrder === 'desc' ? -comparison : comparison;
    });
  }, [data?.topProducts, productSortBy, productSortOrder]);

  const handleProductSort = (field: 'unitsSold' | 'revenue' | 'orders' | 'name') => {
    if (productSortBy === field) {
      setProductSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setProductSortBy(field);
      setProductSortOrder('desc');
    }
  };

  // SVG Chart Calculation
  const chartPoints = data?.revenueTimeSeries || [];
  const maxChartValue = useMemo(() => {
    if (!chartPoints.length) return 100;
    const values = chartPoints.map((pt) =>
      chartMetric === 'revenue' ? pt.revenue : pt.orders
    );
    const max = Math.max(...values, 1);
    // Add 15% headroom for aesthetic spacing
    return Math.ceil(max * 1.15);
  }, [chartPoints, chartMetric]);

  return (
    <div className="space-y-8 max-w-[1400px]">
      {/* 1. Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#171B1F] to-[#121517] border border-soft-gold/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-soft-gold/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-soft-gold/10 border border-soft-gold/30">
              <Sparkles className="w-3.5 h-3.5 text-soft-gold" />
              <span className="font-tech text-[10px] uppercase tracking-[0.25em] text-soft-gold font-bold">
                Atelier Intelligence
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
              Analytics
            </h1>
            <p className="font-sans text-xs sm:text-sm text-ivory/70 mt-1 max-w-xl leading-relaxed">
              Understand sales, customers, products, and store performance.
            </p>
          </div>

          {/* Date Range Selector & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Range Presets Tabs */}
            <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10 overflow-x-auto">
              {(
                [
                  { id: '7d', label: 'Last 7 days' },
                  { id: '30d', label: 'Last 30 days' },
                  { id: '90d', label: 'Last 90 days' },
                  { id: '12m', label: 'Last 12 months' },
                  { id: 'custom', label: 'Custom' },
                ] as const
              ).map((tab) => {
                const isSelected = timeframe === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setTimeframe(tab.id);
                      if (tab.id === 'custom') {
                        setShowCustomPicker(true);
                      } else {
                        setShowCustomPicker(false);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl font-sans text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-soft-gold text-charcoal shadow-sm'
                        : 'text-ivory/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => loadAnalytics(true)}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-medium uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Refresh Realtime Data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  refreshing ? 'animate-spin text-soft-gold' : ''
                }`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Custom Range Picker Drawer / Bar */}
        {showCustomPicker && timeframe === 'custom' && (
          <form
            onSubmit={handleApplyCustomRange}
            className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-4 bg-black/20 p-4 rounded-2xl"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-soft-gold" />
              <span className="text-xs font-tech uppercase tracking-wider text-ivory/70 font-semibold">
                Custom Range:
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-ivory/60 font-medium">Start:</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="bg-[#14171A] border border-white/20 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-soft-gold"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-ivory/60 font-medium">End:</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="bg-[#14171A] border border-white/20 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-soft-gold"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-soft-gold text-charcoal font-semibold text-xs uppercase tracking-wider hover:bg-[#e5c158] transition-colors cursor-pointer"
            >
              Apply Dates
            </button>

            {customError && (
              <p className="text-xs text-rose-400 flex items-center gap-1 font-medium w-full mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {customError}
              </p>
            )}
          </form>
        )}

        {/* Period Summary Tagline */}
        {data && (
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-ivory/50 font-tech">
            <div>
              Active Window:{' '}
              <span className="text-white font-medium">
                {new Date(data.dateRange.startDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                —{' '}
                {new Date(data.dateRange.endDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div>
              Updated:{' '}
              <span className="text-soft-gold">
                {new Date(data.updatedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-xs sm:text-sm text-rose-300 font-sans">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => loadAnalytics(false)}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold uppercase tracking-wider transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="space-y-8 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-[#14171A] border border-white/10 space-y-4"
              >
                <div className="w-24 h-3 bg-white/10 rounded" />
                <div className="w-32 h-8 bg-white/15 rounded" />
                <div className="w-20 h-3 bg-white/5 rounded" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 p-6 rounded-2xl bg-[#14171A] border border-white/10 h-96" />
            <div className="lg:col-span-4 p-6 rounded-2xl bg-[#14171A] border border-white/10 h-96" />
          </div>
        </div>
      )}

      {/* Main Analytics Content */}
      {data && (
        <>
          {/* 2. Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Metric 1: Total Revenue */}
            <div className="p-6 rounded-2xl bg-[#14171A] border border-white/10 hover:border-soft-gold/40 transition-all duration-300 shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between mb-3">
                <span className="font-tech text-xs uppercase tracking-wider text-ivory/60 font-semibold">
                  Total Revenue
                </span>
                <div className="w-8 h-8 rounded-xl bg-soft-gold/10 flex items-center justify-center text-soft-gold border border-soft-gold/20">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>

              <div className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight mb-2">
                {formatINR(data.metrics.totalRevenue.value)}
              </div>

              <div className="flex items-center gap-2">
                {(() => {
                  const comparison = formatPercentChange(
                    data.metrics.totalRevenue.percentageChange
                  );
                  if (!comparison) {
                    return (
                      <span className="text-[11px] font-tech text-ivory/40">
                        — vs previous period
                      </span>
                    );
                  }
                  return (
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        comparison.isPositive
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : comparison.isNegative
                          ? 'bg-rose-500/15 text-rose-400'
                          : 'bg-white/10 text-ivory/60'
                      }`}
                    >
                      {comparison.isPositive && <TrendingUp className="w-3 h-3" />}
                      {comparison.isNegative && <TrendingDown className="w-3 h-3" />}
                      {comparison.formatted} vs previous period
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Metric 2: Total Orders */}
            <div className="p-6 rounded-2xl bg-[#14171A] border border-white/10 hover:border-soft-gold/40 transition-all duration-300 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="font-tech text-xs uppercase tracking-wider text-ivory/60 font-semibold">
                  Total Orders
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>

              <div className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight mb-2">
                {data.metrics.totalOrders.value.toLocaleString()}
              </div>

              <div className="flex items-center gap-2">
                {(() => {
                  const comparison = formatPercentChange(
                    data.metrics.totalOrders.percentageChange
                  );
                  if (!comparison) {
                    return (
                      <span className="text-[11px] font-tech text-ivory/40">
                        — vs previous period
                      </span>
                    );
                  }
                  return (
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        comparison.isPositive
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : comparison.isNegative
                          ? 'bg-rose-500/15 text-rose-400'
                          : 'bg-white/10 text-ivory/60'
                      }`}
                    >
                      {comparison.isPositive && <TrendingUp className="w-3 h-3" />}
                      {comparison.isNegative && <TrendingDown className="w-3 h-3" />}
                      {comparison.formatted} vs previous period
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Metric 3: Average Order Value */}
            <div className="p-6 rounded-2xl bg-[#14171A] border border-white/10 hover:border-soft-gold/40 transition-all duration-300 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="font-tech text-xs uppercase tracking-wider text-ivory/60 font-semibold">
                  Average Order Value
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>

              <div className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight mb-2">
                {formatINR(data.metrics.avgOrderValue.value)}
              </div>

              <div className="flex items-center gap-2">
                {(() => {
                  const comparison = formatPercentChange(
                    data.metrics.avgOrderValue.percentageChange
                  );
                  if (!comparison) {
                    return (
                      <span className="text-[11px] font-tech text-ivory/40">
                        — vs previous period
                      </span>
                    );
                  }
                  return (
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        comparison.isPositive
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : comparison.isNegative
                          ? 'bg-rose-500/15 text-rose-400'
                          : 'bg-white/10 text-ivory/60'
                      }`}
                    >
                      {comparison.isPositive && <TrendingUp className="w-3 h-3" />}
                      {comparison.isNegative && <TrendingDown className="w-3 h-3" />}
                      {comparison.formatted} vs previous period
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Metric 4: Items Sold */}
            <div className="p-6 rounded-2xl bg-[#14171A] border border-white/10 hover:border-soft-gold/40 transition-all duration-300 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="font-tech text-xs uppercase tracking-wider text-ivory/60 font-semibold">
                  Items Sold
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                  <Package className="w-4 h-4" />
                </div>
              </div>

              <div className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight mb-2">
                {data.metrics.itemsSold.value.toLocaleString()}
              </div>

              <div className="flex items-center gap-2">
                {(() => {
                  const comparison = formatPercentChange(
                    data.metrics.itemsSold.percentageChange
                  );
                  if (!comparison) {
                    return (
                      <span className="text-[11px] font-tech text-ivory/40">
                        — vs previous period
                      </span>
                    );
                  }
                  return (
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        comparison.isPositive
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : comparison.isNegative
                          ? 'bg-rose-500/15 text-rose-400'
                          : 'bg-white/10 text-ivory/60'
                      }`}
                    >
                      {comparison.isPositive && <TrendingUp className="w-3 h-3" />}
                      {comparison.isNegative && <TrendingDown className="w-3 h-3" />}
                      {comparison.formatted} vs previous period
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Secondary Metrics: Customer Cohort Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-[#14171A] border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-tech uppercase tracking-wider text-ivory/50">
                  Total Active Customers
                </p>
                <p className="text-2xl font-serif font-bold text-white mt-1">
                  {data.customerAnalytics.totalPurchasingCustomers.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 text-ivory/80">
                <Users className="w-5 h-5 text-soft-gold" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#14171A] border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-tech uppercase tracking-wider text-ivory/50">
                  New Customers
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-serif font-bold text-white">
                    {data.customerAnalytics.newCustomers.toLocaleString()}
                  </p>
                  <span className="text-[11px] text-emerald-400 font-medium">First purchase</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#14171A] border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-tech uppercase tracking-wider text-ivory/50">
                  Repeat Customers
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-serif font-bold text-white">
                    {data.customerAnalytics.returningCustomers.toLocaleString()}
                  </p>
                  <span className="text-[11px] text-soft-gold font-medium">
                    {data.customerAnalytics.repeatCustomerRate}% rate
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-soft-gold/10 text-soft-gold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* 3. Revenue & Orders Over Time Interactive Chart */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#14171A] border border-white/10 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-soft-gold" />
                  <h2 className="font-serif text-lg sm:text-xl font-bold text-white">
                    {chartMetric === 'revenue' ? 'Revenue Trajectory' : 'Order Volume'}
                  </h2>
                </div>
                <p className="text-xs text-ivory/60">
                  {chartMetric === 'revenue'
                    ? 'Completed and verified revenue over the selected timeframe.'
                    : 'Order volume distribution over the selected timeframe.'}
                </p>
              </div>

              {/* Metric Toggle */}
              <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setChartMetric('revenue')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    chartMetric === 'revenue'
                      ? 'bg-soft-gold text-charcoal shadow-sm'
                      : 'text-ivory/60 hover:text-white'
                  }`}
                >
                  Revenue
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('orders')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    chartMetric === 'orders'
                      ? 'bg-soft-gold text-charcoal shadow-sm'
                      : 'text-ivory/60 hover:text-white'
                  }`}
                >
                  Orders
                </button>
              </div>
            </div>

            {/* Empty State vs Real Chart */}
            {!data.hasOrders || chartPoints.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-ivory/40">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-base font-semibold text-white">
                  No sales data for this period.
                </h3>
                <p className="text-xs text-ivory/50 max-w-sm mx-auto">
                  There were no verified orders placed during the selected date window.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Responsive SVG Chart */}
                <div className="relative w-full h-72 sm:h-80 select-none">
                  <svg
                    className="w-full h-full overflow-visible"
                    viewBox="0 0 1000 300"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                      const y = 260 - ratio * 220;
                      const val = Math.round(maxChartValue * ratio);
                      return (
                        <g key={ratio}>
                          <line
                            x1="0"
                            y1={y}
                            x2="1000"
                            y2={y}
                            stroke="rgba(255, 255, 255, 0.07)"
                            strokeDasharray="4 4"
                          />
                          <text
                            x="0"
                            y={y - 6}
                            fill="rgba(255, 255, 255, 0.3)"
                            fontSize="11"
                            fontFamily="monospace"
                          >
                            {chartMetric === 'revenue' ? formatINR(val) : val}
                          </text>
                        </g>
                      );
                    })}

                    {/* Generate SVG Area & Line Path */}
                    {(() => {
                      const len = chartPoints.length;
                      if (len === 1) {
                        const pt = chartPoints[0];
                        const val = chartMetric === 'revenue' ? pt.revenue : pt.orders;
                        const y = 260 - (val / maxChartValue) * 220;
                        return (
                          <circle
                            cx="500"
                            cy={y}
                            r="6"
                            fill="#D4AF37"
                            stroke="#ffffff"
                            strokeWidth="2"
                          />
                        );
                      }

                      const coords = chartPoints.map((pt, idx) => {
                        const x = (idx / (len - 1)) * 960 + 20;
                        const val = chartMetric === 'revenue' ? pt.revenue : pt.orders;
                        const y = 260 - (val / maxChartValue) * 220;
                        return { x, y, pt };
                      });

                      const pathD = coords.reduce((acc, c, idx) => {
                        return idx === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`;
                      }, '');

                      const areaD = `${pathD} L ${coords[coords.length - 1].x} 260 L ${coords[0].x} 260 Z`;
                      const strokeColor = chartMetric === 'revenue' ? '#D4AF37' : '#60A5FA';
                      const gradientId =
                        chartMetric === 'revenue' ? 'url(#goldGradient)' : 'url(#blueGradient)';

                      return (
                        <>
                          <path d={areaD} fill={gradientId} />
                          <path
                            d={pathD}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {coords.map((c, idx) => {
                            const isHovered = hoveredPointIndex === idx;
                            return (
                              <g
                                key={idx}
                                onMouseEnter={() => setHoveredPointIndex(idx)}
                                onMouseLeave={() => setHoveredPointIndex(null)}
                                className="cursor-pointer"
                              >
                                {/* Invisible larger target for smooth hover */}
                                <circle cx={c.x} cy={c.y} r="14" fill="transparent" />
                                <circle
                                  cx={c.x}
                                  cy={c.y}
                                  r={isHovered ? 6 : 3.5}
                                  fill={isHovered ? '#ffffff' : strokeColor}
                                  stroke={strokeColor}
                                  strokeWidth={isHovered ? 2 : 1}
                                  className="transition-all duration-150"
                                />
                              </g>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>

                  {/* Dynamic Tooltip on Hover */}
                  {hoveredPointIndex !== null && chartPoints[hoveredPointIndex] && (
                    <div
                      className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full bg-[#1A1E22] border border-white/20 p-3 rounded-xl shadow-2xl z-20"
                      style={{
                        left: `${
                          (hoveredPointIndex / Math.max(1, chartPoints.length - 1)) * 96 + 2
                        }%`,
                        top: '40px',
                      }}
                    >
                      <p className="font-tech text-[10px] uppercase text-ivory/60 mb-1">
                        {chartPoints[hoveredPointIndex].date}
                      </p>
                      <p className="font-serif text-sm font-bold text-white">
                        {formatINR(chartPoints[hoveredPointIndex].revenue)}
                      </p>
                      <p className="text-xs text-soft-gold font-medium">
                        {chartPoints[hoveredPointIndex].orders}{' '}
                        {chartPoints[hoveredPointIndex].orders === 1 ? 'order' : 'orders'}
                      </p>
                    </div>
                  )}
                </div>

                {/* X-Axis Date Labels */}
                <div className="flex justify-between text-[11px] font-tech text-ivory/50 px-2 pt-2 border-t border-white/10 overflow-x-hidden">
                  {chartPoints
                    .filter((_, idx) => {
                      const step = Math.ceil(chartPoints.length / 8);
                      return idx % step === 0 || idx === chartPoints.length - 1;
                    })
                    .map((pt, i) => (
                      <span key={i}>{pt.date}</span>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Sales by Category & Order Statuses (2 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sales by Category (7 cols) */}
            <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-[#14171A] border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="w-4 h-4 text-soft-gold" />
                  <h2 className="font-serif text-lg font-bold text-white">Sales by Category</h2>
                </div>
                <p className="text-xs text-ivory/60 mb-6">
                  Revenue contribution and volume across artisan categories.
                </p>

                {data.categorySales.length === 0 ? (
                  <p className="text-xs text-ivory/40 py-8 text-center italic">
                    No category sales for this period.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {data.categorySales.map((cat) => (
                      <div
                        key={cat.categoryId}
                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-sans font-semibold text-white">
                              {cat.name}
                            </span>
                            <span className="font-tech text-[10px] text-ivory/40">
                              ({cat.orders} {cat.orders === 1 ? 'order' : 'orders'})
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-tech text-[10px] text-soft-gold font-bold">
                              {cat.percentOfTotal}%
                            </span>
                            <span className="font-serif font-bold text-white">
                              {formatINR(cat.revenue)}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-soft-gold to-[#B8860B] rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(3, cat.percentOfTotal))}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-[10px] text-ivory/40 font-tech mt-1.5">
                          <span>Units Sold: {cat.unitsSold}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Order & Payment Status Distribution (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Order Status Distribution */}
              <div className="p-6 sm:p-7 rounded-3xl bg-[#14171A] border border-white/10">
                <h2 className="font-serif text-lg font-bold text-white mb-1">
                  Order Statuses
                </h2>
                <p className="text-xs text-ivory/60 mb-5">
                  Fulfillment pipeline breakdown.
                </p>

                <div className="space-y-3">
                  {data.orderStatuses.map((item) => (
                    <div key={item.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.status === 'delivered'
                              ? 'bg-emerald-400'
                              : item.status === 'shipped'
                              ? 'bg-blue-400'
                              : item.status === 'processing'
                              ? 'bg-amber-400'
                              : item.status === 'cancelled' || item.status === 'refunded'
                              ? 'bg-rose-400'
                              : 'bg-white/40'
                          }`}
                        />
                        <span className="capitalize font-medium text-ivory/80">
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-tech">
                        <span className="text-ivory/50">{item.count} orders</span>
                        <span className="font-semibold text-white w-10 text-right">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Status Distribution */}
              <div className="p-6 sm:p-7 rounded-3xl bg-[#14171A] border border-white/10">
                <h2 className="font-serif text-lg font-bold text-white mb-1">
                  Payment Statuses
                </h2>
                <p className="text-xs text-ivory/60 mb-5">
                  Settlement and verification distribution.
                </p>

                <div className="space-y-3">
                  {data.paymentStatuses.map((item) => (
                    <div key={item.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.status === 'paid'
                              ? 'bg-emerald-400'
                              : item.status === 'pending'
                              ? 'bg-amber-400'
                              : 'bg-rose-400'
                          }`}
                        />
                        <span className="capitalize font-medium text-ivory/80">
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-tech">
                        <span className="text-soft-gold font-medium">
                          {formatINR(item.amount)}
                        </span>
                        <span className="text-ivory/50">({item.count})</span>
                        <span className="font-semibold text-white w-10 text-right">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 5. Top Products Sold (Table with Sorting) */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#14171A] border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingBag className="w-4 h-4 text-soft-gold" />
                  <h2 className="font-serif text-lg font-bold text-white">
                    Top Performing Products
                  </h2>
                </div>
                <p className="text-xs text-ivory/60">
                  Products ranked by real order items in the selected period.
                </p>
              </div>
            </div>

            {sortedProducts.length === 0 ? (
              <p className="text-xs text-ivory/40 py-12 text-center italic">
                No products sold during this period.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-6 sm:mx-0">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] font-tech uppercase tracking-wider text-ivory/50">
                      <th className="pb-3 pl-4">#</th>
                      <th
                        className="pb-3 cursor-pointer hover:text-white"
                        onClick={() => handleProductSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Product
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        className="pb-3 text-right cursor-pointer hover:text-white"
                        onClick={() => handleProductSort('unitsSold')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Units Sold
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        className="pb-3 text-right cursor-pointer hover:text-white"
                        onClick={() => handleProductSort('orders')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Orders
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        className="pb-3 pr-4 text-right cursor-pointer hover:text-white"
                        onClick={() => handleProductSort('revenue')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Revenue
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs font-sans">
                    {sortedProducts.map((prod, index) => (
                      <tr
                        key={prod.productId}
                        className="hover:bg-white/[0.02] transition-colors group"
                      >
                        <td className="py-3.5 pl-4 font-tech text-ivory/40">
                          {index + 1}
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={prod.image || '/images/products/tote-bag.jpg'}
                              alt={prod.name}
                              className="w-10 h-10 rounded-lg object-cover bg-white/5 shrink-0 border border-white/10"
                            />
                            <div>
                              <p className="font-medium text-white group-hover:text-soft-gold transition-colors">
                                {prod.name}
                              </p>
                              <span className="text-[10px] font-tech text-ivory/50">
                                {prod.categoryName || 'Artisan Direct'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 text-right font-tech font-bold text-white">
                          <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                            {prod.unitsSold}
                          </span>
                        </td>
                        <td className="py-3.5 text-right font-tech text-ivory/70">
                          {prod.orders}
                        </td>
                        <td className="py-3.5 pr-4 text-right font-serif font-bold text-soft-gold text-sm">
                          {formatINR(prod.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 6. Discounts & Inventory Insights (2 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Discount Analytics (6 cols) */}
            <div className="lg:col-span-6 p-6 sm:p-8 rounded-3xl bg-[#14171A] border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="w-4 h-4 text-soft-gold" />
                  <h2 className="font-serif text-lg font-bold text-white">
                    Discount & Promotion Performance
                  </h2>
                </div>
                <p className="text-xs text-ivory/60 mb-6">
                  Impact of vouchers and seasonal offers.
                </p>

                {/* Discount KPIs */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] font-tech uppercase text-ivory/50">
                      Discounted Orders
                    </p>
                    <p className="text-lg font-serif font-bold text-white mt-1">
                      {data.discountAnalytics.ordersUsingDiscounts}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] font-tech uppercase text-ivory/50">
                      Discount Given
                    </p>
                    <p className="text-lg font-serif font-bold text-rose-400 mt-1">
                      {formatINR(data.discountAnalytics.totalDiscountGiven)}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] font-tech uppercase text-ivory/50">
                      Discounted Rev
                    </p>
                    <p className="text-lg font-serif font-bold text-soft-gold mt-1">
                      {formatINR(data.discountAnalytics.discountedOrdersRevenue)}
                    </p>
                  </div>
                </div>

                {/* Most-Used Promo Codes Table */}
                <h3 className="font-tech text-xs uppercase tracking-wider text-ivory/70 font-semibold mb-3">
                  Most Used Coupons
                </h3>
                {data.discountAnalytics.mostUsedCoupons.length === 0 ? (
                  <p className="text-xs text-ivory/40 py-4 text-center italic">
                    No promo codes used during this period.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.discountAnalytics.mostUsedCoupons.map((coupon) => (
                      <div
                        key={coupon.code}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-tech font-bold uppercase tracking-wider text-soft-gold px-2 py-0.5 rounded bg-soft-gold/10 border border-soft-gold/20">
                            {coupon.code}
                          </span>
                          <span className="text-ivory/50 font-tech">
                            {coupon.usageCount} {coupon.usageCount === 1 ? 'use' : 'uses'}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-serif font-bold text-white">
                            {formatINR(coupon.revenue)}
                          </p>
                          <span className="text-[10px] text-rose-400 font-tech">
                            -{formatINR(coupon.totalDiscountAmount)} off
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Inventory Insights (6 cols) */}
            <div className="lg:col-span-6 p-6 sm:p-8 rounded-3xl bg-[#14171A] border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-soft-gold" />
                  <h2 className="font-serif text-lg font-bold text-white">
                    Inventory & Stock Insights
                  </h2>
                </div>
                <p className="text-xs text-ivory/60 mb-6">
                  Actionable stock analytics to avoid stockouts on bestsellers.
                </p>

                {/* Inventory Metrics */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] font-tech uppercase text-ivory/50">
                      Catalog Retail Value
                    </p>
                    <p className="text-lg font-serif font-bold text-white mt-1">
                      {formatINR(data.inventoryInsight.currentInventoryValue)}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] font-tech uppercase text-ivory/50">
                      Low Stock Items
                    </p>
                    <p className="text-lg font-serif font-bold text-amber-400 mt-1">
                      {data.inventoryInsight.lowStockProductsCount}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] font-tech uppercase text-ivory/50">
                      Out of Stock
                    </p>
                    <p className="text-lg font-serif font-bold text-rose-400 mt-1">
                      {data.inventoryInsight.outOfStockProductsCount}
                    </p>
                  </div>
                </div>

                {/* Best Sellers Approaching Low Stock Alert */}
                <h3 className="font-tech text-xs uppercase tracking-wider text-ivory/70 font-semibold mb-3">
                  Bestsellers Approaching Low Stock
                </h3>

                {data.inventoryInsight.fastMovingLowStock.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>All high-demand products currently have healthy inventory levels.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.inventoryInsight.fastMovingLowStock.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image || '/images/products/tote-bag.jpg'}
                            alt={item.name}
                            className="w-8 h-8 rounded-lg object-cover bg-white/5"
                          />
                          <div>
                            <p className="font-medium text-white">{item.name}</p>
                            <span className="text-[10px] font-tech text-ivory/50">
                              {item.unitsSold} units sold in period
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded font-tech font-bold text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {item.availableQuantity} left
                          </span>
                          <p className="text-[9px] font-tech text-ivory/40 mt-0.5">
                            Threshold: {item.lowStockThreshold}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-white/5 mt-4 flex justify-end">
                <Link
                  href="/admin/inventory"
                  className="text-xs font-sans font-medium text-soft-gold hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <span>Manage Stock in Inventory Console</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
