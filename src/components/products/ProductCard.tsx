'use client';

import React from 'react';
import { Heart, Eye, ShoppingBag, Star, Sparkles } from 'lucide-react';
import { Product } from '@/types';
import { useStore } from '@/lib/store';

interface ProductCardProps {
  product: Product;
  highlightMostLoved?: boolean;
}

export default function ProductCard({
  product,
  highlightMostLoved = false,
}: ProductCardProps) {
  const { addToCart, toggleWishlist, isInWishlist, openQuickView } = useStore();
  const inWish = isInWishlist(product.id);

  return (
    <div className="glass-card rounded-2xl sm:rounded-3xl overflow-hidden group flex flex-col h-full border border-white/90 shadow-luxury hover:shadow-luxury-hover transition-all duration-500 bg-white/80">
      
      {/* Product Image Stage */}
      <div className="h-44 xs:h-52 sm:h-80 w-full relative overflow-hidden bg-beige/60">
        <img
          src={product.image || product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-106 transition-transform duration-700 ease-out"
        />

        {/* Ambient Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Badges Top Bar */}
        <div className="absolute top-2.5 left-2.5 right-2.5 sm:top-4 sm:left-4 sm:right-4 flex items-center justify-between pointer-events-none">
          <div className="flex flex-col gap-1 sm:gap-1.5 items-start">
            {product.isMostLoved && (
              <span className="font-tech text-[8px] sm:text-[10px] uppercase tracking-wider bg-rose-950/90 text-rose-100 backdrop-blur-md px-2 py-0.5 sm:px-3 sm:py-1 rounded-full font-semibold shadow-sm flex items-center gap-1 border border-rose-400/30">
                <span>Most Loved</span>
                <span>❤️</span>
              </span>
            )}

            {product.badge && !product.isMostLoved && (
              <span className="font-tech text-[8px] sm:text-[10px] uppercase tracking-wider bg-navy/90 text-ivory backdrop-blur-md px-2 py-0.5 sm:px-3 sm:py-1 rounded-full font-medium shadow-sm">
                {product.badge}
              </span>
            )}
          </div>

          {/* Wishlist Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product);
            }}
            aria-label={`Save ${product.name} to Wishlist`}
            className="pointer-events-auto p-1.5 sm:p-2.5 rounded-full glass-panel hover:bg-white text-charcoal transition-all shadow-sm cursor-pointer"
          >
            <Heart
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
                inWish
                  ? 'fill-rose-500 text-rose-500'
                  : 'text-charcoal stroke-[2] group-hover:text-soft-gold'
              }`}
            />
          </button>
        </div>

        {/* Hover Quick Actions Shelf */}
        <div className="hidden sm:flex absolute bottom-4 left-4 right-4 items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
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

      {/* Product Content Details */}
      <div className="p-3 xs:p-4 sm:p-6 lg:p-7 flex flex-col flex-grow justify-between bg-white/50 backdrop-blur-sm">
        <div>
          {/* Category & Star Rating */}
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="font-tech text-[8px] xs:text-[9px] sm:text-[10px] text-olive-accent uppercase tracking-[0.15em] sm:tracking-[0.2em] font-semibold truncate max-w-[60%]">
              {product.category}
            </span>

            <div className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-[11px] font-tech text-charcoal/80 font-medium">
              <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-soft-gold text-soft-gold" />
              <span>{product.rating}</span>
              <span className="text-charcoal/40 font-normal hidden xs:inline">
                ({product.reviewCount})
              </span>
            </div>
          </div>

          {/* Product Title */}
          <h3
            onClick={() => openQuickView(product)}
            className="font-serif text-sm xs:text-base sm:text-xl lg:text-2xl font-semibold text-charcoal mb-1 sm:mb-2 group-hover:text-olive-dark transition-colors cursor-pointer leading-snug line-clamp-1"
          >
            {product.name}
          </h3>

          {/* Product Excerpt (Hidden on mobile cards for balanced heights) */}
          <p className="hidden sm:block font-sans text-xs text-charcoal/70 leading-relaxed line-clamp-2">
            {product.description}
          </p>
        </div>

        {/* Price & Primary CTA */}
        <div className="mt-3 sm:mt-6 pt-2.5 sm:pt-4 border-t border-charcoal/10 flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="font-tech text-sm xs:text-base sm:text-xl font-bold text-navy">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
            {product.originalPrice && (
              <span className="font-tech text-[10px] sm:text-xs text-charcoal/40 line-through">
                ₹{product.originalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          <button
            onClick={() => addToCart(product, 1)}
            className="inline-flex items-center gap-1 sm:gap-1.5 font-sans text-[11px] sm:text-xs uppercase tracking-wider sm:tracking-widest font-semibold text-navy hover:text-soft-gold transition-colors cursor-pointer group/cta self-end xs:self-auto"
            aria-label={`Add ${product.name} to Cart`}
          >
            <span>Add to Bag</span>
            <span className="group-hover/cta:translate-x-1 transition-transform">→</span>
          </button>
        </div>

      </div>

    </div>
  );
}
