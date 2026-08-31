import type { Metadata } from 'next';
import { Playfair_Display, Cormorant_Garamond, Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/modals/CartDrawer';
import QuickViewModal from '@/components/modals/QuickViewModal';
import CustomCursor from '@/components/ui/CustomCursor';
import ScrollProgress from '@/components/ui/ScrollProgress';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VELORA | Luxury Handcrafted Crochet Brand',
  description:
    'VELORA — Premium handcrafted crochet brand. Handcrafted elegance, bespoke artisan accessories, luxury home decor, and custom handmade creations.',
  keywords: [
    'luxury crochet',
    'handmade crochet brand',
    'crochet bags',
    'crochet home decor',
    'amigurumi',
    'organic cotton yarn',
    'bespoke crochet',
    'VELORA',
  ],
  openGraph: {
    title: 'VELORA | Luxury Handcrafted Crochet Brand',
    description: 'Made by Hand. Meant to Be Loved.',
    siteName: 'VELORA',
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`scroll-smooth ${playfair.variable} ${cormorant.variable} ${inter.variable} ${spaceGrotesk.variable}`}
    >
      <body className="font-sans antialiased bg-ivory text-charcoal selection:bg-soft-gold selection:text-white">
        <ScrollProgress />
        <CustomCursor />
        <Navbar />
        {children}
        <Footer />
        <CartDrawer />
        <QuickViewModal />
      </body>
    </html>
  );
}
