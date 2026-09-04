'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  getInventoryWithProducts,
  adjustStock,
  updateLowStockThreshold,
  getInventoryAuditLogs,
} from '@/lib/inventory';
import { getCategories } from '@/lib/categories';
import { getAdminProfile, AdminProfile } from '@/lib/auth';
import { ProductInventoryView, CategoryItem, InventoryAuditLog } from '@/types';
import {
  Boxes,
  Search,
  Filter,
  Plus,
  Minus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  History,
  TrendingDown,
  TrendingUp,
  Package,
  Layers,
  Settings2,
  Check,
  Loader2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
} from 'lucide-react';

export default function AdminInventoryPage() {
  const [items, setItems] = useState<ProductInventoryView[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStockStatus, setSelectedStockStatus] = useState('all');

  // Single Stock Adjustment Modal State
  const [adjustingItem, setAdjustingItem] = useState<ProductInventoryView | null>(null);
  const [adjustmentMode, setAdjustmentMode] = useState<'add' | 'remove'>('add');
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('5');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('New stock received');
  const [customReason, setCustomReason] = useState<string>('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Threshold Edit Modal State
  const [editingThresholdItem, setEditingThresholdItem] = useState<ProductInventoryView | null>(null);
  const [newThresholdValue, setNewThresholdValue] = useState<string>('5');
  const [thresholdSubmitting, setThresholdSubmitting] = useState(false);
  const [thresholdError, setThresholdError] = useState<string | null>(null);

  // History / Audit Logs Drawer State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<InventoryAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Bulk Adjustment State
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<'add' | 'remove'>('add');
  const [bulkAmount, setBulkAmount] = useState<string>('10');
  const [bulkReason, setBulkReason] = useState<string>('Batch restock arrival');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Load Inventory Data
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [invData, catData, profile] = await Promise.all([
        getInventoryWithProducts(),
        getCategories(),
        getAdminProfile(),
      ]);

      setItems(invData);
      setCategories(catData);
      setAdminProfile(profile);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setNotification({ type: 'error', message: 'Failed to query inventory database.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load Audit History
  const handleOpenHistory = async () => {
    setIsHistoryOpen(true);
    setAuditLoading(true);
    try {
      const logs = await getInventoryAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  // Open Single Stock Adjustment Modal
  const handleOpenAdjustModal = (item: ProductInventoryView, defaultMode: 'add' | 'remove' = 'add') => {
    setAdjustingItem(item);
    setAdjustmentMode(defaultMode);
    setAdjustmentAmount('5');
    setAdjustmentReason(defaultMode === 'add' ? 'New stock received' : 'Damaged item');
    setCustomReason('');
    setAdjustError(null);
  };

  // Submit Single Stock Adjustment
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem || !adminProfile) return;

    const amt = Number(adjustmentAmount);
    if (isNaN(amt) || amt <= 0) {
      setAdjustError('Please enter a valid positive quantity to adjust.');
      return;
    }

    const delta = adjustmentMode === 'add' ? amt : -amt;
    const finalReason = adjustmentReason === 'Other' ? customReason.trim() : adjustmentReason;

    if (!finalReason) {
      setAdjustError('Please provide a reason or note for this inventory adjustment.');
      return;
    }

    // Client preview validation
    const projectedQuantity = adjustingItem.inventory.quantity + delta;
    if (projectedQuantity < 0) {
      setAdjustError(
        `Cannot remove ${amt} unit(s). Current stock is only ${adjustingItem.inventory.quantity}. Stock cannot be negative.`
      );
      return;
    }

    setAdjustSubmitting(true);
    setAdjustError(null);

    try {
      // Call secure server adjustment
      const res = await adjustStock({
        productId: adjustingItem.product.id,
        delta,
        reason: finalReason,
        adminProfile,
        productName: adjustingItem.product.name,
      });

      if (!res.success) {
        setAdjustError(res.error || 'Failed to update stock in database.');
        setAdjustSubmitting(false);
        return;
      }

      setNotification({
        type: 'success',
        message: `Updated "${adjustingItem.product.name}" stock by ${delta > 0 ? `+${delta}` : delta} units.`,
      });

      setAdjustingItem(null);
      await loadData(true);
    } catch (err: any) {
      setAdjustError(err?.message || 'An unexpected error occurred.');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Open Threshold Edit Modal
  const handleOpenThresholdModal = (item: ProductInventoryView) => {
    setEditingThresholdItem(item);
    setNewThresholdValue(String(item.inventory.lowStockThreshold));
    setThresholdError(null);
  };

  // Submit Threshold Update
  const handleThresholdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingThresholdItem || !adminProfile) return;

    const val = Number(newThresholdValue);
    if (isNaN(val) || val < 0) {
      setThresholdError('Low-stock threshold must be a non-negative number.');
      return;
    }

    setThresholdSubmitting(true);
    setThresholdError(null);

    try {
      const res = await updateLowStockThreshold({
        productId: editingThresholdItem.product.id,
        threshold: val,
        adminProfile,
        productName: editingThresholdItem.product.name,
      });

      if (!res.success) {
        setThresholdError(res.error || 'Failed to update threshold.');
        setThresholdSubmitting(false);
        return;
      }

      setNotification({
        type: 'success',
        message: `Low-stock threshold for "${editingThresholdItem.product.name}" set to ${val}.`,
      });

      setEditingThresholdItem(null);
      await loadData(true);
    } catch (err: any) {
      setThresholdError(err?.message || 'Error updating threshold.');
    } finally {
      setThresholdSubmitting(false);
    }
  };

  // Toggle Selection for Bulk Action
  const toggleSelectProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProductIds.length === filteredItems.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredItems.map((item) => item.product.id));
    }
  };

  // Submit Bulk Adjustment
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductIds.length === 0 || !adminProfile) return;

    const amt = Number(bulkAmount);
    if (isNaN(amt) || amt <= 0) {
      setBulkError('Adjustment amount must be a positive number.');
      return;
    }

    const delta = bulkMode === 'add' ? amt : -amt;

    // Check every selected product against negative stock
    const selectedItems = items.filter((i) => selectedProductIds.includes(i.product.id));
    const failingItems = selectedItems.filter((i) => i.inventory.quantity + delta < 0);

    if (failingItems.length > 0) {
      setBulkError(
        `Cannot remove ${amt} units from ${failingItems[0].product.name} (only ${failingItems[0].inventory.quantity} in stock). Adjustments must not cause negative stock.`
      );
      return;
    }

    setBulkSubmitting(true);
    setBulkError(null);

    try {
      let successCount = 0;
      for (const item of selectedItems) {
        const res = await adjustStock({
          productId: item.product.id,
          delta,
          reason: bulkReason,
          adminProfile,
          productName: item.product.name,
        });
        if (res.success) successCount++;
      }

      setNotification({
        type: 'success',
        message: `Bulk adjustment applied to ${successCount} product(s).`,
      });

      setIsBulkModalOpen(false);
      setSelectedProductIds([]);
      await loadData(true);
    } catch (err: any) {
      setBulkError(err?.message || 'Bulk operation failed.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Filter & Search Logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Search (name or slug)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.product.name.toLowerCase().includes(q);
        const matchSlug = item.product.slug ? item.product.slug.toLowerCase().includes(q) : false;
        if (!matchName && !matchSlug) return false;
      }

      // 2. Category
      if (selectedCategory !== 'all' && item.product.category !== selectedCategory) {
        return false;
      }

      // 3. Stock Status
      if (selectedStockStatus !== 'all') {
        if (selectedStockStatus !== item.stockStatus) return false;
      }

      return true;
    });
  }, [items, searchQuery, selectedCategory, selectedStockStatus]);

  // Reset Filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedStockStatus('all');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' || selectedCategory !== 'all' || selectedStockStatus !== 'all';

  // Summary Metrics
  const summary = useMemo(() => {
    const totalUnits = items.reduce((acc, i) => acc + i.inventory.quantity, 0);
    const totalReserved = items.reduce((acc, i) => acc + i.inventory.reservedQuantity, 0);
    const lowStockCount = items.filter((i) => i.stockStatus === 'low_stock').length;
    const outOfStockCount = items.filter((i) => i.stockStatus === 'out_of_stock').length;
    return { totalUnits, totalReserved, lowStockCount, outOfStockCount };
  }, [items]);

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header & Summary Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-wide">
              Inventory & Stock Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-tech font-bold uppercase tracking-wider bg-soft-gold/20 text-soft-gold border border-soft-gold/30">
              {items.length} Products
            </span>
          </div>
          <p className="font-sans text-xs sm:text-sm text-ivory/60 mt-1">
            Real-time stock level monitoring, safe quantity adjustments, and audit trail logging.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenHistory}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ivory text-xs font-sans font-medium flex items-center gap-2 border border-white/10 transition-colors cursor-pointer"
            title="View inventory audit logs"
          >
            <History className="w-3.5 h-3.5 text-soft-gold" />
            <span>Audit History</span>
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ivory text-xs font-sans font-medium flex items-center gap-2 border border-white/10 transition-colors cursor-pointer"
            title="Refresh inventory from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-soft-gold' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Inventory Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <p className="font-tech text-[10px] uppercase tracking-wider text-ivory/50">Total On Hand</p>
          <p className="font-tech text-2xl font-bold text-white">{summary.totalUnits.toLocaleString()}</p>
          <p className="font-sans text-[11px] text-ivory/40">Physical units in inventory</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <p className="font-tech text-[10px] uppercase tracking-wider text-ivory/50">Reserved</p>
          <p className="font-tech text-2xl font-bold text-amber-400">{summary.totalReserved}</p>
          <p className="font-sans text-[11px] text-ivory/40">Allocated for pending orders</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <p className="font-tech text-[10px] uppercase tracking-wider text-rose-400/80">Low Stock Alert</p>
          <p className="font-tech text-2xl font-bold text-rose-400">{summary.lowStockCount}</p>
          <p className="font-sans text-[11px] text-ivory/40">&le; threshold alert items</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <p className="font-tech text-[10px] uppercase tracking-wider text-ivory/50">Out of Stock</p>
          <p className="font-tech text-2xl font-bold text-ivory/80">{summary.outOfStockCount}</p>
          <p className="font-sans text-[11px] text-ivory/40">Products with 0 available units</p>
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

      {/* 4. Filter Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-ivory/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product by title or slug..."
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

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-[#14171A] border border-white/10 rounded-xl text-ivory text-xs focus:outline-none focus:border-soft-gold"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div>
            <select
              value={selectedStockStatus}
              onChange={(e) => setSelectedStockStatus(e.target.value)}
              className="w-full px-3 py-2 bg-[#14171A] border border-white/10 rounded-xl text-ivory text-xs focus:outline-none focus:border-soft-gold"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock (Normal)</option>
              <option value="low_stock">Low Stock (&le; Threshold)</option>
              <option value="out_of_stock">Out of Stock (0 Units)</option>
            </select>
          </div>
        </div>

        {/* Action Controls & Bulk Selection Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-3">
            {selectedProductIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-soft-gold/20 text-soft-gold font-tech text-xs font-bold">
                  {selectedProductIds.length} Selected
                </span>
                <button
                  onClick={() => {
                    setBulkError(null);
                    setIsBulkModalOpen(true);
                  }}
                  className="px-3 py-1 rounded-lg bg-soft-gold hover:bg-[#E5C158] text-charcoal text-xs font-sans font-bold transition-all shadow-luxury cursor-pointer"
                >
                  Bulk Adjust Stock
                </button>
                <button
                  onClick={() => setSelectedProductIds([])}
                  className="text-ivory/50 hover:text-white text-xs font-tech ml-1"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="font-tech text-xs text-ivory/50">
              Showing <span className="text-soft-gold font-bold">{filteredItems.length}</span> of{' '}
              {items.length} creations
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
      </div>

      {/* 5. Inventory Table */}
      {loading ? (
        <div className="p-12 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3 text-ivory/60">
          <Loader2 className="w-6 h-6 animate-spin text-soft-gold" />
          <p className="font-sans text-xs">Querying product inventory records from Supabase...</p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-ivory/50 font-tech uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      selectedProductIds.length === filteredItems.length && filteredItems.length > 0
                    }
                    onChange={handleSelectAll}
                    className="rounded bg-white/10 border-white/20 text-soft-gold focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Creation</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">On Hand</th>
                <th className="py-3.5 px-4">Reserved</th>
                <th className="py-3.5 px-4">Available</th>
                <th className="py-3.5 px-4">Threshold</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredItems.map((item) => (
                <tr key={item.product.id} className="hover:bg-white/[0.02] transition-colors group">
                  {/* Select Checkbox */}
                  <td className="py-4 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(item.product.id)}
                      onChange={() => toggleSelectProduct(item.product.id)}
                      className="rounded bg-white/10 border-white/20 text-soft-gold focus:ring-0 cursor-pointer"
                    />
                  </td>

                  {/* Creation Title & Thumbnail */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.product.image || '/images/products/tote-bag.jpg'}
                          alt={item.product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="min-w-0 max-w-xs">
                        <p className="font-serif text-xs sm:text-sm font-semibold text-white truncate group-hover:text-soft-gold transition-colors">
                          {item.product.name}
                        </p>
                        <p className="font-tech text-[10px] text-ivory/40 truncate">
                          /{item.product.slug || item.product.id}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-tech uppercase font-medium bg-white/5 text-ivory/80 border border-white/10">
                      {item.product.category}
                    </span>
                  </td>

                  {/* Total Quantity (On Hand) */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="font-tech font-bold text-sm text-white">
                      {item.inventory.quantity}
                    </span>
                  </td>

                  {/* Reserved Quantity */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="font-tech text-xs text-amber-400">
                      {item.inventory.reservedQuantity}
                    </span>
                  </td>

                  {/* Available Quantity */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span
                      className={`font-tech font-bold text-sm ${
                        item.availableQuantity > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {item.availableQuantity}
                    </span>
                  </td>

                  {/* Low Stock Threshold (Click to edit) */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <button
                      onClick={() => handleOpenThresholdModal(item)}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-ivory/70 hover:text-white border border-white/5 transition-colors cursor-pointer"
                      title="Click to adjust low stock threshold"
                    >
                      <span className="font-tech text-xs">{item.inventory.lowStockThreshold}</span>
                      <Settings2 className="w-3 h-3 text-ivory/40" />
                    </button>
                  </td>

                  {/* Status Badge */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    {item.stockStatus === 'out_of_stock' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-tech font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Out of Stock
                      </span>
                    ) : item.stockStatus === 'low_stock' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-tech font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Low Stock
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-tech font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        In Stock
                      </span>
                    )}
                  </td>

                  {/* Quick Action Buttons */}
                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => handleOpenAdjustModal(item, 'add')}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 font-sans text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Add Stock"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>

                      <button
                        onClick={() => handleOpenAdjustModal(item, 'remove')}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-sans text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Remove Stock"
                      >
                        <Minus className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-20 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-ivory/40">
            <Boxes className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-lg font-bold text-white">No inventory records found</h3>
          <p className="font-sans text-xs text-ivory/50 max-w-xs mx-auto leading-relaxed">
            No products match the selected criteria. Try adjusting your search query or filters.
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-soft-gold text-charcoal font-sans text-xs font-bold shadow-luxury cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* 6. Stock Adjustment Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => !adjustSubmitting && setAdjustingItem(null)}
          />

          <div className="relative w-full max-w-md bg-[#14171A] border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-serif text-xl font-bold text-white">Adjust Stock Level</h3>
                <p className="font-sans text-xs text-ivory/60 truncate max-w-xs mt-0.5">
                  {adjustingItem.product.name}
                </p>
              </div>
              <button
                onClick={() => !adjustSubmitting && setAdjustingItem(null)}
                className="p-1.5 rounded-lg text-ivory/40 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error in modal */}
            {adjustError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{adjustError}</span>
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              {/* Current Stock Banner */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                <div>
                  <p className="font-tech text-[10px] uppercase text-ivory/50">Current</p>
                  <p className="font-tech font-bold text-sm text-white">
                    {adjustingItem.inventory.quantity}
                  </p>
                </div>
                <div>
                  <p className="font-tech text-[10px] uppercase text-ivory/50">Reserved</p>
                  <p className="font-tech font-bold text-sm text-amber-400">
                    {adjustingItem.inventory.reservedQuantity}
                  </p>
                </div>
                <div>
                  <p className="font-tech text-[10px] uppercase text-ivory/50">Available</p>
                  <p className="font-tech font-bold text-sm text-emerald-400">
                    {adjustingItem.availableQuantity}
                  </p>
                </div>
              </div>

              {/* Mode Toggle (Add vs Remove) */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setAdjustmentMode('add')}
                  className={`py-2 rounded-lg text-xs font-sans font-bold flex items-center justify-center gap-1.5 transition-all ${
                    adjustmentMode === 'add'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-ivory/60 hover:text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stock</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustmentMode('remove')}
                  className={`py-2 rounded-lg text-xs font-sans font-bold flex items-center justify-center gap-1.5 transition-all ${
                    adjustmentMode === 'remove'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-ivory/60 hover:text-white'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Remove Stock</span>
                </button>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                  Quantity to {adjustmentMode === 'add' ? 'Add' : 'Remove'} *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder-ivory/30 focus:outline-none focus:border-soft-gold text-xs font-tech"
                />
              </div>

              {/* Reason / Audit Note */}
              <div>
                <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                  Reason / Audit Note *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'New stock received',
                    'Damaged item',
                    'Manual correction',
                    'Returned item',
                    'Stock count correction',
                    'Other',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAdjustmentReason(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-sans font-medium transition-colors ${
                        adjustmentReason === preset
                          ? 'bg-soft-gold text-charcoal font-bold'
                          : 'bg-white/5 text-ivory/60 hover:bg-white/10'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {adjustmentReason === 'Other' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom audit note..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder-ivory/30 focus:outline-none focus:border-soft-gold text-xs mt-1"
                  />
                )}
              </div>

              {/* Live Preview */}
              <div className="p-3 rounded-xl bg-soft-gold/5 border border-soft-gold/20 flex items-center justify-between text-xs font-tech">
                <span className="text-ivory/70">Projected Total On Hand:</span>
                <span className="text-soft-gold font-bold text-sm">
                  {Math.max(
                    0,
                    adjustingItem.inventory.quantity +
                      (adjustmentMode === 'add'
                        ? Number(adjustmentAmount) || 0
                        : -(Number(adjustmentAmount) || 0))
                  )}{' '}
                  units
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={adjustSubmitting}
                  onClick={() => setAdjustingItem(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ivory text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="px-5 py-2 rounded-xl bg-soft-gold hover:bg-[#E5C158] text-charcoal text-xs font-sans font-bold flex items-center gap-1.5 shadow-luxury cursor-pointer disabled:opacity-50"
                >
                  {adjustSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording Adjustment...</span>
                    </>
                  ) : (
                    <span>Confirm Adjustment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Low Stock Threshold Edit Modal */}
      {editingThresholdItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => !thresholdSubmitting && setEditingThresholdItem(null)}
          />

          <div className="relative w-full max-w-sm bg-[#14171A] border border-white/15 rounded-3xl p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Edit Stock Threshold</h3>
                <p className="font-sans text-xs text-ivory/60 truncate max-w-xs mt-0.5">
                  {editingThresholdItem.product.name}
                </p>
              </div>
              <button
                onClick={() => !thresholdSubmitting && setEditingThresholdItem(null)}
                className="p-1.5 rounded-lg text-ivory/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {thresholdError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200">
                {thresholdError}
              </div>
            )}

            <form onSubmit={handleThresholdSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                  Low Stock Threshold Units *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={newThresholdValue}
                  onChange={(e) => setNewThresholdValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder-ivory/30 focus:outline-none focus:border-soft-gold text-xs font-tech"
                />
                <p className="font-tech text-[10px] text-ivory/40 mt-1">
                  Triggers &quot;Low Stock&quot; alert badge when on-hand quantity falls &le; this number.
                </p>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={thresholdSubmitting}
                  onClick={() => setEditingThresholdItem(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ivory text-xs font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={thresholdSubmitting}
                  className="px-5 py-2 rounded-xl bg-soft-gold hover:bg-[#E5C158] text-charcoal text-xs font-sans font-bold flex items-center gap-1.5 shadow-luxury disabled:opacity-50"
                >
                  {thresholdSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Update Threshold</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Bulk Stock Adjustment Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => !bulkSubmitting && setIsBulkModalOpen(false)}
          />

          <div className="relative w-full max-w-lg bg-[#14171A] border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-serif text-xl font-bold text-white">Bulk Stock Adjustment</h3>
                <p className="font-sans text-xs text-soft-gold mt-0.5">
                  Modifying {selectedProductIds.length} selected products simultaneously
                </p>
              </div>
              <button
                onClick={() => !bulkSubmitting && setIsBulkModalOpen(false)}
                className="p-1.5 rounded-lg text-ivory/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bulkError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200">
                {bulkError}
              </div>
            )}

            <form onSubmit={handleBulkSubmit} className="space-y-4">
              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setBulkMode('add')}
                  className={`py-2 rounded-lg text-xs font-sans font-bold flex items-center justify-center gap-1.5 ${
                    bulkMode === 'add'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-ivory/60 hover:text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Selected</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBulkMode('remove')}
                  className={`py-2 rounded-lg text-xs font-sans font-bold flex items-center justify-center gap-1.5 ${
                    bulkMode === 'remove'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-ivory/60 hover:text-white'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Remove from Selected</span>
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                  Quantity Units per Item *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={bulkAmount}
                  onChange={(e) => setBulkAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory text-xs font-tech"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                  Audit Reason / Note *
                </label>
                <input
                  type="text"
                  required
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory text-xs font-sans"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={bulkSubmitting}
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ivory text-xs font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="px-5 py-2 rounded-xl bg-soft-gold hover:bg-[#E5C158] text-charcoal text-xs font-sans font-bold flex items-center gap-1.5 shadow-luxury disabled:opacity-50"
                >
                  {bulkSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Applying to {selectedProductIds.length} items...</span>
                    </>
                  ) : (
                    <span>Apply Bulk Adjustment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Audit History Drawer */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsHistoryOpen(false)}
          />

          <div className="relative w-full max-w-lg h-full bg-[#14171A] border-l border-white/15 p-6 sm:p-8 shadow-2xl z-10 flex flex-col justify-between overflow-y-auto space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-soft-gold/10 border border-soft-gold/20 flex items-center justify-center text-soft-gold">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-white">Inventory Audit Logs</h3>
                    <p className="font-sans text-xs text-ivory/50">Historical record of all stock adjustments</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-2 rounded-xl text-ivory/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {auditLoading ? (
                <div className="py-16 text-center space-y-2 text-ivory/50">
                  <Loader2 className="w-6 h-6 animate-spin text-soft-gold mx-auto" />
                  <p className="font-sans text-xs">Loading audit records from database...</p>
                </div>
              ) : auditLogs.length > 0 ? (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-xs font-semibold text-white">
                          {log.productName || 'Inventory Item'}
                        </span>
                        <span className="font-tech text-[10px] text-ivory/40">
                          {new Date(log.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-tech font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                              (log.delta ?? 0) >= 0
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {(log.delta ?? 0) > 0 ? `+${log.delta}` : log.delta ?? 'Update'} units
                          </span>
                          {log.oldQuantity !== undefined && log.newQuantity !== undefined && (
                            <span className="font-tech text-[11px] text-ivory/60">
                              {log.oldQuantity} &rarr; {log.newQuantity}
                            </span>
                          )}
                        </div>

                        <span className="font-sans text-[10px] text-ivory/50 truncate max-w-[140px]">
                          {log.userEmail || 'Admin'}
                        </span>
                      </div>

                      {log.reason && (
                        <p className="font-sans text-[11px] text-ivory/70 italic bg-white/[0.02] p-2 rounded-lg border border-white/5">
                          &ldquo;{log.reason}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center space-y-3 bg-white/[0.02] rounded-2xl border border-dashed border-white/10 p-6">
                  <FileText className="w-8 h-8 text-ivory/30 mx-auto" />
                  <h4 className="font-serif text-sm font-semibold text-white">No adjustments recorded yet</h4>
                  <p className="font-sans text-xs text-ivory/50 leading-relaxed">
                    When stock changes or threshold edits are made, an immutable audit entry will be recorded here.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-sans text-xs font-semibold"
              >
                Close Audit Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
