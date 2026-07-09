import { ImageResponse } from "next/og";

export const alt = "TypeDiag — 공간 타건 동역학 타자연습";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = {
  bg: "#1e2024",
  raised: "#262930",
  keycapTop: "#383c47",
  keycapFace: "#323640",
  accent: "#4dc6e8",
  text: "#d0deeb",
  muted: "#8ca6b5",
} as const;

async function loadFont(url: string, name: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load ${name} font (${res.status})`);
  }
  return res.arrayBuffer();
}

export default async function OpenGraphImage() {
  const [outfitBold, firaCodeBold, notoSansKrBold] = await Promise.all([
    loadFont(
      "https://fonts.gstatic.com/s/outfit/v15/QGYyz_MVcBeNP4NjuGObqx1XmO1I4deyC4E.ttf",
      "Outfit",
    ),
    loadFont(
      "https://fonts.gstatic.com/s/firacode/v27/uU9eCBsR6Z2vfE9aq3bL0fxyUs4tcw4W_NprFVc.ttf",
      "Fira Code",
    ),
    loadFont(
      "https://fonts.gstatic.com/s/notosanskr/v39/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzg01eLQ.ttf",
      "Noto Sans KR",
    ),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "72px 88px",
        background: `linear-gradient(135deg, ${COLORS.bg} 0%, #151619 55%, ${COLORS.raised} 100%)`,
        fontFamily: "Outfit",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: "rgba(77, 198, 232, 0.08)",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 148,
            height: 148,
            borderRadius: 28,
            background: `linear-gradient(180deg, ${COLORS.keycapTop} 0%, ${COLORS.keycapFace} 100%)`,
            border: "2px solid rgba(140, 166, 181, 0.2)",
            boxShadow: "0 18px 40px rgba(12, 14, 16, 0.45)",
            fontFamily: "Fira Code",
            fontSize: 88,
            fontWeight: 700,
            color: COLORS.accent,
          }}
        >
          T
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 760 }}>
          <div
            style={{
              display: "flex",
              fontSize: 88,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: COLORS.text,
              lineHeight: 1,
            }}
          >
            Type
            <span style={{ color: COLORS.accent }}>Diag</span>
          </div>
          <div
            style={{
              fontFamily: "Noto Sans KR",
              fontSize: 40,
              fontWeight: 700,
              color: COLORS.text,
              lineHeight: 1.25,
            }}
          >
            공간 타건 동역학 타자연습
          </div>
          <div
            style={{
              fontFamily: "Noto Sans KR",
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.muted,
              lineHeight: 1.4,
            }}
          >
            SKDM으로 오타·지연 병목 구간을 진단합니다
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 40,
          right: 56,
          fontFamily: "Fira Code",
          fontSize: 22,
          color: "rgba(140, 166, 181, 0.45)",
          letterSpacing: "0.08em",
        }}
      >
        typediag
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Outfit", data: outfitBold, style: "normal", weight: 700 },
        { name: "Fira Code", data: firaCodeBold, style: "normal", weight: 700 },
        { name: "Noto Sans KR", data: notoSansKrBold, style: "normal", weight: 700 },
      ],
    },
  );
}
