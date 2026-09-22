'use client';

import React, { useState, useEffect } from 'react';
import CategorySection from './CategorySection';
import MostLovedSection from './MostLovedSection';
import ProductCard from './ProductCard';
import { PRODUCTS } from '@/data/mock-data';
import { Product } from '@/types';
import { getProducts } from '@/lib/products';
import { Sparkles, X, Filter, ArrowRight } from 'lucide-react';

import { PromotionalBanner } from '@/types/content';

interface ProductSectionProps {
  banners?: PromotionalBanner[];
}

export default function ProductSection({ banners }: ProductSectionProps = {}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);

  // Sync category from URL query parameters (e.g., /?category=Bags#category-products-anchor)
  useEffect(() => {
    function handleCategoryFromUrl() {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const cat = params.get('category');
        if (cat) {
          setSelectedCategory(decodeURIComponent(cat));
          setTimeout(() => {
            const el = document.getElementById('category-products-anchor');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        }
      }
    }

    handleCategoryFromUrl();
    window.addEventListener('popstate', handleCategoryFromUrl);
    window.addEventListener('hashchange', handleCategoryFromUrl);

    return () => {
      window.removeEventListener('popstate', handleCategoryFromUrl);
      window.removeEventListener('hashchange', handleCategoryFromUrl);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const data = await getProducts({ publishedOnly: true });
        if (isMounted && data && data.length > 0) {
          setProducts(data);
        }
      } catch (err) {
        console.warn('Failed to load products from Supabase, retained fallback:', err);
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter products by selected category (checking both name and slug)
  const filteredProducts = selectedCategory
    ? products.filter(
        (p) =>
          p.category.toLowerCase() === selectedCategory.toLowerCase() ||
          p.categorySlug?.toLowerCase() === selectedCategory.toLowerCase()
      )
    : [];

  return (
    <div id="collections" className="scroll-mt-24">
      <div id="shop" className="space-y-6">
      
      {/* 1. CATEGORY SECTION ("Shop by Category") */}
      <CategorySection
        selectedCategory={selectedCategory}
        onSelectCategory={(categoryName) => {
          setSelectedCategory(categoryName);
          // Smooth scroll to product results if category is selected
          if (categoryName) {
            setTimeout(() => {
              const el = document.getElementById('category-products-anchor');
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }
        }}
      />

      {/* Anchor for smooth scroll */}
      <div id="category-products-anchor" />

      {/* DYNAMIC CATEGORY FILTERED PRODUCTS DISPLAY */}
      {selectedCategory && (
        <section className="py-8 sm:py-12 px-3.5 sm:px-6 md:px-12 lg:px-20 max-w-[1600px] mx-auto animate-fade-in">
          
          {/* Active Filter Header Banner */}
          <div className="glass-panel p-4 sm:p-8 rounded-2xl sm:rounded-3xl mb-6 sm:mb-10 border border-soft-gold/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-luxury bg-white/90">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-soft-gold animate-pulse" />
                <span className="font-tech text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.25em] text-olive-dark font-semibold">
                  Filtered Catalog
                </span>
              </div>
              <h3 className="font-serif text-xl sm:text-3xl font-bold text-charcoal flex items-center gap-2 sm:gap-3">
                <span>{selectedCategory}</span>
                <span className="font-tech text-xs sm:text-sm font-normal text-olive-accent bg-beige px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'Creation' : 'Creations'}
                </span>
              </h3>
            </div>

            <button
              onClick={() => setSelectedCategory(null)}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-charcoal/20 bg-white hover:bg-navy hover:text-ivory hover:border-navy text-charcoal font-sans text-xs uppercase tracking-wider font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Clear Filter (Show All)</span>
            </button>
          </div>

          {/* Filtered Products Grid (2 cols mobile, 3 cols desktop, 4 cols xl) */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} offers={banners} />
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 sm:p-12 rounded-2xl sm:rounded-3xl text-center space-y-4 max-w-md mx-auto">
              <p className="font-serif text-xl text-charcoal">No products found in this category.</p>
              <button
                onClick={() => setSelectedCategory(null)}
                className="bg-navy text-ivory font-sans text-xs uppercase tracking-widest px-6 py-3 rounded-full hover:bg-soft-gold hover:text-navy transition-all"
              >
                View All Categories
              </button>
            </div>
          )}

          {/* Stitched Seam Divider */}
          <div className="max-w-7xl mx-auto my-12">
            <div className="stitched-divider" />
          </div>
        </section>
      )}

      {/* 2. MOST LOVED PRODUCTS ("Most Loved by You ❤️") */}
      <MostLovedSection offers={banners} />

      </div>
    </div>
  );
}
