import { notFound } from "next/navigation";
import FixedTargetsWorkspace from "./FixedTargetsWorkspace";
import type { TargetText } from "@/db/schema";

const FIXED_TARGETS = [
  {
    id: "target_001",
    content: "매일 마주하는 평범한 일상이 때로는 지루하게 느껴질 수 있지만, 우리가 흘리는 땀방울이 모여 결국 찬란한 미래를 완성하는 소중한 밑거름이 된다는 사실을 잊지 말고 오늘 하루도 묵묵히 최선을 다해 나아간다면 분명히 값진 성취를 맛보는 기쁨을 누리게 될 것입니다.",
    language: "ko",
    createdAt: new Date("2026-07-01T21:04:29.000Z"),
    embedding: null
  },
  {
    id: "target_002",
    content: "보이지 않는 선율은 공기 중으로 흩어지는 찰나의 은하수가 되어 적막한 심연을 유영하고, 수천 개의 감정이 얽히고설킨 음표들은 메마른 영혼의 갈라진 틈을 부드럽게 채우며 아득한 저편의 기억을 깨우는 고요한 파동으로 번져 나간다.",
    language: "ko",
    createdAt: new Date("2026-07-01T21:04:29.000Z"),
    embedding: null
  },
  {
    id: "target_003",
    content: "단순한 시각적 아름다움을 넘어 사용자의 경험과 본질적인 가치를 깊이 있게 탐구하는 디자인은 비로소 공간과 사물에 생명력을 불어넣으며, 우리 일상의 무미건조한 틈새를 채우는 동시에 감각적인 울림을 선사하는 예술적 언어로 거듭나기에 그 의미가 매우 깊다고 할 수 있습니다.",
    language: "ko",
    createdAt: new Date("2026-07-01T21:04:29.000Z"),
    embedding: null
  },
  {
    id: "target_004",
    content: "가장 여리고 부드러운 잎사귀 하나가 차가운 바위를 뚫고 솟아오르는 순간은 생명의 연약함을 증명하는 듯 보이지만 사실은 그 어떤 단단한 철보다도 강인한 의지로 대지의 침묵을 깨뜨리며 영원한 순환의 법칙을 완성하는 장엄한 투쟁의 서사이다.",
    language: "ko",
    createdAt: new Date("2026-07-01T21:04:29.000Z"),
    embedding: null
  },
  {
    id: "target_005",
    content: "어젯밤 나는 로또 당첨의 부푼 꿈을 꾸며 화려한 저택에서 샴페인을 마시는 상상을 즐겼지만, 눈을 떠보니 차가운 이불 속에서 출근 준비를 걱정하고 있는 나 자신을 발견하게 되어 정말 허탈한 웃음만이 터져 나왔습니다.",
    language: "ko",
    createdAt: new Date("2026-07-01T21:04:29.000Z"),
    embedding: null
  },
  {
    id: "target_006",
    content: "우리는 저마다의 깊은 내면을 들여다보며 삶의 본질적인 물음을 끊임없이 던지지만, 정답 없는 길을 홀로 걷는 고독 속에서 비로소 영혼의 진정한 자유를 마주하게 된다.",
    language: "ko",
    createdAt: new Date("2026-07-01T21:04:29.000Z"),
    embedding: null
  },
  {
    id: "target_007",
    content: "우리는 잠에서 깨어나기 위해 끊임없이 꿈을 꾸며 현실을 부정하지만, 사실 그토록 갈망하던 찬란한 내일의 이상향은 우리가 눈을 감고 마주했던 찰나의 환상 속에 이미 온전히 머물러 있었기에, 결국 꿈은 현실의 도피처가 아니라 우리가 도달해야 할 가장 진실한 목적지라는 역설을 마주하게 된다.",
    language: "ko",
    createdAt: new Date("2026-07-01T21:04:29.000Z"),
    embedding: null
  },
  {
    id: "target_008",
    content: "희미한 달빛이 창가에 내려앉아 깊은 밤을 적시는 동안, 잊고 지냈던 그대의 온기가 계절을 건너 기억의 저편에서 아스라이 피어오르며 메마른 가슴 한구석을 다시금 눈물겨운 그리움으로 가득 채우고 있습니다.",
    language: "ko",
    createdAt: new Date("2026-07-01T21:04:29.000Z"),
    embedding: null
  },
  {
    id: "target_009",
    content: "끝없이 펼쳐진 광활한 우주는 우리가 이해할 수 있는 범위를 아득히 넘어서는 신비로운 질서로 가득 차 있으며, 수많은 별이 탄생하고 소멸하는 과정을 묵묵히 지켜보는 동안 인간은 자신의 존재가 얼마나 찰나에 불과한지 깨닫고는 겸허한 마음으로 깊은 사색에 잠기게 된다.",
    language: "ko",
    createdAt: new Date("2026-07-01T21:04:29.000Z"),
    embedding: null
  },
  {
    id: "target_010",
    content: "현대 도시의 복잡한 구조 속에서 우리가 매일 마주하는 건축물들은 단순히 물리적인 공간의 나열을 넘어 인간의 삶과 철학을 어떻게 투영하고 있으며, 그 차가운 콘크리트 벽면 뒤에 숨겨진 예술적 가치는 과연 우리에게 어떤 미래지향적인 메시지를 전달하고자 하는 것일까요?",
    language: "ko",
    createdAt: new Date("2026-07-01T21:04:29.000Z"),
    embedding: null
  }
] as TargetText[];

export default async function DevFixedPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <FixedTargetsWorkspace targets={FIXED_TARGETS} />;
}
