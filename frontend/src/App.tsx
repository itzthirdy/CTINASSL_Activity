import { animate } from "animejs";
import { useAnimeScope } from "./animations/useAnimeScope";

export function App() {
  const heroRef = useAnimeScope<HTMLDivElement>((_scope, root) => {
    const title = root.querySelector(".sp-title");
    if (title) {
      animate(title, {
        translateY: [16, 0],
        opacity: [0, 1],
        duration: 650,
        ease: "outExpo",
      });
    }
  }, []);

  return (
    <div
      ref={heroRef}
      className="flex min-h-screen flex-col items-center justify-center bg-[#FAF9F7] px-6 text-center text-[#181715]"
    >
      <div className="sp-title max-w-xl rounded-2xl border border-[#E6E3DD] bg-white p-10 shadow-sm">
        <p className="font-mono-tabular text-xs font-semibold tracking-[0.2em] text-[#6F5D4E] uppercase">
          MERN + TypeScript + Tailwind v4 + Anime.js v4
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#181715]">
          SOLE PURPOSE
        </h1>
        <p className="mt-3 text-sm text-[#6B6863]">
          Scaffold ready. Supply your shoe models and animation cues to begin
          building the storefront and Anime.js choreography.
        </p>
      </div>
    </div>
  );
}

export default App;
