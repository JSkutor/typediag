import { useEffect, useRef } from 'react';

export interface ThreeManager {
  resize: (w: number, h: number) => void;
  dispose: () => void;
}

export function useThreeManager<T extends ThreeManager>(
  ManagerClass: new (el: HTMLElement, w: number, h: number) => T,
  mountRef: React.RefObject<HTMLElement | null>,
  isActivated: boolean = true,
  onInit?: (manager: T) => void
) {
  const managerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!mountRef.current || !isActivated) return;

    const el = mountRef.current;
    const w = el.clientWidth || window.innerWidth;
    const h = el.clientHeight || window.innerHeight;

    const mgr = new ManagerClass(el, w, h);
    managerRef.current = mgr;
    
    if (onInit) {
      onInit(mgr);
    }

    const handleResize = () => {
      if (!mountRef.current || !managerRef.current) return;
      const newW = mountRef.current.clientWidth;
      const newH = mountRef.current.clientHeight;
      managerRef.current.resize(newW, newH);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      mgr.dispose();
      managerRef.current = null;
    };
  }, [ManagerClass, mountRef, isActivated, onInit]);

  return managerRef;
}
