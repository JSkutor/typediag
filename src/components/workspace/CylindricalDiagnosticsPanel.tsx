"use client";

import React, { useState } from "react";

/**
 * Collapsible 2-column diagnostics panel for the Cylindrical Vector view.
 * Layout shell only — data wiring lives in follow-up work.
 */
export const CylindricalDiagnosticsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`cyl-drawer ${isOpen ? "cyl-drawer--open" : ""}`}>
      <button
        type="button"
        className="cyl-drawer__toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="cyl-drawer-panel"
        aria-label={isOpen ? "진단 패널 닫기" : "진단 패널 열기"}
      >
        <span className="cyl-drawer__chevron" aria-hidden="true">
          ›
        </span>
      </button>

      <div id="cyl-drawer-panel" className="cyl-drawer__body" aria-hidden={!isOpen}>
        <div className="cyl-drawer__grid">
          <section className="cyl-drawer__col cyl-drawer__col--controls">
            <header className="cyl-panel__header">
              <span className="cyl-panel__subtitle">Spatial Keystroke Dynamics Model</span>
              <h2 className="cyl-panel__title">Cylindrical Vector Diagnostics</h2>
            </header>

            <div className="cyl-drawer__placeholder">
              <span className="cyl-label-text">Controls</span>
              <p className="cyl-diag__empty">키 선택 · 좌표 · 토글</p>
            </div>
          </section>

          <section className="cyl-drawer__col cyl-drawer__col--diagnostics">
            <header className="cyl-drawer__col-header">
              <span className="cyl-label-text">Diagnostics</span>
            </header>

            <div className="cyl-drawer__placeholder">
              <p className="cyl-diag__empty">Shift · 오타 · 물리 분산 · 느린 전이</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
