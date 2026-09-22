'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { X, Heart, ShoppingBag, Sparkles, Check } from 'lucide-react';
import { useStore } from '@/lib/store';

export default function QuickViewModal() {
  const pathname = usePathname();
  const {
    quickViewProduct,
    closeQuickView,
    addToCart,
    toggleWishlist,
    isInWishlist,
  } = useStore();

  const [selectedColor, setSelectedColor] = useState<string>('');

  if (pathname?.startsWith('/admin') || !quickViewProduct) return null;

  const inWish = isInWishlist(quickViewProduct.id);
  const currentColor = selectedColor || quickViewProduct.colors?.[0] || '';
  const isDiscounted = Boolean(
    quickViewProduct.originalPrice && quickViewProduct.originalPrice > quickViewProduct.price
  );
  const discountPct = isDiscounted
    ? Math.round(
        ((quickViewProduct.originalPrice! - quickViewProduct.price) /
          quickViewProduct.originalPrice!) *
          100
      )
    : 0;

  const handleAdd = () => {
    addToCart(quickViewProduct, 1, currentColor);
    closeQuickView();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 xs:p-4">
      {/* Backdrop */}
      <div
        onClick={closeQuickView}
        className="fixed inset-0 bg-charcoal/70 backdrop-blur-md transition-opacity"
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative glass-card max-w-3xl w-full p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-white z-10 bg-ivory shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <button
          onClick={closeQuickView}
          aria-label="Close Quick View"
          className="absolute top-4 right-4 sm:top-6 sm:right-6 p-1.5 sm:p-2 text-charcoal hover:text-soft-gold transition-colors rounded-full hover:bg-white/80 cursor-pointer z-10"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 items-center">
          
          {/* Image */}
          <div className="relative h-56 xs:h-64 sm:h-96 w-full rounded-xl sm:rounded-2xl overflow-hidden bg-beige/60">
            <img
              src={quickViewProduct.images[0]}
              alt={quickViewProduct.name}
              className="w-full h-full object-cover"
            />
            {isDiscounted && discountPct > 0 ? (
              <span className="absolute top-3 left-3 sm:top-4 sm:left-4 font-tech text-[9px] sm:text-[10px] uppercase tracking-wider bg-soft-gold text-charcoal backdrop-blur-md px-2.5 py-1 rounded-full font-bold shadow-md">
                {discountPct}% OFF ATELIER OFFER
              </span>
            ) : quickViewProduct.badge ? (
              <span className="absolute top-3 left-3 sm:top-4 sm:left-4 font-tech text-[9px] sm:text-[10px] uppercase tracking-wider bg-navy/90 text-ivory backdrop-blur-md px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full font-medium shadow-sm">
                {quickViewProduct.badge}
              </span>
            ) : null}
          </div>

          {/* Details */}
          <div className="space-y-3 sm:space-y-4">
            <span className="font-tech text-[9px] sm:text-[10px] uppercase text-olive-accent tracking-[0.2em] sm:tracking-[0.25em] font-medium">
              {quickViewProduct.category}
            </span>

            <h3 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-charcoal leading-snug">
              {quickViewProduct.name}
            </h3>

            <div className="flex items-baseline flex-wrap gap-2 sm:gap-3">
              <span className="font-tech text-xl sm:text-2xl font-bold text-navy">
                ₹{quickViewProduct.price.toLocaleString('en-IN')}
              </span>
              {isDiscounted && (
                <span className="font-tech text-xs sm:text-sm text-charcoal/40 line-through">
                  ₹{quickViewProduct.originalPrice!.toLocaleString('en-IN')}
                </span>
              )}
              {isDiscounted && discountPct > 0 && (
                <span className="font-tech text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  {discountPct}% OFF
                </span>
              )}
            </div>

            <p className="font-sans text-xs text-charcoal/75 leading-relaxed">
              {quickViewProduct.description}
            </p>

            {/* Materials & Lead Time */}
            <div className="py-2 space-y-1 sm:space-y-1.5 text-xs text-charcoal/80 border-t border-b border-charcoal/10 font-sans">
              <p>
                <strong className="font-medium text-charcoal">Materials:</strong>{' '}
                {quickViewProduct.materials}
              </p>
              {quickViewProduct.dimensions && (
                <p>
                  <strong className="font-medium text-charcoal">Dimensions:</strong>{' '}
                  {quickViewProduct.dimensions}
                </p>
              )}
              {quickViewProduct.isMadeToOrder && (
                <p className="text-olive-accent font-medium">
                  ✨ Made to order • Production time: {quickViewProduct.leadTime || '4-6 business days'}
                </p>
              )}
            </div>

            {/* Color Variant Selector */}
            {quickViewProduct.colors && quickViewProduct.colors.length > 0 && (
              <div>
                <label className="font-tech text-[9px] sm:text-[10px] uppercase tracking-wider text-olive-accent block mb-1.5 font-medium">
                  Select Shade: {currentColor}
                </label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {quickViewProduct.colors.map((col) => (
                    <button
                      key={col}
                      onClick={() => setSelectedColor(col)}
                      className={`text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border transition-all cursor-pointer ${
                        currentColor === col
                          ? 'border-navy bg-navy text-ivory font-semibold'
                          : 'border-charcoal/20 bg-white/70 text-charcoal hover:border-soft-gold'
                      }`}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2.5 sm:gap-3 pt-2 sm:pt-3">
              <button
                onClick={handleAdd}
                className="flex-grow bg-navy text-ivory font-sans text-xs uppercase tracking-widest py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl hover:bg-soft-gold hover:text-navy transition-all duration-300 font-semibold flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Atelier Bag</span>
              </button>

              <button
                onClick={() => toggleWishlist(quickViewProduct)}
                aria-label="Toggle Wishlist"
                className="p-2.5 sm:p-3 rounded-xl border border-charcoal/20 bg-white text-charcoal hover:text-rose-500 transition-colors cursor-pointer"
              >
                <Heart
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    inWish ? 'fill-rose-500 text-rose-500' : 'text-charcoal stroke-[1.75]'
                  }`}
                />
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
