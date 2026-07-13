import React, { Suspense } from "react";
import ShareViewer from "./ShareViewer";

export const metadata = {
  title: "TypeDiag | Shared Latency Surface",
  description: "Interactive 3D view of a shared typing latency surface.",
};

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 20, color: "var(--text-muted)" }}>Loading 3D Surface...</div>
      }
    >
      <ShareViewer />
    </Suspense>
  );
}
