"use client";

import React, { useState, useEffect } from "react";
import styles from "./DevThemesPanel.module.css";

interface ThemeColors {
  bgBase: string;
  bgRaised: string;
  keyAlphaBg: string;
  keyAlphaText: string;
  keyModBg: string;
  keyModText: string;
  borderSubtle: string;
  shadowColor: string;
  accent: string; // Primary Point Color (e.g. Mint, Cyan)
  accentGlow: string; // Translucent variant of Primary Accent
  accentSecond: string; // Secondary Point Color (e.g. Peach, Amber)
}

interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: "muted_navy",
    name: "1. Muted Navy (채도 약화)",
    description:
      "1번 베이스: 푸른빛의 채도를 낮추어 배경을 훨씬 은은하고 튀지 않게 약화한 뮤티드 네이비",
    colors: {
      bgBase: "#1b1d24",
      bgRaised: "#242833",
      keyAlphaBg: "#2f3545",
      keyAlphaText: "#8ca6b5",
      keyModBg: "#1f222b",
      keyModText: "#5e697a",
      borderSubtle: "rgba(140, 166, 181, 0.06)",
      shadowColor: "rgba(8, 9, 12, 0.7)",
      accent: "#4dc6e8", // Oblivion Cyan Blue
      accentGlow: "rgba(77, 198, 232, 0.12)",
      accentSecond: "#a194b8", // Soft Lavender Purple
    },
  },
  {
    id: "soft_slate",
    name: "2. Soft Slate (명도 완화)",
    description:
      "1번 베이스: 어두움의 깊이를 한 톤 올려서 명암 강도를 부드럽게 약화한 소프트 슬레이트",
    colors: {
      bgBase: "#20242f",
      bgRaised: "#292e3c",
      keyAlphaBg: "#353c4e",
      keyAlphaText: "#8ca6b5",
      keyModBg: "#242835",
      keyModText: "#5e697a",
      borderSubtle: "rgba(140, 166, 181, 0.06)",
      shadowColor: "rgba(8, 9, 12, 0.7)",
      accent: "#4dc6e8", // Oblivion Cyan Blue
      accentGlow: "rgba(77, 198, 232, 0.12)",
      accentSecond: "#a194b8", // Soft Lavender Purple
    },
  },
  {
    id: "warm_charcoal",
    name: "3. Warm Charcoal (청색 최소화)",
    description:
      "1번 베이스: 배경의 청색 틴트를 최소한으로 빼고 부드러운 다크 회색 차콜로 억제한 테마",
    colors: {
      bgBase: "#1e2024",
      bgRaised: "#262930",
      keyAlphaBg: "#323640",
      keyAlphaText: "#8ca6b5",
      keyModBg: "#212328",
      keyModText: "#5e697a",
      borderSubtle: "rgba(140, 166, 181, 0.06)",
      shadowColor: "rgba(8, 9, 12, 0.7)",
      accent: "#4dc6e8", // Oblivion Cyan Blue
      accentGlow: "rgba(77, 198, 232, 0.12)",
      accentSecond: "#a194b8", // Soft Lavender Purple
    },
  },
  {
    id: "low_contrast",
    name: "4. Low Contrast (대비 최소화)",
    description:
      "1번 베이스: 배경과 패널 간의 밝기 격차를 최소한으로 좁혀서 시각적 자극을 낮춘 테마",
    colors: {
      bgBase: "#1a1d25",
      bgRaised: "#1f232e",
      keyAlphaBg: "#2b303e",
      keyAlphaText: "#8ca6b5",
      keyModBg: "#1c202a",
      keyModText: "#5e697a",
      borderSubtle: "rgba(140, 166, 181, 0.06)",
      shadowColor: "rgba(8, 9, 12, 0.7)",
      accent: "#4dc6e8", // Oblivion Cyan Blue
      accentGlow: "rgba(77, 198, 232, 0.12)",
      accentSecond: "#a194b8", // Soft Lavender Purple
    },
  },
];

