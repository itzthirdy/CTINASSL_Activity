import { Heart, ShoppingBag, Trash2, X } from "lucide-react";
import { formatPHP } from "../data/shoeCatalog";
import type { FeaturedShoe } from "../data/shoeCatalog";
import { resolveAssetUrl } from "../utils/useTransparentCutout";

interface LikedShoesDrawerProps {
  isOpen: boolean;
  likedShoes: FeaturedShoe[];
  onClose: () => void;
  onSelectShoe: (shoe: FeaturedShoe) => void;
  onMoveToBasket: (shoe: FeaturedShoe) => void;
  onRemoveLiked: (shoeId: string) => void;
}

export function LikedShoesDrawer({
  isOpen,
  likedShoes,
  onClose,
  onSelectShoe,
  onMoveToBasket,
  onRemoveLiked,
}: LikedShoesDrawerProps) {
  if (!isOpen) return null;

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
              <Heart className="h-5 w-5 fill-rose-400 text-rose-400" />
              <h3 className="font-sport text-xl tracking-wider uppercase italic">
                LIKED SHOES
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

          {likedShoes.length === 0 ? (
            <div className="mt-16 flex flex-col items-center text-center">
              <Heart className="h-12 w-12 text-zinc-600" />
              <p className="mt-4 text-sm font-medium text-zinc-300">
                No liked shoes saved yet.
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Tap the heart icon on any shoe while signed in to save it to
                your personal collection.
              </p>
            </div>
          ) : (
            <div className="mt-5 max-h-[75vh] space-y-3 overflow-y-auto pr-1">
              {likedShoes.map((shoe) => (
                <div
                  key={shoe.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectShoe(shoe);
                      onClose();
                    }}
                    className="h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-[#F5F5F5] p-1"
                  >
                    <img
                      src={resolveAssetUrl(shoe.angles.lateral)}
                      alt={shoe.name}
                      className="h-full w-full object-contain"
                    />
                  </button>

                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectShoe(shoe);
                        onClose();
                      }}
                      className="cursor-pointer truncate text-left text-sm font-semibold text-white hover:underline"
                    >
                      {shoe.name}
                    </button>
                    <p className="text-xs text-zinc-400">
                      {shoe.category} · {shoe.stock} in stock
                    </p>
                    <p className="font-mono-tabular mt-1 text-xs font-bold text-amber-300">
                      {formatPHP(shoe.price)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={shoe.stock <= 0}
                      onClick={() => onMoveToBasket(shoe)}
                      className="flex cursor-pointer items-center gap-1 rounded-lg bg-white px-2.5 py-2 text-xs font-bold text-black transition hover:bg-amber-300 disabled:opacity-40"
                      title="Add to Basket"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>+</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveLiked(shoe.id)}
                      className="cursor-pointer rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-red-400"
                      title="Remove from Liked"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
