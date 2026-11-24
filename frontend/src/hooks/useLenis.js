import { useEffect } from "react";
import Lenis from "lenis";
export function useLenis() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true, wheelMultiplier: 0.9 });
    let frameId;
    const animate = (time) => { lenis.raf(time); frameId = window.requestAnimationFrame(animate); };
    frameId = window.requestAnimationFrame(animate);
    return () => { window.cancelAnimationFrame(frameId); lenis.destroy(); };
  }, []);
}