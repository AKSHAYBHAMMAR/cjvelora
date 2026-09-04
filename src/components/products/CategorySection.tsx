'use client';

import React, { useState, useEffect } from 'react';
import CategoryCard from './CategoryCard';
import { CATEGORIES } from '@/data/mock-data';
import { CategoryItem } from '@/types';
import { getCategories } from '@/lib/categories';
import { Sparkles, Layers } from 'lucide-react';

interface CategorySectionProps {
  selectedCategory: string | null;
  onSelectCategory: (categoryName: string | null) => void;
}

export default function CategorySection({
  selectedCategory,
  onSelectCategory,
}: CategorySectionProps) {
  const [categories, setCategories] = useState<CategoryItem[]>(CATEGORIES);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        const data = await getCategories();
        if (isMounted && data && data.length > 0) {
          setCategories(data);
        }
      } catch (err) {
        console.warn('Failed to load categories from Supabase, retained fallback:', err);
      }
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalProducts = categories.reduce((acc, cat) => acc + cat.itemCount, 0);

  return (
    <section id="categories" className="py-20 px-6 md:px-12 lg:px-20 max-w-[1600px] mx-auto">
      
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <div className="inline-flex items-center gap-2 mb-2 px-3.5 py-1 rounded-full glass-panel border border-soft-gold/30">
            <Sparkles className="w-3 h-3 text-soft-gold" />
            <span className="font-tech text-[10px] uppercase tracking-[0.3em] text-olive-dark font-medium">
              Handmade Catalog
            </span>
          </div>

          <h2 className="font-serif text-3xl md:text-5xl font-semibold text-charcoal tracking-tight">
            Shop by Category
          </h2>
          <p className="font-serif italic text-base md:text-lg text-olive-accent font-light mt-1">
            Explore authentic handcrafted crochet across our signature artisan collections.
          </p>
        </div>

        {/* Filter Indicator & Reset Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectCategory(null)}
            className={`px-5 py-2.5 rounded-full font-sans text-xs uppercase tracking-widest font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer ${
              selectedCategory === null
                ? 'bg-navy text-ivory shadow-luxury'
                : 'glass-panel text-charcoal hover:bg-white hover:border-soft-gold'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Categories ({totalProducts})</span>
          </button>
        </div>
      </div>

      {/* 6 Category Visual Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 sm:gap-6">
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            isActive={selectedCategory === cat.name}
            onSelect={(name) => {
              // Toggle category selection
              if (selectedCategory === name) {
                onSelectCategory(null);
              } else {
                onSelectCategory(name);
              }
            }}
          />
        ))}
      </div>

    </section>
  );
}
