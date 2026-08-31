'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Heart, ShoppingBag, Menu, X, Sparkles } from 'lucide-react';
import { useStore } from '@/lib/store';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const {
    openCart,
    getCartCount,
    wishlist,
    isMobileMenuOpen,
    openMobileMenu,
    closeMobileMenu,
  } = useStore();

  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  // Client hydration sync for Zustand
  useEffect(() => {
    setCartCount(getCartCount());
    setWishlistCount(wishlist.length);
  }, [getCartCount, wishlist]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 ${
          scrolled ? 'glass-panel shadow-md py-3' : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex items-center justify-between">
          
          {/* Left Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 font-sans text-xs uppercase tracking-widest font-medium text-charcoal/80">
            <Link href="#hero" className="hover:text-soft-gold transition-colors">
              Home
            </Link>
            <Link href="#categories" className="hover:text-soft-gold transition-colors">
              Categories
            </Link>
            <Link href="#most-loved" className="hover:text-soft-gold transition-colors">
              Most Loved
            </Link>
            <Link href="#about" className="hover:text-soft-gold transition-colors">
              Our Story
            </Link>
          </nav>

          {/* Center Brand Identity */}
          <Link href="#hero" className="flex flex-col items-center group cursor-pointer text-center">
            <span className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-charcoal group-hover:text-soft-gold transition-colors duration-300">
              VELORA
            </span>
            <span className="font-tech text-[9px] uppercase tracking-[0.35em] text-olive-accent -mt-1">
              Handmade Luxury
            </span>
          </Link>

          {/* Right Navigation & Interactive Actions */}
          <div className="flex items-center gap-6">
            <nav className="hidden lg:flex items-center gap-8 font-sans text-xs uppercase tracking-widest font-medium text-charcoal/80">
              <Link href="#process" className="hover:text-soft-gold transition-colors">
                Craft Process
              </Link>
              <Link href="#testimonials" className="hover:text-soft-gold transition-colors">
                Reviews
              </Link>
              <Link href="#contact" className="hover:text-soft-gold transition-colors">
                Contact
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              {/* Search Button */}
              <button
                aria-label="Search Catalog"
                onClick={() => {
                  const searchEl = document.getElementById('categories');
                  searchEl?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="p-2.5 rounded-full text-charcoal hover:text-soft-gold hover:bg-white/60 transition-all cursor-pointer"
              >
                <Search className="w-5 h-5 stroke-[1.75]" />
              </button>

              {/* Wishlist Button */}
              <button
                aria-label="View Wishlist"
                onClick={() => {
                  const mostLovedEl = document.getElementById('most-loved');
                  mostLovedEl?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="p-2.5 rounded-full text-charcoal hover:text-soft-gold hover:bg-white/60 transition-all relative cursor-pointer"
              >
                <Heart className="w-5 h-5 stroke-[1.75]" />
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-soft-gold text-white text-[9px] font-tech font-bold rounded-full flex items-center justify-center animate-scale-in">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* Cart Drawer Trigger */}
              <button
                aria-label="Shopping Cart"
                onClick={openCart}
                className="p-2.5 rounded-full text-charcoal hover:text-soft-gold hover:bg-white/60 transition-all relative cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-navy text-ivory text-[9px] font-tech font-bold rounded-full flex items-center justify-center animate-scale-in">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu Toggle */}
              <button
                aria-label="Toggle Navigation Menu"
                onClick={openMobileMenu}
                className="lg:hidden p-2 text-charcoal hover:text-soft-gold cursor-pointer"
              >
                <Menu className="w-6 h-6 stroke-[1.75]" />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Fullscreen Mobile Drawer */}
      <div
        className={`fixed inset-0 z-50 bg-ivory/95 backdrop-blur-2xl flex flex-col justify-center items-center gap-8 transition-all duration-300 ${
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={closeMobileMenu}
          aria-label="Close Mobile Navigation"
          className="absolute top-6 right-6 p-3 text-charcoal hover:text-soft-gold cursor-pointer"
        >
          <X className="w-8 h-8 stroke-[1.5]" />
        </button>

        <div className="flex flex-col items-center mb-4">
          <span className="font-serif text-3xl font-bold tracking-tight text-charcoal">
            VELORA
          </span>
          <span className="font-tech text-[10px] uppercase tracking-[0.35em] text-olive-accent mt-1">
            Handmade Luxury
          </span>
        </div>

        <Link
          href="#hero"
          onClick={closeMobileMenu}
          className="font-serif text-2xl text-charcoal hover:text-soft-gold transition-colors"
        >
          Home
        </Link>
        <Link
          href="#categories"
          onClick={closeMobileMenu}
          className="font-serif text-2xl text-charcoal hover:text-soft-gold transition-colors"
        >
          Shop by Category
        </Link>
        <Link
          href="#most-loved"
          onClick={closeMobileMenu}
          className="font-serif text-2xl text-charcoal hover:text-soft-gold transition-colors"
        >
          Most Loved by You ❤️
        </Link>
        <Link
          href="#about"
          onClick={closeMobileMenu}
          className="font-serif text-2xl text-charcoal hover:text-soft-gold transition-colors"
        >
          Our Story & Atelier
        </Link>
        <Link
          href="#process"
          onClick={closeMobileMenu}
          className="font-serif text-2xl text-charcoal hover:text-soft-gold transition-colors"
        >
          Crafting Process
        </Link>
        <Link
          href="#testimonials"
          onClick={closeMobileMenu}
          className="font-serif text-2xl text-charcoal hover:text-soft-gold transition-colors"
        >
          Client Reviews
        </Link>
        <Link
          href="#contact"
          onClick={closeMobileMenu}
          className="font-serif text-2xl text-charcoal hover:text-soft-gold transition-colors"
        >
          Contact Concierge
        </Link>

        <div className="mt-6 pt-6 border-t border-charcoal/10 flex gap-4">
          <button
            onClick={() => {
              closeMobileMenu();
              openCart();
            }}
            className="bg-navy text-ivory font-sans text-xs uppercase tracking-widest px-8 py-3.5 rounded-full flex items-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Bag ({cartCount})</span>
          </button>
        </div>
      </div>
    </>
  );
}
