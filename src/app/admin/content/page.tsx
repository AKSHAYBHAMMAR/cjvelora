'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  Sparkles,
  Image as ImageIcon,
  Layers,
  ShoppingBag,
  BookOpen,
  Search,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Eye,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Loader2,
  Upload,
  Calendar,
  X,
  Tag,
  Check,
  RefreshCw,
  Sliders,
  Globe,
  FileText,
} from 'lucide-react';
import {
  getAdminContent,
  saveSiteContentSection,
  createPromotionalBanner,
  updatePromotionalBanner,
  deletePromotionalBanner,
  saveFeaturedCollections,
  saveFeaturedProducts,
  uploadContentImage,
} from '@/lib/content';
import { getCategories } from '@/lib/categories';
import { getProducts } from '@/lib/products';
import {
  isOfferActive,
  getOfferStatus,
  getCollectionRoute,
  STANDARD_COLLECTIONS,
} from '@/lib/offers';
import {
  AllContentData,
  AnnouncementBarContent,
  HeroContent,
  AboutContent,
  SeoContent,
  PromotionalBanner,
  CreateBannerInput,
  FeaturedCollectionItem,
  FeaturedProductItem,
} from '@/types/content';
import { CategoryItem, Product } from '@/types';

type ContentTabKey =
  | 'announcement'
  | 'hero'
  | 'banners'
  | 'collections'
  | 'products'
  | 'about'
  | 'seo';

interface TabConfig {
  id: ContentTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const CONTENT_TABS: TabConfig[] = [
  { id: 'announcement', label: 'Announcement Bar', icon: Megaphone, description: 'Top header announcement message and scheduling' },
  { id: 'hero', label: 'Homepage Hero', icon: Sparkles, description: 'Signature video canvas copy, philosophies & CTAs' },
  { id: 'banners', label: 'Promotional Banners', icon: Tag, description: 'Artisan drop campaigns and visual editorial cards' },
  { id: 'collections', label: 'Featured Collections', icon: Layers, description: 'Curated category highlights from existing catalog' },
  { id: 'products', label: 'Featured Products', icon: ShoppingBag, description: 'Handpicked heirloom creations showcase' },
  { id: 'about', label: 'Brand / Story', icon: BookOpen, description: 'Atelier craftsmanship journey and heirloom stats' },
  { id: 'seo', label: 'SEO Metadata', icon: Globe, description: 'Google search indexing, OpenGraph card & snippet' },
];

export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState<ContentTabKey>('announcement');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Content Data
  const [content, setContent] = useState<AllContentData | null>(null);
  const [initialContent, setInitialContent] = useState<AllContentData | null>(null);

