"use client";

import dynamic from "next/dynamic";

export const LandingSurface3D = dynamic(
  () =>
    import("@/components/landing/LandingSurface3D").then((mod) => ({
      default: mod.LandingSurface3D,
    })),
  { ssr: false },
);

export const LandingCylindrical3D = dynamic(
  () =>
    import("@/components/landing/LandingCylindrical3D").then((mod) => ({
      default: mod.LandingCylindrical3D,
    })),
  { ssr: false },
);
