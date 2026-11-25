import { useEffect, useMemo, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { HeroCylinderStage } from "./components/HeroCylinderStage";
import { ShopShowcase } from "./components/ShopShowcase";
import { AboutUsSection } from "./components/AboutUsSection";
import { ProductDetailPage } from "./components/ProductDetailPage";
import { CategoryDrawer } from "./components/CategoryDrawer";
import { AuthModal } from "./components/AuthModal";
import type { AuthModalMode } from "./components/AuthModal";
import { BasketDrawer } from "./components/BasketDrawer";
import type { BasketItem } from "./components/BasketDrawer";
import { LikedShoesDrawer } from "./components/LikedShoesDrawer";
import { UserAccountPage } from "./components/UserAccountPage";
import { PaymentDashboardPage } from "./components/PaymentDashboardPage";
import { AdminDashboardPage } from "./components/AdminDashboardPage";
import { FEATURED_SHOES, SHOE_CATEGORIES } from "./data/shoeCatalog";
import type { AngleKey, FeaturedShoe, ShoeCategory } from "./data/shoeCatalog";
import { storeApi } from "./services/api";
import type {
  AppUser,
  OrderRecord,
  OrderStatusType,
  PaymentMethodType,
  ShippingAddressRecord,
} from "./services/api";

function ProductDetailRoute({
  products,
  likedShoeIds,
  onBackToShop,
  onSelectShoe,
  onAddToBasket,
  onToggleLike,
}: {
  products: FeaturedShoe[];
  likedShoeIds: string[];
  onBackToShop: () => void;
  onSelectShoe: (shoe: FeaturedShoe, angle?: AngleKey) => void;
  onAddToBasket: (shoe: FeaturedShoe, size: string) => void;
  onToggleLike: (shoe: FeaturedShoe) => void;
}) {
  const { shoeId } = useParams<{ shoeId: string }>();
  const [searchParams] = useSearchParams();

  const shoe =
    products.find((item) => item.id === shoeId) ??
    products[0] ??
    FEATURED_SHOES[0];
  const rawAngle = searchParams.get("angle") as AngleKey | null;
  const validAngle: AngleKey =
    rawAngle && rawAngle in shoe.angles ? rawAngle : "lateral";

  return (
    <ProductDetailPage
      key={shoe.id}
      shoe={shoe}
      allProducts={products}
      isLiked={likedShoeIds.includes(shoe.id)}
      initialAngle={validAngle}
      onBackToShop={onBackToShop}
      onSelectShoe={onSelectShoe}
      onAddToBasket={onAddToBasket}
      onToggleLike={onToggleLike}
    />
  );
}

export function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // MERN Synchronized Database State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() =>
    storeApi.getSessionUser()
  );
  const [users, setUsers] = useState<AppUser[]>([]);
  const [products, setProducts] = useState<FeaturedShoe[]>(FEATURED_SHOES);
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  // Category & Section Navigation State
  const [activeCategory, setActiveCategory] =
    useState<ShoeCategory>("All Shoes");
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [shopTriggerCount, setShopTriggerCount] = useState(0);
  const [pendingSection, setPendingSection] = useState<
    "home" | "shop-now" | "about-us" | null
  >(null);

  // Overlays & Basket State
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>("login");
  const [authPromptMsg, setAuthPromptMsg] = useState<string | null>(null);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isLikedOpen, setIsLikedOpen] = useState(false);
  const [basketItems, setBasketItems] = useState<BasketItem[]>([]);

  // Load initial database collections
  useEffect(() => {
    void storeApi.getProducts().then(setProducts);
    void storeApi.getUsers().then(setUsers);
    void storeApi.getOrders().then(setOrders);
  }, []);

  // Scroll smoothly to target section when navigating back to "/"
  useEffect(() => {
    if (location.pathname !== "/" || !pendingSection) return;

    const timer = window.setTimeout(() => {
      if (pendingSection === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const el = document.getElementById(pendingSection);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
        if (pendingSection === "shop-now") {
          setShopTriggerCount((prev) => prev + 1);
        }
      }
      setPendingSection(null);
    }, 60);

    return () => window.clearTimeout(timer);
  }, [location.pathname, pendingSection]);

  const categoryCounts = useMemo(() => {
    const counts: Record<ShoeCategory, number> = {
      "All Shoes": products.length,
      "Basketball Shoes": 0,
      "Running Shoes": 0,
      "Sandals & Slides": 0,
      Lifestyle: 0,
    };
    for (const item of products) {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  const promptSignIn = (message: string) => {
    setAuthPromptMsg(message);
    setAuthModalMode("login");
    setIsLoginOpen(true);
  };

  const handleNavigateHome = () => {
    if (location.pathname !== "/") {
      setPendingSection("home");
      navigate("/");
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleNavigateShopNow = () => {
    if (location.pathname !== "/") {
      setPendingSection("shop-now");
      navigate("/");
    } else {
      const shopEl = document.getElementById("shop-now");
      if (shopEl) {
        shopEl.scrollIntoView({ behavior: "smooth" });
      }
      setShopTriggerCount((prev) => prev + 1);
    }
  };

  const handleSelectCategory = (cat: ShoeCategory) => {
    setActiveCategory(cat);
    handleNavigateShopNow();
  };

  const handleNavigateAbout = () => {
    if (location.pathname !== "/") {
      setPendingSection("about-us");
      navigate("/");
    } else {
      const aboutEl = document.getElementById("about-us");
      if (aboutEl) {
        aboutEl.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleOpenShoeDetail = (
    shoe: FeaturedShoe,
    initialAngle: AngleKey = "lateral"
  ) => {
    navigate(`/shoe/${shoe.id}?angle=${initialAngle}`);
  };

  // SIGNED-IN GUARD: Adding to Basket is only allowed for signed-in users
  const handleAddToBasket = (shoe: FeaturedShoe, size = "US 9") => {
    if (!currentUser) {
      promptSignIn(
        "Please sign in first to add shoes to your basket and checkout."
      );
      return;
    }
    if (shoe.stock <= 0) return;

    setBasketItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.shoe.id === shoe.id && item.size === size
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1,
        };
        return updated;
      }
      return [...prev, { shoe, size, quantity: 1 }];
    });
  };

  // SIGNED-IN GUARD: Liking/Favouriting shoes is only allowed for signed-in users
  const handleToggleLike = async (shoe: FeaturedShoe) => {
    if (!currentUser) {
      promptSignIn("Please sign in first to save shoes to your Liked list.");
      return;
    }
    const alreadyLiked = currentUser.likedShoeIds.includes(shoe.id);
    const nextLiked = alreadyLiked
      ? currentUser.likedShoeIds.filter((id) => id !== shoe.id)
      : [...currentUser.likedShoeIds, shoe.id];

    const updatedUser = await storeApi.updateUser(currentUser._id, {
      likedShoeIds: nextLiked,
    });
    setCurrentUser(updatedUser);
    setUsers(await storeApi.getUsers());
  };

  const handleRemoveBasketItem = (shoeId: string, size: string) => {
    setBasketItems((prev) =>
      prev.filter((item) => !(item.shoe.id === shoeId && item.size === size))
    );
  };

  const handleOpenBasket = () => {
    if (!currentUser) {
      promptSignIn("Please sign in to access your basket and checkout.");
      return;
    }
    setIsBasketOpen(true);
  };

  // CHECKOUT SUBMISSION: Creates order, deducts stock in DB, clears basket
  const handleSubmitOrder = async (payload: {
    paymentMethod: PaymentMethodType;
    shippingAddress: ShippingAddressRecord;
  }): Promise<OrderRecord> => {
    if (!currentUser) {
      throw new Error("Sign in required");
    }
    const items = basketItems.map((b) => ({
      shoeId: b.shoe.id,
      shoeName: b.shoe.name,
      size: b.size,
      quantity: b.quantity,
      price: b.shoe.price,
      imageUrl: b.shoe.angles.pairAngle,
    }));
    const totalAmount = items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    const { order, updatedProducts } = await storeApi.createOrder({
      userId: currentUser._id,
      username: currentUser.username,
      userEmail: currentUser.email,
      items,
      totalAmount,
      paymentMethod: payload.paymentMethod,
      shippingAddress: payload.shippingAddress,
    });

    setProducts(updatedProducts);
    setOrders(await storeApi.getOrders());
    setBasketItems([]);
    return order;
  };

  const likedShoeObjects = useMemo(() => {
    if (!currentUser) return [];
    return products.filter((p) => currentUser.likedShoeIds.includes(p.id));
  }, [currentUser, products]);

  const totalBasketCount = basketItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-[#070709] text-white">
      {/* Header Navigation with Categories Drawer, Guest vs Signed-In vs Admin Controls */}
      <Navbar
        basketCount={totalBasketCount}
        likedCount={likedShoeObjects.length}
        currentUser={currentUser}
        onNavigateHome={handleNavigateHome}
        onNavigateAbout={handleNavigateAbout}
        onNavigateShopNow={handleNavigateShopNow}
        onOpenCategories={() => setIsCategoryDrawerOpen(true)}
        onOpenLogin={() => {
          setAuthPromptMsg(null);
          setAuthModalMode("login");
          setIsLoginOpen(true);
        }}
        onOpenBasket={handleOpenBasket}
        onOpenLiked={() => setIsLikedOpen(true)}
        onNavigateAccount={() => navigate("/account")}
        onNavigateAdmin={() => navigate("/admin")}
        onSignOut={() => {
          storeApi.setSessionUser(null);
          setCurrentUser(null);
          setBasketItems([]);
          navigate("/");
        }}
      />

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <HeroCylinderStage
                  onShopNowClick={handleNavigateShopNow}
                  onSelectShoeToBuy={(shoe) =>
                    handleOpenShoeDetail(shoe, "lateral")
                  }
                />
                <ShopShowcase
                  products={products}
                  activeCategory={activeCategory}
                  likedShoeIds={currentUser?.likedShoeIds ?? []}
                  shopTriggerCount={shopTriggerCount}
                  onCategoryChange={setActiveCategory}
                  onSelectShoeToBuy={handleOpenShoeDetail}
                  onQuickAddToBasket={(shoe) => handleAddToBasket(shoe, "US 9")}
                  onToggleLike={handleToggleLike}
                />
                <AboutUsSection onExploreShop={handleNavigateShopNow} />
              </>
            }
          />

          <Route
            path="/shoe/:shoeId"
            element={
              <ProductDetailRoute
                products={products}
                likedShoeIds={currentUser?.likedShoeIds ?? []}
                onBackToShop={handleNavigateShopNow}
                onSelectShoe={handleOpenShoeDetail}
                onAddToBasket={handleAddToBasket}
                onToggleLike={handleToggleLike}
              />
            }
          />

          <Route
            path="/checkout"
            element={
              currentUser ? (
                <PaymentDashboardPage
                  user={currentUser}
                  basketItems={basketItems}
                  onBackToShop={handleNavigateShopNow}
                  onViewMyOrders={() => navigate("/account")}
                  onSubmitOrder={handleSubmitOrder}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/account"
            element={
              currentUser ? (
                <UserAccountPage
                  key={currentUser._id}
                  user={currentUser}
                  orders={orders}
                  onBackHome={handleNavigateHome}
                  onUpdateProfile={async (updates) => {
                    const updated = await storeApi.updateUser(
                      currentUser._id,
                      updates
                    );
                    setCurrentUser(updated);
                    setUsers(await storeApi.getUsers());
                  }}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route
            path="/admin"
            element={
              currentUser?.role === "admin" ? (
                <AdminDashboardPage
                  users={users}
                  products={products}
                  orders={orders}
                  onBackHome={handleNavigateHome}
                  onCreateUser={async (data) => {
                    await storeApi.createUser(data);
                    setUsers(await storeApi.getUsers());
                  }}
                  onUpdateUser={async (userId, updates) => {
                    const updated = await storeApi.updateUser(userId, updates);
                    if (currentUser._id === userId) {
                      setCurrentUser(updated);
                    }
                    setUsers(await storeApi.getUsers());
                  }}
                  onDeleteUser={async (userId) => {
                    await storeApi.deleteUser(userId);
                    setUsers(await storeApi.getUsers());
                  }}
                  onCreateProduct={async (data) => {
                    await storeApi.createProduct(data);
                    setProducts(await storeApi.getProducts());
                  }}
                  onUpdateProduct={async (shoeId, updates) => {
                    const next = await storeApi.updateProduct(shoeId, updates);
                    setProducts(next);
                  }}
                  onDeleteProduct={async (shoeId) => {
                    const next = await storeApi.deleteProduct(shoeId);
                    setProducts(next);
                  }}
                  onUpdateOrderStatus={async (
                    orderId: string,
                    status: OrderStatusType
                  ) => {
                    const next = await storeApi.updateOrderStatus(
                      orderId,
                      status
                    );
                    setOrders(next);
                  }}
                  onDeleteOrder={async (orderId: string) => {
                    const next = await storeApi.deleteOrder(orderId);
                    setOrders(next);
                  }}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#050507] py-8 text-center text-xs text-zinc-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row md:px-10">
          <button
            type="button"
            onClick={handleNavigateHome}
            className="font-sport cursor-pointer text-sm tracking-widest text-white uppercase italic"
          >
            SOLE <span className="text-amber-400">PURPOSE</span>
          </button>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {SHOE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat.id)}
                className="cursor-pointer text-xs text-zinc-400 hover:text-white"
              >
                {cat.label}
              </button>
            ))}
          </div>
          <p>
            © 2026 Sole Purpose Philippines. MERN Stack + React 19 &amp;
            Anime.js v4.
          </p>
        </div>
      </footer>

      {/* Nike-Style Slide-Out Shoes Category Drawer */}
      <CategoryDrawer
        isOpen={isCategoryDrawerOpen}
        activeCategory={activeCategory}
        categoryCounts={categoryCounts}
        onClose={() => setIsCategoryDrawerOpen(false)}
        onSelectCategory={handleSelectCategory}
      />

      {/* Sign In / Register / Forgot Password -> Change Password Dashboard Modal */}
      <AuthModal
        key={isLoginOpen ? `open-${authModalMode}` : "closed"}
        isOpen={isLoginOpen}
        initialMode={authModalMode}
        promptMessage={authPromptMsg}
        onClose={() => {
          setIsLoginOpen(false);
          setAuthPromptMsg(null);
        }}
        onAuthSuccess={async (user) => {
          setCurrentUser(user);
          setUsers(await storeApi.getUsers());
        }}
      />

      {/* Liked Shoes Drawer (Signed-In Users) */}
      <LikedShoesDrawer
        isOpen={isLikedOpen}
        likedShoes={likedShoeObjects}
        onClose={() => setIsLikedOpen(false)}
        onSelectShoe={(shoe) => handleOpenShoeDetail(shoe, "lateral")}
        onMoveToBasket={(shoe) => handleAddToBasket(shoe, "US 9")}
        onRemoveLiked={async (shoeId) => {
          const target = products.find((p) => p.id === shoeId);
          if (target) await handleToggleLike(target);
        }}
      />

      {/* Basket Drawer */}
      <BasketDrawer
        isOpen={isBasketOpen}
        items={basketItems}
        onClose={() => setIsBasketOpen(false)}
        onRemoveItem={handleRemoveBasketItem}
        onProceedToCheckout={() => navigate("/checkout")}
      />
    </div>
  );
}

export default App;
