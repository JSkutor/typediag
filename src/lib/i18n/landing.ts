import type { LandingLang } from "./lang";

export type { LandingLang };

export interface LandingCopy {
  meta: { title: string; description: string };
  nav: { practice: string; dashboard: string; getStarted: string };
  hero: {
    eyebrow: string;
    headlinePrimary: string;
    headlineAccent: string;
    subtitle: string;
    cta: string;
    secondaryLink: string;
    scroll: string;
  };
  problem: {
    eyebrow: string;
    title: string;
    subtitle: string;
    pains: Array<{ quote: string; detail: string }>;
  };
  howItWorks: {
    eyebrow: string;
    title: string;
    subtitle: string;
    steps: Array<{ num: string; title: string; desc: string }>;
  };
  diagnosis: {
    eyebrow: string;
    title: string;
    subtitle: string;
    dimensionsLabel: string;
    dimensions: string[];
    beforeLabel: string;
    afterLabel: string;
    beforeNote: string;
    bottleneck: string;
    insight: string;
    barsTitle: string;
    slowTransitions: Array<{ pair: string; ms: number; bar: number }>;
  };
  weaknessMap: {
    eyebrow: string;
    title: string;
    subtitle: string;
    pills: string[];
  };
  features: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: Array<{ title: string; desc: string }>;
  };
  cta: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    subtitle: string;
    button: string;
    note: string;
  };
  footer: {
    practice: string;
    copyright: string;
  };
}

