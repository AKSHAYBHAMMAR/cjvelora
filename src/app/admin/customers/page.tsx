'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getAdminCustomers,
  formatINR,
  formatCustomerDate,
  CustomerQueryParams,
  CustomerListMetrics,
} from '@/lib/customers';
import { AdminCustomerSummary } from '@/types';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  ShoppingBag,
  IndianRupee,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Phone,
  Mail,
  ArrowUpDown,
  Sparkles,
  TrendingUp,
  Award,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomerSummary[]>([]);
  const [metrics, setMetrics] = useState<CustomerListMetrics>({
    totalCustomers: 0,
    totalSpent: 0,
    avgCustomerValue: 0,
    repeatCustomersCount: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'with-orders' | 'no-orders' | 'high-value' | 'recent'>('all');
  const [activeSort, setActiveSort] = useState<'newest' | 'oldest' | 'highest-spent' | 'most-orders' | 'recent-order'>('newest');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCustomers = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const queryParams: CustomerQueryParams = {
          search: searchQuery,
          filter: activeFilter,
          sort: activeSort,
          page: currentPage,
          limit: 20,
        };

        const res = await getAdminCustomers(queryParams);

        if (!res.success) {
          setError(res.error || 'Failed to retrieve customers.');
        } else {
          setCustomers(res.customers || []);
          if (res.metrics) setMetrics(res.metrics);
          if (res.pagination) setPagination(res.pagination);
        }
      } catch (err: any) {
        console.error('Error fetching admin customers:', err);
        setError(err?.message || 'An unexpected error occurred while fetching customers.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchQuery, activeFilter, activeSort, currentPage]
  );

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Reset page when filter, sort, or search changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (filter: 'all' | 'with-orders' | 'no-orders' | 'high-value' | 'recent') => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: 'newest' | 'oldest' | 'highest-spent' | 'most-orders' | 'recent-order') => {
    setActiveSort(sort);
    setCurrentPage(1);
  };

  const repeatRatio = metrics.totalCustomers > 0
    ? Math.round((metrics.repeatCustomersCount / metrics.totalCustomers) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#0A0D0F] text-ivory/90 p-4 sm:p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-tech uppercase tracking-widest bg-soft-gold/10 text-soft-gold border border-soft-gold/20">
              Patron Registry
            </span>
            <span className="text-white/30 text-xs">•</span>
            <span className="text-ivory/50 font-tech text-xs">Atelier Clientele Directory</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-light text-white tracking-wide flex items-center gap-3">
            Customers
          </h1>
          <p className="text-ivory/60 text-xs sm:text-sm font-sans mt-1">
            Comprehensive directory of patrons, lifetime spend, order histories, and delivery profiles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCustomers(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-tech tracking-wider uppercase text-ivory/80 hover:text-white transition-all disabled:opacity-50"
            title="Refresh Registry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-soft-gold' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Sync Registry'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="p-5 rounded-2xl bg-[#121518] border border-white/10 relative overflow-hidden group hover:border-soft-gold/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-tech uppercase tracking-wider text-ivory/50">Total Patrons</span>
            <div className="w-8 h-8 rounded-xl bg-soft-gold/10 border border-soft-gold/20 flex items-center justify-center text-soft-gold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-serif text-2xl lg:text-3xl text-white font-medium">
              {metrics.totalCustomers.toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-ivory/50 font-sans mt-1">Registered patrons & clients</p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-soft-gold/5 rounded-full blur-2xl pointer-events-none group-hover:bg-soft-gold/10 transition-all" />
        </div>

        {/* Total Client Spend */}
        <div className="p-5 rounded-2xl bg-[#121518] border border-white/10 relative overflow-hidden group hover:border-soft-gold/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-tech uppercase tracking-wider text-ivory/50">Client Lifetime Spend</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-serif text-2xl lg:text-3xl text-white font-medium">
              {formatINR(metrics.totalSpent)}
            </h3>
            <p className="text-[11px] text-ivory/50 font-sans mt-1">Total revenue collected from patrons</p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
        </div>

        {/* Average Value */}
        <div className="p-5 rounded-2xl bg-[#121518] border border-white/10 relative overflow-hidden group hover:border-soft-gold/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-tech uppercase tracking-wider text-ivory/50">Average Patron Value</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="font-serif text-2xl lg:text-3xl text-white font-medium">
              {formatINR(metrics.avgCustomerValue)}
            </h3>
            <p className="text-[11px] text-ivory/50 font-sans mt-1">Average lifetime value per patron</p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-all" />
        </div>

        {/* Repeat Patrons */}
        <div className="p-5 rounded-2xl bg-[#121518] border border-white/10 relative overflow-hidden group hover:border-soft-gold/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-tech uppercase tracking-wider text-ivory/50">Repeat Patron Rate</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h3 className="font-serif text-2xl lg:text-3xl text-white font-medium">
                {repeatRatio}%
              </h3>
              <span className="text-xs font-tech text-ivory/60">
                ({metrics.repeatCustomersCount} patrons)
              </span>
            </div>
            <p className="text-[11px] text-ivory/50 font-sans mt-1">Patrons with &gt; 1 completed order</p>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/10 transition-all" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#121518] border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-ivory/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by patron name, email, or phone number..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-soft-gold/50 focus:outline-none text-xs text-white placeholder:text-ivory/30 transition-all font-sans"
          />
        </div>

        {/* Cohort Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Patrons' },
            { id: 'with-orders', label: 'With Orders' },
            { id: 'high-value', label: 'High Value (₹5k+)' },
            { id: 'recent', label: 'Recent (30d)' },
            { id: 'no-orders', label: 'Prospects' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleFilterChange(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-tech uppercase tracking-wider whitespace-nowrap transition-all ${
                activeFilter === tab.id
                  ? 'bg-soft-gold text-rich-black font-semibold shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-ivory/70 border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={activeSort}
              onChange={(e) => handleSortChange(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-tech text-ivory/80 focus:border-soft-gold/50 focus:outline-none transition-all cursor-pointer"
            >
              <option value="newest" className="bg-[#14171A] text-white">Newest Patrons</option>
              <option value="oldest" className="bg-[#14171A] text-white">Oldest Patrons</option>
              <option value="highest-spent" className="bg-[#14171A] text-white">Highest Total Spend</option>
              <option value="most-orders" className="bg-[#14171A] text-white">Most Orders Placed</option>
              <option value="recent-order" className="bg-[#14171A] text-white">Most Recent Order</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-ivory/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchCustomers()}
            className="px-3 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-tech uppercase"
          >
            Retry
          </button>
        </div>
      )}

      {/* Customers Table / List */}
      <div className="rounded-2xl bg-[#121518] border border-white/10 overflow-hidden shadow-2xl">
        {loading ? (
          /* Loading Skeleton */
          <div className="p-8 space-y-4">
            <div className="flex items-center justify-center py-16 space-y-4 flex-col text-center">
              <div className="w-10 h-10 border-2 border-soft-gold/20 border-t-soft-gold rounded-full animate-spin" />
              <p className="text-xs font-tech uppercase tracking-widest text-ivory/50">
                Retrieving Patron Directory...
              </p>
            </div>
          </div>
        ) : customers.length === 0 ? (
          /* Empty State */
          <div className="py-20 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-ivory/40">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg text-white">No Patrons Found</h3>
            <p className="text-xs text-ivory/50 max-w-md mx-auto">
              {searchQuery || activeFilter !== 'all'
                ? 'No customer records match your current filter criteria or search query. Try clearing your search.'
                : 'There are currently no customer profiles recorded in the database.'}
            </p>
            {(searchQuery || activeFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                  setCurrentPage(1);
                }}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-tech uppercase text-soft-gold transition-all"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          /* Data Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-black/20 text-ivory/50 font-tech uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-normal">Patron</th>
                  <th className="py-3.5 px-4 font-normal">Contact</th>
                  <th className="py-3.5 px-4 font-normal">Patron Since</th>
                  <th className="py-3.5 px-4 font-normal">Latest Order</th>
                  <th className="py-3.5 px-4 font-normal text-center">Orders</th>
                  <th className="py-3.5 px-4 font-normal text-right">Lifetime Spend</th>
                  <th className="py-3.5 px-4 font-normal text-right">Avg Order</th>
                  <th className="py-3.5 px-4 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {customers.map((customer) => {
                  const hasOrders = customer.totalOrders > 0;
                  const isHighValue = customer.totalSpent >= 5000;
                  const isRepeat = customer.totalOrders > 1;

                  return (
                    <tr
                      key={customer.id}
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Patron Name & Badges */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-serif text-sm font-semibold text-soft-gold uppercase flex-shrink-0 group-hover:border-soft-gold/40 transition-all">
                            {customer.name ? customer.name.charAt(0) : 'P'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                href={`/admin/customers/${encodeURIComponent(customer.id)}`}
                                className="font-serif text-sm font-medium text-white hover:text-soft-gold transition-colors truncate"
                              >
                                {customer.name}
                              </Link>
                              {isHighValue && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-tech uppercase tracking-wider bg-soft-gold/15 text-soft-gold border border-soft-gold/30">
                                  VIP
                                </span>
                              )}
                              {isRepeat && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-tech uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                  Repeat
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-ivory/40 truncate mt-0.5">
                              {customer.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-4 px-4 font-mono text-[11px] text-ivory/70">
                        {customer.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-ivory/40 flex-shrink-0" />
                            <span>{customer.phone}</span>
                          </div>
                        ) : (
                          <span className="text-ivory/30">—</span>
                        )}
                      </td>

                      {/* Patron Since */}
                      <td className="py-4 px-4 font-mono text-[11px] text-ivory/60 whitespace-nowrap">
                        {formatCustomerDate(customer.customerSince)}
                      </td>

                      {/* Latest Order */}
                      <td className="py-4 px-4 font-mono text-[11px] whitespace-nowrap">
                        {customer.lastOrderDate ? (
                          <span className="text-ivory/80">
                            {formatCustomerDate(customer.lastOrderDate)}
                          </span>
                        ) : (
                          <span className="text-ivory/30">No orders placed</span>
                        )}
                      </td>

                      {/* Orders Count Breakdown */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-black/30 border border-white/5 px-2.5 py-1 rounded-lg">
                          <span className="font-semibold text-white">
                            {customer.totalOrders}
                          </span>
                          {customer.paidOrdersCount > 0 && (
                            <span className="text-[10px] text-emerald-400 font-tech">
                              ({customer.paidOrdersCount} paid)
                            </span>
                          )}
                          {customer.cancelledOrdersCount > 0 && (
                            <span className="text-[10px] text-rose-400 font-tech">
                              ({customer.cancelledOrdersCount} can.)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Lifetime Spend */}
                      <td className="py-4 px-4 text-right font-mono font-medium text-white whitespace-nowrap">
                        {formatINR(customer.totalSpent)}
                      </td>

                      {/* Avg Order */}
                      <td className="py-4 px-4 text-right font-mono text-[11px] text-ivory/60 whitespace-nowrap">
                        {customer.avgOrderValue > 0 ? formatINR(customer.avgOrderValue) : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/customers/${encodeURIComponent(customer.id)}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-soft-gold hover:text-rich-black border border-white/10 hover:border-soft-gold text-[11px] font-tech uppercase tracking-wider text-ivory/80 transition-all"
                        >
                          <span>Profile</span>
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

        {/* Pagination Bar */}
        {!loading && pagination.total > 0 && (
          <div className="p-4 border-t border-white/10 bg-black/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-ivory/50 font-tech">
              Showing{' '}
              <span className="text-white font-medium">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{' '}
              to{' '}
              <span className="text-white font-medium">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of <span className="text-white font-medium">{pagination.total}</span> patrons
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-tech text-ivory/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  // Center pages around current page if possible
                  let pageNum = i + 1;
                  if (pagination.totalPages > 5) {
                    const start = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4));
                    pageNum = start + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-tech transition-all ${
                        pagination.page === pageNum
                          ? 'bg-soft-gold text-rich-black font-semibold'
                          : 'bg-white/5 hover:bg-white/10 text-ivory/60'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-tech text-ivory/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
