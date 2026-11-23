import { useEffect, useRef } from "react";
import type { DependencyList, RefObject } from "react";
import { createScope } from "animejs";
import type { Scope } from "animejs";

/**
 * React 19 StrictMode-safe hook wrapping Anime.js v4 `createScope`.
 * Automatically reverts all timelines/animations on unmount and respects
 * the user's `prefers-reduced-motion: reduce` setting.
 */
export function useAnimeScope<T extends HTMLElement = HTMLDivElement>(
  setup: (scope: Scope, root: T) => void,
  deps: DependencyList = []
): RefObject<T | null> {
  const rootRef = useRef<T | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const scope = createScope({ root }).add((self) => {
      if (self) {
        setup(self, root);
      }
    });

    return () => {
      scope.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return rootRef;
}
