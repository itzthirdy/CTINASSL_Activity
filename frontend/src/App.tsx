import { useCallback, useEffect, useMemo, useState } from "react";
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
import { ToastContainer } from "./components/ToastContainer";
import type { ToastNotice } from "./components/ToastContainer";
import { SHOE_CATEGORIES } from "./data/shoeCatalog";
import type { AngleKey, FeaturedShoe, ShoeCategory } from "./data/shoeCatalog";
import { storeApi } from "./services/api";
import type {
  AppUser,
  OrderRecord,
  OrderStatusType,
  PaymentMethodType,
  ShippingAddressRecord,
} from "./services/api";

function getBasketKey(userId: string | undefined): string {
  return `sp_basket_v1_${userId ?? "guest"}`;
}

function loadPersistedBasket(userId: string | undefined): BasketItem[] {
  try {
    const raw = localStorage.getItem(getBasketKey(userId));
    return raw ? (JSON.parse(raw) as BasketItem[]) : [];
  } catch {
    return [];
  }
}

function ProductDetailRoute({
  products,
  currentUser,
  likedShoeIds,
  onBackToShop,
  onSelectShoe,
  onAddToBasket,
  onToggleLike,
  onAddReview,
  onDeleteReview,
}: {
  products: FeaturedShoe[];
  currentUser: AppUser | null;
  likedShoeIds: string[];
  onBackToShop: () => void;
  onSelectShoe: (shoe: FeaturedShoe, angle?: AngleKey) => void;
  onAddToBasket: (shoe: FeaturedShoe, size: string) => void;
  onToggleLike: (shoe: FeaturedShoe) => void;
  onAddReview: (
    shoeId: string,
    review: { rating: number; title: string; comment: string; location: string }
  ) => Promise<void>;
  onDeleteReview: (shoeId: string, reviewId: string) => Promise<void>;
}) {
  const { shoeId } = useParams<{ shoeId: string }>();
  const [searchParams] = useSearchParams();

  const shoe = products.find((item) => item.id === shoeId) ?? products[0];
  if (!shoe) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 pt-28 text-center">
        <p className="text-sm text-zinc-300">No shoes found in catalog.</p>
        <button
          type="button"
          onClick={onBackToShop}
          className="mt-4 cursor-pointer rounded-full bg-white px-6 py-2.5 text-xs font-bold text-black uppercase"
        >
          Back to Storefront
        </button>
      </div>
    );
  }

  const rawAngle = searchParams.get("angle") as AngleKey | null;
  const validAngle: AngleKey =
    rawAngle && shoe.angles[rawAngle] ? rawAngle : "lateral";

  return (
    <ProductDetailPage
      key={shoe.id}
      shoe={shoe}
      allProducts={products}
      currentUser={currentUser}
      isLiked={likedShoeIds.includes(shoe.id)}
      initialAngle={validAngle}
      onBackToShop={onBackToShop}
      onSelectShoe={onSelectShoe}
      onAddToBasket={onAddToBasket}
      onToggleLike={onToggleLike}
      onAddReview={onAddReview}
      onDeleteReview={onDeleteReview}
    />
  );
}

