import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { useEffect } from "react";

import Collections from "./pages/Collections";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import Orders from "./pages/Orders";
import NotFound from "./pages/NotFound";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";

import { MidrangeAuthProvider } from "./context/MidrangeAuthContext";
import { WishlistProvider } from "./context/WishlistContext";
import Wishlist from "./pages/Wishlist";
import ResetPassword from "./pages/Forgotpassword";

const queryClient = new QueryClient();


// ✅ Scroll to top on every route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};


const App = () => (
  <QueryClientProvider client={queryClient}>
    <WishlistProvider>
    <MidrangeAuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          <BrowserRouter>

            {/* ✅ Scroll reset */}
            <ScrollToTop />

            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/mid" element={<Index />} />

              <Route path="/products" element={<Products />} />

              <Route path="/categories" element={<Products />} />
              <Route path="/categories/:categorySlug" element={<Products />} />
              <Route path="/categories/:categorySlug/:subSlug" element={<Products />} />
<Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/product/:id" element={<ProductDetail />} />

              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />

              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              <Route path="/profile" element={<Profile />} />
              <Route path="/orders" element={<Orders />} />

              <Route path="/order-success/:orderId" element={<OrderSuccess />} />
              <Route path="/wishlist" element={<Wishlist />} />
              {/* Catch all */}
              <Route path="*" element={<NotFound />} />
            </Routes>

          </BrowserRouter>

        </TooltipProvider>
      </CartProvider>
    </MidrangeAuthProvider>
    </WishlistProvider>
  </QueryClientProvider>
);

export default App;