// Re-structured keyboard rows: Alphas are clean, Modifiers have clean look, specific keys have accent settings.
const KEYBOARD_ROWS = [
  [
    { code: "KeyQ", label: "Q", isAccent: false },
    { code: "KeyW", label: "W", isAccent: false },
    { code: "KeyE", label: "E", isAccent: false },
    { code: "KeyR", label: "R", isAccent: false },
    { code: "KeyT", label: "T", isAccent: false },
    { code: "KeyY", label: "Y", isAccent: false },
    { code: "KeyU", label: "U", isAccent: false },
    { code: "KeyI", label: "I", isAccent: false },
    { code: "KeyO", label: "O", isAccent: false },
    { code: "KeyP", label: "P", isAccent: false },
  ],
  [
    { code: "KeyA", label: "A", isAccent: false },
    { code: "KeyS", label: "S", isAccent: false },
    { code: "KeyD", label: "D", isAccent: false },
    { code: "KeyF", label: "F", isAccent: false },
    { code: "KeyG", label: "G", isAccent: false },
    { code: "KeyH", label: "H", isAccent: false },
    { code: "KeyJ", label: "J", isAccent: false },
    { code: "KeyK", label: "K", isAccent: false },
    { code: "KeyL", label: "L", isAccent: false },
  ],
  [
    { code: "KeyZ", label: "Z", isAccent: false },
    { code: "KeyX", label: "X", isAccent: false },
    { code: "KeyC", label: "C", isAccent: false },
    { code: "KeyV", label: "V", isAccent: false },
    { code: "KeyB", label: "B", isAccent: false },
    { code: "KeyN", label: "N", isAccent: false },
    { code: "KeyM", label: "M", isAccent: false },
  ],
];

