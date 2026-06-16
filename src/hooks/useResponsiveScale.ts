import { useEffect } from "react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function useResponsiveScale() {
  const setDynamicScale = useWorkspaceStore((state) => state.setDynamicScale);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      const baseW = 1060;
      const baseH = 720;
      const scaleX = window.innerWidth / baseW;
      const scaleY = window.innerHeight / baseH;
      // Fit entirely within viewport, cap max at 1.45 for big screens, min at 0.25 for small screens
      const scale = Math.max(0.25, Math.min(scaleX, scaleY, 1.45));
      setDynamicScale(scale);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [setDynamicScale]);
}
