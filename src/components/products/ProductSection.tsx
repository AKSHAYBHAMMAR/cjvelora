'use client';

import React, { useState } from 'react';
import CategorySection from './CategorySection';
import MostLovedSection from './MostLovedSection';
import ProductCard from './ProductCard';
import { PRODUCTS } from '@/data/mock-data';
import { Sparkles, X, Filter, ArrowRight } from 'lucide-react';

export default function ProductSection() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter products by selected category
  const filteredProducts = selectedCategory
    ? PRODUCTS.filter((p) => p.category === selectedCategory)
    : [];

  return (
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
        <section className="py-12 px-6 md:px-12 lg:px-20 max-w-[1600px] mx-auto animate-fade-in">
          
          {/* Active Filter Header Banner */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl mb-10 border border-soft-gold/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-luxury bg-white/90">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-soft-gold animate-pulse" />
                <span className="font-tech text-[10px] uppercase tracking-[0.25em] text-olive-dark font-semibold">
                  Filtered Catalog
                </span>
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal flex items-center gap-3">
                <span>{selectedCategory}</span>
                <span className="font-tech text-xs sm:text-sm font-normal text-olive-accent bg-beige px-3 py-1 rounded-full">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'Creation' : 'Creations'}
                </span>
              </h3>
            </div>

            <button
              onClick={() => setSelectedCategory(null)}
              className="px-5 py-2.5 rounded-full border border-charcoal/20 bg-white hover:bg-navy hover:text-ivory hover:border-navy text-charcoal font-sans text-xs uppercase tracking-wider font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <X className="w-4 h-4" />
              <span>Clear Filter (Show All)</span>
            </button>
          </div>

          {/* Filtered Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="glass-card p-12 rounded-3xl text-center space-y-4 max-w-md mx-auto">
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
      <MostLovedSection />

    </div>
  );
}
