'use client';

import React from 'react';
import { ArrowRight, Heart, Eye, ShoppingBag, Star, Sparkles } from 'lucide-react';
import { FEATURED_PRODUCTS } from '@/data/mock-data';
import { useStore } from '@/lib/store';
import { Product } from '@/types';

export default function FeaturedMasterpieces() {
  const { addToCart, toggleWishlist, isInWishlist, openQuickView } = useStore();

  return (
    <section id="featured" className="py-24 px-6 md:px-12 lg:px-20 max-w-[1600px] mx-auto bg-warm-white/70 rounded-3xl my-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-soft-gold" />
            <span className="font-tech text-xs uppercase tracking-[0.3em] text-olive-accent font-medium">
              100% Handcrafted
            </span>
          </div>
          <h2 className="font-serif text-3xl md:text-5xl font-semibold text-charcoal tracking-tight">
            Featured Crochet Masterpieces
          </h2>
        </div>
        <a
          href="#collections"
          className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-widest font-semibold text-navy hover:text-soft-gold transition-colors group"
        >
          <span>View All Collections</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </a>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {FEATURED_PRODUCTS.map((product) => {
          const inWish = isInWishlist(product.id);
          return (
            <div
              key={product.id}
              className="glass-card rounded-3xl overflow-hidden group flex flex-col h-full border border-white/90 shadow-luxury hover:shadow-luxury-hover transition-all duration-500 bg-white/75"
            >
              {/* Product Image Canvas */}
              <div className="h-72 sm:h-80 w-full relative overflow-hidden bg-beige/60">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />

                {/* Top Badges */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                  {product.badge ? (
                    <span className="font-tech text-[10px] uppercase tracking-wider bg-navy/90 text-ivory backdrop-blur-md px-3 py-1 rounded-full font-medium shadow-sm">
                      {product.badge}
                    </span>
                  ) : <div />}

                  {/* Wishlist Button */}
                  <button
                    onClick={() => toggleWishlist(product)}
                    aria-label={`Save ${product.name} to Wishlist`}
                    className="pointer-events-auto p-2.5 rounded-full glass-panel hover:bg-white text-charcoal transition-all shadow-sm cursor-pointer"
                  >
                    <Heart
                      className={`w-4 h-4 transition-colors ${
                        inWish ? 'fill-rose-500 text-rose-500' : 'text-charcoal stroke-[2]'
                      }`}
                    />
                  </button>
                </div>

                {/* Hover Quick Actions Shelf */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  <button
                    onClick={() => openQuickView(product)}
                    className="flex-1 glass-panel text-charcoal font-sans text-xs uppercase tracking-wider py-2.5 px-3 rounded-full hover:bg-white hover:text-navy font-semibold flex items-center justify-center gap-1.5 shadow-md backdrop-blur-md transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Quick View</span>
                  </button>
                  <button
                    onClick={() => addToCart(product, 1)}
                    className="flex-1 bg-navy text-ivory font-sans text-xs uppercase tracking-wider py-2.5 px-3 rounded-full hover:bg-soft-gold hover:text-navy font-semibold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Add to Bag</span>
                  </button>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-6 sm:p-7 flex flex-col flex-grow justify-between bg-white/50 backdrop-blur-sm">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-tech text-[10px] text-olive-accent uppercase tracking-[0.2em] font-medium">
                      {product.category}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] font-tech text-charcoal/80">
                      <Star className="w-3 h-3 fill-soft-gold text-soft-gold" />
                      <span>{product.rating}</span>
                      <span className="text-charcoal/40">({product.reviewCount})</span>
                    </div>
                  </div>

                  <h3
                    onClick={() => openQuickView(product)}
                    className="font-serif text-xl sm:text-2xl font-semibold text-charcoal mb-2 group-hover:text-olive-accent transition-colors cursor-pointer"
                  >
                    {product.name}
                  </h3>

                  <p className="font-sans text-xs text-charcoal/70 leading-relaxed line-clamp-2">
                    {product.description}
                  </p>
                </div>

                {/* Pricing & Footer Action */}
                <div className="mt-6 pt-4 border-t border-charcoal/10 flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="font-tech text-lg sm:text-xl font-bold text-navy">
                      ₹{product.price.toLocaleString('en-IN')}
                    </span>
                    {product.originalPrice && (
                      <span className="font-tech text-xs text-charcoal/40 line-through">
                        ₹{product.originalPrice.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => addToCart(product, 1)}
                    className="inline-flex items-center gap-1.5 font-sans text-xs uppercase tracking-widest font-semibold text-navy hover:text-soft-gold transition-colors cursor-pointer"
                  >
                    <span>Add to Bag</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>

            </div>
          );
        })}
      </div>

    </section>
  );
}
