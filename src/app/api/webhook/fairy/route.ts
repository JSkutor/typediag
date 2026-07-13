import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("[TypeDiag] DISCORD_WEBHOOK_URL is not set");
      return NextResponse.json({ error: "DISCORD_WEBHOOK_URL is not set" }, { status: 500 });
    }

    // Fairy에서 온 이벤트인지 대략적으로 확인
    const event = payload.event || "unknown_event";

    // Discord Embed 생성
    const isPayment = event === "payment.completed";
    const data = payload.data || {};

    const fields = isPayment
      ? [
          {
            name: "👤 후원자",
            value: data.fairyName
              ? `${data.fairyName} (${data.fairyEmail || "이메일 없음"})`
              : "익명 요정",
            inline: true,
          },
          {
            name: "💰 금액",
            value: data.amount ? `${data.amount.toLocaleString()} 원` : "비공개",
            inline: true,
          },
          {
            name: "💌 응원 메시지",
            value: data.fairyMessage ? `> ${data.fairyMessage}` : "메시지 없음",
            inline: false,
          },
        ]
      : Object.entries(payload).map(([key, value]) => ({
          name: key,
          value: typeof value === "object" ? JSON.stringify(value) : String(value),
          inline: true,
        }));

    const discordPayload = {
      embeds: [
        {
          title: "🧚‍♀️ TypeDiag에 커피가 도착했습니다!",
          description: isPayment
            ? "따뜻한 후원 덕분에 TypeDiag 서버가 1초 더 살아남았습니다. 🎉"
            : `Fairy 이벤트가 발생했습니다: \`${event}\``,
          color: 0x00d2ff, // TypeDiag Accent Color 느낌
          fields,
          footer: {
            text: "TypeDiag Webhook System",
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Discord로 전송
    const discordRes = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(discordPayload),
    });

    if (!discordRes.ok) {
      const errorText = await discordRes.text();
      console.error("[TypeDiag] Failed to send to Discord:", errorText);
      return NextResponse.json(
        { error: "Failed to send to Discord", details: errorText },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TypeDiag] Fairy webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
