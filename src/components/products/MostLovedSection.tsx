'use client';

import React, { useState, useEffect } from 'react';
import { PRODUCTS } from '@/data/mock-data';
import { Product } from '@/types';
import { getMostLovedProducts } from '@/lib/products';
import ProductCard from './ProductCard';
import { Heart, Sparkles } from 'lucide-react';

export default function MostLovedSection() {
  const [mostLovedProducts, setMostLovedProducts] = useState<Product[]>(
    PRODUCTS.filter((p) => p.isMostLoved)
  );

  useEffect(() => {
    let isMounted = true;

    async function loadMostLoved() {
      try {
        const data = await getMostLovedProducts({ publishedOnly: true });
        if (isMounted && data && data.length > 0) {
          setMostLovedProducts(data);
        }
      } catch (err) {
        console.warn('Failed to load most loved products from Supabase, retained fallback:', err);
      }
    }

    loadMostLoved();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section id="most-loved" className="py-10 sm:py-20 px-3.5 sm:px-6 md:px-12 lg:px-20 max-w-[1600px] mx-auto bg-warm-white/60 rounded-2xl sm:rounded-3xl my-6 border border-white/60">
      
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-14 gap-4 sm:gap-6">
        <div>
          <div className="inline-flex items-center gap-2 mb-2 px-3 sm:px-3.5 py-1 rounded-full glass-panel border border-rose-300/40">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span className="font-tech text-[9px] sm:text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.3em] text-rose-900 font-semibold">
              Community Favorites
            </span>
          </div>

          <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl font-semibold text-charcoal tracking-tight flex items-center gap-2 sm:gap-3">
            <span>Most Loved by You</span>
            <span className="text-rose-500 text-2xl sm:text-3xl md:text-4xl animate-pulse">❤️</span>
          </h2>

          <p className="font-serif italic text-sm sm:text-base md:text-lg text-olive-accent font-light mt-1">
            Our most cherished handcrafted creations, looped with intentional love and adored across homes worldwide.
          </p>
        </div>

        {/* Total Loved Count */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-tech uppercase tracking-wider text-charcoal/60 bg-white/70 px-4 py-2 rounded-full border border-charcoal/10">
          <Sparkles className="w-3.5 h-3.5 text-soft-gold" />
          <span>Curated Heirloom Selection</span>
        </div>
      </div>

      {/* Most Loved Products Grid (2 cols mobile, 3 cols desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
        {mostLovedProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            highlightMostLoved={true}
          />
        ))}
      </div>

    </section>
  );
}
