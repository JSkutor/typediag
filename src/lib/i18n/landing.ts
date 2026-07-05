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
    beforeValue: string;
    beforeUnit: string;
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
    terms: string;
    privacy: string;
    copyright: string;
  };
}

const COPY: Record<LandingLang, LandingCopy> = {
  ko: {
    meta: {
      title: "TypeDiag — 3D 지연 지형 기반 공간 타건 동역학 타자연습",
      description:
        "글자 간 미세한 지연과 키 입력 습관을 3D 지형으로 시각화하여 오타와 타이핑 병목을 진단하는 차세대 타자연습 플랫폼.",
    },
    nav: { practice: "연습", dashboard: "대시보드", getStarted: "시작하기" },
    hero: {
      eyebrow: "단순한 CPM 측정을 넘어선 3D 공간 타건 진단",
      headlinePrimary: "3D 지연 지형으로",
      headlineAccent: "타이핑 병목을 진단하다",
      subtitle:
        "TypeDiag는 단순한 타자 속도 측정을 넘어, 키보드 위에서 손가락이 머뭇거리는 지연 구간을 3D 지형으로 보여줍니다. 나만의 진짜 타이핑 병목을 눈으로 직접 확인하세요.",
      cta: "진단 시작하기",
      secondaryLink: "작동 원리",
      scroll: "스크롤",
    },
    problem: {
      eyebrow: "이런 경험, 있으시죠",
      title: "평균 속도는 괜찮은데, 왜 특정 키에서만 멈출까?",
      subtitle:
        "기존의 단순 타자 연습기는 '얼마나 빠른지'만 알려줍니다. 손가락이 꼬이고 머뭇거리는 '진짜 병목'은 찾아내지 못합니다.",
      pains: [
        {
          quote: "실제 타이핑 속도가 CPM 처럼 오르지 않아요.",
          detail: "전체 평균 뒤에 숨은 특정 입력 흐름 중의 미세한 지연 병목이 원인입니다.",
        },
        {
          quote: "특정 키 조합에서 자꾸 버벅거려요.",
          detail: "물리적 거리와 손가락 움직임에 따른 고유의 취약 전환 구간이 존재하기 때문입니다.",
        },
        {
          quote: "오타를 개선하기 힘들어요.",
          detail:
            "자신의 흔한 오타 패턴이나 키 입력 순서가 뒤바뀌는 부분이 있는 곳을 모르면 교정하기 어렵습니다.",
        },
      ],
    },
    howItWorks: {
      eyebrow: "작동 방식",
      title: "타이핑 습관을 시각화하는 세 단계",
      subtitle: "설정 없이 바로 타이핑을 시작하세요. 정교한 분석 파이프라인이 뒤에서 작동합니다.",
      steps: [
        {
          num: "01",
          title: "실시간 키 이벤트 수집",
          desc: "평소대로 자연스럽게 타이핑하는 동안, 키를 누르고 떼는 타이밍과 각 키 사이의 이동 간격을 밀리초(ms) 단위로 정밀하게 기록합니다.",
        },
        {
          num: "02",
          title: "3D 공간 지연 시각화",
          desc: "지연 데이터를 3D 키보드 지형으로 즉시 변환합니다. 타이핑 중 유독 머뭇거리거나 버벅거리는 위치가 입체적인 높낮이로 화면에 그려집니다.",
        },
        {
          num: "03",
          title: "다양한 타건 통계 진단",
          desc: "키를 완전히 떼기 전에 다음 키를 누르는 물 흐르듯 흘려 누르는 구름타법 실력, 자주 꼬여서 입력되는 입력 쌍, 그리고 연속 글자 오타 패턴을 정밀하게 분석해 냅니다.",
        },
      ],
    },
    diagnosis: {
      eyebrow: "진단 리포트",
      title: "단 한 번의 연습으로 도출되는 정밀 진단",
      subtitle:
        "단순한 점수를 넘어, 당신의 타이핑 흐름을 막아서는 병목 키와 지연 요인을 정확히 짚어냅니다.",
      dimensionsLabel: "6가지 진단 관점",
      dimensions: [
        "키 누름",
        "키 간 이동",
        "시프트 지연",
        "머뭇거림 비율",
        "오타 유발",
        "손가락 부하",
      ],
      beforeLabel: "일반 타자 연습",
      beforeValue: "435",
      beforeUnit: "CPM",
      afterLabel: "TypeDiag 진단",
      beforeNote: "평균 CPM은 빠른데, 특정 자모 전환에서는 병목이 걸리지 않나요?",
      bottleneck: "병목",
      insight:
        "왼손 검지 R→T 구간과 특정 키 전환 시 미세한 지연이 발견되었습니다. 해당 구간의 3D 정밀 진단 분석을 확인하세요.",
      barsTitle: "가장 느린 키 전환",
      slowTransitions: [
        { pair: "R → T", ms: 340, bar: 92 },
        { pair: "O → P", ms: 285, bar: 78 },
        { pair: "Shift → P", ms: 241, bar: 66 },
        { pair: "L → ;", ms: 198, bar: 54 },
        { pair: "Space → A", ms: 176, bar: 48 },
      ],
    },
    weaknessMap: {
      eyebrow: "지연 지형",
      title: "손가락이 멈추는 물리적 공간의 높이",
      subtitle:
        "키보드 위에서 손가락이 멈칫하거나 버벅거리는 지점을 입체적인 높낮이로 시각화합니다. 봉우리가 높을수록 더 많이 지체되는 나만의 병목 구간입니다.",
      pills: ["느린 키 전환 하이라이트", "손가락별 부하 시각화", "타이핑 실시간 3D 업데이트"],
    },
    features: {
      eyebrow: "연습 모드",
      title: "약점을 직접 공략하도록 설계된 연습 환경",
      subtitle: "실시간 알고리즘과 신경망 모델이 당신의 분석 데이터를 토대로 연습을 지원합니다.",
      items: [
        {
          title: "토픽 모드",
          desc: "관심 있는 주제를 입력하면 관련된 내용을 담고 있는 제시문을 AI가 즉시 생성해줍니다.",
        },
        {
          title: "하드코어 모드",
          desc: "자주 쓰이지 않거나 본인이 평소에 버벅거리고 오타를 자주 내는 취약한 글자 조합을 모아 맞춤형 훈련 문장을 생성합니다.",
        },
        {
          title: "게스트 세션 보존",
          desc: "가입 없이 바로 연습을 시작해도 연습 세션을 저장하고, 추후 로그인 시 안전하게 데이터를 연동합니다.",
        },
        {
          title: "실시간 3D 진단",
          desc: "연습 도중 화면 전환을 통해, 타이핑에 따라 실시간으로 업데이트되는 3D 지연 지형과 다양한 분석 결과를 직접 확인할 수 있습니다.",
        },
      ],
    },
    cta: {
      eyebrow: "시작할 준비가 됐나요?",
      titleLine1: "병목을 찾아내고,",
      titleLine2: "한계를 돌파하세요.",
      subtitle:
        "타이핑을 시작하세요. TypeDiag가 당신의 3D 공간 타건 지연을 완벽하게 분석해 드립니다.",
      button: "무료 진단 시작하기",
      note: "회원가입, 설치 없이 무료로 시작",
    },
    footer: {
      practice: "연습하기",
      terms: "이용약관",
      privacy: "개인정보 처리방침",
      copyright: "TypeDiag. All rights reserved.",
    },
  },
  en: {
    meta: {
      title: "TypeDiag — 3D Visual Keystroke Dynamics & Typing Practice",
      description:
        "A next-generation typing platform that captures physical key timing and visualizes your typing bottlenecks on a 3D keyboard landscape.",
    },
    nav: { practice: "Practice", dashboard: "Dashboard", getStarted: "Get Started" },
    hero: {
      eyebrow: "Beyond Speed — 3D Spatial Typing Diagnostics",
      headlinePrimary: "Type Smarter.",
      headlineAccent: "Diagnose Deeper.",
      subtitle:
        "TypeDiag doesn't just show average speed. It reveals your custom typing bottlenecks on a 3D keyboard landscape, showing you exactly where your fingers hesitate.",
      cta: "Start Free Diagnostics",
      secondaryLink: "See how it works",
      scroll: "scroll",
    },
    problem: {
      eyebrow: "Sound Familiar?",
      title: "Speed isn't the whole story.",
      subtitle:
        "Most typing tests only tell you how fast you type. They completely hide the specific key transitions where you hesitate and stall.",
      pains: [
        {
          quote: "My average WPM goes up, but typing still feels sluggish.",
          detail: "Averages hide micro-bottlenecks hidden inside specific typing flows.",
        },
        {
          quote: "I keep stalling on the exact same key pairs.",
          detail: "Awkward key transitions, R→T, and Shift combos create unique spatial latency.",
        },
        {
          quote: "I repeat the same mistakes without knowing why.",
          detail: "Without tracking key ordering errors, it is difficult to break old habits.",
        },
      ],
    },
    howItWorks: {
      eyebrow: "How It Works",
      title: "Three steps to map your habits",
      subtitle:
        "No complex setup. Just open the page, start typing, and let the diagnostic system do the rest.",
      steps: [
        {
          num: "01",
          title: "Real-time Keystroke Collection",
          desc: "Type naturally. We measure the precise duration of your key presses and the millisecond intervals between key transitions.",
        },
        {
          num: "02",
          title: "3D Latency Visualization",
          desc: "Your typing delay is mapped onto a 3D keyboard landscape. Stalling keys rise up as peaks, giving you immediate visual feedback.",
        },
        {
          num: "03",
          title: "Custom Keystroke Diagnosis",
          desc: "We analyze your habits of overlapping keys, detect where typing speed drops, and trace recurrent sequences of mistyped letters.",
        },
      ],
    },
    diagnosis: {
      eyebrow: "Your Report",
      title: "One session. Actionable insights.",
      subtitle:
        "Go beyond a single score — see exactly which key transitions and fingers are holding you back.",
      dimensionsLabel: "6 diagnostic views",
      dimensions: ["Hold", "Latency", "Shift", "Hesitation", "Errors", "Finger load"],
      beforeLabel: "Typical typing test",
      beforeValue: "87",
      beforeUnit: "WPM",
      afterLabel: "TypeDiag Diagnostics",
      beforeNote: "Fast overall WPM — but where are you actually slow?",
      bottleneck: "Bottleneck",
      insight:
        "Left index finger transition R→T shows elevated latency. Practice this specific transition sequence in Hardcore Mode.",
      barsTitle: "Slowest transitions",
      slowTransitions: [
        { pair: "R → T", ms: 340, bar: 92 },
        { pair: "O → P", ms: 285, bar: 78 },
        { pair: "Shift → P", ms: 241, bar: 66 },
        { pair: "L → ;", ms: 198, bar: 54 },
        { pair: "Space → A", ms: 176, bar: 48 },
      ],
    },
    weaknessMap: {
      eyebrow: "Weakness Map",
      title: "Visualizing physical keystroke latency",
      subtitle:
        "Peaks on the 3D keyboard landscape represent slow transitions. The higher the peak, the more that specific key pair is holding you back.",
      pills: ["Slow transition highlight", "Per-finger load view", "Live updates as you type"],
    },
    features: {
      eyebrow: "Practice Modes",
      title: "Practice built to target your bottlenecks",
      subtitle:
        "Real-time algorithms dynamically customize your training material to target your weaknesses.",
      items: [
        {
          title: "Topic Mode",
          desc: "Enter any topic you like. Our system instantly generates customized typing cards on the subject.",
        },
        {
          title: "Hardcore Mode",
          desc: "Generates custom layouts focusing on rare, error-prone key transitions to push your limits (Korean only; English in progress).",
        },
        {
          title: "Guest Session Preservation",
          desc: "Start typing immediately without signing up. Your sessions are saved and seamlessly merged when you create an account.",
        },
        {
          title: "Live 3D Diagnostics",
          desc: "Switch to the dashboard mid-session to see real-time updates of your 3D typing landscape and transition statistics.",
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
      terms: "Terms of Service",
      privacy: "Privacy Policy",
      copyright: "TypeDiag. All rights reserved.",
    },
  },
};

export function getLandingCopy(lang: LandingLang): LandingCopy {
  return COPY[lang];
}
