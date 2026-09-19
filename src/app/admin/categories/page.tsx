'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryActiveStatus,
  uploadCategoryImage,
  slugifyCategory,
} from '@/lib/categories';
import { AdminCategory } from '@/types';
import {
  Layers,
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
  Upload,
  ArrowUp,
  ArrowDown,
  Info,
  Check,
  Package,
  SlidersHorizontal,
  Image as ImageIcon,
  FolderPlus,
  ShieldAlert,
} from 'lucide-react';

const PRESET_IMAGES = [
  { label: 'Crochet Bags', url: '/images/categories/crochet-bags.jpg' },
  { label: 'Crochet Toys', url: '/images/categories/crochet-toys.jpg' },
  { label: 'Crochet Kitchens', url: '/images/categories/crochet-kitchens.jpg' },
  { label: 'Crochet Gifts', url: '/images/categories/crochet-gifts.jpg' },
  { label: 'Dream Catchers', url: '/images/categories/dream-catchers.jpg' },
  { label: 'Table Mats', url: '/images/categories/table-mats.jpg' },
];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'display_order' | 'name' | 'products' | 'created'>('display_order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Modal States: Add / Edit
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formSlugManuallyEdited, setFormSlugManuallyEdited] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('/images/categories/crochet-bags.jpg');
  const [formDisplayOrder, setFormDisplayOrder] = useState('1');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Image upload state within modal
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal State: Delete / Safety Modal
  const [deletingCategory, setDeletingCategory] = useState<AdminCategory | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load Categories Data
  const loadCategories = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getAdminCategories();
      if (res.success) {
        setCategories(res.categories);
      } else {
        setNotification({
          type: 'error',
          message: res.error || 'Failed to load categories from database.',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.message || 'Network error fetching categories.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Auto-clear notification after 5 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Summary Metrics
  const summary = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.isActive).length;
    const inactive = total - active;
    const withProducts = categories.filter((c) => c.productCount > 0).length;
    return { total, active, inactive, withProducts };
  }, [categories]);

  // Filter and Sort Categories
  const filteredAndSortedCategories = useMemo(() => {
    return categories
      .filter((cat) => {
        // Status Filter
        if (statusFilter === 'active' && !cat.isActive) return false;
        if (statusFilter === 'inactive' && cat.isActive) return false;

        // Search Query (name or slug)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = cat.name.toLowerCase().includes(q);
          const matchesSlug = cat.slug.toLowerCase().includes(q);
          const matchesDesc = cat.description?.toLowerCase().includes(q);
          if (!matchesName && !matchesSlug && !matchesDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'name') {
          diff = a.name.localeCompare(b.name);
        } else if (sortBy === 'products') {
          diff = a.productCount - b.productCount;
        } else if (sortBy === 'display_order') {
          diff = a.displayOrder - b.displayOrder;
        } else if (sortBy === 'created') {
          diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }

        return sortDirection === 'asc' ? diff : -diff;
      });
  }, [categories, statusFilter, searchQuery, sortBy, sortDirection]);

  // Open Form Modal for Create
  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormSlug('');
    setFormSlugManuallyEdited(false);
    setFormDescription('');
    setFormImageUrl('/images/categories/crochet-bags.jpg');
    // Set next display order
    const maxOrder = categories.reduce((max, c) => Math.max(max, c.displayOrder), 0);
    setFormDisplayOrder(String(maxOrder + 1));
    setFormIsActive(true);
    setFormError(null);
    setImageUploadError(null);
    setIsFormModalOpen(true);
  };

  // Open Form Modal for Edit
  const handleOpenEditModal = (cat: AdminCategory) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormSlugManuallyEdited(true); // Don't auto-override existing slug
    setFormDescription(cat.description || '');
    setFormImageUrl(cat.imageUrl || '/images/categories/crochet-bags.jpg');
    setFormDisplayOrder(String(cat.displayOrder));
    setFormIsActive(cat.isActive);
    setFormError(null);
    setImageUploadError(null);
    setIsFormModalOpen(true);
  };

  // Name change handler with auto-slug generation
  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!formSlugManuallyEdited) {
      setFormSlug(slugifyCategory(val));
    }
  };

  // Slug change handler
  const handleSlugChange = (val: string) => {
    setFormSlug(slugifyCategory(val));
    setFormSlugManuallyEdited(true);
  };

  // Handle Image File Selection & Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadLoading(true);
    setImageUploadError(null);

    try {
      const res = await uploadCategoryImage(file, formSlug || formName || 'category');
      if (res.publicUrl) {
        setFormImageUrl(res.publicUrl);
        setNotification({
          type: 'success',
          message: 'Image uploaded successfully.',
        });
      } else {
        setImageUploadError(res.error || 'Failed to upload image.');
      }
    } catch (err: any) {
      setImageUploadError(err?.message || 'Error uploading file.');
    } finally {
      setImageUploadLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Submit Add / Edit Form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError('Category name is required.');
      return;
    }

    const trimmedSlug = formSlug.trim() || slugifyCategory(trimmedName);
    if (!trimmedSlug) {
      setFormError('A valid slug is required.');
      return;
    }

    const orderNum = parseInt(formDisplayOrder, 10);
    if (isNaN(orderNum) || orderNum < 0) {
      setFormError('Display order must be a non-negative number.');
      return;
    }

    setFormSubmitting(true);

    try {
      if (editingCategory) {
        // Update
        const res = await updateCategory(editingCategory.id, {
          name: trimmedName,
          slug: trimmedSlug,
          description: formDescription.trim(),
          imageUrl: formImageUrl.trim(),
          displayOrder: orderNum,
          isActive: formIsActive,
        });

        if (res.success && res.category) {
          setCategories((prev) =>
            prev.map((c) => (c.id === editingCategory.id ? res.category! : c))
          );
          setIsFormModalOpen(false);
          setNotification({
            type: 'success',
            message: `Category "${trimmedName}" updated successfully.`,
          });
        } else {
          setFormError(res.error || 'Failed to update category.');
        }
      } else {
        // Create
        const res = await createCategory({
          name: trimmedName,
          slug: trimmedSlug,
          description: formDescription.trim(),
          imageUrl: formImageUrl.trim(),
          displayOrder: orderNum,
          isActive: formIsActive,
        });

        if (res.success && res.category) {
          setCategories((prev) => [...prev, res.category!]);
          setIsFormModalOpen(false);
          setNotification({
            type: 'success',
            message: `Category "${trimmedName}" created successfully.`,
          });
        } else {
          setFormError(res.error || 'Failed to create category.');
        }
      }
    } catch (err: any) {
      setFormError(err?.message || 'An unexpected error occurred.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Category Active Status
  const handleToggleStatus = async (cat: AdminCategory) => {
    const newStatus = !cat.isActive;
    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, isActive: newStatus } : c))
    );

    try {
      const res = await toggleCategoryActiveStatus(cat.id, newStatus);
      if (!res.success) {
        // Revert on failure
        setCategories((prev) =>
          prev.map((c) => (c.id === cat.id ? { ...c, isActive: cat.isActive } : c))
        );
        setNotification({
          type: 'error',
          message: res.error || `Failed to update status for "${cat.name}".`,
        });
      } else {
        setNotification({
          type: 'success',
          message: `Category "${cat.name}" is now ${newStatus ? 'Active' : 'Inactive'}.`,
        });
      }
    } catch {
      // Revert
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, isActive: cat.isActive } : c))
      );
      setNotification({
        type: 'error',
        message: 'Network error updating category status.',
      });
    }
  };

  // Open Delete Safety Confirmation Modal
  const handleOpenDeleteModal = (cat: AdminCategory) => {
    setDeletingCategory(cat);
    setDeleteError(null);
  };

  // Perform Deletion (with strict product-attached check)
  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    setDeleteSubmitting(true);
    setDeleteError(null);

    try {
      const res = await deleteCategory(deletingCategory.id);
      if (res.success) {
        setCategories((prev) => prev.filter((c) => c.id !== deletingCategory.id));
        setNotification({
          type: 'success',
          message: `Category "${deletingCategory.name}" was permanently deleted.`,
        });
        setDeletingCategory(null);
      } else {
        setDeleteError(
          res.message || res.error || 'Failed to delete category due to safety restrictions.'
        );
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'Error occurred while deleting category.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Deactivate instead of deleting (if products are attached)
  const handleDeactivateInstead = async () => {
    if (!deletingCategory) return;
    setDeleteSubmitting(true);
    try {
      const res = await toggleCategoryActiveStatus(deletingCategory.id, false);
      if (res.success) {
        setCategories((prev) =>
          prev.map((c) => (c.id === deletingCategory.id ? { ...c, isActive: false } : c))
        );
        setNotification({
          type: 'success',
          message: `Category "${deletingCategory.name}" was deactivated to hide it from customers while keeping products safe.`,
        });
        setDeletingCategory(null);
      } else {
        setDeleteError(res.error || 'Failed to deactivate category.');
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to deactivate category.');
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
              <Layers className="w-4 h-4" />
            </span>
            <span className="font-tech text-xs uppercase tracking-wider text-soft-gold font-semibold">
              Catalog Management
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Categories
          </h1>
          <p className="font-sans text-xs sm:text-sm text-ivory/60 mt-1 max-w-2xl">
            Curate and organize artisan product collections, manage category slugs, display order,
            and maintain customer storefront navigation.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadCategories(true)}
            disabled={refreshing || loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-ivory/80 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-2 text-xs font-sans font-medium"
            title="Refresh categories"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-soft-gold' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-soft-gold hover:bg-soft-gold/90 text-charcoal font-sans text-xs font-semibold shadow-luxury transition-all flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
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
        {/* Total Categories */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="font-tech text-[10px] sm:text-xs uppercase tracking-wider text-ivory/50 font-semibold">
              Total Categories
            </span>
            <span className="p-2 rounded-xl bg-soft-gold/10 text-soft-gold border border-soft-gold/20">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {loading ? <span className="opacity-40 animate-pulse">—</span> : summary.total}
          </div>
          <p className="font-sans text-[11px] text-ivory/40 mt-1">Catalog divisions</p>
        </div>

        {/* Active Categories */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="font-tech text-[10px] sm:text-xs uppercase tracking-wider text-emerald-400/70 font-semibold">
              Active Categories
            </span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Eye className="w-4 h-4" />
            </span>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-emerald-400 tracking-tight">
            {loading ? <span className="opacity-40 animate-pulse">—</span> : summary.active}
          </div>
          <p className="font-sans text-[11px] text-ivory/40 mt-1">Visible on storefront</p>
        </div>

        {/* Inactive Categories */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="font-tech text-[10px] sm:text-xs uppercase tracking-wider text-amber-400/70 font-semibold">
              Inactive Categories
            </span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <EyeOff className="w-4 h-4" />
            </span>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-amber-400 tracking-tight">
            {loading ? <span className="opacity-40 animate-pulse">—</span> : summary.inactive}
          </div>
          <p className="font-sans text-[11px] text-ivory/40 mt-1">Hidden from shoppers</p>
        </div>

        {/* Categories with Products */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="font-tech text-[10px] sm:text-xs uppercase tracking-wider text-cyan-400/70 font-semibold">
              With Products
            </span>
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-cyan-400 tracking-tight">
            {loading ? <span className="opacity-40 animate-pulse">—</span> : summary.withProducts}
          </div>
          <p className="font-sans text-[11px] text-ivory/40 mt-1">Populated collections</p>
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
            placeholder="Search categories by name, slug, or description..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2 text-xs sm:text-sm text-white placeholder:text-ivory/30 focus:outline-none focus:border-soft-gold/50 transition-colors"
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
          <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-sans font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-soft-gold text-charcoal font-semibold shadow-sm'
                  : 'text-ivory/70 hover:text-white'
              }`}
            >
              All ({categories.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-sans font-medium transition-colors ${
                statusFilter === 'active'
                  ? 'bg-soft-gold text-charcoal font-semibold shadow-sm'
                  : 'text-ivory/70 hover:text-white'
              }`}
            >
              Active ({summary.active})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg font-sans font-medium transition-colors ${
                statusFilter === 'inactive'
                  ? 'bg-soft-gold text-charcoal font-semibold shadow-sm'
                  : 'text-ivory/70 hover:text-white'
              }`}
            >
              Inactive ({summary.inactive})
            </button>
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
              <option value="display_order" className="bg-[#14171A] text-white">
                Display Order
              </option>
              <option value="name" className="bg-[#14171A] text-white">
                Name (A-Z)
              </option>
              <option value="products" className="bg-[#14171A] text-white">
                Product Count
              </option>
              <option value="created" className="bg-[#14171A] text-white">
                Created Date
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

      {/* 5. Categories Table & Mobile View */}
      {loading ? (
        <div className="p-16 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 text-soft-gold animate-spin" />
          <p className="font-sans text-xs text-ivory/60">Loading categories from database...</p>
        </div>
      ) : filteredAndSortedCategories.length === 0 ? (
        /* Empty State */
        <div className="p-12 sm:p-16 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-soft-gold/10 border border-soft-gold/20 text-soft-gold flex items-center justify-center mx-auto">
            <FolderPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-white">No categories found</h3>
            <p className="font-sans text-xs text-ivory/50 max-w-sm mx-auto mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'No categories match the active filter or search query. Try clearing your search parameters.'
                : 'There are currently no categories in the catalog. Create your first category to get started.'}
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
              Add First Category
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden shadow-luxury">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="py-3.5 px-4 font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-semibold w-16">
                      Order
                    </th>
                    <th className="py-3.5 px-4 font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-semibold w-20">
                      Image
                    </th>
                    <th className="py-3.5 px-4 font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-semibold">
                      Category Name & Description
                    </th>
                    <th className="py-3.5 px-4 font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-semibold">
                      Slug
                    </th>
                    <th className="py-3.5 px-4 font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-semibold text-center">
                      Products
                    </th>
                    <th className="py-3.5 px-4 font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-semibold text-center">
                      Status
                    </th>
                    <th className="py-3.5 px-4 font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-semibold">
                      Created
                    </th>
                    <th className="py-3.5 px-4 font-tech text-[10px] uppercase tracking-wider text-ivory/50 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAndSortedCategories.map((cat) => (
                    <tr
                      key={cat.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Display Order */}
                      <td className="py-3 px-4 font-tech text-xs text-soft-gold font-bold">
                        <span className="px-2 py-0.5 rounded bg-soft-gold/10 border border-soft-gold/20">
                          #{cat.displayOrder}
                        </span>
                      </td>

                      {/* Image Preview */}
                      <td className="py-3 px-4">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
                          <Image
                            src={cat.imageUrl || '/images/categories/crochet-bags.jpg'}
                            alt={cat.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                            onError={(e) => {
                              // Fallback on image load error
                              (e.target as any).src = '/images/categories/crochet-bags.jpg';
                            }}
                          />
                        </div>
                      </td>

                      {/* Name & Description */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-serif text-sm font-bold text-white group-hover:text-soft-gold transition-colors">
                          {cat.name}
                        </div>
                        {cat.description && (
                          <p className="font-sans text-xs text-ivory/50 line-clamp-1 mt-0.5">
                            {cat.description}
                          </p>
                        )}
                      </td>

                      {/* Slug */}
                      <td className="py-3 px-4">
                        <code className="font-tech text-[11px] text-ivory/60 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          {cat.slug}
                        </code>
                      </td>

                      {/* Product Count */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 font-tech text-xs font-semibold px-2.5 py-1 rounded-full ${
                            cat.productCount > 0
                              ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                              : 'bg-white/5 text-ivory/40 border border-white/5'
                          }`}
                        >
                          <Package className="w-3 h-3" />
                          <span>{cat.productCount}</span>
                        </span>
                      </td>

                      {/* Status Toggle Badge */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(cat)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-tech text-[10px] uppercase tracking-wider font-semibold border transition-all cursor-pointer hover:opacity-80 active:scale-95 ${
                            cat.isActive
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-white/5 border-white/10 text-ivory/40'
                          }`}
                          title={`Click to ${cat.isActive ? 'deactivate' : 'activate'}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              cat.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-ivory/40'
                            }`}
                          />
                          <span>{cat.isActive ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 font-sans text-xs text-ivory/50">
                        {new Date(cat.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditModal(cat)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-ivory/70 hover:text-white transition-colors"
                            title="Edit Category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleOpenDeleteModal(cat)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 hover:text-rose-200 transition-colors"
                            title={
                              cat.productCount > 0
                                ? 'Protected: Category has products'
                                : 'Delete Category'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Grid View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredAndSortedCategories.map((cat) => (
              <div
                key={cat.id}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
                    <Image
                      src={cat.imageUrl || '/images/categories/crochet-bags.jpg'}
                      alt={cat.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-serif text-base font-bold text-white truncate">
                        {cat.name}
                      </span>
                      <span className="font-tech text-[10px] text-soft-gold font-bold px-2 py-0.5 rounded bg-soft-gold/10 border border-soft-gold/20">
                        #{cat.displayOrder}
                      </span>
                    </div>
                    <code className="font-tech text-[10px] text-ivory/50 block mt-0.5">
                      {cat.slug}
                    </code>
                    {cat.description && (
                      <p className="font-sans text-xs text-ivory/50 line-clamp-2 mt-1">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-tech text-[11px] font-semibold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      <Package className="w-3 h-3" />
                      <span>{cat.productCount} products</span>
                    </span>

                    <button
                      onClick={() => handleToggleStatus(cat)}
                      className={`font-tech text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${
                        cat.isActive
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-white/5 border-white/10 text-ivory/40'
                      }`}
                    >
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(cat)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-ivory/80"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(cat)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 6. Add / Edit Category Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={() => !formSubmitting && setIsFormModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-lg rounded-2xl bg-[#14171A] border border-white/10 shadow-luxury overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-soft-gold/10 text-soft-gold border border-soft-gold/20">
                  <Layers className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-serif text-lg font-bold text-white">
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </h3>
                  <p className="font-sans text-[11px] text-ivory/50">
                    {editingCategory
                      ? `Updating details for "${editingCategory.name}"`
                      : 'Create a new artisan product category'}
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

            {/* Modal Body / Form */}
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs font-sans flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block font-tech text-[10px] uppercase tracking-wider text-ivory/70 font-semibold mb-1.5">
                  Category Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Crochet Bags"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-soft-gold/60 transition-colors"
                />
              </div>

              {/* Slug */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70 font-semibold">
                    URL Slug <span className="text-rose-400">*</span>
                  </label>
                  <span className="font-tech text-[10px] text-ivory/40">
                    Auto-generated / Unique
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={formSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="e.g. crochet-bags"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 font-tech text-xs text-soft-gold focus:outline-none focus:border-soft-gold/60 transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-tech text-[10px] uppercase tracking-wider text-ivory/70 font-semibold mb-1.5">
                  Description / Subtitle
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Artisan Carryalls & Totes crafted with organic cotton"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-soft-gold/60 transition-colors resize-none"
                />
              </div>

              {/* Image Preview & Upload */}
              <div>
                <label className="block font-tech text-[10px] uppercase tracking-wider text-ivory/70 font-semibold mb-1.5">
                  Category Image
                </label>

                <div className="flex items-center gap-3 mb-3">
                  {/* Preview box */}
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
                    <Image
                      src={formImageUrl || '/images/categories/crochet-bags.jpg'}
                      alt="Category Preview"
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* File upload button */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageFileChange}
                      className="hidden"
                      id="category-file-upload"
                    />
                    <label
                      htmlFor="category-file-upload"
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-ivory/90 hover:text-white text-xs font-sans font-medium transition-colors cursor-pointer ${
                        imageUploadLoading ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      {imageUploadLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-soft-gold" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{imageUploadLoading ? 'Uploading...' : 'Upload New Image'}</span>
                    </label>
                    <p className="font-sans text-[10px] text-ivory/40 mt-1">
                      Supports JPEG, PNG, WebP up to 5MB
                    </p>
                  </div>
                </div>

                {imageUploadError && (
                  <p className="font-sans text-[11px] text-rose-300 mb-2">
                    {imageUploadError}
                  </p>
                )}

                {/* Preset Image Options */}
                <div className="space-y-1.5">
                  <span className="font-tech text-[9px] uppercase tracking-wider text-ivory/40 block">
                    Or choose from standard presets:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PRESET_IMAGES.map((preset) => (
                      <button
                        type="button"
                        key={preset.url}
                        onClick={() => setFormImageUrl(preset.url)}
                        className={`px-2 py-1.5 rounded-lg text-left text-[10px] font-sans truncate transition-colors border ${
                          formImageUrl === preset.url
                            ? 'bg-soft-gold/20 border-soft-gold/40 text-soft-gold font-semibold'
                            : 'bg-white/5 border-white/5 text-ivory/60 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Display Order & Active Toggle Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-tech text-[10px] uppercase tracking-wider text-ivory/70 font-semibold mb-1.5">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-soft-gold/60 transition-colors"
                  />
                  <p className="font-sans text-[10px] text-ivory/40 mt-1">
                    Lower numbers appear first
                  </p>
                </div>

                <div>
                  <label className="block font-tech text-[10px] uppercase tracking-wider text-ivory/70 font-semibold mb-1.5">
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormIsActive((prev) => !prev)}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-sans font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      formIsActive
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-white/5 border-white/10 text-ivory/50'
                    }`}
                  >
                    {formIsActive ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Active (Public)</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-ivory/40" />
                        <span>Inactive (Hidden)</span>
                      </>
                    )}
                  </button>
                  <p className="font-sans text-[10px] text-ivory/40 mt-1 text-center">
                    Toggle storefront visibility
                  </p>
                </div>
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
                  <span>{editingCategory ? 'Save Changes' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Product Safety & Delete Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={() => !deleteSubmitting && setDeletingCategory(null)}
          />

          <div className="relative w-full max-w-md rounded-2xl bg-[#14171A] border border-white/10 shadow-luxury overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`p-2 rounded-xl border ${
                    deletingCategory.productCount > 0
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {deletingCategory.productCount > 0 ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </span>
                <h3 className="font-serif text-lg font-bold text-white">
                  {deletingCategory.productCount > 0 ? 'Cannot Delete Category' : 'Delete Category'}
                </h3>
              </div>

              <button
                onClick={() => setDeletingCategory(null)}
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

              {deletingCategory.productCount > 0 ? (
                /* PRODUCT SAFETY WARNING: Products are attached */
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-sans space-y-2">
                    <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Safety Protection Active</span>
                    </p>
                    <p>
                      <strong>{deletingCategory.name}</strong> has{' '}
                      <strong>{deletingCategory.productCount} product(s)</strong> attached to it.
                    </p>
                    <p className="text-amber-200/80">
                      Hard-deleting this category would break product catalog references. To prevent
                      data corruption, deletion is strictly prohibited while products remain
                      associated.
                    </p>
                  </div>

                  <p className="font-sans text-xs text-ivory/70">
                    <strong>Recommended Action:</strong> Deactivate the category instead. It will be
                    immediately hidden from customers on the storefront while keeping existing
                    products safely preserved.
                  </p>
                </div>
              ) : (
                /* SAFE DELETION: No products attached */
                <div className="space-y-2">
                  <p className="font-sans text-sm text-ivory/80">
                    Are you sure you want to permanently delete category{' '}
                    <strong className="text-white">"{deletingCategory.name}"</strong>?
                  </p>
                  <p className="font-sans text-xs text-rose-300/80">
                    This category has 0 attached products and can be safely removed. This action
                    cannot be undone.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setDeletingCategory(null)}
                  disabled={deleteSubmitting}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-ivory/80 text-xs font-sans transition-colors"
                >
                  Cancel
                </button>

                {deletingCategory.productCount > 0 ? (
                  /* Option to deactivate instead */
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
                  /* Safe hard delete */
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
