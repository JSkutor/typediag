import { KEYBOARD_META } from "@/lib/skdm/keyboardMeta";
import type { Finger, Hand } from "@/lib/skdm/keyboardMeta";
import type { KeystrokeDiagnostics } from "@/utils/cylindricalStats";

const FINGER_ORDER: Finger[] = ["pinky", "ring", "middle", "index"];

const FINGER_COLORS: Record<Finger, string> = {
  pinky: "#a855f7",
  ring: "#3b82f6",
  middle: "#10b981",
  index: "#ec4899",
};

const FINGER_HEIGHTS: Record<Finger, number> = {
  pinky: 34,
  ring: 40,
  middle: 46,
  index: 42,
};

const MAX_FINGER_H = Math.max(...Object.values(FINGER_HEIGHTS));

const LAYOUT = {
  viewW: 300,
  viewH: 94,
  centerW: 44,
  handBlockW: 128,
  graphicW: 112,
  baseY: 66,
  tipR: 5,
  fingerGap: 2.5,
  palmH: 5,
  labelY: 86,
} as const;

function formatPct(value: number) {
  return `${value.toFixed(0)}%`;
}

function handFingerOrder(hand: Hand): Finger[] {
  return hand === "L" ? FINGER_ORDER : [...FINGER_ORDER].reverse();
}

function handGraphicX(hand: Hand) {
  const blockStart = hand === "L" ? 0 : LAYOUT.handBlockW + LAYOUT.centerW;
  return blockStart + (LAYOUT.handBlockW - LAYOUT.graphicW) / 2;
}

function fingerWidth() {
  return (LAYOUT.graphicW - LAYOUT.fingerGap * 3) / 4;
}

interface FingerSlot {
  finger: Finger;
  x: number;
  w: number;
  height: number;
}

function fingerSlots(hand: Hand): FingerSlot[] {
  const x0 = handGraphicX(hand);
  const fw = fingerWidth();
  const step = fw + LAYOUT.fingerGap;
  return handFingerOrder(hand).map((finger, i) => ({
    finger,
    x: x0 + i * step,
    w: fw,
    height: FINGER_HEIGHTS[finger],
  }));
}

/** 개별 손가락 — 둥근 사각형 실루엣 */
function buildFingerPath(x: number, baseY: number, w: number, height: number) {
  const r = Math.min(LAYOUT.tipR, w / 2 - 0.5);
  const top = baseY - height;
  return [
    `M ${x} ${baseY}`,
    `L ${x} ${top + r}`,
    `Q ${x} ${top} ${x + r} ${top}`,
    `L ${x + w - r} ${top}`,
    `Q ${x + w} ${top} ${x + w} ${top + r}`,
    `L ${x + w} ${baseY}`,
    "Z",
  ].join(" ");
}

function buildPalmBase(x0: number, baseY: number, totalW: number) {
  const r = 3;
  const y0 = baseY;
  const y1 = baseY + LAYOUT.palmH;
  return [
    `M ${x0 + r} ${y0}`,
    `L ${x0 + totalW - r} ${y0}`,
    `Q ${x0 + totalW} ${y0} ${x0 + totalW} ${y0 + r}`,
    `L ${x0 + totalW} ${y1 - r}`,
    `Q ${x0 + totalW} ${y1} ${x0 + totalW - r} ${y1}`,
    `L ${x0 + r} ${y1}`,
    `Q ${x0} ${y1} ${x0} ${y1 - r}`,
    `L ${x0} ${y0 + r}`,
    `Q ${x0} ${y0} ${x0 + r} ${y0}`,
    "Z",
  ].join(" ");
}

interface FocusHandProps {
  hand: Hand;
  focusFinger: Finger | null;
  fingerValues: Partial<Record<Finger, number>>;
}

