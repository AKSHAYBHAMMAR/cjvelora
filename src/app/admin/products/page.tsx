'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductPublishStatus,
  AdminProduct,
  CreateProductInput,
} from '@/lib/products';
import {
  getProductImages,
  uploadProductImage,
  deleteProductImage,
  updateImageOrder,
  validateImageFile,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_IMAGE_SIZE_BYTES,
} from '@/lib/product-images';
import { getCategories } from '@/lib/categories';
import { getAdminProfile, AdminProfile } from '@/lib/auth';
import { CategoryItem, ProductImageRecord } from '@/types';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
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
  ExternalLink,
  ShieldAlert,
  Loader2,
  IndianRupee,
  Layers,
  Image as ImageIcon,
  Upload,
  ArrowUp,
  ArrowDown,
  Info,
  Check,
  FileImage,
} from 'lucide-react';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPublished, setSelectedPublished] = useState<string>('all');
  const [selectedBestSeller, setSelectedBestSeller] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formComparePrice, setFormComparePrice] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('/images/products/tote-bag.jpg');
  const [formMaterials, setFormMaterials] = useState('100% Organic OEKO-TEX Cotton Yarn');
  const [formDimensions, setFormDimensions] = useState('');
  const [formCareInstructions, setFormCareInstructions] = useState('');
  const [formIsPublished, setFormIsPublished] = useState(true);
  const [formIsBestSeller, setFormIsBestSeller] = useState(false);

  // Delete Confirmation Modal
  const [deletingProduct, setDeletingProduct] = useState<AdminProduct | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showUnpublishAlternative, setShowUnpublishAlternative] = useState(false);

  // Dedicated Product Image Management Modal
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [managingProduct, setManagingProduct] = useState<AdminProduct | null>(null);
  const [productImages, setProductImages] = useState<ProductImageRecord[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; previewUrl: string }[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageActionError, setImageActionError] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Data
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [prodData, catData, profile] = await Promise.all([
        getAdminProducts(),
        getCategories(),
        getAdminProfile(),
      ]);

      setProducts(prodData);
      setCategories(catData);
      setAdminProfile(profile);
      if (catData.length > 0 && !formCategory) {
        setFormCategory(catData[0].name);
      }
    } catch (err) {
      console.error('Failed to load admin products:', err);
      setNotification({ type: 'error', message: 'Failed to load products from database.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [formCategory]);

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

  // Generate slug automatically when name changes (only in create mode)
  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingProduct) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setFormSlug(generated);
    }
  };

  // Open Form for Creation
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormPrice('');
    setFormComparePrice('');
    setFormCategory(categories[0]?.name || 'Crochet Bags');
    setFormImageUrl('/images/products/tote-bag.jpg');
    setFormMaterials('100% Organic OEKO-TEX Cotton Yarn');
    setFormDimensions('');
    setFormCareInstructions('');
    setFormIsPublished(true);
    setFormIsBestSeller(false);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Form for Editing
  const handleOpenEditModal = (product: AdminProduct) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormSlug(product.slug || product.id);
    setFormDescription(product.description || '');
    setFormPrice(String(product.price || ''));
    setFormComparePrice(product.originalPrice ? String(product.originalPrice) : '');
    setFormCategory(product.category || (categories[0]?.name ?? 'Crochet Bags'));
    setFormImageUrl(product.image || '/images/products/tote-bag.jpg');
    setFormMaterials(product.materials || '');
    setFormDimensions(product.dimensions || '');
    setFormCareInstructions(product.careInstructions || '');
    setFormIsPublished(product.isPublished ?? true);
    setFormIsBestSeller(product.isMostLoved ?? false);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Dedicated Image Management Modal
  const handleOpenImageManager = async (product: AdminProduct) => {
    setManagingProduct(product);
    setImageActionError(null);
    setPendingFiles([]);
    setIsImageModalOpen(true);
    setImagesLoading(true);

    try {
      const records = await getProductImages(product.id);
      setProductImages(records);
    } catch (err: any) {
      console.error('Failed to load product images:', err);
      setImageActionError('Could not retrieve images for this product.');
    } finally {
      setImagesLoading(false);
    }
  };

  // Close Image Management Modal
  const handleCloseImageManager = () => {
    // Clean up any pending object URLs
    pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPendingFiles([]);
    setIsImageModalOpen(false);
    setManagingProduct(null);
    setImageActionError(null);
  };

  // Handle Image File Selection (Validates Type and Size)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageActionError(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const filesArray = Array.from(e.target.files);
    const validPending: { file: File; previewUrl: string }[] = [];
    let errorFound = '';

    for (const file of filesArray) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        errorFound = validation.error || 'Invalid file selected.';
        break;
      }
      validPending.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (errorFound) {
      setImageActionError(errorFound);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setPendingFiles((prev) => [...prev, ...validPending]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove a pending file before upload
  const handleRemovePendingFile = (index: number) => {
    setPendingFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  // Explicit Upload Action (Does NOT upload automatically)
  const handleUploadPendingImages = async () => {
    if (!managingProduct || pendingFiles.length === 0) return;

    setUploadingImages(true);
    setImageActionError(null);

    try {
      let currentOrder =
        productImages.length > 0
          ? Math.max(...productImages.map((img) => img.displayOrder)) + 1
          : 0;

      const newUploaded: ProductImageRecord[] = [];

      for (const item of pendingFiles) {
        const res = await uploadProductImage(
          managingProduct.id,
          item.file,
          managingProduct.name,
          currentOrder++
        );

        if (res.error) {
          throw new Error(res.error);
        }

        if (res.data) {
          newUploaded.push(res.data);
        }
      }

      // Clean up object URLs
      pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPendingFiles([]);

      const updatedList = [...productImages, ...newUploaded];
      setProductImages(updatedList);

      setNotification({
        type: 'success',
        message: `Successfully uploaded ${newUploaded.length} image${newUploaded.length > 1 ? 's' : ''} to Supabase Storage.`,
      });

      // Refresh product list to update thumbnails
      await loadData(true);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setImageActionError(err?.message || 'Failed to upload images to Supabase Storage.');
    } finally {
      setUploadingImages(false);
    }
  };

  // Reorder Images (Move Up / Down)
  const handleMoveImage = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= productImages.length) return;

    const reordered = [...productImages];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const updatedWithOrder = reordered.map((img, idx) => ({
      ...img,
      displayOrder: idx,
    }));

    setProductImages(updatedWithOrder);

    const payload = updatedWithOrder.map((img) => ({
      id: img.id,
      displayOrder: img.displayOrder,
    }));

    const res = await updateImageOrder(payload);
    if (!res.success) {
      setImageActionError(res.error || 'Failed to update image order.');
      if (managingProduct) {
        const fresh = await getProductImages(managingProduct.id);
        setProductImages(fresh);
      }
    } else {
      setNotification({
        type: 'success',
        message: 'Image display sequence updated.',
      });
      await loadData(true);
    }
  };

  // Delete Uploaded Supabase Image
  const handleDeleteUploadedImage = async (img: ProductImageRecord) => {
    if (!window.confirm('Permanently delete this image from Supabase Storage and database?')) {
      return;
    }

    setDeletingImageId(img.id);
    setImageActionError(null);

    try {
      const res = await deleteProductImage(img);
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete image.');
      }

      setProductImages((prev) => prev.filter((item) => item.id !== img.id));
      setNotification({
        type: 'success',
        message: 'Image removed from Supabase Storage and database.',
      });
      await loadData(true);
    } catch (err: any) {
      console.error('Delete image error:', err);
      setImageActionError(err?.message || 'Failed to delete image.');
    } finally {
      setDeletingImageId(null);
    }
  };

  // Save Product (Create or Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formName.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (!formSlug.trim()) {
      setFormError('Product slug is required.');
      return;
    }
    const priceNum = Number(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError('Price must be a valid non-negative number.');
      return;
    }
    let comparePriceNum: number | undefined = undefined;
    if (formComparePrice.trim()) {
      comparePriceNum = Number(formComparePrice);
      if (isNaN(comparePriceNum) || comparePriceNum < 0) {
        setFormError('Compare-at price must be a valid non-negative number.');
        return;
      }
    }

    const matchingCat = categories.find((c) => c.name === formCategory);

    setFormSubmitting(true);
    try {
      if (editingProduct) {
        // Edit flow
        const result = await updateProduct(editingProduct.id, {
          name: formName,
          slug: formSlug,
          description: formDescription,
          price: priceNum,
          compareAtPrice: comparePriceNum,
          categoryId: matchingCat?.id,
          isPublished: formIsPublished,
          isBestSeller: formIsBestSeller,
          imageUrl: formImageUrl,
          materials: formMaterials,
          dimensions: formDimensions,
          careInstructions: formCareInstructions,
        });

        if (result.error) {
          setFormError(result.error);
          setFormSubmitting(false);
          return;
        }

        setNotification({ type: 'success', message: `Product "${formName}" was successfully updated.` });
      } else {
        // Create flow
        const result = await createProduct({
          name: formName,
          slug: formSlug,
          description: formDescription,
          price: priceNum,
          compareAtPrice: comparePriceNum,
          category: formCategory,
          categoryId: matchingCat?.id,
          isPublished: formIsPublished,
          isBestSeller: formIsBestSeller,
          imageUrl: formImageUrl,
          materials: formMaterials,
          dimensions: formDimensions,
          careInstructions: formCareInstructions,
        });

        if (result.error) {
          setFormError(result.error);
          setFormSubmitting(false);
          return;
        }

        setNotification({ type: 'success', message: `New product "${formName}" created and inventory initialized.` });
      }

      setIsFormModalOpen(false);
      await loadData(true);
    } catch (err: any) {
      setFormError(err?.message || 'An unexpected error occurred while saving.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Published Status quickly from the row
  const handleTogglePublish = async (product: AdminProduct) => {
    const current = product.isPublished ?? true;
    const res = await toggleProductPublishStatus(product.id, current);
    if (res.success) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isPublished: !current } : p))
      );
      setNotification({
        type: 'success',
        message: `Product "${product.name}" is now ${!current ? 'Published' : 'Unpublished (Draft)'}.`,
      });
    } else {
      setNotification({ type: 'error', message: res.error || 'Failed to toggle status.' });
    }
  };

  // Confirm Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return;

    if (adminProfile?.role === 'staff') {
      setDeleteError('Staff accounts are not permitted to permanently delete catalog items. Please unpublish this product instead.');
      setShowUnpublishAlternative(true);
      return;
    }

    setDeleteSubmitting(true);
    setDeleteError(null);
    setShowUnpublishAlternative(false);

    try {
      const res = await deleteProduct(deletingProduct.id);

      if (res.hasForeignKeyConflict) {
        setDeleteError(res.error);
        setShowUnpublishAlternative(true);
        setDeleteSubmitting(false);
        return;
      }

      if (res.error) {
        setDeleteError(res.error);
        setDeleteSubmitting(false);
        return;
      }

      setNotification({ type: 'success', message: `Product "${deletingProduct.name}" was permanently removed.` });
      setDeletingProduct(null);
      await loadData(true);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete product.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Safe Unpublish Action (as an alternative to foreign key deletion conflict)
  const handleUnpublishAlternative = async () => {
    if (!deletingProduct) return;
    setDeleteSubmitting(true);
    try {
      const res = await toggleProductPublishStatus(deletingProduct.id, true);
      if (res.success) {
        setNotification({
          type: 'success',
          message: `Product "${deletingProduct.name}" unpublished safely. Historical data preserved.`,
        });
        setDeletingProduct(null);
        await loadData(true);
      } else {
        setDeleteError(res.error || 'Failed to unpublish product.');
      }
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Client-side Search, Filtering, and Sorting
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // 1. Search Query (name or slug)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.slug && p.slug.toLowerCase().includes(query))
      );
    }

    // 2. Category Filter
    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // 3. Published Filter
    if (selectedPublished === 'published') {
      result = result.filter((p) => (p.isPublished ?? true) === true);
    } else if (selectedPublished === 'draft') {
      result = result.filter((p) => (p.isPublished ?? true) === false);
    }

    // 4. Best Seller Filter
    if (selectedBestSeller === 'bestseller') {
      result = result.filter((p) => p.isMostLoved === true);
    } else if (selectedBestSeller === 'regular') {
      result = result.filter((p) => !p.isMostLoved);
    }

    // 5. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        case 'oldest':
          return (Number(a.id) || 0) - (Number(b.id) || 0);
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return result;
  }, [products, searchQuery, selectedCategory, selectedPublished, selectedBestSeller, sortBy]);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedPublished('all');
    setSelectedBestSeller('all');
    setSortBy('newest');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedPublished !== 'all' ||
    selectedBestSeller !== 'all' ||
    sortBy !== 'newest';

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-wide">
              Product Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-tech font-bold uppercase tracking-wider bg-soft-gold/20 text-soft-gold border border-soft-gold/30">
              {products.length} Products
            </span>
          </div>
          <p className="font-sans text-xs sm:text-sm text-ivory/60 mt-1">
            Manage handcrafted creations, gallery images, inventory status, and storefront visibility.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ivory text-xs font-sans font-medium flex items-center gap-2 border border-white/10 transition-colors cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-soft-gold' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-soft-gold hover:bg-[#E5C158] text-charcoal text-xs font-sans font-bold flex items-center gap-2 shadow-luxury transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* 2. Notification Toast */}
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

      {/* 3. Search, Filters, and Sorting Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-ivory/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name or slug..."
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

          {/* Published Status Filter */}
          <div>
            <select
              value={selectedPublished}
              onChange={(e) => setSelectedPublished(e.target.value)}
              className="w-full px-3 py-2 bg-[#14171A] border border-white/10 rounded-xl text-ivory text-xs focus:outline-none focus:border-soft-gold"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published (Live)</option>
              <option value="draft">Draft (Unpublished)</option>
            </select>
          </div>

          {/* Best Seller Filter */}
          <div>
            <select
              value={selectedBestSeller}
              onChange={(e) => setSelectedBestSeller(e.target.value)}
              className="w-full px-3 py-2 bg-[#14171A] border border-white/10 rounded-xl text-ivory text-xs focus:outline-none focus:border-soft-gold"
            >
              <option value="all">All Items</option>
              <option value="bestseller">Best Sellers Only</option>
              <option value="regular">Regular Items</option>
            </select>
          </div>
        </div>

        {/* Sorting and Clear Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-2">
            <span className="font-tech text-[10px] uppercase tracking-wider text-ivory/50">
              Sort By:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1 bg-[#14171A] border border-white/10 rounded-lg text-ivory text-xs font-tech focus:outline-none focus:border-soft-gold"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-low">Price: Low → High</option>
              <option value="price-high">Price: High → Low</option>
              <option value="name-asc">Name: A → Z</option>
              <option value="name-desc">Name: Z → A</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-tech text-xs text-ivory/50">
              Showing <span className="text-soft-gold font-bold">{filteredProducts.length}</span> of{' '}
              {products.length} products
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

      {/* 4. Product Table */}
      {loading ? (
        <div className="p-12 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3 text-ivory/60">
          <Loader2 className="w-6 h-6 animate-spin text-soft-gold" />
          <p className="font-sans text-xs">Loading creations from Supabase database...</p>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-ivory/50 font-tech uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-6">Product</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Inventory</th>
                <th className="py-3.5 px-4">Badges</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-white/[0.02] transition-colors group">
                  {/* Column 1: Image & Title */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3.5">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.image || '/images/products/tote-bag.jpg'}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="min-w-0 max-w-xs">
                        <p className="font-serif text-sm font-semibold text-white truncate group-hover:text-soft-gold transition-colors">
                          {product.name}
                        </p>
                        <p className="font-tech text-[10px] text-ivory/40 truncate">
                          /{product.slug || product.id}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Column 2: Category */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-tech uppercase font-medium bg-white/5 text-ivory/80 border border-white/10">
                      {product.category}
                    </span>
                  </td>

                  {/* Column 3: Price */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="space-y-0.5">
                      <div className="font-tech font-bold text-sm text-white">
                        ₹{product.price.toLocaleString('en-IN')}
                      </div>
                      {product.originalPrice && (
                        <div className="font-tech text-[10px] text-ivory/40 line-through">
                          ₹{product.originalPrice.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Column 4: Inventory Quantity & Low Stock Badge */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase ${
                            product.isLowStock
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {product.inventoryQuantity} in stock
                        </span>
                      </div>
                      {product.isLowStock && (
                        <p className="font-tech text-[9px] text-rose-400/80">
                          &le; {product.lowStockThreshold} threshold
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Column 5: Badges (Best Seller, Heirloom, etc.) */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex flex-wrap items-center gap-1">
                      {product.isMostLoved && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-tech font-bold uppercase bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          ❤️ Most Loved
                        </span>
                      )}
                      {product.badge && !product.isMostLoved && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-tech font-medium uppercase bg-soft-gold/10 text-soft-gold border border-soft-gold/20">
                          {product.badge}
                        </span>
                      )}
                      {!product.isMostLoved && !product.badge && (
                        <span className="text-ivory/30 font-tech text-[10px]">—</span>
                      )}
                    </div>
                  </td>

                  {/* Column 6: Published Status */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <button
                      onClick={() => handleTogglePublish(product)}
                      title={product.isPublished ?? true ? 'Click to Unpublish' : 'Click to Publish'}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-tech uppercase font-bold transition-colors cursor-pointer ${
                        product.isPublished ?? true
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                          : 'bg-white/10 text-ivory/50 hover:bg-white/20 border border-white/10'
                      }`}
                    >
                      {product.isPublished ?? true ? (
                        <>
                          <Eye className="w-3 h-3 text-emerald-400" />
                          <span>Live</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 text-ivory/40" />
                          <span>Draft</span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* Column 7: Actions (Images, Edit & Delete) */}
                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => handleOpenImageManager(product)}
                        className="p-2 rounded-lg bg-soft-gold/10 hover:bg-soft-gold/20 text-soft-gold hover:text-[#E5C158] transition-colors cursor-pointer"
                        title="Manage Product Images (Supabase Storage)"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(product)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-ivory/70 hover:text-white transition-colors cursor-pointer"
                        title="Edit Product"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setDeletingProduct(product);
                          setDeleteError(null);
                          setShowUnpublishAlternative(false);
                        }}
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                        title="Delete Product"
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
      ) : (
        <div className="py-20 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-ivory/40">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-lg font-bold text-white">No products found</h3>
          <p className="font-sans text-xs text-ivory/50 max-w-xs mx-auto leading-relaxed">
            No creations match the selected search and filter criteria.
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-soft-gold text-charcoal font-sans text-xs font-bold shadow-luxury cursor-pointer"
            >
              Clear Search & Filters
            </button>
          )}
        </div>
      )}

      {/* 5. Add / Edit Product Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !formSubmitting && setIsFormModalOpen(false)}
          />

          <div className="relative w-full max-w-2xl bg-[#14171A] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                  {editingProduct ? 'Edit Creation' : 'Add New Creation'}
                </h3>
                <p className="font-sans text-xs text-ivory/50 mt-0.5">
                  {editingProduct ? `Updating ${editingProduct.name}` : 'Create a new handcrafted piece in Supabase'}
                </p>
              </div>
              <button
                onClick={() => !formSubmitting && setIsFormModalOpen(false)}
                className="p-2 rounded-xl text-ivory/40 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error in modal */}
            {formError && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Bohemian Crossbody Shell Pouch"
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder-ivory/30 focus:outline-none focus:border-soft-gold text-xs"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                    Unique Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="e.g. bohemian-crossbody-shell-pouch"
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder-ivory/30 focus:outline-none focus:border-soft-gold text-xs font-tech"
                  />
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory text-xs focus:outline-none focus:border-soft-gold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name} className="bg-[#14171A]">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 3499"
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder-ivory/30 focus:outline-none focus:border-soft-gold text-xs font-tech"
                  />
                </div>

                {/* Compare-at Price */}
                <div>
                  <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                    Original / Compare-at Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formComparePrice}
                    onChange={(e) => setFormComparePrice(e.target.value)}
                    placeholder="e.g. 3999 (optional strikethrough)"
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder-ivory/30 focus:outline-none focus:border-soft-gold text-xs font-tech"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                  Short Description *
                </label>
                <textarea
                  rows={2}
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Summary of handcrafted materials, design motif, and utility..."
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder-ivory/30 focus:outline-none focus:border-soft-gold text-xs"
                />
              </div>

              {/* Local Public Image Path */}
              <div>
                <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                  Local Public Image Path
                </label>
                <input
                  type="text"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="/images/products/tote-bag.jpg"
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder-ivory/30 focus:outline-none focus:border-soft-gold text-xs font-tech"
                />
                <p className="font-tech text-[10px] text-ivory/40 mt-1">
                  Preserved local asset path. Additional gallery images can be managed via Cloud Storage below.
                </p>
              </div>

              {/* Shortcut to Cloud Image Management (if editing existing product) */}
              {editingProduct && (
                <div className="p-3.5 rounded-xl bg-soft-gold/5 border border-soft-gold/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-soft-gold/10 flex items-center justify-center text-soft-gold">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-sans text-xs font-semibold text-white">Product Gallery & Cloud Images</p>
                      <p className="font-tech text-[10px] text-ivory/50">Upload new images to Supabase Storage or reorder gallery</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormModalOpen(false);
                      handleOpenImageManager(editingProduct);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-soft-gold hover:bg-[#E5C158] text-charcoal text-xs font-sans font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Manage Images</span>
                  </button>
                </div>
              )}

              {/* Materials & Dimensions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                    Materials
                  </label>
                  <input
                    type="text"
                    value={formMaterials}
                    onChange={(e) => setFormMaterials(e.target.value)}
                    placeholder="100% Organic OEKO-TEX Cotton Yarn"
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder-ivory/30 focus:outline-none focus:border-soft-gold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                    Dimensions
                  </label>
                  <input
                    type="text"
                    value={formDimensions}
                    onChange={(e) => setFormDimensions(e.target.value)}
                    placeholder="e.g. 38cm x 42cm"
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder-ivory/30 focus:outline-none focus:border-soft-gold text-xs"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 flex flex-wrap items-center gap-6 border-t border-white/5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPublished}
                    onChange={(e) => setFormIsPublished(e.target.checked)}
                    className="rounded bg-white/10 border-white/20 text-soft-gold focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span className="font-sans text-xs text-ivory/90 font-medium">
                    Published (Visible on Storefront)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsBestSeller}
                    onChange={(e) => setFormIsBestSeller(e.target.checked)}
                    className="rounded bg-white/10 border-white/20 text-rose-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span className="font-sans text-xs text-ivory/90 font-medium flex items-center gap-1">
                    <span>Best Seller (Most Loved)</span>
                    <span>❤️</span>
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={formSubmitting}
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-ivory text-xs font-sans font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-soft-gold hover:bg-[#E5C158] text-charcoal text-xs font-sans font-bold flex items-center gap-2 shadow-luxury cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving to Supabase...</span>
                    </>
                  ) : (
                    <span>{editingProduct ? 'Save Changes' : 'Create Creation'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Dedicated Product Image Management Modal */}
      {isImageModalOpen && managingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => !uploadingImages && handleCloseImageManager()}
          />

          <div className="relative w-full max-w-3xl bg-[#14171A] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-soft-gold/10 border border-soft-gold/20 flex items-center justify-center text-soft-gold">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                    Image Management
                  </h3>
                  <p className="font-sans text-xs text-ivory/60">
                    Product:{' '}
                    <span className="text-white font-medium">{managingProduct.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => !uploadingImages && handleCloseImageManager()}
                className="p-2 rounded-xl text-ivory/40 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {imageActionError && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{imageActionError}</span>
              </div>
            )}

            {/* Section A: Default Local Product Image (Preserved) */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-tech text-xs uppercase tracking-wider text-ivory/70 font-semibold flex items-center gap-2">
                  <FileImage className="w-3.5 h-3.5 text-soft-gold" />
                  <span>Default Local Image (Preserved)</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-tech uppercase bg-white/10 text-ivory/60 border border-white/10">
                  Local Asset
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-white/15 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={managingProduct.image || '/images/products/tote-bag.jpg'}
                    alt={managingProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="font-tech text-xs text-white truncate">
                    {managingProduct.image || '/images/products/tote-bag.jpg'}
                  </p>
                  <p className="font-sans text-[11px] text-ivory/40 leading-relaxed">
                    Source of truth local asset in <code className="text-ivory/60">public/images/products/</code>.
                    Preserved strictly and never uploaded or modified.
                  </p>
                </div>
              </div>
            </div>

            {/* Section B: Cloud Hosted Gallery Images (Supabase Storage: product-images) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-sans text-sm font-bold text-white flex items-center gap-2">
                    <span>Cloud Storage Images</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-tech uppercase bg-soft-gold/20 text-soft-gold border border-soft-gold/30">
                      {productImages.length} uploaded
                    </span>
                  </h4>
                  <p className="font-tech text-[11px] text-ivory/40 mt-0.5">
                    Bucket: <code className="text-soft-gold">product-images</code> · Display order controls gallery sequence.
                  </p>
                </div>
              </div>

              {imagesLoading ? (
                <div className="py-8 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 text-ivory/50">
                  <Loader2 className="w-5 h-5 animate-spin text-soft-gold" />
                  <p className="font-sans text-xs">Querying product_images from Supabase...</p>
                </div>
              ) : productImages.length === 0 ? (
                <div className="py-8 px-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-1">
                  <p className="font-sans text-xs text-ivory/60">No additional cloud images uploaded yet.</p>
                  <p className="font-tech text-[10px] text-ivory/40">
                    Upload JPEG, PNG, or WebP images below to expand this product&apos;s photo gallery.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {productImages.map((img, idx) => (
                    <div
                      key={img.id}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 group hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-black/40 border border-white/15 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.publicUrl}
                            alt={img.altText || managingProduct.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase bg-soft-gold/20 text-soft-gold">
                              Order #{img.displayOrder}
                            </span>
                            <span className="font-sans text-xs font-semibold text-white truncate">
                              {img.altText || 'Gallery Image'}
                            </span>
                          </div>
                          <p className="font-tech text-[10px] text-ivory/40 truncate mt-0.5">
                            {img.storagePath}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Move Up */}
                        <button
                          onClick={() => handleMoveImage(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-ivory/60 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Move Down */}
                        <button
                          onClick={() => handleMoveImage(idx, 'down')}
                          disabled={idx === productImages.length - 1}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-ivory/60 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Image */}
                        <button
                          onClick={() => handleDeleteUploadedImage(img)}
                          disabled={deletingImageId === img.id}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 disabled:opacity-50 cursor-pointer transition-colors ml-1"
                          title="Delete from Storage and Database"
                        >
                          {deletingImageId === img.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section C: Upload New Images Area */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <div className="space-y-1">
                <h4 className="font-sans text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-soft-gold" />
                  <span>Upload New Cloud Images</span>
                </h4>
                <p className="font-sans text-xs text-ivory/50">
                  Select JPEG, PNG, or WebP images up to 5MB each. Upload happens only upon clicking the upload button.
                </p>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                id="cloud-image-file-input"
              />

              {/* File Dropzone / Click Area */}
              <label
                htmlFor="cloud-image-file-input"
                className="block p-6 rounded-xl border-2 border-dashed border-white/15 hover:border-soft-gold/50 bg-black/20 hover:bg-black/30 transition-all text-center cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-soft-gold/10 text-soft-gold flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="font-sans text-xs font-semibold text-white group-hover:text-soft-gold transition-colors">
                  Click to browse image files
                </p>
                <p className="font-tech text-[10px] text-ivory/40 mt-1">
                  Supported formats: JPEG, PNG, WebP · Max 5MB per file
                </p>
              </label>

              {/* Pending Files Preview List */}
              {pendingFiles.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs text-ivory/70 font-medium">
                    <span>Selected for upload ({pendingFiles.length})</span>
                    <button
                      type="button"
                      onClick={() => {
                        pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
                        setPendingFiles([]);
                      }}
                      className="text-rose-400 hover:text-rose-300 text-[11px] font-tech"
                    >
                      Clear Selection
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {pendingFiles.map((item, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-xl overflow-hidden bg-black/40 border border-white/15 aspect-square group"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.previewUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                          <button
                            type="button"
                            onClick={() => handleRemovePendingFile(idx)}
                            className="self-end p-1 rounded-md bg-rose-500/80 hover:bg-rose-600 text-white cursor-pointer"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <p className="font-tech text-[9px] text-white/90 truncate">
                            {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Explicit Upload Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={uploadingImages}
                      onClick={handleUploadPendingImages}
                      className="w-full py-2.5 px-4 rounded-xl bg-soft-gold hover:bg-[#E5C158] text-charcoal text-xs font-sans font-bold flex items-center justify-center gap-2 shadow-luxury cursor-pointer disabled:opacity-50 transition-all"
                    >
                      {uploadingImages ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Uploading to Supabase Storage bucket &quot;product-images&quot;...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>
                            Upload {pendingFiles.length} Selected Image{pendingFiles.length > 1 ? 's' : ''} to Supabase Storage
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Close */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <p className="font-tech text-[10px] text-ivory/40">
                Supabase Storage Bucket: <span className="text-soft-gold font-bold">product-images</span>
              </p>
              <button
                type="button"
                onClick={handleCloseImageManager}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-sans font-semibold cursor-pointer"
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Safe Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !deleteSubmitting && setDeletingProduct(null)}
          />

          <div className="relative w-full max-w-md bg-[#14171A] border border-rose-500/30 rounded-3xl p-6 shadow-2xl z-10 space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-white">
                  Delete Product Confirmation
                </h3>
                <p className="font-sans text-xs text-ivory/60">
                  Are you sure you want to permanently delete{' '}
                  <span className="text-white font-semibold">{deletingProduct.name}</span>?
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 leading-relaxed">
                {deleteError}
              </div>
            )}

            {/* If foreign key conflict or staff role, offer unpublish alternative */}
            {showUnpublishAlternative && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2">
                <p className="font-semibold">Recommended Safe Action:</p>
                <p className="text-[11px] text-amber-200/80">
                  Unpublishing will hide this item from the storefront while keeping all inventory records and order histories 100% intact.
                </p>
                <button
                  onClick={handleUnpublishAlternative}
                  className="w-full py-2 px-3 rounded-lg bg-amber-500 text-charcoal font-sans text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Unpublish Product Instead
                </button>
              </div>
            )}

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ivory text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>

              {!showUnpublishAlternative && (
                <button
                  type="button"
                  disabled={deleteSubmitting}
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {deleteSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Confirm Delete</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