export function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState<AppUser | null>(() =>
    storeApi.getSessionUser()
  );
  const [users, setUsers] = useState<AppUser[]>([]);
  const [products, setProducts] = useState<FeaturedShoe[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const [activeCategory, setActiveCategory] =
    useState<ShoeCategory>("All Shoes");
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [shopTriggerCount, setShopTriggerCount] = useState(0);
  const [pendingSection, setPendingSection] = useState<
    "home" | "shop-now" | "about-us" | null
  >(null);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>("login");
  const [authPromptMsg, setAuthPromptMsg] = useState<string | null>(null);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isLikedOpen, setIsLikedOpen] = useState(false);
  const [basketItems, setBasketItems] = useState<BasketItem[]>(() =>
    loadPersistedBasket(storeApi.getSessionUser()?._id)
  );

  const notify = useCallback(
    (title: string, type: ToastNotice["type"] = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { id, title, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3400);
    },
    []
  );

  // Hydrate products & session from Express HttpOnly cookie on boot
  useEffect(() => {
    void storeApi.getProducts().then(setProducts);
    void storeApi.getCurrentUser().then((sessionUser) => {
      setCurrentUser(sessionUser);
      setBasketItems(loadPersistedBasket(sessionUser?._id));
      if (sessionUser) {
        void storeApi.getOrders().then(setOrders);
        if (sessionUser.role === "admin") {
          void storeApi.getUsers().then(setUsers);
        }
      }
    });
  }, []);

  // Persist basket across page refreshes
  useEffect(() => {
    localStorage.setItem(
      getBasketKey(currentUser?._id),
      JSON.stringify(basketItems)
    );
  }, [basketItems, currentUser?._id]);

  useEffect(() => {
    if (location.pathname !== "/" || !pendingSection) return;

    const timer = window.setTimeout(() => {
      if (pendingSection === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const el = document.getElementById(pendingSection);
        if (el) el.scrollIntoView({ behavior: "smooth" });
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
      document.getElementById("shop-now")?.scrollIntoView({ behavior: "smooth" });
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
      document.getElementById("about-us")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleOpenShoeDetail = (
    shoe: FeaturedShoe,
    initialAngle: AngleKey = "lateral"
  ) => {
    navigate(`/shoe/${shoe.id}?angle=${initialAngle}`);
  };

  const handleAddToBasket = (shoe: FeaturedShoe, size = "US 9") => {
    if (!currentUser) {
      promptSignIn(
        "Please sign in first to add shoes to your basket and checkout."
      );
      return;
    }
    if (shoe.stock <= 0) {
      notify(`${shoe.name} is out of stock.`, "error");
      return;
    }

    setBasketItems((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.shoe.id === shoe.id && item.size === size
      );
      if (existingIdx > -1) {
        const nextQty = prev[existingIdx].quantity + 1;
        if (nextQty > shoe.stock) {
          notify(`Only ${shoe.stock} pair(s) available in stock.`, "error");
          return prev;
        }
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], quantity: nextQty };
        notify(`Updated ${shoe.name} (${size}) to ${nextQty}`, "success");
        return updated;
      }
      notify(`Added ${shoe.name} (${size}) to basket`, "success");
      return [...prev, { shoe, size, quantity: 1 }];
    });
  };

  const handleUpdateBasketQty = (
    shoeId: string,
    size: string,
    nextQty: number
  ) => {
    if (nextQty <= 0) {
      setBasketItems((prev) =>
        prev.filter((item) => !(item.shoe.id === shoeId && item.size === size))
      );
      return;
    }
    const liveShoe = products.find((p) => p.id === shoeId);
    const maxStock = liveShoe?.stock ?? nextQty;
    if (nextQty > maxStock) {
      notify(`Stock limit reached (${maxStock} left).`, "error");
      return;
    }
    setBasketItems((prev) =>
      prev.map((item) =>
        item.shoe.id === shoeId && item.size === size
          ? { ...item, quantity: nextQty }
          : item
      )
    );
  };

  const handleToggleLike = async (shoe: FeaturedShoe) => {
    if (!currentUser) {
      promptSignIn("Please sign in first to save shoes to your Liked list.");
      return;
    }
    const alreadyLiked = currentUser.likedShoeIds.includes(shoe.id);
    const nextLiked = alreadyLiked
      ? currentUser.likedShoeIds.filter((id) => id !== shoe.id)
      : [...currentUser.likedShoeIds, shoe.id];

    const updatedUser = await storeApi.updateSelfProfile({
      likedShoeIds: nextLiked,
    });
    setCurrentUser(updatedUser);
    notify(
      alreadyLiked
        ? `Removed ${shoe.name} from Liked`
        : `Saved ${shoe.name} to Liked`,
      "info"
    );
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

  const handleSubmitOrder = async (payload: {
    paymentMethod: PaymentMethodType;
    shippingAddress: ShippingAddressRecord;
  }): Promise<OrderRecord> => {
    if (!currentUser) throw new Error("Sign in required");
    const items = basketItems.map((b) => ({
      shoeId: b.shoe.id,
      shoeName: b.shoe.name,
      size: b.size,
      quantity: b.quantity,
      price: b.shoe.price,
      imageUrl: b.shoe.angles.lateral,
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
    notify(`Order ${order.orderNumber} confirmed!`, "success");
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
          void storeApi.logout();
          setCurrentUser(null);
          setOrders([]);
          setUsers([]);
          setBasketItems([]);
          notify("Signed out.", "info");
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
                  products={products}
                  isAdmin={currentUser?.role === "admin"}
                  onShopNowClick={handleNavigateShopNow}
                  onSelectShoeToBuy={(shoe) =>
                    handleOpenShoeDetail(shoe, "lateral")
                  }
                  onOpenAdmin={() => navigate("/admin")}
                />
                <ShopShowcase
                  products={products}
                  activeCategory={activeCategory}
                  likedShoeIds={currentUser?.likedShoeIds ?? []}
                  shopTriggerCount={shopTriggerCount}
                  onCategoryChange={setActiveCategory}
                  onSelectShoeToBuy={handleOpenShoeDetail}
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
                currentUser={currentUser}
                likedShoeIds={currentUser?.likedShoeIds ?? []}
                onBackToShop={handleNavigateShopNow}
                onSelectShoe={handleOpenShoeDetail}
                onAddToBasket={handleAddToBasket}
                onToggleLike={handleToggleLike}
                onAddReview={async (shoeId, review) => {
                  const next = await storeApi.addProductReview(shoeId, review);
                  setProducts(next);
                  notify("Review posted!", "success");
                }}
                onDeleteReview={async (shoeId, reviewId) => {
                  const next = await storeApi.deleteProductReview(
                    shoeId,
                    reviewId
                  );
                  setProducts(next);
                  notify("Review deleted.", "info");
                }}
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
                    const updated = await storeApi.updateSelfProfile(updates);
                    setCurrentUser(updated);
                    notify("Account updated!", "success");
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
                    notify(`User @${data.username} created`, "success");
                  }}
                  onUpdateUser={async (userId, updates) => {
                    const updated = await storeApi.updateUser(userId, updates);
                    if (currentUser._id === userId) setCurrentUser(updated);
                    setUsers(await storeApi.getUsers());
                    notify("User updated", "success");
                  }}
                  onDeleteUser={async (userId) => {
                    await storeApi.deleteUser(userId);
                    setUsers(await storeApi.getUsers());
                    notify("User removed", "info");
                  }}
                  onUploadShoeAngles={(files) =>
                    storeApi.uploadShoeAngles(files)
                  }
                  onSeedDemoProducts={async () => {
                    const next = await storeApi.seedDemoProducts();
                    setProducts(next);
                    notify("Starter demo shoes loaded", "success");
                  }}
                  onCreateProduct={async (data) => {
                    await storeApi.createProduct(data);
                    setProducts(await storeApi.getProducts());
                    notify(`${data.name} added to store!`, "success");
                  }}
                  onUpdateProduct={async (shoeId, updates) => {
                    const next = await storeApi.updateProduct(shoeId, updates);
                    setProducts(next);
                    notify("Shoe inventory saved", "success");
                  }}
                  onDeleteProduct={async (shoeId) => {
                    const next = await storeApi.deleteProduct(shoeId);
                    setProducts(next);
                    notify("Shoe removed", "info");
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
                    notify(`Order status → ${status}`, "success");
                  }}
                  onDeleteOrder={async (orderId: string) => {
                    const next = await storeApi.deleteOrder(orderId);
                    setOrders(next);
                    notify("Order deleted", "info");
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

      <CategoryDrawer
        isOpen={isCategoryDrawerOpen}
        activeCategory={activeCategory}
        categoryCounts={categoryCounts}
        onClose={() => setIsCategoryDrawerOpen(false)}
        onSelectCategory={handleSelectCategory}
      />

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
          setBasketItems(loadPersistedBasket(user._id));
          setOrders(await storeApi.getOrders());
          if (user.role === "admin") {
            setUsers(await storeApi.getUsers());
          }
          notify(`Signed in as @${user.username}`, "success");
        }}
      />

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

      <BasketDrawer
        isOpen={isBasketOpen}
        items={basketItems}
        onClose={() => setIsBasketOpen(false)}
        onUpdateQuantity={handleUpdateBasketQty}
        onRemoveItem={handleRemoveBasketItem}
        onProceedToCheckout={() => navigate("/checkout")}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) =>
          setToasts((prev) => prev.filter((item) => item.id !== id))
        }
      />
    </div>
  );
}

export default App;