  // Catalog Lookups
  const [allCategories, setAllCategories] = useState<CategoryItem[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Toast Notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Banner Modal
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PromotionalBanner | null>(null);
  const [bannerForm, setBannerForm] = useState<CreateBannerInput>({
    title: '',
    description: '',
    imageUrl: '',
    ctaText: 'Explore Collection',
    ctaLink: '/#categories',
    badge: 'LIMITED ATELIER EDITION',
    discountType: 'percentage',
    discountValue: 10,
    collectionId: 'crochet-bags',
    collectionName: 'Crochet Bags',
    collectionSlug: 'crochet-bags',
    active: true,
    displayOrder: 1,
    startDate: null,
    endDate: null,
  });
  const [bannerSubmitting, setBannerSubmitting] = useState(false);
  const [bannerImageUploading, setBannerImageUploading] = useState(false);

  // Delete Banner Modal
  const [deletingBanner, setDeletingBanner] = useState<PromotionalBanner | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // About Image Uploading
  const [aboutImageUploading, setAboutImageUploading] = useState(false);

  // Load Content & Lookups
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [contentRes, categoriesRes, productsRes] = await Promise.all([
        getAdminContent(),
        getCategories(),
        getProducts({ publishedOnly: false }),
      ]);

      setContent(contentRes);
      setInitialContent(JSON.parse(JSON.stringify(contentRes)));
      setAllCategories(categoriesRes || []);
      setAllProducts(productsRes || []);
    } catch (err: any) {
      console.error('Failed to load admin content:', err);
      setToast({
        type: 'error',
        message: err?.message || 'Failed to load content from database.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dirty State Detection
  const isDirty = useMemo(() => {
    if (!content || !initialContent) return false;
    if (activeTab === 'announcement') {
      return JSON.stringify(content.announcementBar) !== JSON.stringify(initialContent.announcementBar);
    }
    if (activeTab === 'hero') {
      return JSON.stringify(content.hero) !== JSON.stringify(initialContent.hero);
    }
    if (activeTab === 'collections') {
      return JSON.stringify(content.featuredCollections) !== JSON.stringify(initialContent.featuredCollections);
    }
    if (activeTab === 'products') {
      return JSON.stringify(content.featuredProducts) !== JSON.stringify(initialContent.featuredProducts);
    }
    if (activeTab === 'about') {
      return JSON.stringify(content.about) !== JSON.stringify(initialContent.about);
    }
    if (activeTab === 'seo') {
      return JSON.stringify(content.seo) !== JSON.stringify(initialContent.seo);
    }
    return false;
  }, [content, initialContent, activeTab]);

  // Accidental Navigation Warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your storefront content. Are you sure you want to exit?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Discard changes in current tab
  const handleDiscard = () => {
    if (!initialContent) return;
    setContent(JSON.parse(JSON.stringify(initialContent)));
    setToast({ type: 'info', message: 'Reverted unsaved edits to last published state.' });
  };

  // Save current active tab
  const handleSaveActiveTab = async () => {
    if (!content) return;
    setSaving(true);

    try {
      if (activeTab === 'announcement') {
        const res = await saveSiteContentSection('announcement_bar', content.announcementBar, content.announcementBar.enabled);
        if (!res.success) throw new Error(res.error);
      } else if (activeTab === 'hero') {
        const res = await saveSiteContentSection('hero', content.hero, content.hero.enabled);
        if (!res.success) throw new Error(res.error);
      } else if (activeTab === 'about') {
        const res = await saveSiteContentSection('about', content.about, content.about.enabled);
        if (!res.success) throw new Error(res.error);
      } else if (activeTab === 'seo') {
        const res = await saveSiteContentSection('seo', content.seo, true);
        if (!res.success) throw new Error(res.error);
      } else if (activeTab === 'collections') {
        const res = await saveFeaturedCollections(
          content.featuredCollections.map((c, i) => ({
            categoryId: c.categoryId,
            displayOrder: i + 1,
            active: c.active,
            title: c.title,
            description: c.description,
          }))
        );
        if (!res.success) throw new Error(res.error);
      } else if (activeTab === 'products') {
        const res = await saveFeaturedProducts(
          content.featuredProducts.map((p, i) => ({
            productId: p.productId,
            displayOrder: i + 1,
            active: p.active,
          }))
        );
        if (!res.success) throw new Error(res.error);
      }

      setInitialContent(JSON.parse(JSON.stringify(content)));
      setToast({
        type: 'success',
        message: `${CONTENT_TABS.find((t) => t.id === activeTab)?.label} published successfully.`,
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err?.message || 'Failed to deploy content modifications.',
      });
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 3. PROMOTIONAL BANNERS ACTIONS
  // ---------------------------------------------------------------------------
  const openCreateBannerModal = () => {
    setEditingBanner(null);
    setBannerForm({
      title: 'The Monsoon Heirloom Drop',
      description: 'Artisan handcrafted crochet bags woven with reinforced double-loop knots and organic botanical yarn.',
      imageUrl: '/images/story/story-secondary.jpg',
      ctaText: 'Explore Collection',
      ctaLink: '/#categories',
      badge: 'LIMITED ATELIER EDITION',
      discountType: 'percentage',
      discountValue: 10,
      collectionId: allCategories[0]?.id || 'crochet-bags',
      collectionName: allCategories[0]?.name || 'Crochet Bags',
      collectionSlug: allCategories[0]?.slug || 'crochet-bags',
      active: true,
      displayOrder: (content?.banners.length || 0) + 1,
      startDate: null,
      endDate: null,
    });
    setIsBannerModalOpen(true);
  };

  const openEditBannerModal = (banner: PromotionalBanner) => {
    setEditingBanner(banner);
    setBannerForm({
      title: banner.title,
      description: banner.description || '',
      imageUrl: banner.imageUrl || '',
      ctaText: banner.ctaText || 'Explore Collection',
      ctaLink: banner.ctaLink || getCollectionRoute(banner.collectionSlug, banner.collectionName),
      badge: banner.badge || 'LIMITED ATELIER EDITION',
      discountType: (banner.discountType as any) || 'percentage',
      discountValue: Number(banner.discountValue ?? 10),
      collectionId: banner.collectionId || '',
      collectionName: banner.collectionName || '',
      collectionSlug: banner.collectionSlug || '',
      active: banner.active,
      displayOrder: banner.displayOrder,
      startDate: banner.startDate ? banner.startDate.slice(0, 10) : null,
      endDate: banner.endDate ? banner.endDate.slice(0, 10) : null,
    });
    setIsBannerModalOpen(true);
  };

  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBannerImageUploading(true);
    try {
      const res = await uploadContentImage(file, 'banners');
      if (res.publicUrl) {
        setBannerForm((prev) => ({ ...prev, imageUrl: res.publicUrl! }));
        setToast({ type: 'success', message: 'Banner asset uploaded to Supabase Storage.' });
      } else {
        setToast({ type: 'error', message: res.error || 'Failed to upload image.' });
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Error uploading file.' });
    } finally {
      setBannerImageUploading(false);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.title.trim()) {
      setToast({ type: 'error', message: 'Banner headline is required.' });
      return;
    }

    setBannerSubmitting(true);
    try {
      if (editingBanner) {
        const res = await updatePromotionalBanner(editingBanner.id, bannerForm);
        if (res.success && res.banner) {
          setContent((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              banners: prev.banners.map((b) => (b.id === editingBanner.id ? res.banner! : b)),
            };
          });
          setInitialContent((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              banners: prev.banners.map((b) => (b.id === editingBanner.id ? res.banner! : b)),
            };
          });
          setIsBannerModalOpen(false);
          setToast({ type: 'success', message: 'Promotional banner updated.' });
        } else {
          throw new Error(res.error || 'Update failed.');
        }
      } else {
        const res = await createPromotionalBanner(bannerForm);
        if (res.success && res.banner) {
          setContent((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              banners: [...prev.banners, res.banner!],
            };
          });
          setInitialContent((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              banners: [...prev.banners, res.banner!],
            };
          });
          setIsBannerModalOpen(false);
          setToast({ type: 'success', message: 'Promotional banner launched.' });
        } else {
          throw new Error(res.error || 'Creation failed.');
        }
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Failed to save banner.' });
    } finally {
      setBannerSubmitting(false);
    }
  };

  const handleDeleteBanner = async () => {
    if (!deletingBanner) return;
    setDeleteSubmitting(true);
    try {
      const res = await deletePromotionalBanner(deletingBanner.id);
      if (res.success) {
        setContent((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            banners: prev.banners.filter((b) => b.id !== deletingBanner.id),
          };
        });
        setInitialContent((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            banners: prev.banners.filter((b) => b.id !== deletingBanner.id),
          };
        });
        setDeletingBanner(null);
        setToast({ type: 'success', message: 'Promotional banner removed.' });
      } else {
        throw new Error(res.error || 'Failed to delete banner.');
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Error deleting banner.' });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Featured Collections Handlers
  // ---------------------------------------------------------------------------
  const handleAddFeaturedCategory = (categoryId: string) => {
    if (!content || !categoryId) return;
    if (content.featuredCollections.some((c) => c.categoryId === categoryId)) {
      setToast({ type: 'info', message: 'Category is already in featured collections list.' });
      return;
    }
    const cat = allCategories.find((c) => c.id === categoryId);
    if (!cat) return;

    const newItem: FeaturedCollectionItem = {
      id: `temp-${Date.now()}`,
      categoryId: cat.id,
      title: cat.name,
      description: cat.subtitle || '',
      imageUrl: cat.image || '',
      displayOrder: content.featuredCollections.length + 1,
      active: true,
      categorySlug: cat.slug,
    };

    setContent((prev) => ({
      ...prev!,
      featuredCollections: [...prev!.featuredCollections, newItem],
    }));
  };

  const handleRemoveFeaturedCategory = (categoryId: string) => {
    if (!content) return;
    setContent((prev) => ({
      ...prev!,
      featuredCollections: prev!.featuredCollections.filter((c) => c.categoryId !== categoryId),
    }));
  };

  const handleMoveCollection = (index: number, direction: 'up' | 'down') => {
    if (!content) return;
    const items = [...content.featuredCollections];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;

    setContent((prev) => ({
      ...prev!,
      featuredCollections: items,
    }));
  };

  // ---------------------------------------------------------------------------
  // Featured Products Handlers
  // ---------------------------------------------------------------------------
  const handleAddFeaturedProduct = (productId: string) => {
    if (!content || !productId) return;
    if (content.featuredProducts.some((p) => p.productId === productId)) {
      setToast({ type: 'info', message: 'Product is already in featured products list.' });
      return;
    }
    const prod = allProducts.find((p) => p.id === productId);
    if (!prod) return;

    const newItem: FeaturedProductItem = {
      id: `temp-${Date.now()}`,
      productId: prod.id,
      displayOrder: content.featuredProducts.length + 1,
      active: true,
      product: prod,
    };

    setContent((prev) => ({
      ...prev!,
      featuredProducts: [...prev!.featuredProducts, newItem],
    }));
  };

  const handleRemoveFeaturedProduct = (productId: string) => {
    if (!content) return;
    setContent((prev) => ({
      ...prev!,
      featuredProducts: prev!.featuredProducts.filter((p) => p.productId !== productId),
    }));
  };

  const handleMoveProduct = (index: number, direction: 'up' | 'down') => {
    if (!content) return;
    const items = [...content.featuredProducts];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;

    setContent((prev) => ({
      ...prev!,
      featuredProducts: items,
    }));
  };

  // ---------------------------------------------------------------------------
  // About Image Upload
  // ---------------------------------------------------------------------------
  const handleAboutImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAboutImageUploading(true);
    try {
      const res = await uploadContentImage(file, 'story');
      if (res.publicUrl) {
        setContent((prev) => ({
          ...prev!,
          about: { ...prev!.about, image: res.publicUrl! },
        }));
        setToast({ type: 'success', message: 'Atelier story photo uploaded.' });
      } else {
        setToast({ type: 'error', message: res.error || 'Failed to upload photo.' });
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message || 'Upload error.' });
    } finally {
      setAboutImageUploading(false);
    }
  };

  // Auto-clear toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-9 h-9 text-soft-gold animate-spin" />
        <div className="text-center">
          <p className="font-serif text-lg text-white">Loading Content Management</p>
          <p className="font-tech text-xs uppercase tracking-[0.25em] text-ivory/50 mt-1">
            Accessing Editorial & Storefront Schema
          </p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-2xl text-white">CMS Service Unavailable</h2>
          <p className="text-sm text-ivory/60 max-w-md mx-auto">
            Unable to communicate with the content database. Please verify your database connection.
          </p>
        </div>
        <button
          onClick={() => loadData(true)}
          className="px-5 py-2.5 rounded-xl bg-soft-gold text-charcoal font-semibold text-xs uppercase tracking-wider inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 pb-32">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-top-4 ${
            toast.type === 'success'
              ? 'bg-[#10241B]/95 border-emerald-500/40 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-[#2B1115]/95 border-rose-500/40 text-rose-200'
              : 'bg-[#1A1E24]/95 border-white/20 text-ivory'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
          {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />}
          {toast.type === 'info' && <Sparkles className="w-5 h-5 text-soft-gold flex-shrink-0" />}
          <p className="text-xs font-medium tracking-wide">{toast.message}</p>
          <button onClick={() => setToast(null)} className="p-1 text-white/50 hover:text-white rounded-lg ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-white">
              Content Management
            </h1>
            <span className="font-tech text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold bg-soft-gold/15 text-soft-gold border border-soft-gold/30">
              Live Atelier CMS
            </span>
          </div>
          <p className="font-sans text-xs md:text-sm text-ivory/60 max-w-2xl">
            Control dynamic storefront announcements, hero messaging, curated collections, and SEO metadata with
            instant live previews.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-ivory/80 text-xs font-semibold tracking-wider flex items-center gap-2 border border-white/10 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Live Storefront</span>
          </Link>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-ivory/80 text-xs font-semibold tracking-wider flex items-center gap-2 border border-white/10 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-none border-b border-white/5">
        {CONTENT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-sans text-xs uppercase tracking-wider font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-soft-gold text-charcoal shadow-luxury'
                  : 'bg-[#14171A] text-ivory/70 hover:text-white hover:bg-white/5 border border-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-charcoal' : 'text-ivory/60'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Context Banner */}
      <div className="bg-[#14171A]/60 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-semibold text-white">
            {CONTENT_TABS.find((t) => t.id === activeTab)?.label}
          </h2>
          <p className="text-xs text-ivory/50 mt-0.5">
            {CONTENT_TABS.find((t) => t.id === activeTab)?.description}
          </p>
        </div>

        {activeTab === 'banners' && (
          <button
            onClick={openCreateBannerModal}
            className="px-4 py-2 rounded-xl bg-soft-gold text-charcoal text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-luxury hover:bg-soft-gold/90 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Banner</span>
          </button>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 1. ANNOUNCEMENT BAR */}
      {/* ===================================================================== */}
      {activeTab === 'announcement' && (
        <div className="space-y-6">
          {/* Real-time Preview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-soft-gold" />
              <span className="font-tech text-xs uppercase tracking-wider text-ivory/70">
                Live Storefront Mockup Preview
              </span>
            </div>
            {content.announcementBar.enabled ? (
              <div className="rounded-xl overflow-hidden border border-white/15 bg-[#121518] text-ivory py-3 px-6 flex items-center justify-between shadow-lg">
                <div className="flex items-center justify-center gap-2 w-full text-center">
                  <Sparkles className="w-3.5 h-3.5 text-soft-gold flex-shrink-0 animate-pulse" />
                  <span className="font-sans text-xs tracking-wide text-ivory/90 font-light">
                    {content.announcementBar.message || 'Enter announcement message...'}
                  </span>
                  {content.announcementBar.ctaText && (
                    <span className="font-tech text-[10px] uppercase tracking-wider text-soft-gold font-semibold underline underline-offset-4 ml-2">
                      {content.announcementBar.ctaText} →
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center text-xs text-ivory/40">
                Announcement bar is currently disabled.
              </div>
            )}
          </div>

          {/* Form */}
          <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div>
                <p className="font-sans text-sm font-semibold text-white">Enable Announcement Bar</p>
                <p className="text-xs text-ivory/50">Display at the top of the storefront header.</p>
              </div>
              <input
                type="checkbox"
                checked={content.announcementBar.enabled}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev!,
                    announcementBar: { ...prev!.announcementBar, enabled: e.target.checked },
                  }))
                }
                className="w-5 h-5 accent-soft-gold cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Announcement Message Copy *
              </label>
              <textarea
                rows={2}
                value={content.announcementBar.message}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev!,
                    announcementBar: { ...prev!.announcementBar, message: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors resize-none"
                placeholder="Complimentary bespoke luxury packaging on all heirloom orders across India"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  CTA Action Text
                </label>
                <input
                  type="text"
                  value={content.announcementBar.ctaText || ''}
                  onChange={(e) =>
                    setContent((prev) => ({
                      ...prev!,
                      announcementBar: { ...prev!.announcementBar, ctaText: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                  placeholder="Explore Collection"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  CTA Target Link
                </label>
                <input
                  type="text"
                  value={content.announcementBar.ctaLink || ''}
                  onChange={(e) =>
                    setContent((prev) => ({
                      ...prev!,
                      announcementBar: { ...prev!.announcementBar, ctaLink: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                  placeholder="/#categories"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  value={content.announcementBar.startDate ? content.announcementBar.startDate.slice(0, 10) : ''}
                  onChange={(e) =>
                    setContent((prev) => ({
                      ...prev!,
                      announcementBar: {
                        ...prev!.announcementBar,
                        startDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                      },
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={content.announcementBar.endDate ? content.announcementBar.endDate.slice(0, 10) : ''}
                  onChange={(e) =>
                    setContent((prev) => ({
                      ...prev!,
                      announcementBar: {
                        ...prev!.announcementBar,
                        endDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                      },
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. HOMEPAGE HERO */}
      {/* ===================================================================== */}
      {activeTab === 'hero' && (
        <div className="space-y-6">
          {/* Live Preview Card */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-soft-gold" />
              <span className="font-tech text-xs uppercase tracking-wider text-ivory/70">
                Live Hero Typography Preview
              </span>
            </div>
            <div className="rounded-2xl border border-white/15 bg-warm-white p-6 sm:p-10 shadow-luxury text-charcoal">
              <div className="max-w-xl space-y-4">
                <h1 className="font-serif text-2xl sm:text-4xl font-semibold leading-tight text-charcoal">
                  {content.hero.heading.split('\n')[0]}
                  {content.hero.heading.split('\n')[1] && (
                    <>
                      <br />
                      <span className="italic font-normal text-olive-accent">
                        {content.hero.heading.split('\n')[1]}
                      </span>
                    </>
                  )}
                </h1>
                <p className="font-sans text-xs sm:text-sm text-charcoal/80 leading-relaxed font-light">
                  {content.hero.subheading}
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <span className="px-5 py-2.5 rounded-full bg-navy text-ivory font-sans text-[11px] uppercase tracking-widest font-semibold shadow-sm">
                    {content.hero.ctaText} →
                  </span>
                  {content.hero.secondaryCtaText && (
                    <span className="px-5 py-2.5 rounded-full border border-charcoal/20 text-charcoal font-sans text-[11px] uppercase tracking-widest font-semibold">
                      {content.hero.secondaryCtaText}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div>
                <p className="font-sans text-sm font-semibold text-white">Enable Hero Section</p>
                <p className="text-xs text-ivory/50">Keep primary luxury hero canvas visible on the homepage.</p>
              </div>
              <input
                type="checkbox"
                checked={content.hero.enabled}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev!,
                    hero: { ...prev!.hero, enabled: e.target.checked },
                  }))
                }
                className="w-5 h-5 accent-soft-gold cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Headline (Use newline for second italic line) *
              </label>
              <textarea
                rows={2}
                value={content.hero.heading}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev!,
                    hero: { ...prev!.hero, heading: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors resize-none font-serif text-sm"
                placeholder="Made by Hand.&#10;Meant to Be Loved."
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Philosophy / Subheading Paragraph *
              </label>
              <textarea
                rows={3}
                value={content.hero.subheading}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev!,
                    hero: { ...prev!.hero, subheading: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors resize-none"
                placeholder="Step into the serene universe of VELORA..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Primary CTA Text
                </label>
                <input
                  type="text"
                  value={content.hero.ctaText}
                  onChange={(e) =>
                    setContent((prev) => ({
                      ...prev!,
                      hero: { ...prev!.hero, ctaText: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                  placeholder="Explore Collection"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Primary CTA Target Link
                </label>
                <input
                  type="text"
                  value={content.hero.ctaLink}
                  onChange={(e) =>
                    setContent((prev) => ({
                      ...prev!,
                      hero: { ...prev!.hero, ctaLink: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                  placeholder="#categories"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Secondary CTA Text
                </label>
                <input
                  type="text"
                  value={content.hero.secondaryCtaText || ''}
                  onChange={(e) =>
                    setContent((prev) => ({
                      ...prev!,
                      hero: { ...prev!.hero, secondaryCtaText: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                  placeholder="Our Story"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Secondary CTA Target Link
                </label>
                <input
                  type="text"
                  value={content.hero.secondaryCtaLink || ''}
                  onChange={(e) =>
                    setContent((prev) => ({
                      ...prev!,
                      hero: { ...prev!.hero, secondaryCtaLink: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                  placeholder="#about"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Hero Video / Background Media URL
              </label>
              <input
                type="text"
                value={content.hero.backgroundMedia}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev!,
                    hero: { ...prev!.hero, backgroundMedia: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                placeholder="/videos/velora-hero.mp4"
              />
              <p className="text-[11px] text-ivory/40">
                Path to video or image asset. Retains video canvas frame seamlessly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. PROMOTIONAL BANNERS & AUTOMATIC OFFER SYSTEM */}
      {/* ===================================================================== */}
      {activeTab === 'banners' && (
        <div className="space-y-8">
          {/* Section 19: Admin Live Preview Component */}
          {content.banners.length > 0 && (() => {
            const previewBanner = content.banners.find((b) => isOfferActive(b)) || content.banners[0];
            const status = getOfferStatus(previewBanner);
            const statusColors = {
              ACTIVE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
              SCHEDULED: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
              EXPIRED: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
              DISABLED: 'bg-white/10 text-ivory/50 border-white/20',
            };

            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-soft-gold" />
                    <span className="font-tech text-xs uppercase tracking-wider text-ivory/70">
                      Live Storefront Offer Preview (Section 19)
                    </span>
                  </div>
                  <span className={`font-tech text-[10px] uppercase tracking-wider px-3 py-1 rounded-full border font-bold ${statusColors[status]}`}>
                    Status: {status}
                  </span>
                </div>

                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-[#121518] to-[#1E232A] text-ivory border border-white/10 shadow-2xl p-6 sm:p-10">
                  <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6">
                    <div className="md:col-span-7 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-gold/15 border border-soft-gold/30 text-soft-gold font-tech text-[10px] uppercase tracking-[0.25em] font-semibold">
                          <Tag className="w-3 h-3" />
                          <span>{previewBanner.badge || 'LIMITED ATELIER EDITION'}</span>
                        </div>
                        {Number(previewBanner.discountValue || 0) > 0 && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-tech text-[10px] uppercase tracking-wider font-bold">
                            {previewBanner.discountValue}% OFF
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                        {previewBanner.title}
                      </h3>

                      {previewBanner.description && (
                        <p className="font-sans text-xs sm:text-sm text-ivory/70 leading-relaxed max-w-xl font-light">
                          {previewBanner.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 pt-2">
                        <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-soft-gold text-charcoal font-sans text-xs uppercase tracking-widest font-bold shadow-luxury">
                          <span>EXPLORE COLLECTION →</span>
                        </span>
                        <span className="text-xs text-ivory/60 font-tech">
                          Collection: <strong className="text-white">{previewBanner.collectionName || 'All Catalog'}</strong>
                        </span>
                      </div>

                      <div className="text-[11px] text-ivory/40 font-mono pt-1 flex flex-wrap gap-4 border-t border-white/5">
                        <span>Start: {previewBanner.startDate ? new Date(previewBanner.startDate).toLocaleDateString('en-IN') : 'Immediate'}</span>
                        <span>End: {previewBanner.endDate ? new Date(previewBanner.endDate).toLocaleDateString('en-IN') : 'No Expiry'}</span>
                      </div>
                    </div>

                    {previewBanner.imageUrl && (
                      <div className="md:col-span-5 h-48 sm:h-64 rounded-2xl overflow-hidden relative border border-white/10">
                        <img
                          src={previewBanner.imageUrl}
                          alt={previewBanner.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Configured Banners Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-semibold text-white">Configured Offers & Banners</h3>
              <button
                onClick={openCreateBannerModal}
                className="px-4 py-2 rounded-xl bg-soft-gold text-charcoal text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-luxury hover:bg-soft-gold/90 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Offer</span>
              </button>
            </div>

            {content.banners.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#14171A] border border-white/10 space-y-4">
                <Tag className="w-12 h-12 text-soft-gold/40 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-serif text-lg text-white">No Promotional Offers Configured</h3>
                  <p className="text-xs text-ivory/50 max-w-sm mx-auto">
                    Configure a seasonal promotional offer with automatic collection percentage discounts.
                  </p>
                </div>
                <button
                  onClick={openCreateBannerModal}
                  className="px-4 py-2.5 rounded-xl bg-soft-gold text-charcoal font-semibold text-xs uppercase tracking-wider inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Offer</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {content.banners.map((b) => {
                  const status = getOfferStatus(b);
                  const statusBadgeClass = {
                    ACTIVE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                    SCHEDULED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                    EXPIRED: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                    DISABLED: 'bg-white/10 text-ivory/50 border-white/10',
                  }[status];

                  return (
                    <div
                      key={b.id}
                      className="bg-[#14171A] border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between"
                    >
                      <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-tech text-[10px] uppercase font-bold text-soft-gold bg-soft-gold/15 px-2.5 py-1 rounded-full border border-soft-gold/30">
                              Order: {b.displayOrder}
                            </span>
                            {Number(b.discountValue || 0) > 0 && (
                              <span className="font-tech text-[10px] uppercase font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/40">
                                {b.discountValue}% OFF
                              </span>
                            )}
                          </div>
                          <span className={`font-tech text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${statusBadgeClass}`}>
                            {status}
                          </span>
                        </div>

                        {b.imageUrl && (
                          <div className="h-44 rounded-xl overflow-hidden relative border border-white/5">
                            <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                          </div>
                        )}

                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-tech tracking-wider text-soft-gold block">
                            {b.badge || 'Limited Atelier Edition'}
                          </span>
                          <h4 className="font-serif text-lg font-semibold text-white">{b.title}</h4>
                          {b.description && (
                            <p className="text-xs text-ivory/70 line-clamp-2 leading-relaxed font-light">
                              {b.description}
                            </p>
                          )}
                        </div>

                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs space-y-1">
                          <div className="text-ivory/80">
                            Collection: <strong className="text-white">{b.collectionName || 'All Products'}</strong>
                          </div>
                          <div className="text-[11px] text-ivory/50 flex items-center justify-between pt-1">
                            <span>Button: EXPLORE COLLECTION →</span>
                            <span>{b.startDate ? `Starts: ${b.startDate.slice(0, 10)}` : 'Active now'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditBannerModal(b)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-ivory/80 text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setDeletingBanner(b)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. FEATURED COLLECTIONS */}
      {/* ===================================================================== */}
      {activeTab === 'collections' && (
        <div className="space-y-6">
          <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div>
                <h3 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
                  Curate Featured Categories
                </h3>
                <p className="text-xs text-ivory/50 mt-0.5">
                  Select categories from the catalog to feature across the storefront.
                </p>
              </div>

              {/* Add category dropdown */}
              <div className="flex items-center gap-2">
                <select
                  id="categorySelect"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddFeaturedCategory(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#1D2126] border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold"
                >
                  <option value="" disabled>
                    + Add Category to Featured...
                  </option>
                  {allCategories
                    .filter((c) => !content.featuredCollections.some((fc) => fc.categoryId === c.id))
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.itemCount} items)
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* List of Featured Collections */}
            {content.featuredCollections.length === 0 ? (
              <div className="p-8 text-center text-xs text-ivory/40">
                No categories currently selected. Storefront will fall back to default catalog categories.
              </div>
            ) : (
              <div className="space-y-3">
                {content.featuredCollections.map((col, idx) => (
                  <div
                    key={col.categoryId || col.id}
                    className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-soft-gold flex items-center justify-center font-tech text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-serif text-sm font-semibold text-white">{col.title}</p>
                        <p className="text-[11px] text-ivory/50">Slug: /{col.categorySlug || 'category'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={idx === 0}
                        onClick={() => handleMoveCollection(idx, 'up')}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-ivory"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={idx === content.featuredCollections.length - 1}
                        onClick={() => handleMoveCollection(idx, 'down')}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-ivory"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveFeaturedCategory(col.categoryId)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. FEATURED PRODUCTS */}
      {/* ===================================================================== */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div>
                <h3 className="font-serif text-sm font-semibold text-white uppercase tracking-wider">
                  Curate Featured Heirloom Products
                </h3>
                <p className="text-xs text-ivory/50 mt-0.5">
                  Selected creations will be showcased in the "Most Loved" community favorites grid.
                </p>
              </div>

              {/* Add product dropdown */}
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddFeaturedProduct(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-[#1D2126] border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold"
              >
                <option value="" disabled>
                  + Add Product to Featured...
                </option>
                {allProducts
                  .filter((p) => !content.featuredProducts.some((fp) => fp.productId === p.id))
                  .map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} (₹{prod.price.toLocaleString('en-IN')})
                    </option>
                  ))}
              </select>
            </div>

            {content.featuredProducts.length === 0 ? (
              <div className="p-8 text-center text-xs text-ivory/40">
                No custom products selected. Storefront will fall back to best sellers and most-loved creations.
              </div>
            ) : (
              <div className="space-y-3">
                {content.featuredProducts.map((p, idx) => {
                  const prodDetails = allProducts.find((item) => item.id === p.productId) || p.product;
                  return (
                    <div
                      key={p.productId || p.id}
                      className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-soft-gold flex items-center justify-center font-tech text-xs font-bold">
                          {idx + 1}
                        </div>
                        {prodDetails?.image && (
                          <img
                            src={prodDetails.image}
                            alt=""
                            className="w-10 h-10 object-cover rounded-lg border border-white/10"
                          />
                        )}
                        <div>
                          <p className="font-serif text-sm font-semibold text-white">
                            {prodDetails?.name || 'Product'}
                          </p>
                          <p className="text-[11px] text-soft-gold font-tech">
                            ₹{prodDetails?.price?.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveProduct(idx, 'up')}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-ivory"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === content.featuredProducts.length - 1}
                          onClick={() => handleMoveProduct(idx, 'down')}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-ivory"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveFeaturedProduct(p.productId)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 ml-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. BRAND / ABOUT STORY */}
      {/* ===================================================================== */}
      {activeTab === 'about' && (
        <div className="space-y-6">
          <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div>
                <p className="font-sans text-sm font-semibold text-white">Enable About Story Section</p>
                <p className="text-xs text-ivory/50">Display the Atelier journey & bento showcase on homepage.</p>
              </div>
              <input
                type="checkbox"
                checked={content.about.enabled}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev!,
                    about: { ...prev!.about, enabled: e.target.checked },
                  }))
                }
                className="w-5 h-5 accent-soft-gold cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Story Headline (Use newline for second line) *
              </label>
              <textarea
                rows={2}
                value={content.about.brandHeading}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev!,
                    about: { ...prev!.about, brandHeading: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors resize-none font-serif text-sm"
                placeholder="The Story Behind&#10;VELORA"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Philosophy Paragraph 1 *
              </label>
              <textarea
                rows={3}
                value={content.about.description}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev!,
                    about: { ...prev!.about, description: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Craftsmanship Paragraph 2 *
              </label>
              <textarea
                rows={3}
                value={content.about.storyContent}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev!,
                    about: { ...prev!.about, storyContent: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors resize-none"
              />
            </div>

            {/* Photo upload */}
            <div className="space-y-2 pt-2">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Artisan Story Cover Photo
              </label>
              <div className="flex items-center gap-4">
                {content.about.image && (
                  <img
                    src={content.about.image}
                    alt="Story"
                    className="w-16 h-16 object-cover rounded-xl border border-white/10"
                  />
                )}
                <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-2 transition-colors">
                  {aboutImageUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-soft-gold" />
                  ) : (
                    <Upload className="w-4 h-4 text-soft-gold" />
                  )}
                  <span>Upload Story Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAboutImageUpload}
                    className="hidden"
                    disabled={aboutImageUploading}
                  />
                </label>
              </div>
            </div>

            {/* Stats Editor */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Atelier Hallmark Metrics (3 Highlights)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {content.about.stats.map((st, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <input
                      type="text"
                      value={st.value}
                      onChange={(e) => {
                        const newStats = [...content.about.stats];
                        newStats[idx].value = e.target.value;
                        setContent((prev) => ({
                          ...prev!,
                          about: { ...prev!.about, stats: newStats },
                        }));
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white font-serif font-bold text-lg"
                      placeholder="100%"
                    />
                    <input
                      type="text"
                      value={st.label}
                      onChange={(e) => {
                        const newStats = [...content.about.stats];
                        newStats[idx].label = e.target.value;
                        setContent((prev) => ({
                          ...prev!,
                          about: { ...prev!.about, stats: newStats },
                        }));
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-ivory text-xs"
                      placeholder="Handmade"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. SEO METADATA */}
      {/* ===================================================================== */}
      {activeTab === 'seo' && (
        <div className="space-y-6">
          {/* SERP Search Preview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-soft-gold" />
              <span className="font-tech text-xs uppercase tracking-wider text-ivory/70">
                Google Search Result Snippet Preview
              </span>
            </div>
            <div className="p-5 rounded-2xl bg-[#1C1F24] border border-white/10 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-ivory/50">
                <span className="w-4 h-4 rounded-full bg-soft-gold/20 flex items-center justify-center text-[10px] text-soft-gold font-serif">
                  V
                </span>
                <span>https://cjvelora.vercel.app</span>
              </div>
              <h4 className="text-blue-400 font-sans text-base hover:underline cursor-pointer">
                {content.seo.homepageTitle}
              </h4>
              <p className="text-xs text-ivory/70 leading-relaxed max-w-xl font-light">
                {content.seo.metaDescription}
              </p>
            </div>
          </div>

          <div className="bg-[#14171A] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Homepage HTML Title Tag *
              </label>
              <input
                type="text"
                value={content.seo.homepageTitle}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev!,
                    seo: { ...prev!.seo, homepageTitle: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                Meta Description *
              </label>
              <textarea
                rows={3}
                value={content.seo.metaDescription}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev!,
                    seo: { ...prev!.seo, metaDescription: e.target.value },
                  }))
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors resize-none"
              />
              <p className="text-[11px] text-ivory/40">Recommended length: 140–160 characters.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  OpenGraph Social Image URL
                </label>
                <input
                  type="text"
                  value={content.seo.ogImage || ''}
                  onChange={(e) =>
                    setContent((prev) => ({
                      ...prev!,
                      seo: { ...prev!.seo, ogImage: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                  placeholder="/images/og/velora-og.jpg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Canonical URL
                </label>
                <input
                  type="text"
                  value={content.seo.canonicalUrl || ''}
                  onChange={(e) =>
                    setContent((prev) => ({
                      ...prev!,
                      seo: { ...prev!.seo, canonicalUrl: e.target.value },
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors"
                  placeholder="https://cjvelora.vercel.app"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                SEO Keywords (Comma-separated)
              </label>
              <textarea
                rows={2}
                value={content.seo.keywords || ''}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev!,
                    seo: { ...prev!.seo, keywords: e.target.value },
                  }))
                }
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold transition-colors resize-none"
                placeholder="luxury crochet, handmade crochet brand..."
              />
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STICKY BOTTOM ACTION BAR (When active tab has unsaved changes) */}
      {/* ===================================================================== */}
      {isDirty && (
        <div className="fixed bottom-6 left-0 right-0 z-40 px-6 max-w-4xl mx-auto animate-in slide-in-from-bottom-6 duration-300">
          <div className="bg-[#181B1F]/95 border border-soft-gold/40 rounded-2xl shadow-2xl backdrop-blur-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <div>
                <p className="font-sans text-xs font-semibold text-white">
                  Unsaved Changes in {CONTENT_TABS.find((t) => t.id === activeTab)?.label}
                </p>
                <p className="text-[11px] text-ivory/50">
                  Publish modifications to reflect on the active storefront.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleDiscard}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ivory/70 text-xs font-semibold tracking-wider border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>

              <button
                type="button"
                onClick={handleSaveActiveTab}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-soft-gold hover:bg-soft-gold/90 text-charcoal text-xs font-bold uppercase tracking-wider transition-all shadow-luxury flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deploying...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Publish Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* BANNER CREATE / EDIT MODAL */}
      {/* ===================================================================== */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181B1F] border border-white/10 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in-50 zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-serif text-lg font-semibold text-white">
                {editingBanner ? 'Edit Promotional Banner' : 'Create Promotional Banner'}
              </h3>
              <button
                onClick={() => setIsBannerModalOpen(false)}
                className="p-1 text-ivory/50 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Banner Headline *
                </label>
                <input
                  type="text"
                  required
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold"
                  placeholder="The Monsoon Heirloom Drop"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Description Copy
                </label>
                <textarea
                  rows={2}
                  value={bannerForm.description || ''}
                  onChange={(e) => setBannerForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold resize-none"
                  placeholder="Artisan handcrafted crochet bags woven with reinforced double-loop knots..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Banner Visual Asset
                </label>
                <div className="flex items-center gap-3">
                  {bannerForm.imageUrl && (
                    <img
                      src={bannerForm.imageUrl}
                      alt="Banner"
                      className="w-14 h-14 object-cover rounded-xl border border-white/10"
                    />
                  )}
                  <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-2 transition-colors">
                    {bannerImageUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-soft-gold" />
                    ) : (
                      <Upload className="w-4 h-4 text-soft-gold" />
                    )}
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerImageUpload}
                      className="hidden"
                      disabled={bannerImageUploading}
                    />
                  </label>
                </div>
              </div>

              {/* Atelier Badge */}
              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Atelier Badge Label
                </label>
                <input
                  type="text"
                  value={bannerForm.badge || ''}
                  onChange={(e) => setBannerForm((prev) => ({ ...prev, badge: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold uppercase tracking-wider"
                  placeholder="LIMITED ATELIER EDITION"
                />
              </div>

              {/* Headline */}
              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Offer Headline *
                </label>
                <input
                  type="text"
                  required
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold"
                  placeholder="The Monsoon Heirloom Drop"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Description Copy
                </label>
                <textarea
                  rows={2}
                  value={bannerForm.description || ''}
                  onChange={(e) => setBannerForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold resize-none"
                  placeholder="Artisan handcrafted crochet bags woven with reinforced double-loop knots..."
                />
              </div>

              {/* DISCOUNT CONFIGURATION (Sections 1 & 6) */}
              <div className="p-4 rounded-xl bg-soft-gold/5 border border-soft-gold/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-tech text-xs uppercase tracking-wider font-bold text-soft-gold">
                      Promotional Discount Configuration
                    </p>
                    <p className="text-[11px] text-ivory/60">
                      Automatic product discount applied to all eligible items in the selected collection.
                    </p>
                  </div>
                  <span className="font-tech text-sm font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/30">
                    {bannerForm.discountValue || 0}% OFF
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={bannerForm.discountValue ?? 0}
                        onChange={(e) => {
                          const val = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                          setBannerForm((prev) => ({ ...prev, discountValue: val }));
                        }}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-tech font-bold focus:outline-none focus:border-soft-gold"
                        placeholder="10"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs text-ivory/50 font-tech font-bold">%</span>
                    </div>

                    {/* Presets: 5%, 10%, 15%, 20%, 25% */}
                    <div className="flex items-center gap-1.5">
                      {[5, 10, 15, 20, 25].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setBannerForm((prev) => ({ ...prev, discountValue: preset }))}
                          className={`px-2.5 py-2 rounded-lg text-xs font-tech font-bold transition-all ${
                            bannerForm.discountValue === preset
                              ? 'bg-soft-gold text-charcoal'
                              : 'bg-white/5 text-ivory/70 hover:bg-white/10 hover:text-white border border-white/10'
                          }`}
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic calculation example display */}
                  <div className="text-[11px] font-mono text-emerald-400/90 bg-black/40 p-2 rounded-lg border border-emerald-500/20">
                    Example: ₹1,000 product &rarr; -₹{Math.round((1000 * (bannerForm.discountValue || 0)) / 100)} discount &rarr;{' '}
                    <strong className="text-white">
                      ₹{Math.max(0, 1000 - Math.round((1000 * (bannerForm.discountValue || 0)) / 100)).toLocaleString('en-IN')}
                    </strong>{' '}
                    offer price
                  </div>
                </div>
              </div>

              {/* COLLECTION SELECTION (Section 3: No URL input) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                    Explore Collection Target * (No URL required)
                  </label>
                  <span className="text-[10px] text-soft-gold font-tech">Button: EXPLORE COLLECTION →</span>
                </div>
                <select
                  value={bannerForm.collectionSlug || bannerForm.collectionId || ''}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    const standardMatch = STANDARD_COLLECTIONS.find((s) => s.slug === selectedVal);
                    const categoryMatch = allCategories.find((c) => c.slug === selectedVal || c.id === selectedVal);

                    if (standardMatch) {
                      setBannerForm((prev) => ({
                        ...prev,
                        collectionId: standardMatch.id,
                        collectionName: standardMatch.name,
                        collectionSlug: standardMatch.slug,
                        ctaText: 'Explore Collection',
                        ctaLink: getCollectionRoute(standardMatch.slug, standardMatch.name),
                      }));
                    } else if (categoryMatch) {
                      setBannerForm((prev) => ({
                        ...prev,
                        collectionId: categoryMatch.id,
                        collectionName: categoryMatch.name,
                        collectionSlug: categoryMatch.slug,
                        ctaText: 'Explore Collection',
                        ctaLink: getCollectionRoute(categoryMatch.slug, categoryMatch.name),
                      }));
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#1D2126] border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold"
                >
                  <option value="" disabled>
                    Select an eligible collection/category...
                  </option>
                  <optgroup label="Curated Collections">
                    {STANDARD_COLLECTIONS.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Catalog Categories">
                    {allCategories.map((cat) => (
                      <option key={cat.id} value={cat.slug || cat.id}>
                        {cat.name} ({cat.itemCount} items)
                      </option>
                    ))}
                  </optgroup>
                </select>
                <p className="text-[11px] text-ivory/40">
                  Products in this collection will automatically display discounted prices while the offer is active.
                </p>
              </div>

              {/* Banner Visual Asset */}
              <div className="space-y-1.5">
                <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                  Banner Visual Asset
                </label>
                <div className="flex items-center gap-3">
                  {bannerForm.imageUrl && (
                    <img
                      src={bannerForm.imageUrl}
                      alt="Banner"
                      className="w-14 h-14 object-cover rounded-xl border border-white/10"
                    />
                  )}
                  <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-2 transition-colors">
                    {bannerImageUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-soft-gold" />
                    ) : (
                      <Upload className="w-4 h-4 text-soft-gold" />
                    )}
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerImageUpload}
                      className="hidden"
                      disabled={bannerImageUploading}
                    />
                  </label>
                </div>
              </div>

              {/* Scheduling Windows */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                    Offer Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={bannerForm.startDate || ''}
                    onChange={(e) => setBannerForm((prev) => ({ ...prev, startDate: e.target.value || null }))}
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                    Offer End Date (Expiration)
                  </label>
                  <input
                    type="date"
                    value={bannerForm.endDate || ''}
                    onChange={(e) => setBannerForm((prev) => ({ ...prev, endDate: e.target.value || null }))}
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold"
                  />
                </div>
              </div>

              {/* Display Order & Active */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-tech text-[10px] uppercase tracking-wider text-ivory/70">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bannerForm.displayOrder || 1}
                    onChange={(e) =>
                      setBannerForm((prev) => ({
                        ...prev,
                        displayOrder: parseInt(e.target.value, 10) || 1,
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-soft-gold"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 self-end">
                  <span className="text-xs font-medium text-white">Active / Published</span>
                  <input
                    type="checkbox"
                    checked={bannerForm.active}
                    onChange={(e) => setBannerForm((prev) => ({ ...prev, active: e.target.checked }))}
                    className="w-4 h-4 accent-soft-gold cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ivory text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bannerSubmitting}
                  className="px-5 py-2 rounded-xl bg-soft-gold hover:bg-soft-gold/90 text-charcoal text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                >
                  {bannerSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingBanner ? 'Save Changes' : 'Create Offer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DELETE BANNER CONFIRMATION MODAL */}
      {/* ===================================================================== */}
      {deletingBanner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181B1F] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-white">Delete Banner</h3>
                <p className="text-xs text-ivory/50">Are you sure you want to remove this banner?</p>
              </div>
            </div>

            <p className="text-xs text-ivory/70">
              "{deletingBanner.title}" will be permanently deleted from promotional campaigns.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingBanner(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ivory text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBanner}
                disabled={deleteSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                {deleteSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
