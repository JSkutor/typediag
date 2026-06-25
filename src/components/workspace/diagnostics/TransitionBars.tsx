import { KEYBOARD_META } from "@/lib/skdm/keyboardMeta";
import type { KeystrokeDiagnostics } from "@/utils/cylindricalStats";

export function buildFingerTransitionItems(focusKey: string, diagnostics: KeystrokeDiagnostics) {
  const targetMeta = KEYBOARD_META[focusKey.toLowerCase()];
  const isLeft = targetMeta ? targetMeta.hand === "L" : true;
  const { ratios } = diagnostics.fingerTransitions;

  return [
    { label: isLeft ? "오른손 전체" : "왼손 전체", value: ratios.oppositeHand, color: "var(--accent)" },
    { label: isLeft ? "왼 소지" : "오른 소지", value: ratios.sameHandPinky, color: "#a855f7" },
    { label: isLeft ? "왼 약지" : "오른 약지", value: ratios.sameHandRing, color: "#3b82f6" },
    { label: isLeft ? "왼 중지" : "오른 중지", value: ratios.sameHandMiddle, color: "#10b981" },
    { label: isLeft ? "왼 검지" : "오른 검지", value: ratios.sameHandIndex, color: "#ec4899" },
    { label: "기타 (스페이스 등)", value: ratios.other, color: "var(--text-muted)" },
  ];
}

export function TransitionBars({
  items,
}: {
  items: ReadonlyArray<{ label: string; value: number; color: string }>;
}) {
  return (
    <div className="cyl-diag__transition-list">
      {items.map((item) => (
        <div key={item.label} className="cyl-diag__transition-item">
          <div className="cyl-diag__transition-meta">
            <span className="cyl-diag__transition-lbl">{item.label}</span>
            <span className="cyl-diag__transition-val">{item.value.toFixed(1)}%</span>
          </div>
          <div className="cyl-diag__transition-bar-bg">
            <div
              className="cyl-diag__transition-bar-fill"
              style={{ width: `${item.value}%`, backgroundColor: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