export function DevThemesPanel() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("muted_navy");
  const [customColors, setCustomColors] = useState<ThemeColors>({
    ...THEME_PRESETS[0].colors,
  });
  const [pressedKeys, setPressedKeys] = useState<Record<string, boolean>>({});
  const [activeKeysCount, setActiveKeysCount] = useState<Record<string, number>>({
    KeyQ: 1,
    KeyW: 0,
    KeyE: 0,
    KeyR: 3,
    KeyT: 1,
    KeyY: 0,
    KeyU: 2,
    KeyI: 7,
    KeyO: 2,
    KeyP: 0,
    KeyA: 4,
    KeyS: 5,
    KeyD: 1,
    KeyF: 0,
    KeyG: 0,
    KeyH: 1,
    KeyJ: 6,
    KeyK: 2,
    KeyL: 3,
    KeyZ: 0,
    KeyX: 0,
    KeyC: 2,
    KeyV: 1,
    KeyB: 0,
    KeyN: 4,
    KeyM: 3,
  }); // Simulated key delay map

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code.startsWith("Key") || e.code === "Space" || e.code === "Backspace") {
        setPressedKeys((prev) => ({ ...prev, [e.code]: true }));
        if (e.code.startsWith("Key")) {
          setActiveKeysCount((prev) => ({
            ...prev,
            [e.code]: Math.min((prev[e.code] || 0) + 1, 10),
          }));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setPressedKeys((prev) => ({ ...prev, [e.code]: false }));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    setCustomColors((prev) => ({ ...prev, [key]: value }));
  };

  const cssVariablesString = `:root {
  --bg-base: ${customColors.bgBase};
  --bg-raised: ${customColors.bgRaised};
  --key-alpha-bg: ${customColors.keyAlphaBg};
  --key-alpha-text: ${customColors.keyAlphaText};
  --key-mod-bg: ${customColors.keyModBg};
  --key-mod-text: ${customColors.keyModText};
  --border-subtle: ${customColors.borderSubtle};
  --shadow-color: ${customColors.shadowColor};
  
  /* Micro-Highlight Accent Colors */
  --accent: ${customColors.accent};
  --accent-glow: ${customColors.accentGlow};
  --accent-second: ${customColors.accentSecond};
}`;

  const currentThemeStyle = {
    "--bg-base": customColors.bgBase,
    "--bg-raised": customColors.bgRaised,
    "--key-alpha-bg": customColors.keyAlphaBg,
    "--key-alpha-text": customColors.keyAlphaText,
    "--key-mod-bg": customColors.keyModBg,
    "--key-mod-text": customColors.keyModText,
    "--border-subtle": customColors.borderSubtle,
    "--shadow-color": customColors.shadowColor,
    "--accent": customColors.accent,
    "--accent-glow": customColors.accentGlow,
    "--accent-second": customColors.accentSecond,
  } as React.CSSProperties;

  const resetHeatmap = () => {
    setActiveKeysCount({
      KeyQ: 0,
      KeyW: 0,
      KeyE: 0,
      KeyR: 0,
      KeyT: 0,
      KeyY: 0,
      KeyU: 0,
      KeyI: 0,
      KeyO: 0,
      KeyP: 0,
      KeyA: 0,
      KeyS: 0,
      KeyD: 0,
      KeyF: 0,
      KeyG: 0,
      KeyH: 0,
      KeyJ: 0,
      KeyK: 0,
      KeyL: 0,
      KeyZ: 0,
      KeyX: 0,
      KeyC: 0,
      KeyV: 0,
      KeyB: 0,
      KeyN: 0,
      KeyM: 0,
    });
  };

  return (
    <div className={styles.playgroundContainer} style={currentThemeStyle}>
      {/* Sidebar: Theme Presets & Customizer */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarSection}>
          <h2 className={styles.sidebarTitle}>1. Theme Presets</h2>
          <p className={styles.sectionDesc}>원하는 베이스 테마를 선택해보세요.</p>
          <div className={styles.presetList}>
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={`${styles.presetCard} ${
                  selectedPresetId === preset.id ? styles.activePreset : ""
                }`}
                onClick={() => {
                  setSelectedPresetId(preset.id);
                  setCustomColors({ ...preset.colors });
                }}
              >
                <div className={styles.presetHeader}>
                  <span className={styles.presetName}>{preset.name}</span>
                  <span
                    className={styles.activeDot}
                    style={{ backgroundColor: preset.colors.accent }}
                  />
                </div>
                <p className={styles.presetDesc}>{preset.description}</p>
                <div className={styles.colorSwatches}>
                  <span style={{ backgroundColor: preset.colors.bgBase }} title="Bg Base" />
                  <span
                    style={{ backgroundColor: preset.colors.keyAlphaBg }}
                    title="Keycap Alpha"
                  />
                  <span style={{ backgroundColor: preset.colors.accent }} title="Primary Accent" />
                  <span
                    style={{ backgroundColor: preset.colors.accentSecond }}
                    title="Secondary Accent"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.sidebarSection}>
          <h2 className={styles.sidebarTitle}>2. Color Customizer</h2>
          <p className={styles.sectionDesc}>각 색상을 세부 조정하여 원하는 톤을 찾으세요.</p>

          <div className={styles.customizerGrid}>
            <div className={styles.customizerGroup}>
              <h3 className={styles.groupTitle}>Backgrounds & Surfaces</h3>
              <div className={styles.colorInputRow}>
                <label>Main Background</label>
                <div className={styles.colorPickerWrapper}>
                  <input
                    type="color"
                    value={customColors.bgBase}
                    onChange={(e) => handleColorChange("bgBase", e.target.value)}
                  />
                  <code>{customColors.bgBase}</code>
                </div>
              </div>
              <div className={styles.colorInputRow}>
                <label>Raised Surface</label>
                <div className={styles.colorPickerWrapper}>
                  <input
                    type="color"
                    value={customColors.bgRaised}
                    onChange={(e) => handleColorChange("bgRaised", e.target.value)}
                  />
                  <code>{customColors.bgRaised}</code>
                </div>
              </div>
            </div>

            <div className={styles.customizerGroup}>
              <h3 className={styles.groupTitle}>Keycaps Base</h3>
              <div className={styles.colorInputRow}>
                <label>Alpha Key Bg</label>
                <div className={styles.colorPickerWrapper}>
                  <input
                    type="color"
                    value={customColors.keyAlphaBg}
                    onChange={(e) => handleColorChange("keyAlphaBg", e.target.value)}
                  />
                  <code>{customColors.keyAlphaBg}</code>
                </div>
              </div>
              <div className={styles.colorInputRow}>
                <label>Alpha Text</label>
                <div className={styles.colorPickerWrapper}>
                  <input
                    type="color"
                    value={customColors.keyAlphaText}
                    onChange={(e) => handleColorChange("keyAlphaText", e.target.value)}
                  />
                  <code>{customColors.keyAlphaText}</code>
                </div>
              </div>
              <div className={styles.colorInputRow}>
                <label>Modifier Key Bg</label>
                <div className={styles.colorPickerWrapper}>
                  <input
                    type="color"
                    value={customColors.keyModBg}
                    onChange={(e) => handleColorChange("keyModBg", e.target.value)}
                  />
                  <code>{customColors.keyModBg}</code>
                </div>
              </div>
            </div>

            <div className={styles.customizerGroup}>
              <h3 className={styles.groupTitle}>Dual Point Colors</h3>
              <div className={styles.colorInputRow}>
                <label>Primary Accent</label>
                <div className={styles.colorPickerWrapper}>
                  <input
                    type="color"
                    value={customColors.accent}
                    onChange={(e) => handleColorChange("accent", e.target.value)}
                  />
                  <code>{customColors.accent}</code>
                </div>
              </div>
              <div className={styles.colorInputRow}>
                <label>Secondary Accent</label>
                <div className={styles.colorPickerWrapper}>
                  <input
                    type="color"
                    value={customColors.accentSecond}
                    onChange={(e) => handleColorChange("accentSecond", e.target.value)}
                  />
                  <code>{customColors.accentSecond}</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Preview Area */}
      <main className={styles.previewArea}>
        {/* Mechanical Keycap Preview */}
        <section className={styles.previewCard}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>Mechanical Keyboard Preview</h3>
              <p className={styles.cardSubtitle}>
                키캡 각인은 깔끔하게 통일하고, Enter/Esc/Space 등 일부 포인트 키캡에만 테마 Accent를
                적용했습니다.
              </p>
            </div>
            <button onClick={resetHeatmap} className={styles.utilityBtn}>
              지연 리셋
            </button>
          </div>

          <div className={styles.keyboardContainer}>
            {KEYBOARD_ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className={styles.keyboardRow}>
                {/* Esc / Caps Locks */}
                {rowIndex === 0 && (
                  <div
                    className={`${styles.keycap} ${styles.modKey} ${styles.escKey}`}
                    style={{ backgroundColor: "var(--accent-second)", color: "var(--bg-base)" }}
                  >
                    <span>Esc</span>
                  </div>
                )}
                {rowIndex === 1 && (
                  <div className={`${styles.keycap} ${styles.modKey} ${styles.capLock}`}>
                    <span>Caps</span>
                  </div>
                )}
                {rowIndex === 2 && (
                  <div className={`${styles.keycap} ${styles.modKey} ${styles.shiftKeyLeft}`}>
                    <span>Shift</span>
                  </div>
                )}

                {row.map((key) => {
                  const isPressed = pressedKeys[key.code];
                  const delayCount = activeKeysCount[key.code] || 0;

                  return (
                    <div
                      key={key.code}
                      className={`${styles.keycap} ${isPressed ? styles.pressed : ""}`}
                      style={{
                        borderColor: delayCount > 0 ? "var(--accent)" : "var(--border-subtle)",
                        boxShadow: isPressed
                          ? "0 1px 1px var(--shadow-color)"
                          : `0 4px 0 var(--shadow-color), inset 0 1px 0 rgba(255,255,255,0.05)`,
                      }}
                    >
                      {/* Latency glow map inside alpha keys */}
                      {delayCount > 0 && (
                        <span
                          className={styles.keyGlow}
                          style={{
                            backgroundColor: "var(--accent)",
                            opacity: Math.min(delayCount * 0.08, 0.3),
                          }}
                        />
                      )}
                      <span className={styles.keyLegend} style={{ color: "var(--key-alpha-text)" }}>
                        {key.label}
                      </span>
                      {delayCount > 0 && (
                        <span className={styles.heatBadge} style={{ color: "var(--accent)" }}>
                          {delayCount}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Right Modifiers: Enter & Shift & Backspace */}
                {rowIndex === 0 && (
                  <div
                    className={`${styles.keycap} ${styles.modKey} ${styles.backspaceKey} ${pressedKeys["Backspace"] ? styles.pressed : ""}`}
                  >
                    <span>Delete</span>
                  </div>
                )}
                {rowIndex === 1 && (
                  <div
                    className={`${styles.keycap} ${styles.modKey} ${styles.enterKey}`}
                    style={{
                      backgroundColor: "var(--accent)",
                      color: "var(--bg-base)",
                      fontWeight: 700,
                    }}
                  >
                    <span>Enter</span>
                  </div>
                )}
                {rowIndex === 2 && (
                  <div className={`${styles.keycap} ${styles.modKey} ${styles.shiftKeyRight}`}>
                    <span>Shift</span>
                  </div>
                )}
              </div>
            ))}
            {/* Spacebar Row */}
            <div className={styles.keyboardRow}>
              <div
                className={`${styles.keycap} ${styles.modKey} ${styles.spaceKey} ${pressedKeys["Space"] ? styles.pressed : ""}`}
                style={{ borderColor: "var(--accent-second)" }}
              >
                <span style={{ color: "var(--accent-second)" }}>Spacebar</span>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.twoColumnGrid}>
          {/* Syntax Highlight Code Editor Preview */}
          <section className={styles.previewCard}>
            <h3 className={styles.cardTitle}>Code Highlight & Typography Preview</h3>
            <p className={styles.cardSubtitle}>
              단일 포인트 컬러스키마를 구문 강조에 적용하여 시인성과 집중도를 대폭 강화했습니다.
            </p>
            <div className={styles.codeContainer}>
              <div className={styles.codeHeader}>
                <span className={styles.dotRed} />
                <span className={styles.dotYellow} />
                <span className={styles.dotGreen} />
                <span className={styles.codeTitle}>model.ts — TypeScript</span>
              </div>
              <pre className={styles.codeContent}>
                <code>
                  <span style={{ color: "var(--key-mod-text)" }}>
                    {"// TypeDiag Spatial Keystroke Dynamics Model (SKDM)"}
                  </span>
                  {"\n"}
                  <span style={{ color: "var(--accent)" }}>import</span>
                  {" { calculateKeyLatency } "}
                  <span style={{ color: "var(--accent)" }}>from</span>{" "}
                  <span style={{ color: "var(--key-alpha-text)" }}>{'"@/lib/skdm/model"'}</span>
                  {";\n\n"}
                  <span style={{ color: "var(--accent)" }}>interface</span>{" "}
                  <span style={{ color: "var(--accent-second)" }}>KeystrokeEvent</span>
                  {" {\n"}
                  {"  key: "}
                  <span style={{ color: "var(--key-alpha-text)" }}>string</span>
                  {";\n"}
                  {"  pressTime: "}
                  <span style={{ color: "var(--key-alpha-text)" }}>number</span>
                  {"; "}
                  <span style={{ color: "var(--key-mod-text)" }}>{"// ms"}</span>
                  {"\n"}
                  {"  releaseTime: "}
                  <span style={{ color: "var(--key-alpha-text)" }}>number</span>
                  {";\n"}
                  {"}\n\n"}
                  <span style={{ color: "var(--accent)" }}>export function</span>{" "}
                  <span style={{ color: "var(--accent-second)" }}>analyzeSession</span>
                  {"(events: KeystrokeEvent[]): DiagnosticResult {\n"}
                  {"  "}
                  <span style={{ color: "var(--accent)" }}>const</span>
                  {" threshold = "}
                  <span style={{ color: "var(--accent-second)" }}>180</span>
                  {"; "}
                  <span style={{ color: "var(--key-mod-text)" }}>{"// hesitation threshold"}</span>
                  {"\n"}
                  {"  "}
                  <span style={{ color: "var(--accent)" }}>let</span>
                  {" latencySum = "}
                  <span style={{ color: "var(--accent-second)" }}>0</span>
                  {";\n\n"}
                  {"  "}
                  <span style={{ color: "var(--accent)" }}>const</span>
                  {" analysis = events.map(("}
                  <span style={{ color: "var(--key-alpha-text)" }}>event</span>
                  {") => {\n"}
                  {"    "}
                  <span style={{ color: "var(--accent)" }}>const</span>
                  {" duration = event.releaseTime - event.pressTime;\n"}
                  {"    "}
                  <span style={{ color: "var(--accent)" }}>const</span>
                  {" isHesitant = duration > threshold;\n"}
                  {"    \n"}
                  {"    "}
                  <span style={{ color: "var(--accent)" }}>return</span>
                  {" {\n"}
                  {"      key: event.key,\n"}
                  {"      latency: duration,\n"}
                  {"      status: isHesitant ? "}
                  <span style={{ color: "var(--accent-second)" }}>{'"hesitant"'}</span>
                  {" : "}
                  <span style={{ color: "var(--key-alpha-text)" }}>{'"stable"'}</span>
                  {"\n"}
                  {"    };\n"}
                  {"  });\n"}
                  {"}"}
                </code>
              </pre>
            </div>
          </section>

          {/* Diagnostics Surface / UI Mockups */}
          <section className={styles.previewCard}>
            <h3 className={styles.cardTitle}>TypeDiag Diagnostics UI Preview</h3>
            <p className={styles.cardSubtitle}>
              지연 지형 진단 점수 및 분석 메트릭 카드가 런타임에 렌더링되는 모습입니다.
            </p>

            <div className={styles.dashboardContainer}>
              {/* Score widget */}
              <div className={styles.scoreCard}>
                <div className={styles.scoreHeader}>
                  <span>Diagnostic Score</span>
                  <span
                    className={styles.scoreBadge}
                    style={{ backgroundColor: "var(--accent-glow)", color: "var(--accent)" }}
                  >
                    Excellent
                  </span>
                </div>
                <div className={styles.scoreNumber} style={{ color: "var(--accent)" }}>
                  95.8<span className={styles.scoreUnit}>/100</span>
                </div>
                <p className={styles.scoreText}>
                  특정 키(I, J) 구간에서 경미한 딜레이 병목이 감지되었으나 전반적으로 고른 타건
                  지형을 유지하고 있습니다.
                </p>
              </div>

              {/* Grid Metric cards */}
              <div className={styles.metricGrid}>
                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>평균 타자속도 (WPM)</span>
                  <span className={styles.metricVal} style={{ color: "var(--accent)" }}>
                    82 WPM
                  </span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>타건 정확도 (ACC)</span>
                  <span className={styles.metricVal} style={{ color: "var(--accent-second)" }}>
                    98.4%
                  </span>
                </div>
              </div>

              {/* Spatial Latency mini map visualization */}
              <div className={styles.miniMap}>
                <div className={styles.miniMapHeader}>
                  <span>Spatial Latency Terrains (SKDM Heatmap)</span>
                  <span style={{ color: "var(--key-mod-text)", fontSize: "11px" }}>
                    2D Delaunay Node Projections
                  </span>
                </div>
                <div className={styles.gridMap}>
                  {Array.from({ length: 15 }).map((_, i) => {
                    const isHot = i === 4 || i === 11 || i === 8;
                    const isWarm = i === 1 || i === 7 || i === 13;
                    let cellColor = "var(--border-subtle)";
                    let opacity = 0.03;
                    let text = "Stable";
                    let textColor = "var(--key-mod-text)";

                    if (isHot) {
                      cellColor = "var(--accent)";
                      opacity = 0.15;
                      text = "Delay";
                      textColor = "var(--accent)";
                    } else if (isWarm) {
                      cellColor = "var(--accent-second)";
                      opacity = 0.1;
                      text = "Warn";
                      textColor = "var(--accent-second)";
                    }

                    return (
                      <div
                        key={i}
                        className={styles.mapCell}
                        style={{
                          backgroundColor: "var(--bg-base)",
                          borderColor: cellColor,
                          borderWidth: isHot || isWarm ? "1.5px" : "1px",
                        }}
                      >
                        <span
                          className={styles.cellFill}
                          style={{
                            backgroundColor: cellColor,
                            opacity: opacity,
                          }}
                        />
                        <span className={styles.cellKey} style={{ color: textColor }}>
                          {text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* CSS Output Export Block */}
        <section className={styles.previewCard}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>3. Export CSS Token Variables</h3>
              <p className={styles.cardSubtitle}>
                결정된 테마의 색상을 복사하여 <code>src/app/styles/tokens.css</code> 파일에 덮어쓸
                수 있습니다.
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(cssVariablesString);
                alert("CSS 변수 토큰이 클립보드에 복사되었습니다!");
              }}
              className={styles.copyBtn}
            >
              클립보드 복사
            </button>
          </div>
          <div className={styles.codeContainer}>
            <pre className={styles.codeContent}>
              <code style={{ color: "var(--key-alpha-text)" }}>{cssVariablesString}</code>
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}
