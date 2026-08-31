import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { UIProvider } from './context/UIContext';
import { FilterProvider } from './context/FilterContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import SearchOverlay from './components/SearchOverlay';
import CartDrawer from './components/CartDrawer';
import ProductQuickView from './components/ProductQuickView';
import CommandPalette from './components/CommandPalette';
import Toast from './components/Toast';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Product from './pages/Product';
import Checkout from './pages/Checkout';
import NewDrops from './pages/NewDrops';
import BestSellers from './pages/BestSellers';
import Collections from './pages/Collections';
import DropRoom from './components/DropRoom';
import VaultPicks from './components/VaultPicks';
import VaultRoute from './vault/VaultRoute';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Shipping from './pages/Shipping';
import Returns from './pages/Returns';
import Warranty from './pages/Warranty';
import FAQ from './pages/FAQ';
import About from './pages/About';
import Journal from './pages/Journal';
import Careers from './pages/Careers';
import Press from './pages/Press';
import Sustainability from './pages/Sustainability';
import Cookies from './pages/Cookies';
import Accessibility from './pages/Accessibility';
import Limited from './pages/Limited';
import GiftCards from './pages/GiftCards';
import Account from './pages/Account';
import SignIn from './pages/SignIn';
import { motion, AnimatePresence } from 'motion/react';
import { pageEntranceVariants } from './lib/motion';

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main id="main-content" className="pt-16 lg:pt-20">
        {children}
      </main>
      <Footer />
      <SearchOverlay />
      <CartDrawer />
      <ProductQuickView />
      <CommandPalette />
      <Toast />
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageEntranceVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/new-drops" element={<NewDrops />} />
          <Route path="/best-sellers" element={<BestSellers />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/drop-room" element={<DropRoom />} />
          <Route path="/vault" element={<VaultRoute />} />
          <Route path="/vault-picks" element={<VaultPicks />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/shipping" element={<Shipping />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/warranty" element={<Warranty />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/about" element={<About />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/press" element={<Press />} />
          <Route path="/sustainability" element={<Sustainability />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="/accessibility" element={<Accessibility />} />
          <Route path="/limited" element={<Limited />} />
          <Route path="/gift-cards" element={<GiftCards />} />
          <Route path="/account" element={<Account />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <CartProvider>
      <WishlistProvider>
        <UIProvider>
          <AuthProvider>
            <FilterProvider>
              <Layout>
                <AppRoutes />
              </Layout>
            </FilterProvider>
          </AuthProvider>
        </UIProvider>
      </WishlistProvider>
    </CartProvider>
  );
}

export default App;