'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Heart, ShoppingBag, Menu, X, User, LogOut } from 'lucide-react';
import { useStore } from '@/lib/store';
import { getCustomerProfile, signOutCustomer, CustomerProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  // All React hooks must be declared before any conditional return
  const {
    openCart,
    getCartCount,
    wishlist,
    isMobileMenuOpen,
    openMobileMenu,
    closeMobileMenu,
  } = useStore();

  const [scrolled, setScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);

  // Sync cart & wishlist counts
  useEffect(() => {
    setCartCount(getCartCount());
    setWishlistCount(wishlist.length);
  }, [getCartCount, wishlist]);

  // Track scroll position for transparent vs glassy transition
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync customer auth state
  useEffect(() => {
    let isMounted = true;

    async function loadCustomer() {
      try {
        const profile = await getCustomerProfile();
        if (isMounted) {
          setCustomer(profile);
        }
      } catch (err) {
        console.error('Failed to retrieve customer status in header:', err);
      }
    }

    loadCustomer();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async () => {
      if (isMounted) {
        const profile = await getCustomerProfile();
        setCustomer(profile);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Do not render storefront navbar inside admin console
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const isHome = pathname === '/';
  // Context-aware dark theme for dark storefront pages (e.g., checkout, customer auth, account orders)
  const isDarkHeader = Boolean(pathname && pathname !== '/' && !pathname.startsWith('/admin'));

  // Ensure anchor links navigate properly whether already on the homepage or on checkout/subpages
  const getNavHref = (hash: string) => (isHome ? hash : `/${hash}`);

  const handleSearchClick = () => {
    if (isHome) {
      const searchEl = document.getElementById('categories');
      searchEl?.scrollIntoView({ behavior: 'smooth' });
    } else {
      router.push('/#categories');
    }
  };

  const handleWishlistClick = () => {
    if (isHome) {
      const mostLovedEl = document.getElementById('most-loved');
      mostLovedEl?.scrollIntoView({ behavior: 'smooth' });
    } else {
      router.push('/#most-loved');
    }
  };

  const handleSignOut = async () => {
    await signOutCustomer();
    setCustomer(null);
    closeMobileMenu();
    router.push('/');
    router.refresh();
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 ${
          isDarkHeader
            ? scrolled
              ? 'bg-[#0a0e14]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl py-3'
              : 'bg-[#0a0e14]/85 backdrop-blur-md border-b border-white/10 py-5'
            : scrolled
              ? 'glass-panel shadow-md py-3'
              : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-12 flex items-center justify-between">
          
          {/* Left Navigation Links */}
          <nav
            className={`hidden lg:flex items-center gap-6 xl:gap-8 font-sans text-xs uppercase tracking-widest font-medium transition-colors ${
              isDarkHeader ? 'text-white/85' : 'text-charcoal/80'
            }`}
          >
            <Link
              href={isHome ? '#hero' : '/'}
              className={`transition-colors ${
                isDarkHeader ? 'hover:text-[#d4af37]' : 'hover:text-soft-gold'
              }`}
            >
              Home
            </Link>
            <Link
              href={getNavHref('#categories')}
              className={`transition-colors ${
                isDarkHeader ? 'hover:text-[#d4af37]' : 'hover:text-soft-gold'
              }`}
            >
              Categories
            </Link>
            <Link
              href={getNavHref('#most-loved')}
              className={`transition-colors ${
                isDarkHeader ? 'hover:text-[#d4af37]' : 'hover:text-soft-gold'
              }`}
            >
              Most Loved
            </Link>
            <Link
              href={getNavHref('#about')}
              className={`transition-colors ${
                isDarkHeader ? 'hover:text-[#d4af37]' : 'hover:text-soft-gold'
              }`}
            >
              Our Story
            </Link>
          </nav>

          {/* Center Brand Identity */}
          <Link
            href={isHome ? '#hero' : '/'}
            className="flex flex-col items-center group cursor-pointer text-center"
          >
            <span
              className={`font-serif text-2xl md:text-3xl font-bold tracking-tight transition-colors duration-300 ${
                isDarkHeader
                  ? 'text-white group-hover:text-[#d4af37]'
                  : 'text-charcoal group-hover:text-soft-gold'
              }`}
            >
              VELORA
            </span>
            <span
              className={`font-tech text-[9px] uppercase tracking-[0.35em] -mt-1 transition-colors ${
                isDarkHeader ? 'text-[#d4af37]/80' : 'text-olive-accent'
              }`}
            >
              Handmade Luxury
            </span>
          </Link>

          {/* Right Navigation & Interactive Actions */}
          <div className="flex items-center gap-4 sm:gap-6">
            <nav
              className={`hidden lg:flex items-center gap-6 xl:gap-8 font-sans text-xs uppercase tracking-widest font-medium transition-colors ${
                isDarkHeader ? 'text-white/85' : 'text-charcoal/80'
              }`}
            >
              <Link
                href={getNavHref('#process')}
                className={`transition-colors ${
                  isDarkHeader ? 'hover:text-[#d4af37]' : 'hover:text-soft-gold'
                }`}
              >
                Craft Process
              </Link>
              <Link
                href={getNavHref('#testimonials')}
                className={`transition-colors ${
                  isDarkHeader ? 'hover:text-[#d4af37]' : 'hover:text-soft-gold'
                }`}
              >
                Reviews
              </Link>
              <Link
                href={getNavHref('#contact')}
                className={`transition-colors ${
                  isDarkHeader ? 'hover:text-[#d4af37]' : 'hover:text-soft-gold'
                }`}
              >
                Contact
              </Link>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search Button */}
              <button
                aria-label="Search Catalog"
                onClick={handleSearchClick}
                className={`p-2 sm:p-2.5 rounded-full transition-all cursor-pointer ${
                  isDarkHeader
                    ? 'text-white/85 hover:text-[#d4af37] hover:bg-white/10'
                    : 'text-charcoal hover:text-soft-gold hover:bg-white/60'
                }`}
              >
                <Search className="w-5 h-5 stroke-[1.75]" />
              </button>

              {/* Wishlist Button */}
              <button
                aria-label="View Wishlist"
                onClick={handleWishlistClick}
                className={`p-2 sm:p-2.5 rounded-full transition-all relative cursor-pointer ${
                  isDarkHeader
                    ? 'text-white/85 hover:text-[#d4af37] hover:bg-white/10'
                    : 'text-charcoal hover:text-soft-gold hover:bg-white/60'
                }`}
              >
                <Heart className="w-5 h-5 stroke-[1.75]" />
                {wishlistCount > 0 && (
                  <span
                    className={`absolute top-1 right-1 w-4 h-4 text-[9px] font-tech font-bold rounded-full flex items-center justify-center animate-scale-in ${
                      isDarkHeader ? 'bg-[#d4af37] text-black' : 'bg-soft-gold text-white'
                    }`}
                  >
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* Cart Drawer Trigger */}
              <button
                aria-label="Shopping Cart"
                onClick={openCart}
                className={`p-2 sm:p-2.5 rounded-full transition-all relative cursor-pointer ${
                  isDarkHeader
                    ? 'text-white/85 hover:text-[#d4af37] hover:bg-white/10'
                    : 'text-charcoal hover:text-soft-gold hover:bg-white/60'
                }`}
              >
                <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
                {cartCount > 0 && (
                  <span
                    className={`absolute top-1 right-1 w-4 h-4 text-[9px] font-tech font-bold rounded-full flex items-center justify-center animate-scale-in ${
                      isDarkHeader ? 'bg-[#d4af37] text-black' : 'bg-navy text-ivory'
                    }`}
                  >
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Customer Login / Account Button */}
              {customer ? (
                <div className="relative group/account">
                  <Link
                    href="/account/orders"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans uppercase tracking-widest font-medium transition-all ${
                      isDarkHeader
                        ? 'border border-[#d4af37]/60 text-white hover:text-[#d4af37] hover:border-[#d4af37] hover:bg-[#d4af37]/10'
                        : 'border border-charcoal/25 text-charcoal hover:text-soft-gold hover:border-soft-gold hover:bg-white/60'
                    }`}
                    title={customer.fullName || customer.email || 'Customer Account'}
                  >
                    <User className={`w-3.5 h-3.5 ${isDarkHeader ? 'text-[#d4af37]' : 'text-soft-gold'}`} />
                    <span className="hidden sm:inline font-medium">Account</span>
                  </Link>

                  {/* Account Quick Dropdown on Desktop */}
                  <div className="absolute right-0 mt-2 w-52 py-2 rounded-2xl shadow-2xl opacity-0 invisible group-hover/account:opacity-100 group-hover/account:visible transition-all duration-200 z-50 border backdrop-blur-xl bg-[#0d1217]/95 border-white/15 text-white">
                    <div className="px-4 py-2 border-b border-white/10">
                      <p className="text-[10px] uppercase tracking-wider text-[#d4af37]">Customer Account</p>
                      <p className="text-xs truncate font-medium text-white/90 mt-0.5">
                        {customer.fullName || customer.email}
                      </p>
                    </div>
                    <Link
                      href="/account/orders"
                      className="flex items-center gap-2 px-4 py-2.5 text-xs text-white/80 hover:text-[#d4af37] hover:bg-white/5 transition-colors"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>My Orders</span>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/customer/login"
                  className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-sans uppercase tracking-widest font-semibold transition-all shadow-sm cursor-pointer ${
                    isDarkHeader
                      ? 'bg-[#d4af37] text-black hover:bg-[#e5c158] hover:shadow-lg'
                      : 'bg-navy text-ivory hover:bg-soft-gold hover:text-navy'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Login</span>
                </Link>
              )}

              {/* Mobile Menu Toggle */}
              <button
                aria-label="Toggle Navigation Menu"
                onClick={openMobileMenu}
                className={`lg:hidden p-2 cursor-pointer transition-colors ${
                  isDarkHeader
                    ? 'text-white/90 hover:text-[#d4af37]'
                    : 'text-charcoal hover:text-soft-gold'
                }`}
              >
                <Menu className="w-6 h-6 stroke-[1.75]" />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Fullscreen Mobile Drawer */}
      <div
        className={`fixed inset-0 z-50 flex flex-col justify-center items-center gap-6 transition-all duration-300 px-6 ${
          isDarkHeader
            ? 'bg-[#0a0e14]/98 backdrop-blur-2xl text-white'
            : 'bg-ivory/98 backdrop-blur-2xl text-charcoal'
        } ${
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={closeMobileMenu}
          aria-label="Close Mobile Navigation"
          className={`absolute top-6 right-6 p-3 cursor-pointer transition-colors ${
            isDarkHeader ? 'text-white/80 hover:text-[#d4af37]' : 'text-charcoal hover:text-soft-gold'
          }`}
        >
          <X className="w-8 h-8 stroke-[1.5]" />
        </button>

        <div className="flex flex-col items-center mb-2">
          <span
            className={`font-serif text-3xl font-bold tracking-tight ${
              isDarkHeader ? 'text-white' : 'text-charcoal'
            }`}
          >
            VELORA
          </span>
          <span
            className={`font-tech text-[10px] uppercase tracking-[0.35em] mt-1 ${
              isDarkHeader ? 'text-[#d4af37]' : 'text-olive-accent'
            }`}
          >
            Handmade Luxury
          </span>
        </div>

        <Link
          href={isHome ? '#hero' : '/'}
          onClick={closeMobileMenu}
          className={`font-serif text-2xl transition-colors ${
            isDarkHeader ? 'text-white/90 hover:text-[#d4af37]' : 'text-charcoal hover:text-soft-gold'
          }`}
        >
          Home
        </Link>
        <Link
          href={getNavHref('#categories')}
          onClick={closeMobileMenu}
          className={`font-serif text-2xl transition-colors ${
            isDarkHeader ? 'text-white/90 hover:text-[#d4af37]' : 'text-charcoal hover:text-soft-gold'
          }`}
        >
          Categories
        </Link>
        <Link
          href={getNavHref('#most-loved')}
          onClick={closeMobileMenu}
          className={`font-serif text-2xl transition-colors ${
            isDarkHeader ? 'text-white/90 hover:text-[#d4af37]' : 'text-charcoal hover:text-soft-gold'
          }`}
        >
          Most Loved by You ❤️
        </Link>
        <Link
          href={getNavHref('#about')}
          onClick={closeMobileMenu}
          className={`font-serif text-2xl transition-colors ${
            isDarkHeader ? 'text-white/90 hover:text-[#d4af37]' : 'text-charcoal hover:text-soft-gold'
          }`}
        >
          Our Story & Atelier
        </Link>
        <Link
          href={getNavHref('#process')}
          onClick={closeMobileMenu}
          className={`font-serif text-2xl transition-colors ${
            isDarkHeader ? 'text-white/90 hover:text-[#d4af37]' : 'text-charcoal hover:text-soft-gold'
          }`}
        >
          Crafting Process
        </Link>
        <Link
          href={getNavHref('#testimonials')}
          onClick={closeMobileMenu}
          className={`font-serif text-2xl transition-colors ${
            isDarkHeader ? 'text-white/90 hover:text-[#d4af37]' : 'text-charcoal hover:text-soft-gold'
          }`}
        >
          Client Reviews
        </Link>
        <Link
          href={getNavHref('#contact')}
          onClick={closeMobileMenu}
          className={`font-serif text-2xl transition-colors ${
            isDarkHeader ? 'text-white/90 hover:text-[#d4af37]' : 'text-charcoal hover:text-soft-gold'
          }`}
        >
          Contact Concierge
        </Link>

        {/* Mobile Action Buttons */}
        <div
          className={`mt-4 pt-6 border-t flex flex-col items-center gap-3 w-full max-w-xs ${
            isDarkHeader ? 'border-white/10' : 'border-charcoal/10'
          }`}
        >
          {customer ? (
            <div className="flex flex-col w-full gap-2.5">
              <Link
                href="/account/orders"
                onClick={closeMobileMenu}
                className={`w-full py-3 rounded-full flex items-center justify-center gap-2 font-sans text-xs uppercase tracking-widest font-semibold transition-all ${
                  isDarkHeader
                    ? 'bg-[#d4af37] text-black hover:bg-[#e5c158]'
                    : 'bg-navy text-ivory hover:bg-soft-gold hover:text-navy'
                }`}
              >
                <User className="w-4 h-4" />
                <span>My Account ({customer.fullName?.split(' ')[0] || 'Orders'})</span>
              </Link>
              <button
                onClick={handleSignOut}
                className={`w-full py-2 rounded-full flex items-center justify-center gap-2 font-sans text-[11px] uppercase tracking-widest transition-all cursor-pointer ${
                  isDarkHeader
                    ? 'border border-white/20 text-white/70 hover:text-white hover:border-white/40'
                    : 'border border-charcoal/20 text-charcoal/70 hover:text-charcoal'
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <Link
              href="/customer/login"
              onClick={closeMobileMenu}
              className={`w-full py-3 rounded-full flex items-center justify-center gap-2 font-sans text-xs uppercase tracking-widest font-semibold transition-all cursor-pointer ${
                isDarkHeader
                  ? 'bg-[#d4af37] text-black hover:bg-[#e5c158]'
                  : 'bg-navy text-ivory hover:bg-soft-gold hover:text-navy'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Customer Login</span>
            </Link>
          )}

          <button
            onClick={() => {
              closeMobileMenu();
              openCart();
            }}
            className={`w-full py-3 rounded-full flex items-center justify-center gap-2 font-sans text-xs uppercase tracking-widest font-medium transition-all cursor-pointer ${
              isDarkHeader
                ? 'border border-[#d4af37]/60 text-[#d4af37] hover:bg-[#d4af37]/10'
                : 'bg-charcoal/10 text-charcoal hover:bg-charcoal/20'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Bag ({cartCount})</span>
          </button>
        </div>
      </div>
    </>
  );
}