function FocusHand({ hand, focusFinger, fingerValues }: FocusHandProps) {
  const slots = fingerSlots(hand);
  const x0 = handGraphicX(hand);

  return (
    <g className="cyl-diag__finger-hand cyl-diag__finger-hand--focus">
      <path
        d={buildPalmBase(x0, LAYOUT.baseY, LAYOUT.graphicW)}
        className="cyl-diag__finger-palm"
      />
      {slots.map(({ finger, x, w, height }) => {
        const pct = fingerValues[finger] ?? 0;
        const isTarget = finger === focusFinger;
        const color = FINGER_COLORS[finger];
        const fillOpacity = 0.22 + (Math.min(pct, 100) / 100) * 0.62;

        return (
          <g key={finger}>
            <path
              d={buildFingerPath(x, LAYOUT.baseY, w, height)}
              fill={color}
              fillOpacity={fillOpacity}
              stroke={isTarget ? color : "rgba(255,255,255,0.14)"}
              strokeWidth={isTarget ? 2 : 0.85}
            />
            {isTarget && (
              <path
                d={`M ${x + w / 2 - 4} ${LAYOUT.baseY + LAYOUT.palmH + 1.5} L ${x + w / 2} ${LAYOUT.baseY + LAYOUT.palmH + 6} L ${x + w / 2 + 4} ${LAYOUT.baseY + LAYOUT.palmH + 1.5} Z`}
                fill={color}
                opacity={0.9}
              />
            )}
            <text
                x={x + w / 2}
                y={LAYOUT.baseY - height / 2 + 4}
                textAnchor="middle"
                className="cyl-diag__finger-pct"
                fill={fillOpacity > 0.5 ? "#f8fafc" : color}
              >
                {formatPct(pct)}
              </text>
          </g>
        );
      })}
      <text
        x={x0 + LAYOUT.graphicW / 2}
        y={LAYOUT.labelY}
        textAnchor="middle"
        className="cyl-diag__finger-hand-lbl"
      >
        같은 손
      </text>
    </g>
  );
}

function OppositeHand({ hand, pct }: { hand: Hand; pct: number }) {
  const slots = fingerSlots(hand);
  const x0 = handGraphicX(hand);
  const fillOpacity = 0.14 + (Math.min(pct, 100) / 100) * 0.42;
  const midHeight = slots[Math.floor(slots.length / 2)]?.height ?? MAX_FINGER_H;
  const labelY = LAYOUT.baseY - midHeight / 2 + 4;

  return (
    <g className="cyl-diag__finger-hand cyl-diag__finger-hand--opposite">
      <path
        d={buildPalmBase(x0, LAYOUT.baseY, LAYOUT.graphicW)}
        className="cyl-diag__finger-palm cyl-diag__finger-palm--muted"
      />
      {slots.map(({ finger, x, w, height }) => (
        <path
          key={finger}
          d={buildFingerPath(x, LAYOUT.baseY, w, height)}
          className="cyl-diag__finger-opposite-finger"
          fillOpacity={fillOpacity}
        />
      ))}
      <text
        x={x0 + LAYOUT.graphicW / 2}
        y={labelY}
        textAnchor="middle"
        className="cyl-diag__finger-opposite-pct"
      >
        {formatPct(pct)}
      </text>
      <text
        x={x0 + LAYOUT.graphicW / 2}
        y={LAYOUT.labelY}
        textAnchor="middle"
        className="cyl-diag__finger-hand-lbl cyl-diag__finger-hand-lbl--muted"
      >
        반대손
      </text>
    </g>
  );
}

export function FingerTransitionViz({
  focusKey,
  diagnostics,
}: {
  focusKey: string;
  diagnostics: KeystrokeDiagnostics;
}) {
  const meta = KEYBOARD_META[focusKey.toLowerCase()];
  const focusHand: Hand = meta?.hand ?? "L";
  const focusFinger: Finger | null = meta?.finger ?? null;
  const { ratios } = diagnostics.fingerTransitions;

  const sameHandValues: Partial<Record<Finger, number>> = {
    pinky: ratios.sameHandPinky,
    ring: ratios.sameHandRing,
    middle: ratios.sameHandMiddle,
    index: ratios.sameHandIndex,
  };

  const centerX = LAYOUT.handBlockW + LAYOUT.centerW / 2;
  const centerY = LAYOUT.baseY - MAX_FINGER_H / 2 + 2;

  return (
    <div className="cyl-diag__finger-viz">
      <svg
        viewBox={`0 0 ${LAYOUT.viewW} ${LAYOUT.viewH}`}
        className="cyl-diag__finger-svg"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="손가락별 전환 비율"
      >
        {focusHand === "L" ? (
          <FocusHand hand="L" focusFinger={focusFinger} fingerValues={sameHandValues} />
        ) : (
          <OppositeHand hand="L" pct={ratios.oppositeHand} />
        )}

        {focusHand === "R" ? (
          <FocusHand hand="R" focusFinger={focusFinger} fingerValues={sameHandValues} />
        ) : (
          <OppositeHand hand="R" pct={ratios.oppositeHand} />
        )}

        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          className="cyl-diag__finger-other-center"
        >
          기타
          <tspan x={centerX} dy="1.35em" className="cyl-diag__finger-other-val">
            {ratios.other.toFixed(0)}%
          </tspan>
        </text>
      </svg>
    </div>
  );
}
