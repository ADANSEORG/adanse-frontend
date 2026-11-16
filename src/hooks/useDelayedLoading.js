import { useEffect, useRef, useState } from "react";

/*
 * Show a skeleton only after `delay` ms of loading, and keep it on screen
 * for at least `minimum` ms once it has appeared, so nothing flashes.
 */
export function useDelayedLoading(
  loading,
  { delay = 200, minimum = 300 } = {}
) {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, delay);

      return () => clearTimeout(timer);
    }

    if (!visible) {
      return undefined;
    }

    const remaining = Math.max(
      0,
      minimum - (Date.now() - shownAt.current)
    );

    const timer = setTimeout(
      () => setVisible(false),
      remaining
    );

    return () => clearTimeout(timer);
  }, [loading, visible, delay, minimum]);

  return visible;
}
