"use client";

import { LazyMotion, MotionConfig, domAnimation } from "framer-motion";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { useCart } from "@/lib/cart-store";
import { useSession } from "@/lib/session-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hydrateCart = useCart((s) => s.hydrate);
  const loadSession = useSession((s) => s.load);

  useEffect(() => {
    void hydrateCart();
    void loadSession();
  }, [hydrateCart, loadSession]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ duration: 1.05, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 260, damping: 30 }}>
        {children}
        <Toaster position="bottom-right" richColors closeButton toastOptions={{ style: { borderRadius: 14, fontFamily: "var(--font-jakarta)" } }} />
      </MotionConfig>
    </LazyMotion>
  );
}
