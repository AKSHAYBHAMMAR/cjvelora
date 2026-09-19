'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getAdminDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  toggleDiscountActive,
  formatDiscountValue,
} from '@/lib/discounts';
import { Discount, DiscountType } from '@/types';
import {
  Tag,
  Plus,
  Search,
  ArrowUpDown,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Loader2,
  ArrowUp,
  ArrowDown,
  Info,
  Check,
  Package,
  SlidersHorizontal,
  Calendar,
  Clock,
  Percent,
  IndianRupee,
  ShieldAlert,
  Ticket,
  Users,
} from 'lucide-react';

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Search, Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'scheduled' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'code' | 'value' | 'usage' | 'start_date' | 'end_date' | 'created'>('created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal State: Create / Edit
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<DiscountType>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState('10');
  const [formMinOrder, setFormMinOrder] = useState('0');
  const [formMaxDiscount, setFormMaxDiscount] = useState('');
  const [formStartAt, setFormStartAt] = useState('');
  const [formEndAt, setFormEndAt] = useState('');
  const [formUsageLimit, setFormUsageLimit] = useState('');
  const [formPerCustomerLimit, setFormPerCustomerLimit] = useState('1');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal State: Delete / Safety
  const [deletingDiscount, setDeletingDiscount] = useState<Discount | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load Discounts Data
  const loadDiscounts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getAdminDiscounts();
      if (res.success) {
        setDiscounts(res.discounts);
      } else {
        setNotification({
          type: 'error',
          message: res.error || 'Failed to load discounts from database.',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.message || 'Network error fetching discounts.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDiscounts();
  }, [loadDiscounts]);

  // Auto-dismiss notification
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Compute status for a discount
  const getDiscountStatus = (d: Discount): 'active' | 'inactive' | 'scheduled' | 'expired' => {
    if (!d.active) return 'inactive';
    const now = new Date().getTime();
    if (d.startAt && new Date(d.startAt).getTime() > now) return 'scheduled';
    if (d.endAt && new Date(d.endAt).getTime() < now) return 'expired';
    return 'active';
  };

  // Summary Metrics
  const summary = useMemo(() => {
    const total = discounts.length;
    let active = 0;
    let expired = 0;
    let totalUses = 0;

    for (const d of discounts) {
      totalUses += d.usageCount;
      const status = getDiscountStatus(d);
      if (status === 'active') active++;
      if (status === 'expired') expired++;
    }

    return { total, active, expired, totalUses };
  }, [discounts]);

  // Filter and Sort Discounts
  const filteredAndSortedDiscounts = useMemo(() => {
    return discounts
      .filter((d) => {
        // Status Filter
        const status = getDiscountStatus(d);
        if (statusFilter !== 'all' && status !== statusFilter) {
          return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesCode = d.code.toLowerCase().includes(q);
          const matchesDesc = d.description?.toLowerCase().includes(q);
          if (!matchesCode && !matchesDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'code') {
          diff = a.code.localeCompare(b.code);
        } else if (sortBy === 'value') {
          diff = a.discountValue - b.discountValue;
        } else if (sortBy === 'usage') {
          diff = a.usageCount - b.usageCount;
        } else if (sortBy === 'start_date') {
          diff = new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
        } else if (sortBy === 'end_date') {
          const aEnd = a.endAt ? new Date(a.endAt).getTime() : Infinity;
          const bEnd = b.endAt ? new Date(b.endAt).getTime() : Infinity;
          diff = aEnd - bEnd;
        } else if (sortBy === 'created') {
          diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }

        return sortDirection === 'asc' ? diff : -diff;
      });
  }, [discounts, statusFilter, searchQuery, sortBy, sortDirection]);

  // Open Form Modal: Create
  const handleOpenCreateModal = () => {
    setEditingDiscount(null);
    setFormCode('');
    setFormDescription('');
    setFormDiscountType('percentage');
    setFormDiscountValue('10');
    setFormMinOrder('0');
    setFormMaxDiscount('');
    // Default start at today
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setFormStartAt(localIso);
    setFormEndAt('');
    setFormUsageLimit('');
    setFormPerCustomerLimit('1');
    setFormIsActive(true);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Form Modal: Edit
  const handleOpenEditModal = (d: Discount) => {
    setEditingDiscount(d);
    setFormCode(d.code);
    setFormDescription(d.description || '');
    setFormDiscountType(d.discountType);
    setFormDiscountValue(String(d.discountValue));
    setFormMinOrder(String(d.minimumOrderAmount));
    setFormMaxDiscount(d.maximumDiscountAmount ? String(d.maximumDiscountAmount) : '');

    const startIso = d.startAt
      ? new Date(new Date(d.startAt).getTime() - new Date(d.startAt).getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      : '';
    setFormStartAt(startIso);

    const endIso = d.endAt
      ? new Date(new Date(d.endAt).getTime() - new Date(d.endAt).getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      : '';
    setFormEndAt(endIso);

    setFormUsageLimit(d.usageLimit !== null && d.usageLimit !== undefined ? String(d.usageLimit) : '');
    setFormPerCustomerLimit(
      d.perCustomerLimit !== null && d.perCustomerLimit !== undefined ? String(d.perCustomerLimit) : '1'
    );
    setFormIsActive(d.active);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Auto-uppercase coupon code
  const handleCodeChange = (val: string) => {
    const uppercased = val.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    setFormCode(uppercased);
  };

  // Submit Form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanedCode = formCode.trim().toUpperCase();
    if (!cleanedCode) {
      setFormError('Coupon code is required.');
      return;
    }

    const valNum = Number(formDiscountValue);
    if (isNaN(valNum) || valNum <= 0) {
      setFormError('Discount value must be greater than zero.');
      return;
    }

    if (formDiscountType === 'percentage' && valNum > 100) {
      setFormError('Percentage discount cannot exceed 100%.');
      return;
    }

    const minOrderNum = Number(formMinOrder) || 0;
    if (minOrderNum < 0) {
      setFormError('Minimum order amount cannot be negative.');
      return;
    }

    let maxDiscountNum: number | null = null;
    if (formMaxDiscount.trim()) {
      maxDiscountNum = Number(formMaxDiscount);
      if (isNaN(maxDiscountNum) || maxDiscountNum <= 0) {
        setFormError('Maximum discount amount must be greater than zero.');
        return;
      }
    }

    if (formEndAt && formStartAt) {
      if (new Date(formEndAt).getTime() < new Date(formStartAt).getTime()) {
        setFormError('End date cannot be earlier than start date.');
        return;
      }
    }

    let usageLimitNum: number | null = null;
    if (formUsageLimit.trim()) {
      usageLimitNum = parseInt(formUsageLimit, 10);
      if (isNaN(usageLimitNum) || usageLimitNum < 0) {
        setFormError('Usage limit cannot be negative.');
        return;
      }
    }

    let perCustLimitNum: number | null = 1;
    if (formPerCustomerLimit.trim()) {
      perCustLimitNum = parseInt(formPerCustomerLimit, 10);
      if (isNaN(perCustLimitNum) || perCustLimitNum < 1) {
        setFormError('Per-customer limit must be at least 1.');
        return;
      }
    }

    setFormSubmitting(true);

    try {
      if (editingDiscount) {
        // Update
        const res = await updateDiscount(editingDiscount.id, {
          code: cleanedCode,
          description: formDescription.trim(),
          discountType: formDiscountType,
          discountValue: valNum,
          minimumOrderAmount: minOrderNum,
          maximumDiscountAmount: maxDiscountNum,
          startAt: formStartAt ? new Date(formStartAt).toISOString() : undefined,
          endAt: formEndAt ? new Date(formEndAt).toISOString() : null,
          usageLimit: usageLimitNum,
          perCustomerLimit: perCustLimitNum,
          active: formIsActive,
        });

        if (res.success && res.discount) {
          setDiscounts((prev) =>
            prev.map((d) => (d.id === editingDiscount.id ? res.discount! : d))
          );
          setIsFormModalOpen(false);
          setNotification({
            type: 'success',
            message: `Discount "${cleanedCode}" updated successfully.`,
          });
        } else {
          setFormError(res.error || 'Failed to update discount.');
        }
      } else {
        // Create
        const res = await createDiscount({
          code: cleanedCode,
          description: formDescription.trim(),
          discountType: formDiscountType,
          discountValue: valNum,
          minimumOrderAmount: minOrderNum,
          maximumDiscountAmount: maxDiscountNum,
          startAt: formStartAt ? new Date(formStartAt).toISOString() : undefined,
          endAt: formEndAt ? new Date(formEndAt).toISOString() : null,
          usageLimit: usageLimitNum,
          perCustomerLimit: perCustLimitNum,
          active: formIsActive,
        });

        if (res.success && res.discount) {
          setDiscounts((prev) => [res.discount!, ...prev]);
          setIsFormModalOpen(false);
          setNotification({
            type: 'success',
            message: `Discount "${cleanedCode}" created successfully.`,
          });
        } else {
          setFormError(res.error || 'Failed to create discount.');
        }
      }
    } catch (err: any) {
      setFormError(err?.message || 'An unexpected error occurred.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Active / Inactive
  const handleToggleActive = async (d: Discount) => {
    const newActive = !d.active;
    // Optimistic update
    setDiscounts((prev) =>
      prev.map((item) => (item.id === d.id ? { ...item, active: newActive } : item))
    );

    try {
      const res = await toggleDiscountActive(d.id, newActive);
      if (!res.success) {
        // Revert
        setDiscounts((prev) =>
          prev.map((item) => (item.id === d.id ? { ...item, active: d.active } : item))
        );
        setNotification({
          type: 'error',
          message: res.error || `Failed to update status for "${d.code}".`,
        });
      } else {
        setNotification({
          type: 'success',
          message: `Coupon "${d.code}" is now ${newActive ? 'Active' : 'Inactive'}.`,
        });
      }
    } catch {
      // Revert
      setDiscounts((prev) =>
        prev.map((item) => (item.id === d.id ? { ...item, active: d.active } : item))
      );
      setNotification({
        type: 'error',
        message: 'Network error updating discount status.',
      });
    }
  };

  // Open Delete Safety Confirmation Modal
  const handleOpenDeleteModal = (d: Discount) => {
    setDeletingDiscount(d);
    setDeleteError(null);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingDiscount) return;
    setDeleteSubmitting(true);
    setDeleteError(null);

    try {
      const res = await deleteDiscount(deletingDiscount.id);
      if (res.success) {
        setDiscounts((prev) => prev.filter((d) => d.id !== deletingDiscount.id));
        setNotification({
          type: 'success',
          message: `Coupon "${deletingDiscount.code}" was permanently deleted.`,
        });
        setDeletingDiscount(null);
      } else {
        setDeleteError(
          res.message || res.error || 'Failed to delete discount due to usage history.'
        );
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'Error occurred while deleting discount.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Deactivate Instead (for used coupons)
  const handleDeactivateInstead = async () => {
    if (!deletingDiscount) return;
    setDeleteSubmitting(true);
    try {
      const res = await toggleDiscountActive(deletingDiscount.id, false);
      if (res.success) {
        setDiscounts((prev) =>
          prev.map((d) => (d.id === deletingDiscount.id ? { ...d, active: false } : d))
        );
        setNotification({
          type: 'success',
          message: `Coupon "${deletingDiscount.code}" was safely deactivated to prevent further customer redemptions while preserving past orders.`,
        });
        setDeletingDiscount(null);
      } else {
        setDeleteError(res.error || 'Failed to deactivate coupon.');
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to deactivate coupon.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-soft-gold/10 text-soft-gold border border-soft-gold/20">
              <Tag className="w-4 h-4" />
            </span>
            <span className="font-tech text-xs uppercase tracking-wider text-soft-gold font-semibold">
              Marketing & Revenue
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Discounts & Promotions
          </h1>
          <p className="font-sans text-xs sm:text-sm text-ivory/60 mt-1 max-w-2xl">
            Manage coupon codes, promotional campaigns, usage quotas, and minimum order requirements.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadDiscounts(true)}
            disabled={refreshing || loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-ivory/80 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-2 text-xs font-sans font-medium"
            title="Refresh discounts"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-soft-gold' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-soft-gold hover:bg-soft-gold/90 text-charcoal font-sans text-xs font-semibold shadow-luxury transition-all flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Create Discount</span>
          </button>
        </div>
      </div>

      {/* 2. Feedback Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <p className="text-xs sm:text-sm font-sans font-medium">{notification.message}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 rounded-lg hover:bg-white/10 text-current transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Summary Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Discounts */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="font-tech text-[10px] sm:text-xs uppercase tracking-wider text-ivory/50 font-semibold">
              Total Discounts
            </span>
            <span className="p-2 rounded-xl bg-soft-gold/10 text-soft-gold border border-soft-gold/20">
              <Tag className="w-4 h-4" />
            </span>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {loading ? <span className="opacity-40 animate-pulse">—</span> : summary.total}
          </div>
          <p className="font-sans text-[11px] text-ivory/40 mt-1">Configured coupons</p>
        </div>

        {/* Active Discounts */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="font-tech text-[10px] sm:text-xs uppercase tracking-wider text-emerald-400/70 font-semibold">
              Active Discounts
            </span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Eye className="w-4 h-4" />
            </span>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-emerald-400 tracking-tight">
            {loading ? <span className="opacity-40 animate-pulse">—</span> : summary.active}
          </div>
          <p className="font-sans text-[11px] text-ivory/40 mt-1">Available at checkout</p>
        </div>

        {/* Expired Discounts */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="font-tech text-[10px] sm:text-xs uppercase tracking-wider text-amber-400/70 font-semibold">
              Expired Discounts
            </span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-amber-400 tracking-tight">
            {loading ? <span className="opacity-40 animate-pulse">—</span> : summary.expired}
          </div>
          <p className="font-sans text-[11px] text-ivory/40 mt-1">Past end date</p>
        </div>

        {/* Total Uses */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="font-tech text-[10px] sm:text-xs uppercase tracking-wider text-cyan-400/70 font-semibold">
              Total Uses
            </span>
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Ticket className="w-4 h-4" />
            </span>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-cyan-400 tracking-tight">
            {loading ? <span className="opacity-40 animate-pulse">—</span> : summary.totalUses}
          </div>
          <p className="font-sans text-[11px] text-ivory/40 mt-1">Orders redeemed</p>
        </div>
      </div>

      {/* 4. Controls Bar (Search, Status Filter, Sort) */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ivory/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by coupon code (e.g. WELCOME10) or description..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2 text-xs sm:text-sm text-white placeholder:text-ivory/30 focus:outline-none focus:border-soft-gold/50 transition-colors uppercase placeholder:normal-case"
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

        {/* Filter Pills & Sort Selector */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Status Filter Buttons */}
          <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs overflow-x-auto">
            {(['all', 'active', 'inactive', 'scheduled', 'expired'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg font-sans font-medium capitalize transition-colors whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-soft-gold text-charcoal font-semibold shadow-sm'
                    : 'text-ivory/70 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
            <SlidersHorizontal className="w-3.5 h-3.5 text-soft-gold" />
            <span className="font-tech text-[10px] uppercase tracking-wider text-ivory/40">
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-ivory/90 font-sans focus:outline-none cursor-pointer"
            >
              <option value="created" className="bg-[#14171A] text-white">
                Created Date
              </option>
              <option value="code" className="bg-[#14171A] text-white">
                Code (A-Z)
              </option>
              <option value="value" className="bg-[#14171A] text-white">
                Value
              </option>
              <option value="usage" className="bg-[#14171A] text-white">
                Usage Count
              </option>
              <option value="start_date" className="bg-[#14171A] text-white">
                Start Date
              </option>
              <option value="end_date" className="bg-[#14171A] text-white">
                End Date
              </option>
            </select>

            {/* Asc / Desc Toggle */}
            <button
              onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="p-1 rounded hover:bg-white/10 text-ivory/60 hover:text-white transition-colors"
              title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortDirection === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 5. Discounts Table & Mobile View */}
      {loading ? (
        <div className="p-16 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 text-soft-gold animate-spin" />
          <p className="font-sans text-xs text-ivory/60">Loading discounts from database...</p>
        </div>
      ) : filteredAndSortedDiscounts.length === 0 ? (
        /* Empty State */
        <div className="p-12 sm:p-16 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-soft-gold/10 border border-soft-gold/20 text-soft-gold flex items-center justify-center mx-auto">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-white">No discounts found</h3>
            <p className="font-sans text-xs text-ivory/50 max-w-sm mx-auto mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'No promotions match the current filter or search criteria. Try clearing your search parameters.'
                : 'There are currently no discount coupons configured. Create your first promotional coupon to get started.'}
            </p>
          </div>
          {searchQuery || statusFilter !== 'all' ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-ivory/80 text-xs font-sans transition-colors"
            >
              Reset Filters
            </button>
          ) : (
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-soft-gold text-charcoal font-sans text-xs font-semibold shadow-luxury transition-all"
            >
              Create First Coupon
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden shadow-luxury">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="py-3.5 px-4 font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-semibold">
                      Coupon Code & Description
                    </th>
                    <th className="py-3.5 px-4 font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-semibold">
                      Type & Value
                    </th>
                    <th className="py-3.5 px-4 font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-semibold">
                      Minimum Order
                    </th>
                    <th className="py-3.5 px-4 font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-semibold text-center">
                      Usage
                    </th>
                    <th className="py-3.5 px-4 font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-semibold">
                      Validity Period
                    </th>
                    <th className="py-3.5 px-4 font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-semibold text-center">
                      Status
                    </th>
                    <th className="py-3.5 px-4 font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAndSortedDiscounts.map((d) => {
                    const status = getDiscountStatus(d);
                    return (
                      <tr
                        key={d.id}
                        className="hover:bg-white/[0.02] transition-colors group"
                      >
                        {/* Code & Description */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-tech text-xs text-soft-gold font-bold bg-soft-gold/10 border border-soft-gold/20 px-2 py-0.5 rounded tracking-wide">
                              {d.code}
                            </span>
                          </div>
                          {d.description && (
                            <p className="font-sans text-xs text-ivory/50 line-clamp-1 mt-1">
                              {d.description}
                            </p>
                          )}
                        </td>

                        {/* Type & Value */}
                        <td className="py-3 px-4">
                          <div className="font-serif text-sm font-bold text-white flex items-center gap-1.5">
                            {d.discountType === 'percentage' ? (
                              <Percent className="w-3.5 h-3.5 text-soft-gold" />
                            ) : (
                              <IndianRupee className="w-3.5 h-3.5 text-soft-gold" />
                            )}
                            <span>{formatDiscountValue(d.discountType, d.discountValue)}</span>
                          </div>
                          {d.maximumDiscountAmount && (
                            <p className="font-sans text-[11px] text-ivory/40 mt-0.5">
                              Cap: ₹{d.maximumDiscountAmount.toLocaleString('en-IN')}
                            </p>
                          )}
                        </td>

                        {/* Minimum Order */}
                        <td className="py-3 px-4 font-sans text-xs text-ivory/70">
                          {d.minimumOrderAmount > 0 ? (
                            <span>₹{d.minimumOrderAmount.toLocaleString('en-IN')} min.</span>
                          ) : (
                            <span className="text-ivory/40">No minimum</span>
                          )}
                        </td>

                        {/* Usage */}
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 font-tech text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                            <Ticket className="w-3 h-3" />
                            <span>
                              {d.usageCount}
                              {d.usageLimit !== null ? ` / ${d.usageLimit}` : ' uses'}
                            </span>
                          </div>
                          {d.perCustomerLimit && (
                            <p className="font-tech text-[9px] text-ivory/40 mt-0.5">
                              Limit {d.perCustomerLimit}/cust.
                            </p>
                          )}
                        </td>

                        {/* Validity Dates */}
                        <td className="py-3 px-4 font-sans text-xs text-ivory/60 space-y-0.5">
                          <div>
                            <span className="text-ivory/40 mr-1">From:</span>
                            <span>{new Date(d.startAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          {d.endAt ? (
                            <div>
                              <span className="text-ivory/40 mr-1">To:</span>
                              <span className={status === 'expired' ? 'text-rose-300 font-medium' : ''}>
                                {new Date(d.endAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-ivory/40 text-[11px]">No expiry</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleActive(d)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-tech text-[10px] uppercase tracking-wider font-semibold border transition-all cursor-pointer hover:opacity-80 active:scale-95 ${
                              status === 'active'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : status === 'scheduled'
                                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                                : status === 'expired'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                : 'bg-white/5 border-white/10 text-ivory/40'
                            }`}
                            title={`Click to ${d.active ? 'deactivate' : 'activate'}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                status === 'active'
                                  ? 'bg-emerald-400 animate-pulse'
                                  : status === 'scheduled'
                                  ? 'bg-cyan-400'
                                  : status === 'expired'
                                  ? 'bg-amber-400'
                                  : 'bg-ivory/40'
                              }`}
                            />
                            <span>{status}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(d)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-ivory/70 hover:text-white transition-colors"
                              title="Edit Discount"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenDeleteModal(d)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 hover:text-rose-200 transition-colors"
                              title={d.usageCount > 0 ? 'Protected: Coupon has order history' : 'Delete Coupon'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Grid */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredAndSortedDiscounts.map((d) => {
              const status = getDiscountStatus(d);
              return (
                <div
                  key={d.id}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-tech text-xs text-soft-gold font-bold bg-soft-gold/10 border border-soft-gold/20 px-2 py-0.5 rounded">
                        {d.code}
                      </span>
                      {d.description && (
                        <p className="font-sans text-xs text-ivory/60 mt-1">{d.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleActive(d)}
                      className={`font-tech text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${
                        status === 'active'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : status === 'scheduled'
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                          : status === 'expired'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-white/5 border-white/10 text-ivory/40'
                      }`}
                    >
                      {status}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-white/5">
                    <div>
                      <span className="text-ivory/40 block text-[10px]">Reward</span>
                      <span className="font-serif font-bold text-white text-sm">
                        {formatDiscountValue(d.discountType, d.discountValue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-ivory/40 block text-[10px]">Usage</span>
                      <span className="font-tech text-xs text-cyan-300 font-semibold">
                        {d.usageCount} {d.usageLimit !== null ? `/ ${d.usageLimit}` : 'uses'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[11px] text-ivory/50">
                      {d.minimumOrderAmount > 0 ? `Min: ₹${d.minimumOrderAmount}` : 'No min.'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(d)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-ivory/80"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(d)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 6. Create / Edit Discount Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={() => !formSubmitting && setIsFormModalOpen(false)}
          />

          <div className="relative w-full max-w-lg rounded-2xl bg-[#14171A] border border-white/10 shadow-luxury overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-soft-gold/10 text-soft-gold border border-soft-gold/20">
                  <Tag className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-serif text-lg font-bold text-white">
                    {editingDiscount ? 'Edit Discount Coupon' : 'Create New Discount'}
                  </h3>
                  <p className="font-sans text-[11px] text-ivory/50">
                    {editingDiscount
                      ? `Updating details for "${editingDiscount.code}"`
                      : 'Define promotional parameters, quotas, and expiration'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsFormModalOpen(false)}
                disabled={formSubmitting}
                className="p-1.5 rounded-lg text-ivory/50 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs font-sans flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Code */}
              <div>
                <label className="block font-tech text-[10px] uppercase tracking-wider text-ivory/70 font-semibold mb-1.5">
                  Coupon Code <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="e.g. WELCOME10"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 font-tech text-xs sm:text-sm text-soft-gold font-bold uppercase placeholder:normal-case placeholder:font-sans focus:outline-none focus:border-soft-gold/60 transition-colors"
                />
                <p className="font-sans text-[10px] text-ivory/40 mt-1">
                  Automatically converted to uppercase.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block font-tech text-[10px] uppercase tracking-wider text-ivory/70 font-semibold mb-1.5">
                  Description / Campaign Note
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. 10% Welcome gift for first-time shoppers"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-soft-gold/60 transition-colors"
                />
              </div>

              {/* Type & Value Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-tech text-[10px] uppercase tracking-wider text-ivory/70 font-semibold mb-1.5">
                    Discount Type
                  </label>
                  <select
                    value={formDiscountType}
                    onChange={(e) => setFormDiscountType(e.target.value as DiscountType)}
                    className="w-full bg-[#1A1D20] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-soft-gold/60 cursor-pointer"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-tech text-[10px] uppercase tracking-wider text-ivory/70 font-semibold mb-1.5">
                    {formDiscountType === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={formDiscountType === 'percentage' ? '100' : undefined}
                    step="1"
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-soft-gold/60 transition-colors"
                  />
                </div>
              </div>

              {/* Minimum Order & Max Discount (Cap) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-tech text-[10px] uppercase tracking-wider text-ivory/70 font-semibold mb-1.5">
                    Minimum Order (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formMinOrder}
                    onChange={(e) => setFormMinOrder(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-soft-gold/60 transition-colors"
                  />
                  <p className="font-sans text-[10px] text-ivory/40 mt-1">
                    0 = No minimum subtotal
                  </p>
                </div>

                <div>
                  <label className="block font-tech text-[10px] uppercase tracking-wider text-ivory/70 font-semibold mb-1.5">
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formMaxDiscount}
                    onChange={(e) => setFormMaxDiscount(e.target.value)}
                    placeholder="Optional (e.g. 500)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-soft-gold/60 transition-colors"
                  />
                  <p className="font-sans text-[10px] text-ivory/40 mt-1">
                    Upper limit for % discount
                  </p>
                </div>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-tech text-[10px] uppercase tracking-wider text-ivory/70 font-semibold mb-1.5">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formStartAt}
                    onChange={(e) => setFormStartAt(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-soft-gold/60 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-tech text-[10px] uppercase tracking-wider text-ivory/70 font-semibold mb-1.5">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formEndAt}
                    onChange={(e) => setFormEndAt(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-soft-gold/60 transition-colors"
                  />
                  <p className="font-sans text-[10px] text-ivory/40 mt-1">
                    Leave blank for no expiry
                  </p>
                </div>
              </div>

              {/* Usage Quotas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-tech text-[10px] uppercase tracking-wider text-ivory/70 font-semibold mb-1.5">
                    Total Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formUsageLimit}
                    onChange={(e) => setFormUsageLimit(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-soft-gold/60 transition-colors"
                  />
                  <p className="font-sans text-[10px] text-ivory/40 mt-1">
                    Blank = Unlimited uses
                  </p>
                </div>

                <div>
                  <label className="block font-tech text-[10px] uppercase tracking-wider text-ivory/70 font-semibold mb-1.5">
                    Per Customer Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formPerCustomerLimit}
                    onChange={(e) => setFormPerCustomerLimit(e.target.value)}
                    placeholder="1"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-soft-gold/60 transition-colors"
                  />
                  <p className="font-sans text-[10px] text-ivory/40 mt-1">
                    Max uses per user email
                  </p>
                </div>
              </div>

              {/* Active Status */}
              <div className="pt-2">
                <label className="block font-tech text-[10px] uppercase tracking-wider text-ivory/70 font-semibold mb-1.5">
                  Coupon Status
                </label>
                <button
                  type="button"
                  onClick={() => setFormIsActive((prev) => !prev)}
                  className={`w-full py-2.5 px-3 rounded-xl border text-xs font-sans font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    formIsActive
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-ivory/50'
                  }`}
                >
                  {formIsActive ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Active (Redeemable at Checkout)</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-ivory/40" />
                      <span>Inactive (Disabled)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-ivory/80 text-xs font-sans transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-soft-gold hover:bg-soft-gold/90 text-charcoal font-sans text-xs font-semibold shadow-luxury transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingDiscount ? 'Save Changes' : 'Create Discount'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Delete Safety Modal */}
      {deletingDiscount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={() => !deleteSubmitting && setDeletingDiscount(null)}
          />

          <div className="relative w-full max-w-md rounded-2xl bg-[#14171A] border border-white/10 shadow-luxury overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`p-2 rounded-xl border ${
                    deletingDiscount.usageCount > 0
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {deletingDiscount.usageCount > 0 ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </span>
                <h3 className="font-serif text-lg font-bold text-white">
                  {deletingDiscount.usageCount > 0 ? 'Cannot Delete Coupon' : 'Delete Coupon'}
                </h3>
              </div>

              <button
                onClick={() => setDeletingDiscount(null)}
                disabled={deleteSubmitting}
                className="p-1.5 rounded-lg text-ivory/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs font-sans flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              {deletingDiscount.usageCount > 0 ? (
                /* Usage Guardrail */
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-sans space-y-2">
                    <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Financial Record Protection</span>
                    </p>
                    <p>
                      Coupon <strong>{deletingDiscount.code}</strong> has already been redeemed in{' '}
                      <strong>{deletingDiscount.usageCount} order(s)</strong>.
                    </p>
                    <p className="text-amber-200/80">
                      Permanently deleting this coupon would corrupt historical order audit trails and
                      reporting. Deletion is blocked to preserve data integrity.
                    </p>
                  </div>

                  <p className="font-sans text-xs text-ivory/70">
                    <strong>Recommended Action:</strong> Deactivate the coupon instead. Customers will
                    no longer be able to use it, while all historical orders remain accurately preserved.
                  </p>
                </div>
              ) : (
                /* Unused coupon: Safe to delete */
                <div className="space-y-2">
                  <p className="font-sans text-sm text-ivory/80">
                    Are you sure you want to permanently delete discount coupon{' '}
                    <strong className="text-white">"{deletingDiscount.code}"</strong>?
                  </p>
                  <p className="font-sans text-xs text-rose-300/80">
                    This coupon has 0 customer redemptions and can be safely removed. This action
                    cannot be undone.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setDeletingDiscount(null)}
                  disabled={deleteSubmitting}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-ivory/80 text-xs font-sans transition-colors"
                >
                  Cancel
                </button>

                {deletingDiscount.usageCount > 0 ? (
                  <button
                    type="button"
                    onClick={handleDeactivateInstead}
                    disabled={deleteSubmitting}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-charcoal font-sans text-xs font-semibold shadow-luxury transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {deleteSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Deactivate Instead</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={deleteSubmitting}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-sans text-xs font-semibold shadow-luxury transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {deleteSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