const COPY: Record<LandingLang, LandingCopy> = {
  ko: {
    meta: {
      title: "TypeDiag — 공간 타건 동역학 타자연습",
      description:
        "물리적 키 입력을 직접 캡처해 공간 타건 동역학(SKDM)으로 분석하는 차세대 타자연습 플랫폼.",
    },
    nav: { practice: "연습", dashboard: "대시보드", getStarted: "시작하기" },
    hero: {
      eyebrow: "타자 속도가 아니라, 타자 습관",
      headlinePrimary: "더 똑똑하게 타이핑하고,",
      headlineAccent: "더 깊이 진단하세요.",
      subtitle:
        "TypeDiag는 얼마나 빠른지가 아니라, 어디서 막히는지 알려줍니다. 키보드 위 약점 지도로 병목을 한눈에 확인하세요.",
      cta: "무료 진단 시작하기",
      secondaryLink: "작동 원리 보기",
      scroll: "스크롤",
    },
    problem: {
      eyebrow: "이런 경험, 있으시죠",
      title: "속도는 괜찮은데, 왜 여기서만 막히지?",
      subtitle:
        "대부분의 타자 테스트는 '얼마나 빠른지'만 알려줍니다. '어디서 막히는지'는 알려주지 않죠.",
      pains: [
        {
          quote: "WPM은 오르는데, 체감 속도는 그대로예요.",
          detail: "평균 속도만 보면 놓치는 구간별 병목이 있습니다.",
        },
        {
          quote: "특정 키 조합에서만 자꾸 멈춰요.",
          detail: "R→T, ㅅ→ㅎ, Shift 조합… 반복되는 약점이 있습니다.",
        },
        {
          quote: "오타 원인을 모르니 같은 실수를 반복해요.",
          detail: "어디서 망설이는지 모르면 연습은 추측에 그칩니다.",
        },
      ],
    },
    howItWorks: {
      eyebrow: "작동 방식",
      title: "타이핑 습관을 아는 세 단계",
      subtitle: "설정도, 전문 용어도 필요 없습니다. 타이핑하고 어디가 막히는지 확인하세요.",
      steps: [
        {
          num: "01",
          title: "평소처럼 타이핑",
          desc: "평소처럼 타이핑하세요. 어떤 키를 눌렀는지, 얼마나 누르고 있었는지, 다음 키까지 얼마나 걸렸는지 모두 기록됩니다.",
        },
        {
          num: "02",
          title: "약점 패턴 분석",
          desc: "평균 속도가 아니라, 손가락이 막히는 지점을 분석합니다. 어떤 키 조합에서 멈추는지 패턴으로 찾아냅니다.",
        },
        {
          num: "03",
          title: "약점 지도로 시각화",
          desc: "병목 구간이 키보드 위 3D 지형의 봉우리로 나타납니다. 높을수록 느린 구간 — 수식 없이 한눈에 파악할 수 있습니다.",
        },
      ],
    },
    diagnosis: {
      eyebrow: "진단 리포트",
      title: "연습 한 번이면, 이런 리포트가 나옵니다",
      subtitle: "점수만이 아닙니다. 어떤 키 전환이 당신을 막고 있는지 정확히 보여줍니다.",
      dimensionsLabel: "6가지 진단 관점",
      dimensions: ["누름", "이동", "Shift", "머뭇거림", "오타", "손가락 부하"],
      beforeLabel: "일반 타자 테스트",
      afterLabel: "TypeDiag",
      beforeNote: "전체적으로 빠르다고요? 그럼 어디가 느린 건가요?",
      bottleneck: "병목",
      insight: "왼손 새끼손가락 구간에서 지연이 집중됩니다. 집중 연습을 권장합니다.",
      barsTitle: "가장 느린 키 전환",
      slowTransitions: [
        { pair: "R → T", ms: 340, bar: 92 },
        { pair: "ㅅ → ㅎ", ms: 285, bar: 78 },
        { pair: "Shift → P", ms: 241, bar: 66 },
        { pair: "L → ;", ms: 198, bar: 54 },
        { pair: "Space → A", ms: 176, bar: 48 },
      ],
    },
    weaknessMap: {
      eyebrow: "약점 지도",
      title: "손가락이 막히는 곳이 보입니다",
      subtitle:
        "3D 지형에서 봉우리가 높을수록 느린 구간입니다. 어떤 키 전환이 흐름을 막는지 직관적으로 파악하세요.",
      pills: ["느린 키 전환 하이라이트", "손가락별 부하 보기", "타이핑 중 실시간 업데이트"],
    },
    features: {
      eyebrow: "연습 모드",
      title: "원하는 방식으로 연습하세요",
      subtitle: "당신만의 타건 병목을 드러내고 개선하도록 설계된 연습 모드입니다.",
      items: [
        {
          title: "토픽 모드",
          desc: "React, 경제학, K-pop… 관심 있는 주제를 입력하면 AI가 맞춤 문장을 실시간 생성합니다. 같은 문장 반복 없음.",
        },
        {
          title: "하드코어 모드",
          desc: "평소 피하는 조합만 골라 연습합니다. 손에 익지 않은 희귀한 자모 결합을 생성해 약점을 집중 단련합니다.",
        },
        {
          title: "가입 없이 시작",
          desc: "페이지를 열고 바로 타이핑하세요. 세션은 자동 저장되며, 원할 때 나중에 로그인해도 됩니다.",
        },
        {
          title: "실시간 진단",
          desc: "연습 중에도 진단 화면으로 전환할 수 있습니다. 키 전환마다 밀리초 단위로 측정되며, 약점 지도가 실시간으로 업데이트됩니다.",
        },
      ],
    },
    cta: {
      eyebrow: "시작할 준비가 됐나요?",
      titleLine1: "병목을 찾아내세요.",
      titleLine2: "한계를 돌파하세요.",
      subtitle: "타이핑을 시작하세요. TypeDiag가 어디를 고쳐야 할지 정확히 알려드립니다.",
      button: "무료 진단 시작하기",
      note: "회원가입 불필요 · 브라우저에서 바로 실행 · 영원히 무료",
    },
    footer: {
      practice: "연습하기",
      copyright: "TypeDiag. All rights reserved.",
    },
  },
  en: {
    meta: {
      title: "TypeDiag — Spatial Keystroke Dynamics Typing Practice",
      description:
        "A next-generation typing platform that captures physical key input and analyzes it with Spatial Keystroke Dynamics (SKDM).",
    },
    nav: { practice: "Practice", dashboard: "Dashboard", getStarted: "Get Started" },
    hero: {
      eyebrow: "Not WPM — typing habits",
      headlinePrimary: "Type Smarter.",
      headlineAccent: "Diagnose Deeper.",
      subtitle:
        "TypeDiag shows you where your fingers get stuck — not just how fast you type. See your weak spots on a 3D keyboard map.",
      cta: "Start Free Diagnostics",
      secondaryLink: "See how it works",
      scroll: "scroll",
    },
    problem: {
      eyebrow: "Sound Familiar?",
      title: "Speed isn't the whole story.",
      subtitle:
        "Most typing tests tell you how fast you are. They don't tell you where you're stuck.",
      pains: [
        {
          quote: "My WPM goes up, but it doesn't feel any faster.",
          detail: "Averages hide the specific transitions slowing you down.",
        },
        {
          quote: "I keep stalling on the same key pairs.",
          detail: "R→T, awkward jamo pairs, Shift combos — the same weak spots.",
        },
        {
          quote: "I repeat the same mistakes without knowing why.",
          detail: "Without knowing where you hesitate, practice stays guesswork.",
        },
      ],
    },
    howItWorks: {
      eyebrow: "How It Works",
      title: "Three steps to know your habits",
      subtitle: "No setup, no jargon. Just type and see where you're stuck.",
      steps: [
        {
          num: "01",
          title: "Type as usual",
          desc: "Every keystroke is captured — which keys you press, how long you hold them, and how long it takes to reach the next key.",
        },
        {
          num: "02",
          title: "Find your weak spots",
          desc: "We analyze where your fingers hesitate — not your average speed, but the specific key pairs that slow you down.",
        },
        {
          num: "03",
          title: "See it on a weakness map",
          desc: "Your bottlenecks appear as peaks on a 3D keyboard landscape. High spots mean slow transitions — instantly obvious, no math required.",
        },
      ],
    },
    diagnosis: {
      eyebrow: "Your Report",
      title: "One session. Actionable insight.",
      subtitle: "Not just a score — see exactly which key transitions are holding you back.",
      dimensionsLabel: "6 diagnostic views",
      dimensions: ["Hold", "Flight", "Shift", "Hesitation", "Errors", "Finger load"],
      beforeLabel: "Typical typing test",
      afterLabel: "TypeDiag",
      beforeNote: "Fast overall — but where are you actually slow?",
      bottleneck: "Bottleneck",
      insight: "Left pinky zone shows elevated latency. Focus practice recommended.",
      barsTitle: "Slowest transitions",
      slowTransitions: [
        { pair: "R → T", ms: 340, bar: 92 },
        { pair: "ㅅ → ㅎ", ms: 285, bar: 78 },
        { pair: "Shift → P", ms: 241, bar: 66 },
        { pair: "L → ;", ms: 198, bar: 54 },
        { pair: "Space → A", ms: 176, bar: 48 },
      ],
    },
    weaknessMap: {
      eyebrow: "Weakness Map",
      title: "See where your fingers stall",
      subtitle:
        "Peaks on the 3D landscape mean slow transitions. The higher the peak, the more that key pair is holding you back — no formulas needed.",
      pills: ["Slow transition highlight", "Per-finger load view", "Live updates as you type"],
    },
    features: {
      eyebrow: "Practice Modes",
      title: "Practice the way you want",
      subtitle: "Modes built to surface — and fix — your specific typing bottlenecks.",
      items: [
        {
          title: "Topic Mode",
          desc: "Type about anything — React, economics, K-pop. AI generates fresh sentences matched to your interests. No repeats.",
        },
        {
          title: "Hardcore Mode",
          desc: "Drill the transitions you avoid. Rare and awkward jamo pairs are generated to push your weak spots.",
        },
        {
          title: "No Sign-up",
          desc: "Open the page and start typing. Your sessions are saved automatically — log in later if you want.",
        },
        {
          title: "Live Diagnostics",
          desc: "Switch to diagnostic view mid-session. Every key transition is measured in milliseconds, and your weakness map updates as you type.",
        },
      ],
    },
    cta: {
      eyebrow: "Ready?",
      titleLine1: "Find Your Bottleneck.",
      titleLine2: "Break Your Ceiling.",
      subtitle: "Start typing. TypeDiag will show you exactly where to improve.",
      button: "Start Free Diagnostics",
      note: "No account required · Works in your browser · Free forever",
    },
    footer: {
      practice: "Practice",
      copyright: "TypeDiag. All rights reserved.",
    },
  },
};

export function getLandingCopy(lang: LandingLang): LandingCopy {
  return COPY[lang];
}
