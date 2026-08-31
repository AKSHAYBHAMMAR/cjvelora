'use client';

import React, { useState } from 'react';
import { X, Heart, ShoppingBag, Sparkles, Check } from 'lucide-react';
import { useStore } from '@/lib/store';

export default function QuickViewModal() {
  const {
    quickViewProduct,
    closeQuickView,
    addToCart,
    toggleWishlist,
    isInWishlist,
  } = useStore();

  const [selectedColor, setSelectedColor] = useState<string>('');

  if (!quickViewProduct) return null;

  const inWish = isInWishlist(quickViewProduct.id);
  const currentColor = selectedColor || quickViewProduct.colors?.[0] || '';

  const handleAdd = () => {
    addToCart(quickViewProduct, 1, currentColor);
    closeQuickView();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={closeQuickView}
        className="fixed inset-0 bg-charcoal/70 backdrop-blur-md transition-opacity"
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative glass-card max-w-3xl w-full p-6 sm:p-8 rounded-3xl border border-white z-10 bg-ivory shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <button
          onClick={closeQuickView}
          aria-label="Close Quick View"
          className="absolute top-6 right-6 p-2 text-charcoal hover:text-soft-gold transition-colors rounded-full hover:bg-white/80 cursor-pointer z-10"
        >
          <X className="w-6 h-6 stroke-[1.5]" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          
          {/* Image */}
          <div className="relative h-72 sm:h-96 w-full rounded-2xl overflow-hidden bg-beige/60">
            <img
              src={quickViewProduct.images[0]}
              alt={quickViewProduct.name}
              className="w-full h-full object-cover"
            />
            {quickViewProduct.badge && (
              <span className="absolute top-4 left-4 font-tech text-[10px] uppercase tracking-wider bg-navy/90 text-ivory backdrop-blur-md px-3 py-1 rounded-full font-medium shadow-sm">
                {quickViewProduct.badge}
              </span>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <span className="font-tech text-[10px] uppercase text-olive-accent tracking-[0.25em] font-medium">
              {quickViewProduct.category}
            </span>

            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal leading-snug">
              {quickViewProduct.name}
            </h3>

            <div className="flex items-baseline gap-3">
              <span className="font-tech text-2xl font-bold text-navy">
                ₹{quickViewProduct.price.toLocaleString('en-IN')}
              </span>
              {quickViewProduct.originalPrice && (
                <span className="font-tech text-sm text-charcoal/40 line-through">
                  ₹{quickViewProduct.originalPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>

            <p className="font-sans text-xs text-charcoal/75 leading-relaxed">
              {quickViewProduct.description}
            </p>

            {/* Materials & Lead Time */}
            <div className="py-2 space-y-1.5 text-xs text-charcoal/80 border-t border-b border-charcoal/10 font-sans">
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
                <label className="font-tech text-[10px] uppercase tracking-wider text-olive-accent block mb-2 font-medium">
                  Select Shade: {currentColor}
                </label>
                <div className="flex flex-wrap gap-2">
                  {quickViewProduct.colors.map((col) => (
                    <button
                      key={col}
                      onClick={() => setSelectedColor(col)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
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
            <div className="flex items-center gap-3 pt-3">
              <button
                onClick={handleAdd}
                className="flex-grow bg-navy text-ivory font-sans text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl hover:bg-soft-gold hover:text-navy transition-all duration-300 font-semibold flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Atelier Bag</span>
              </button>

              <button
                onClick={() => toggleWishlist(quickViewProduct)}
                aria-label="Toggle Wishlist"
                className="p-3 rounded-xl border border-charcoal/20 bg-white text-charcoal hover:text-rose-500 transition-colors cursor-pointer"
              >
                <Heart
                  className={`w-5 h-5 ${
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
