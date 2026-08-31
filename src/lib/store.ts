import { create } from 'zustand';
import { Product, CartItem } from '@/types';

interface StoreState {
  // Cart
  cart: CartItem[];
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (product: Product, quantity?: number, selectedColor?: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;

  // Wishlist
  wishlist: Product[];
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;

  // Quick View Modal
  quickViewProduct: Product | null;
  openQuickView: (product: Product) => void;
  closeQuickView: () => void;

  // Mobile Menu
  isMobileMenuOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  // Cart
  cart: [
    {
      product: {
        id: 'p1',
        name: 'Artisan Crochet Tote Bag',
        category: 'Crochet Bags',
        categorySlug: 'bags-totes',
        price: 3499,
        description: 'Handmade luxury open-weave cotton tote bag crafted with heavy gauge yarn handles.',
        materials: '100% Organic OEKO-TEX Cotton Yarn',
        image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=900&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=900&auto=format&fit=crop'],
        rating: 4.9,
        reviewCount: 48,
        inStock: true,
      },
      quantity: 1,
      selectedColor: 'Oatmeal Ivory',
    },
    {
      product: {
        id: 'p2',
        name: 'Waffle Dishcloth & Trivet Set',
        category: 'Crochet Kitchens',
        categorySlug: 'kitchen-essentials',
        price: 1499,
        description: 'Hand-knitted waffle dishcloths and thick cotton trivet pads.',
        materials: 'Natural Unbleached Egyptian Cotton',
        image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?q=80&w=900&auto=format&fit=crop',
        images: ['https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?q=80&w=900&auto=format&fit=crop'],
        rating: 4.8,
        reviewCount: 32,
        inStock: true,
      },
      quantity: 1,
      selectedColor: 'Warm Sand',
    }
  ],
  isCartOpen: false,
  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),
  addToCart: (product: Product, quantity = 1, selectedColor) => {
    set((state) => {
      const existing = state.cart.find((item) => item.product.id === product.id);
      if (existing) {
        return {
          cart: state.cart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ),
          isCartOpen: true,
        };
      }
      return {
        cart: [...state.cart, { product, quantity, selectedColor: selectedColor || product.colors?.[0] }],
        isCartOpen: true,
      };
    });
  },
  removeFromCart: (productId: string) => {
    set((state) => ({
      cart: state.cart.filter((item) => item.product.id !== productId),
    }));
  },
  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set((state) => ({
      cart: state.cart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    }));
  },
  clearCart: () => set({ cart: [] }),
  getCartTotal: () => {
    return get().cart.reduce(
      (acc, item) => acc + item.product.price * item.quantity,
      0
    );
  },
  getCartCount: () => {
    return get().cart.reduce((acc, item) => acc + item.quantity, 0);
  },

  // Wishlist
  wishlist: [],
  toggleWishlist: (product: Product) => {
    set((state) => {
      const exists = state.wishlist.some((p) => p.id === product.id);
      if (exists) {
        return { wishlist: state.wishlist.filter((p) => p.id !== product.id) };
      }
      return { wishlist: [...state.wishlist, product] };
    });
  },
  isInWishlist: (productId: string) => {
    return get().wishlist.some((p) => p.id === productId);
  },

  // Quick View Modal
  quickViewProduct: null,
  openQuickView: (product: Product) => set({ quickViewProduct: product }),
  closeQuickView: () => set({ quickViewProduct: null }),

  // Mobile Menu
  isMobileMenuOpen: false,
  openMobileMenu: () => set({ isMobileMenuOpen: true }),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
}));
