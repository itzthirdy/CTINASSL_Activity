import { ShoppingBasket, Trash2, X } from "lucide-react";
import { formatPHP } from "../data/shoeCatalog";
import type { FeaturedShoe } from "../data/shoeCatalog";

export interface BasketItem {
  shoe: FeaturedShoe;
  size: string;
  quantity: number;
}

interface BasketDrawerProps {
  isOpen: boolean;
  items: BasketItem[];
  onClose: () => void;
  onRemoveItem: (shoeId: string, size: string) => void;
  onClearBasket: () => void;
}

export function BasketDrawer({
  isOpen,
  items,
  onClose,
  onRemoveItem,
  onClearBasket,
}: BasketDrawerProps) {
  if (!isOpen) return null;

  const subtotal = items.reduce(
    (sum, item) => sum + item.shoe.price * item.quantity,
    0
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col justify-between border-l border-white/15 bg-[#0d0e14] p-6 text-white shadow-2xl"
      >
        <div>
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <ShoppingBasket className="h-5 w-5 text-amber-400" />
              <h3 className="font-sport text-xl tracking-wider uppercase italic">
                YOUR BASKET
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-zinc-300 hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {items.length === 0 ? (
            <div className="mt-16 flex flex-col items-center text-center">
              <ShoppingBasket className="h-12 w-12 text-zinc-600" />
              <p className="mt-4 text-sm font-medium text-zinc-300">
                Your basket is currently empty.
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Hover and click any shoe in our 360° cylinder or Featured Court Releases to add a pair.
              </p>
            </div>
          ) : (
            <div className="mt-5 max-h-[62vh] space-y-3 overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={`${item.shoe.id}-${item.size}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                >
                  <img
                    src={item.shoe.angles.pairAngle}
                    alt={item.shoe.name}
                    className="h-16 w-16 rounded-xl bg-[#F5F5F5] object-contain p-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {item.shoe.name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      Size: {item.size} · Qty: {item.quantity}
                    </p>
                    <p className="font-mono-tabular mt-1 text-xs font-bold text-amber-300">
                      {formatPHP(item.shoe.price * item.quantity)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.shoe.id, item.size)}
                    className="cursor-pointer rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-red-400"
                    title="Remove pair"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Subtotal</span>
              <span className="font-mono-tabular text-lg font-bold text-white">
                {formatPHP(subtotal)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClearBasket();
                onClose();
              }}
              className="mt-4 w-full cursor-pointer rounded-full bg-white py-3.5 text-xs font-bold tracking-[0.18em] text-black uppercase transition hover:bg-amber-300"
            >
              Checkout Now
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
