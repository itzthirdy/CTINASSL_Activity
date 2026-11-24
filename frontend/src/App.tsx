import { useEffect, useState } from "react";
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
import { AuthModal } from "./components/AuthModal";
import { BasketDrawer } from "./components/BasketDrawer";
import type { BasketItem } from "./components/BasketDrawer";
import { FEATURED_SHOES } from "./data/shoeCatalog";
import type { AngleKey, FeaturedShoe } from "./data/shoeCatalog";

function ProductDetailRoute({
  onBackToShop,
  onSelectShoe,
  onAddToBasket,
}: {
  onBackToShop: () => void;
  onSelectShoe: (shoe: FeaturedShoe, angle?: AngleKey) => void;
  onAddToBasket: (shoe: FeaturedShoe, size: string) => void;
}) {
  const { shoeId } = useParams<{ shoeId: string }>();
  const [searchParams] = useSearchParams();

  const shoe =
    FEATURED_SHOES.find((item) => item.id === shoeId) ?? FEATURED_SHOES[0];
  const rawAngle = searchParams.get("angle") as AngleKey | null;
  const validAngle: AngleKey =
    rawAngle && rawAngle in shoe.angles ? rawAngle : "lateral";

  return (
    <ProductDetailPage
      key={shoe.id}
      shoe={shoe}
      initialAngle={validAngle}
      onBackToShop={onBackToShop}
      onSelectShoe={onSelectShoe}
      onAddToBasket={onAddToBasket}
    />
  );
}

export function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [shopTriggerCount, setShopTriggerCount] = useState(0);
  const [pendingSection, setPendingSection] = useState<
    "home" | "shop-now" | "about-us" | null
  >(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [basketItems, setBasketItems] = useState<BasketItem[]>([]);

  // Scroll smoothly to target section when navigating back to "/" from a product page
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

  const handleAddToBasket = (shoe: FeaturedShoe, size = "US 9") => {
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

  const handleRemoveBasketItem = (shoeId: string, size: string) => {
    setBasketItems((prev) =>
      prev.filter((item) => !(item.shoe.id === shoeId && item.size === size))
    );
  };

  const totalBasketCount = basketItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-[#070709] text-white">
      {/* Retained Header: SOLE PURPOSE (Back to Home), Home / About Us / Shop Now, Sign In & Basket */}
      <Navbar
        basketCount={totalBasketCount}
        userName={userName}
        onNavigateHome={handleNavigateHome}
        onNavigateAbout={handleNavigateAbout}
        onNavigateShopNow={handleNavigateShopNow}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenBasket={() => setIsBasketOpen(true)}
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
                  shopTriggerCount={shopTriggerCount}
                  onSelectShoeToBuy={handleOpenShoeDetail}
                  onQuickAddToBasket={(shoe) => handleAddToBasket(shoe, "US 9")}
                />
                <AboutUsSection onExploreShop={handleNavigateShopNow} />
              </>
            }
          />
          <Route
            path="/shoe/:shoeId"
            element={
              <ProductDetailRoute
                onBackToShop={handleNavigateShopNow}
                onSelectShoe={handleOpenShoeDetail}
                onAddToBasket={handleAddToBasket}
              />
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
          <p>
            © 2026 Sole Purpose Philippines. Built with React 19 &amp; Anime.js
            v4.
          </p>
        </div>
      </footer>

      <AuthModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(name) => setUserName(name)}
      />

      <BasketDrawer
        isOpen={isBasketOpen}
        items={basketItems}
        onClose={() => setIsBasketOpen(false)}
        onRemoveItem={handleRemoveBasketItem}
        onClearBasket={() => setBasketItems([])}
      />
    </div>
  );
}

export default App;
