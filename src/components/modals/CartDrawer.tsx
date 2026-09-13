'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useStore } from '@/lib/store';

export default function CartDrawer() {
  const pathname = usePathname();
  const {
    cart,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeFromCart,
    getCartTotal,
  } = useStore();

  const total = getCartTotal();

  if (pathname?.startsWith('/admin') || !isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <div className="relative w-full max-w-md h-full bg-ivory shadow-2xl p-4 sm:p-8 flex flex-col justify-between z-10 overflow-y-auto animate-slide-in-right">
        
        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-4 sm:pb-6 border-b border-charcoal/10">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-navy" />
              <h3 className="font-serif text-lg sm:text-xl font-semibold text-charcoal">
                Your Atelier Bag
              </h3>
            </div>
            <button
              onClick={closeCart}
              aria-label="Close Shopping Bag"
              className="p-1.5 sm:p-2 text-charcoal hover:text-soft-gold transition-colors cursor-pointer rounded-full hover:bg-white/60"
            >
              <X className="w-5 h-5 stroke-[1.75]" />
            </button>
          </div>

          {/* Items List */}
          <div className="py-4 sm:py-6 space-y-3 sm:space-y-5">
            {cart.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-beige flex items-center justify-center text-charcoal/40">
                  <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
                </div>
                <p className="font-serif text-lg text-charcoal">Your bag is currently empty</p>
                <p className="font-sans text-xs text-charcoal/60 max-w-xs">
                  Discover our handcrafted crochet collections and find a unique heirloom piece.
                </p>
                <button
                  onClick={closeCart}
                  className="mt-2 bg-navy text-ivory font-sans text-xs uppercase tracking-widest px-6 py-3 rounded-full hover:bg-soft-gold hover:text-navy transition-all"
                >
                  Explore Catalog
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex gap-2.5 sm:gap-4 items-center bg-white/70 p-2.5 sm:p-3.5 rounded-2xl border border-white shadow-sm"
                >
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-xl shrink-0 bg-beige/60"
                  />
                  <div className="flex-grow min-w-0">
                    <h4 className="font-serif text-xs sm:text-sm font-semibold text-charcoal truncate">
                      {item.product.name}
                    </h4>
                    {item.selectedColor && (
                      <span className="font-tech text-[9px] sm:text-[10px] text-olive-accent block truncate">
                        {item.selectedColor}
                      </span>
                    )}
                    <span className="font-tech text-xs text-navy font-bold">
                      ₹{item.product.price.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1 sm:gap-2 border border-charcoal/15 bg-white rounded-lg px-1.5 sm:px-2 py-1 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="text-xs text-charcoal hover:text-soft-gold font-bold px-0.5 sm:px-1"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                    <span className="text-xs font-tech font-semibold min-w-[12px] sm:min-w-[14px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="text-xs text-charcoal hover:text-soft-gold font-bold px-0.5 sm:px-1"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    aria-label={`Remove ${item.product.name}`}
                    className="text-charcoal/40 hover:text-rose-500 p-1 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Checkout Summary */}
        {cart.length > 0 && (
          <div className="pt-4 sm:pt-6 border-t border-charcoal/10 space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center font-serif text-base sm:text-lg font-semibold text-charcoal">
              <span>Subtotal</span>
              <span className="font-tech text-lg sm:text-xl text-navy font-bold">
                ₹{total.toLocaleString('en-IN')}
              </span>
            </div>
            <p className="font-sans text-[10px] text-charcoal/60 text-center">
              Taxes and worldwide express delivery calculated at checkout.
            </p>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="w-full bg-navy text-ivory font-sans text-xs uppercase tracking-widest py-3.5 sm:py-4 rounded-xl hover:bg-soft-gold hover:text-navy transition-all duration-300 shadow-md font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proceed to Luxury Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
