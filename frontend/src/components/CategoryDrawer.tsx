import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { ChevronLeft, X } from "lucide-react";
import { SHOE_CATEGORIES } from "../data/shoeCatalog";
import type { ShoeCategory } from "../data/shoeCatalog";

interface CategoryDrawerProps {
  isOpen: boolean;
  activeCategory: ShoeCategory;
  categoryCounts: Record<ShoeCategory, number>;
  onClose: () => void;
  onSelectCategory: (category: ShoeCategory) => void;
}

export function CategoryDrawer({
  isOpen,
  activeCategory,
  categoryCounts,
  onClose,
  onSelectCategory,
}: CategoryDrawerProps) {
  const drawerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen && drawerRef.current) {
      animate(drawerRef.current, {
        translateX: ["100%", "0%"],
        duration: 380,
        ease: "outExpo",
      });
      const items = drawerRef.current.querySelectorAll(".cat-drawer-item");
      animate(items, {
        opacity: [0, 1],
        translateX: [24, 0],
        delay: stagger(55, { start: 90 }),
        duration: 420,
        ease: "outExpo",
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs"
    >
      {/* White Slide-Out Drawer matching Nike Screenshot (media_1795562707089_4c1157d1.jpg) */}
      <aside
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-sm flex-col justify-between bg-white px-8 py-7 text-[#111111] shadow-2xl"
      >
        <div>
          {/* Top Header: < All Categories & X Close */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex cursor-pointer items-center gap-2 text-base font-medium text-[#111111] hover:opacity-75"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Sole Purpose</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close category menu"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[#111111] transition hover:bg-zinc-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Title: Shoes */}
          <h2 className="mt-9 text-2xl font-semibold tracking-tight text-[#111111]">
            Shoes
          </h2>

          {/* Vertical Category List */}
          <ul className="mt-7 space-y-4">
            {SHOE_CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.id;
              return (
                <li key={cat.id} className="cat-drawer-item">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat.id);
                      onClose();
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between py-1 text-left text-base transition ${
                      isSelected
                        ? "font-bold text-[#111111]"
                        : "font-medium text-[#707072] hover:text-[#111111]"
                    }`}
                  >
                    <span>{cat.drawerLabel}</span>
                    <span className="font-mono-tabular rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
                      {categoryCounts[cat.id] ?? 0}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="border-t border-zinc-200 pt-4 text-xs text-[#707072]">
          Select any category to filter the Sole Purpose lineup. Additional Nike
          photo references can be added per category anytime.
        </p>
      </aside>
    </div>
  );
}
