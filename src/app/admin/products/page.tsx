'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductPublishStatus,
  quickUpdatePrice,
  quickUpdateStock,
  AdminProduct,
} from '@/lib/products';
import {
  getProductImages,
  uploadProductImage,
  deleteProductImage,
  setPrimaryProductImage,
  updateImageOrder,
  validateImageFile,
  ALLOWED_IMAGE_TYPES,
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
  Package,
  Clock,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Star,
  Archive,
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
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>('all');
  const [selectedProductType, setSelectedProductType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Full Form Fields
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLongDescription, setFormLongDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formComparePrice, setFormComparePrice] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('/images/products/tote-bag.jpg');
  const [formMaterials, setFormMaterials] = useState('100% Organic OEKO-TEX Cotton Yarn');
  const [formDimensions, setFormDimensions] = useState('');
  const [formCareInstructions, setFormCareInstructions] = useState('');
  const [formIsMadeToOrder, setFormIsMadeToOrder] = useState(false);
  const [formLeadTime, setFormLeadTime] = useState('5-7 business days');
  const [formStockQuantity, setFormStockQuantity] = useState('10');
  const [formLowStockThreshold, setFormLowStockThreshold] = useState('5');
  const [formIsPublished, setFormIsPublished] = useState(true);
  const [formIsBestSeller, setFormIsBestSeller] = useState(false);

  // Quick Price Modal State
  const [priceModalProduct, setPriceModalProduct] = useState<AdminProduct | null>(null);
  const [newPriceValue, setNewPriceValue] = useState('');
  const [priceSubmitting, setPriceSubmitting] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Quick Stock Modal State
  const [stockModalProduct, setStockModalProduct] = useState<AdminProduct | null>(null);
  const [newStockValue, setNewStockValue] = useState('');
  const [newThresholdValue, setNewThresholdValue] = useState('');
  const [stockSubmitting, setStockSubmitting] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  // Delete / Archive Confirmation Modal
  const [deletingProduct, setDeletingProduct] = useState<AdminProduct | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showArchiveOption, setShowArchiveOption] = useState(false);

  // Dedicated Product Image Management Modal
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [managingProduct, setManagingProduct] = useState<AdminProduct | null>(null);
  const [productImages, setProductImages] = useState<ProductImageRecord[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; previewUrl: string }[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageActionError, setImageActionError] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
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
        setFormCategoryId(catData[0].id);
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

  // Auto slug generation on name change (in create mode)
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
    setFormLongDescription('');
    setFormPrice('');
    setFormComparePrice('');
    const firstCat = categories[0];
    setFormCategory(firstCat?.name || 'Crochet Bags');
    setFormCategoryId(firstCat?.id || '');
    setFormImageUrl('/images/products/tote-bag.jpg');
    setFormMaterials('100% Organic OEKO-TEX Cotton Yarn');
    setFormDimensions('');
    setFormCareInstructions('Gentle hand wash cold. Lay flat to dry.');
    setFormIsMadeToOrder(false);
    setFormLeadTime('5-7 business days');
    setFormStockQuantity('10');
    setFormLowStockThreshold('5');
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
    setFormLongDescription(product.longDescription || '');
    setFormPrice(String(product.price || ''));
    setFormComparePrice(product.originalPrice ? String(product.originalPrice) : '');
    setFormCategory(product.category || (categories[0]?.name ?? 'Crochet Bags'));
    setFormCategoryId(product.categoryId || categories.find((c) => c.name === product.category)?.id || '');
    setFormImageUrl(product.image || '/images/products/tote-bag.jpg');
    setFormMaterials(product.materials || '');
    setFormDimensions(product.dimensions || '');
    setFormCareInstructions(product.careInstructions || '');
    setFormIsMadeToOrder(Boolean(product.isMadeToOrder));
    setFormLeadTime(product.leadTime || '5-7 business days');
    setFormStockQuantity(String(product.inventoryQuantity ?? 0));
    setFormLowStockThreshold(String(product.lowStockThreshold ?? 5));
    setFormIsPublished(product.isPublished ?? true);
    setFormIsBestSeller(Boolean(product.isMostLoved));
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Quick Price Modal
  const handleOpenPriceModal = (product: AdminProduct) => {
    setPriceModalProduct(product);
    setNewPriceValue(String(product.price));
    setPriceError(null);
  };

  // Submit Quick Price Change
  const handlePriceModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceModalProduct) return;

    const num = Number(newPriceValue);
    if (isNaN(num) || num < 0) {
      setPriceError('Price must be a valid non-negative number.');
      return;
    }

    setPriceSubmitting(true);
    setPriceError(null);

    const res = await quickUpdatePrice(priceModalProduct.id, num);
    if (res.success) {
      setNotification({
        type: 'success',
        message: `Price for "${priceModalProduct.name}" updated to ₹${num.toLocaleString('en-IN')}. New orders, cart, and storefront are immediately updated.`,
      });
      setPriceModalProduct(null);
      await loadData(true);
    } else {
      setPriceError(res.error || 'Failed to update price.');
    }
    setPriceSubmitting(false);
  };

  // Open Quick Stock Modal
  const handleOpenStockModal = (product: AdminProduct) => {
    setStockModalProduct(product);
    setNewStockValue(String(product.inventoryQuantity ?? 0));
    setNewThresholdValue(String(product.lowStockThreshold ?? 5));
    setStockError(null);
  };

  // Submit Quick Stock Change
  const handleStockModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalProduct) return;

    const stockNum = parseInt(newStockValue, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      setStockError('Stock quantity must be a non-negative number.');
      return;
    }

    const threshNum = parseInt(newThresholdValue, 10);
    if (isNaN(threshNum) || threshNum < 0) {
      setStockError('Threshold must be a non-negative number.');
      return;
    }

    setStockSubmitting(true);
    setStockError(null);

    const res = await quickUpdateStock(stockModalProduct.id, stockNum, threshNum);
    if (res.success) {
      setNotification({
        type: 'success',
        message: `Stock for "${stockModalProduct.name}" updated to ${stockNum} units (Threshold: ${threshNum}).`,
      });
      setStockModalProduct(null);
      await loadData(true);
    } else {
      setStockError(res.error || 'Failed to update inventory.');
    }
    setStockSubmitting(false);
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
    pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPendingFiles([]);
    setIsImageModalOpen(false);
    setManagingProduct(null);
    setImageActionError(null);
  };

  // Image Selection
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

  // Remove pending file before upload
  const handleRemovePendingFile = (index: number) => {
    setPendingFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  // Upload Pending Images to Supabase Storage
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

      pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPendingFiles([]);

      const updatedList = [...productImages, ...newUploaded];
      setProductImages(updatedList);

      setNotification({
        type: 'success',
        message: `Uploaded ${newUploaded.length} image(s) to Supabase Storage.`,
      });

      await loadData(true);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setImageActionError(err?.message || 'Failed to upload images to Supabase Storage.');
    } finally {
      setUploadingImages(false);
    }
  };

  // Set as Primary Image
  const handleSetPrimary = async (img: ProductImageRecord) => {
    if (!managingProduct) return;
    setSettingPrimaryId(img.id);
    setImageActionError(null);

    try {
      const res = await setPrimaryProductImage(managingProduct.id, img.id, img.storagePath);
      if (!res.success) {
        throw new Error(res.error || 'Failed to set primary image.');
      }

      const fresh = await getProductImages(managingProduct.id);
      setProductImages(fresh);

      setNotification({
        type: 'success',
        message: `Designated as primary thumbnail across all storefront views.`,
      });
      await loadData(true);
    } catch (err: any) {
      setImageActionError(err?.message || 'Failed to update primary image.');
    } finally {
      setSettingPrimaryId(null);
    }
  };

  // Reorder Images
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
      setNotification({ type: 'success', message: 'Image sequence updated.' });
      await loadData(true);
    }
  };

  // Delete Image
  const handleDeleteUploadedImage = async (img: ProductImageRecord) => {
    if (!window.confirm('Permanently remove this image from Supabase Storage?')) return;

    setDeletingImageId(img.id);
    setImageActionError(null);

    try {
      const res = await deleteProductImage(img);
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete image.');
      }

      setProductImages((prev) => prev.filter((item) => item.id !== img.id));
      setNotification({ type: 'success', message: 'Image removed successfully.' });
      await loadData(true);
    } catch (err: any) {
      setImageActionError(err?.message || 'Failed to delete image.');
    } finally {
      setDeletingImageId(null);
    }
  };

  // Full Form Submit (Create or Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

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

    const stockNum = parseInt(formStockQuantity, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      setFormError('Stock quantity must be a non-negative number.');
      return;
    }

    const thresholdNum = parseInt(formLowStockThreshold, 10);
    if (isNaN(thresholdNum) || thresholdNum < 0) {
      setFormError('Low stock threshold must be a non-negative number.');
      return;
    }

    const matchingCat = categories.find((c) => c.name === formCategory) || categories[0];

    setFormSubmitting(true);
    try {
      if (editingProduct) {
        const result = await updateProduct(editingProduct.id, {
          name: formName,
          slug: formSlug,
          description: formDescription,
          longDescription: formLongDescription,
          price: priceNum,
          compareAtPrice: comparePriceNum,
          categoryId: matchingCat?.id,
          isPublished: formIsPublished,
          isBestSeller: formIsBestSeller,
          isMadeToOrder: formIsMadeToOrder,
          leadTime: formIsMadeToOrder ? formLeadTime : undefined,
          stockQuantity: stockNum,
          lowStockThreshold: thresholdNum,
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

        setNotification({
          type: 'success',
          message: `Product "${formName}" was successfully updated in Supabase.`,
        });
      } else {
        const result = await createProduct({
          name: formName,
          slug: formSlug,
          description: formDescription,
          longDescription: formLongDescription,
          price: priceNum,
          compareAtPrice: comparePriceNum,
          category: formCategory,
          categoryId: matchingCat?.id,
          isPublished: formIsPublished,
          isBestSeller: formIsBestSeller,
          isMadeToOrder: formIsMadeToOrder,
          leadTime: formIsMadeToOrder ? formLeadTime : undefined,
          stockQuantity: stockNum,
          lowStockThreshold: thresholdNum,
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

        setNotification({
          type: 'success',
          message: `New product "${formName}" created and inventory initialized.`,
        });
      }

      setIsFormModalOpen(false);
      await loadData(true);
    } catch (err: any) {
      setFormError(err?.message || 'An unexpected error occurred while saving.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Published Status
  const handleTogglePublish = async (product: AdminProduct) => {
    const current = product.isPublished ?? true;
    const res = await toggleProductPublishStatus(product.id, current);
    if (res.success) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isPublished: !current } : p))
      );
      setNotification({
        type: 'success',
        message: `Product "${product.name}" is now ${!current ? 'Published (Live)' : 'Unpublished (Draft)'}.`,
      });
    } else {
      setNotification({ type: 'error', message: res.error || 'Failed to toggle status.' });
    }
  };

  // Confirm Delete / Archive
  const handleDeleteConfirm = async (forceArchive = false) => {
    if (!deletingProduct) return;

    setDeleteSubmitting(true);
    setDeleteError(null);

    try {
      const res = await deleteProduct(deletingProduct.id, { archive: forceArchive });

      if (!res.success) {
        if (res.hasOrderReferences) {
          setShowArchiveOption(true);
          setDeleteError(res.error || 'This product has historical customer orders and cannot be permanently deleted.');
        } else {
          setDeleteError(res.error || 'Failed to remove product.');
        }
        setDeleteSubmitting(false);
        return;
      }

      setNotification({
        type: 'success',
        message: res.message || (res.archived ? 'Product was archived successfully.' : 'Product was permanently removed.'),
      });
      setDeletingProduct(null);
      await loadData(true);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to remove product.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Filter, Search, and Sort
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search Query (name or slug)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.slug && p.slug.toLowerCase().includes(query))
      );
    }

    // Category Filter
    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Published Filter
    if (selectedPublished === 'published') {
      result = result.filter((p) => (p.isPublished ?? true) === true);
    } else if (selectedPublished === 'draft') {
      result = result.filter((p) => (p.isPublished ?? true) === false);
    }

    // Stock Status Filter
    if (selectedStockStatus === 'in_stock') {
      result = result.filter((p) => p.availableStock > (p.lowStockThreshold || 5));
    } else if (selectedStockStatus === 'low_stock') {
      result = result.filter((p) => p.availableStock > 0 && p.availableStock <= (p.lowStockThreshold || 5));
    } else if (selectedStockStatus === 'out_of_stock') {
      result = result.filter((p) => p.availableStock <= 0);
    }

    // Product Type Filter
    if (selectedProductType === 'ready_to_ship') {
      result = result.filter((p) => !p.isMadeToOrder);
    } else if (selectedProductType === 'made_to_order') {
      result = result.filter((p) => Boolean(p.isMadeToOrder));
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'oldest':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
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
  }, [products, searchQuery, selectedCategory, selectedPublished, selectedStockStatus, selectedProductType, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedPublished, selectedStockStatus, selectedProductType, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedPublished('all');
    setSelectedStockStatus('all');
    setSelectedProductType('all');
    setSortBy('newest');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedPublished !== 'all' ||
    selectedStockStatus !== 'all' ||
    selectedProductType !== 'all' ||
    sortBy !== 'newest';

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header & Primary Actions */}
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
            Handcrafted catalog CRUD, prices, real inventory stock, and Cloud Storage image management.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-ivory/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by product name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#14171A] border border-white/10 rounded-xl text-ivory text-xs placeholder-ivory/30 focus:outline-none focus:border-soft-gold"
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
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedPublished}
              onChange={(e) => setSelectedPublished(e.target.value)}
              className="w-full px-3 py-2 bg-[#14171A] border border-white/10 rounded-xl text-ivory text-xs focus:outline-none focus:border-soft-gold"
            >
              <option value="all">All Statuses</option>
              <option value="published">Live (Published)</option>
              <option value="draft">Draft (Unpublished)</option>
            </select>
          </div>

          {/* Stock Filter */}
          <div>
            <select
              value={selectedStockStatus}
              onChange={(e) => setSelectedStockStatus(e.target.value)}
              className="w-full px-3 py-2 bg-[#14171A] border border-white/10 rounded-xl text-ivory text-xs focus:outline-none focus:border-soft-gold"
            >
              <option value="all">All Stock Levels</option>
              <option value="in_stock">In Stock (&gt; Threshold)</option>
              <option value="low_stock">Low Stock (&le; Threshold)</option>
              <option value="out_of_stock">Out of Stock (0 units)</option>
            </select>
          </div>

          {/* Product Type Filter */}
          <div>
            <select
              value={selectedProductType}
              onChange={(e) => setSelectedProductType(e.target.value)}
              className="w-full px-3 py-2 bg-[#14171A] border border-white/10 rounded-xl text-ivory text-xs focus:outline-none focus:border-soft-gold"
            >
              <option value="all">All Product Types</option>
              <option value="ready_to_ship">Ready to Ship</option>
              <option value="made_to_order">Made to Order</option>
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
          <p className="font-sans text-xs">Loading products from Supabase database...</p>
        </div>
      ) : paginatedProducts.length > 0 ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-2xl overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[960px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-ivory/50 font-tech uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-6">Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Stock</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {paginatedProducts.map((product) => {
                  const createdStr = product.createdAt
                    ? new Date(product.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—';

                  return (
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
                            {product.isMostLoved && (
                              <span className="inline-flex items-center gap-1 mt-0.5 text-[9px] font-tech text-rose-300 font-bold">
                                ❤️ Most Loved
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Category */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-tech uppercase font-medium bg-white/5 text-ivory/80 border border-white/10">
                          {product.category}
                        </span>
                      </td>

                      {/* Column 3: Price + Quick Change Price */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
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
                          <button
                            onClick={() => handleOpenPriceModal(product)}
                            className="p-1 rounded-md bg-white/5 hover:bg-soft-gold/20 hover:text-soft-gold text-ivory/40 transition-colors"
                            title="Quick Change Price"
                          >
                            <IndianRupee className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Column 4: Available Stock + Quick Change Stock */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="space-y-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase inline-block ${
                                product.availableStock <= 0
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : product.isLowStock
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {product.availableStock} available
                            </span>
                            <div className="font-tech text-[9px] text-ivory/40">
                              Total: {product.inventoryQuantity} | Res: {product.reservedQuantity}
                            </div>
                          </div>
                          <button
                            onClick={() => handleOpenStockModal(product)}
                            className="p-1 rounded-md bg-white/5 hover:bg-soft-gold/20 hover:text-soft-gold text-ivory/40 transition-colors"
                            title="Quick Adjust Stock"
                          >
                            <Package className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Column 5: Product Type */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {product.isMadeToOrder ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-tech uppercase font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            <span>Made to Order</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-tech uppercase font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            <Package className="w-3 h-3" />
                            <span>Ready to Ship</span>
                          </span>
                        )}
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

                      {/* Column 7: Created Date */}
                      <td className="py-4 px-4 whitespace-nowrap font-tech text-[10px] text-ivory/60">
                        {createdStr}
                      </td>

                      {/* Column 8: Actions */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenImageManager(product)}
                            className="p-2 rounded-lg bg-soft-gold/10 hover:bg-soft-gold/20 text-soft-gold hover:text-[#E5C158] transition-colors cursor-pointer"
                            title="Manage Images (Supabase Storage)"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(product)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-ivory/70 hover:text-white transition-colors cursor-pointer"
                            title="Edit Product Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setDeletingProduct(product);
                              setDeleteError(null);
                              setShowArchiveOption(false);
                            }}
                            className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                            title="Remove / Archive Product"
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

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-2">
              <span className="font-tech text-xs text-ivory/50">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 bg-[#14171A] border border-white/10 rounded-lg text-ivory text-xs font-tech focus:outline-none focus:border-soft-gold"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-tech text-xs text-ivory/60">
                Page <span className="text-soft-gold font-bold">{currentPage}</span> of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-ivory"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-ivory"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
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
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
                <p className="font-sans text-xs text-ivory/50 mt-0.5">
                  {editingProduct ? `Updating ${editingProduct.name} in Supabase` : 'Create a new handcrafted piece with real inventory'}
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

                {/* Category Selection from DB */}
                <div>
                  <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      const catName = e.target.value;
                      setFormCategory(catName);
                      const match = categories.find((c) => c.name === catName);
                      if (match) setFormCategoryId(match.id);
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#14171A] border border-white/10 rounded-xl text-ivory text-xs focus:outline-none focus:border-soft-gold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
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
                  <p className="font-tech text-[10px] text-ivory/40 mt-1">
                    Storefront, cart, and checkout immediately use this price.
                  </p>
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

                {/* Product Type (Ready to Ship vs Made to Order) */}
                <div className="sm:col-span-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <span className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium">
                    Product Type
                  </span>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="productType"
                        checked={!formIsMadeToOrder}
                        onChange={() => setFormIsMadeToOrder(false)}
                        className="text-soft-gold focus:ring-0"
                      />
                      <span className="font-sans text-xs text-ivory">Ready to Ship</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="productType"
                        checked={formIsMadeToOrder}
                        onChange={() => setFormIsMadeToOrder(true)}
                        className="text-soft-gold focus:ring-0"
                      />
                      <span className="font-sans text-xs text-ivory">Made to Order</span>
                    </label>
                  </div>

                  {formIsMadeToOrder && (
                    <div className="pt-2 border-t border-white/5">
                      <label className="block text-xs font-tech uppercase tracking-wider text-ivory/70 mb-1">
                        Artisan Lead Time
                      </label>
                      <input
                        type="text"
                        value={formLeadTime}
                        onChange={(e) => setFormLeadTime(e.target.value)}
                        placeholder="e.g. 5-7 business days"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-ivory text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Stock Quantity */}
                <div>
                  <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={formStockQuantity}
                    onChange={(e) => setFormStockQuantity(e.target.value)}
                    placeholder="e.g. 10"
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder-ivory/30 focus:outline-none focus:border-soft-gold text-xs font-tech"
                  />
                  <p className="font-tech text-[10px] text-ivory/40 mt-1">
                    Updates the real Supabase inventory record.
                  </p>
                </div>

                {/* Low Stock Threshold */}
                <div>
                  <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formLowStockThreshold}
                    onChange={(e) => setFormLowStockThreshold(e.target.value)}
                    placeholder="e.g. 5"
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

              {/* Care Instructions */}
              <div>
                <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                  Care Instructions
                </label>
                <input
                  type="text"
                  value={formCareInstructions}
                  onChange={(e) => setFormCareInstructions(e.target.value)}
                  placeholder="Gentle hand wash cold. Lay flat to dry."
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder-ivory/30 focus:outline-none focus:border-soft-gold text-xs"
                />
              </div>

              {/* Primary Image Path */}
              <div>
                <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 font-medium mb-1.5">
                  Primary Image Asset / URL
                </label>
                <input
                  type="text"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="/images/products/tote-bag.jpg"
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory placeholder-ivory/30 focus:outline-none focus:border-soft-gold text-xs font-tech"
                />
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
                    Published (Live on Storefront)
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
                    <span>Best Seller (Most Loved ❤️)</span>
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
                    <span>{editingProduct ? 'Save Changes' : 'Create Product'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Quick Change Price Modal */}
      {priceModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !priceSubmitting && setPriceModalProduct(null)}
          />

          <div className="relative w-full max-w-md bg-[#14171A] border border-white/15 rounded-3xl p-6 shadow-2xl z-10 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-soft-gold" />
                <h3 className="font-serif text-lg font-bold text-white">Change Product Price</h3>
              </div>
              <button
                onClick={() => !priceSubmitting && setPriceModalProduct(null)}
                className="p-1.5 rounded-lg text-ivory/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="font-sans text-xs text-white font-medium">{priceModalProduct.name}</p>
              <p className="font-tech text-[10px] text-ivory/50 mt-0.5">
                Current Price: <span className="text-soft-gold font-bold">₹{priceModalProduct.price.toLocaleString('en-IN')}</span>
              </p>
            </div>

            {priceError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200">
                {priceError}
              </div>
            )}

            <form onSubmit={handlePriceModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 mb-1.5">
                  New Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  autoFocus
                  value={newPriceValue}
                  onChange={(e) => setNewPriceValue(e.target.value)}
                  placeholder="e.g. 899"
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory text-sm font-tech focus:outline-none focus:border-soft-gold"
                />
                <p className="font-tech text-[10px] text-ivory/40 mt-1">
                  Changing this will immediately update the catalog price, cart, and checkout. Historical orders remain untouched.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={priceSubmitting}
                  onClick={() => setPriceModalProduct(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ivory text-xs font-sans font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={priceSubmitting}
                  className="px-4 py-2 rounded-xl bg-soft-gold hover:bg-[#E5C158] text-charcoal text-xs font-sans font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {priceSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Update Price</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Quick Change Stock Modal */}
      {stockModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !stockSubmitting && setStockModalProduct(null)}
          />

          <div className="relative w-full max-w-md bg-[#14171A] border border-white/15 rounded-3xl p-6 shadow-2xl z-10 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-soft-gold" />
                <h3 className="font-serif text-lg font-bold text-white">Adjust Stock & Threshold</h3>
              </div>
              <button
                onClick={() => !stockSubmitting && setStockModalProduct(null)}
                className="p-1.5 rounded-lg text-ivory/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="font-sans text-xs text-white font-medium">{stockModalProduct.name}</p>
              <div className="flex items-center gap-4 font-tech text-[10px] text-ivory/50 mt-1">
                <span>Total: {stockModalProduct.inventoryQuantity}</span>
                <span>Reserved: {stockModalProduct.reservedQuantity}</span>
                <span>Available: {stockModalProduct.availableStock}</span>
              </div>
            </div>

            {stockError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200">
                {stockError}
              </div>
            )}

            <form onSubmit={handleStockModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 mb-1.5">
                  Total Inventory Units *
                </label>
                <input
                  type="number"
                  required
                  min={stockModalProduct.reservedQuantity}
                  step="1"
                  autoFocus
                  value={newStockValue}
                  onChange={(e) => setNewStockValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory text-sm font-tech focus:outline-none focus:border-soft-gold"
                />
                <p className="font-tech text-[10px] text-ivory/40 mt-1">
                  Must be at least {stockModalProduct.reservedQuantity} to honor reserved customer orders.
                </p>
              </div>

              <div>
                <label className="block text-xs font-tech uppercase tracking-wider text-ivory/80 mb-1.5">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={newThresholdValue}
                  onChange={(e) => setNewThresholdValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-ivory text-sm font-tech focus:outline-none focus:border-soft-gold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={stockSubmitting}
                  onClick={() => setStockModalProduct(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ivory text-xs font-sans font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={stockSubmitting}
                  className="px-4 py-2 rounded-xl bg-soft-gold hover:bg-[#E5C158] text-charcoal text-xs font-sans font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {stockSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Inventory</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Dedicated Image Manager Modal */}
      {isImageModalOpen && managingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={handleCloseImageManager} />

          <div className="relative w-full max-w-2xl bg-[#14171A] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-soft-gold" />
                  <span>Manage Product Images</span>
                </h3>
                <p className="font-sans text-xs text-ivory/50 mt-0.5">
                  {managingProduct.name} &bull; Supabase Storage (`product-images`)
                </p>
              </div>
              <button
                onClick={handleCloseImageManager}
                className="p-2 rounded-xl text-ivory/40 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {imageActionError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{imageActionError}</span>
              </div>
            )}

            {/* Current Gallery */}
            <div className="space-y-3">
              <h4 className="font-tech text-xs uppercase tracking-wider text-ivory/80 font-medium">
                Gallery Images ({productImages.length})
              </h4>

              {imagesLoading ? (
                <div className="p-8 rounded-xl bg-white/5 text-center text-ivory/50 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-soft-gold" />
                  <span>Loading images from Supabase...</span>
                </div>
              ) : productImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {productImages.map((img, idx) => (
                    <div
                      key={img.id}
                      className="relative rounded-xl overflow-hidden bg-black/40 border border-white/10 group p-2 space-y-2"
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.publicUrl}
                          alt={img.altText || 'Product gallery'}
                          className="w-full h-full object-cover"
                        />
                        {idx === 0 && (
                          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-soft-gold text-charcoal font-tech text-[9px] font-bold uppercase shadow">
                            Primary
                          </span>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex items-center justify-between gap-1 pt-1">
                        <div className="flex items-center gap-1">
                          <button
                            disabled={idx === 0}
                            onClick={() => handleMoveImage(idx, 'up')}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-20 text-ivory"
                            title="Move left"
                          >
                            <ArrowUp className="w-3 h-3 rotate-[-90deg]" />
                          </button>
                          <button
                            disabled={idx === productImages.length - 1}
                            onClick={() => handleMoveImage(idx, 'down')}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-20 text-ivory"
                            title="Move right"
                          >
                            <ArrowDown className="w-3 h-3 rotate-[-90deg]" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {idx !== 0 && (
                            <button
                              disabled={settingPrimaryId === img.id}
                              onClick={() => handleSetPrimary(img)}
                              className="px-2 py-1 rounded text-[9px] font-tech font-bold uppercase bg-white/5 hover:bg-soft-gold hover:text-charcoal text-soft-gold border border-soft-gold/30 transition-colors"
                              title="Make this the primary storefront image"
                            >
                              {settingPrimaryId === img.id ? 'Saving...' : 'Set Primary'}
                            </button>
                          )}
                          <button
                            disabled={deletingImageId === img.id}
                            onClick={() => handleDeleteUploadedImage(img)}
                            className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                            title="Delete image"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5 text-center text-ivory/40 text-xs">
                  No Cloud Storage images uploaded yet for this product. Defaulting to local asset: {managingProduct.image}
                </div>
              )}
            </div>

            {/* Upload Additional Images */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <h4 className="font-tech text-xs uppercase tracking-wider text-ivory/80 font-medium">
                Upload New Image(s)
              </h4>

              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                id="admin-product-file-input"
              />

              <label
                htmlFor="admin-product-file-input"
                className="block p-6 rounded-2xl border-2 border-dashed border-white/20 hover:border-soft-gold/60 text-center cursor-pointer transition-colors bg-white/[0.02]"
              >
                <Upload className="w-6 h-6 text-soft-gold mx-auto mb-2" />
                <p className="font-sans text-xs text-white font-medium">
                  Click to select JPEG, PNG, or WebP images
                </p>
                <p className="font-tech text-[10px] text-ivory/40 mt-1">
                  Maximum file size: 5MB each.
                </p>
              </label>

              {/* Staged pending files */}
              {pendingFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="font-tech text-[10px] uppercase tracking-wider text-soft-gold">
                    Ready to Upload ({pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {pendingFiles.map((p, idx) => (
                      <div
                        key={idx}
                        className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/20 bg-black/40"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.previewUrl} alt="Pending" className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleRemovePendingFile(idx)}
                          className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 text-white hover:bg-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    disabled={uploadingImages}
                    onClick={handleUploadPendingImages}
                    className="w-full py-2.5 rounded-xl bg-soft-gold hover:bg-[#E5C158] text-charcoal text-xs font-sans font-bold flex items-center justify-center gap-2 shadow-luxury cursor-pointer"
                  >
                    {uploadingImages ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading to Supabase Storage...</span>
                      </>
                    ) : (
                      <span>Submit & Upload {pendingFiles.length} Image(s)</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 9. Delete / Archive Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !deleteSubmitting && setDeletingProduct(null)}
          />

          <div className="relative w-full max-w-md bg-[#14171A] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-5">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Remove Product</h3>
                <p className="font-tech text-xs text-rose-300">Data integrity confirmation</p>
              </div>
            </div>

            <p className="font-sans text-xs text-ivory/80 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-white">"{deletingProduct.name}"</span>?
            </p>

            {deleteError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 leading-relaxed">
                {deleteError}
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
              <p className="font-tech text-[10px] uppercase tracking-wider text-ivory/60 font-semibold">
                Safety Policy
              </p>
              <p className="font-sans text-[11px] text-ivory/70 leading-relaxed">
                If this product has been ordered by customers, it cannot be permanently deleted. Instead, it will be safely <strong>Unpublished / Archived</strong> so it no longer appears in the store while preserving all order receipts.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => setDeletingProduct(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ivory text-xs font-sans font-medium"
              >
                Cancel
              </button>

              {showArchiveOption ? (
                <button
                  type="button"
                  disabled={deleteSubmitting}
                  onClick={() => handleDeleteConfirm(true)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-charcoal text-xs font-sans font-bold flex items-center justify-center gap-1.5"
                >
                  {deleteSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                  <span>Archive / Unpublish</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={deleteSubmitting}
                    onClick={() => handleDeleteConfirm(true)}
                    className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-ivory text-xs font-sans font-medium flex items-center justify-center gap-1.5"
                  >
                    <Archive className="w-3.5 h-3.5 text-soft-gold" />
                    <span>Archive Instead</span>
                  </button>

                  <button
                    type="button"
                    disabled={deleteSubmitting}
                    onClick={() => handleDeleteConfirm(false)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-sans font-bold flex items-center justify-center gap-1.5"
                  >
                    {deleteSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
