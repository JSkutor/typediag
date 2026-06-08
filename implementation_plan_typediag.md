# TypeDiag 라우팅 아키텍처 및 레이아웃 개편 계획서

본 문서는 TypeDiag 프로젝트의 라우팅 구조 변경(단일 페이지 앱 통합) 및 레이아웃 품질 개편을 위한 구체적인 구현 계획을 정의합니다.

---

## 1. 아키텍처 개요 (라우팅 & 흐름)

사용자의 편리한 접속(Zero Friction)과 검색엔진 최적화(SEO), 그리고 매끄러운 단일 페이지(SPA)의 상태 보존을 모두 달성하기 위해 **"언어별 루트 기반 SPA + 독립된 SEO 랜딩 페이지"** 구조를 채택합니다.

```mermaid
flowchart TD
    Start[사용자 접속: typediag.com] --> Root{루트 / 접속}
    
    Root -- "한국어 사용자 (ko-KR)" --> Redir[/[lang]/page.tsx 로 리다이렉트]
    Root -- "그 외 언어 사용자 (Default)" --> ENWorkspace[/[lang]/page.tsx - English Workspace]
    
    Redir --> KOWorkspace[/[lang]/page.tsx - Korean Workspace]
    
    KOWorkspace -- "쿼리 파라미터 ?tab=" --> Tabs{SPA 탭 제어}
    Tabs -- "?tab=practice (기본)" --> WorkspacePractice[연습 화면]
    Tabs -- "?tab=dashboard" --> WorkspaceDashboard[분석 대시보드]
    Tabs -- "?tab=settings" --> WorkspaceSettings[설정 화면]
    
    KOWorkspace -- "헤더/푸터 링크 클릭" --> AboutPage[/about - 상세 소개 및 기술 원리 랜딩 페이지]
    ENWorkspace -- "헤더/푸터 링크 클릭" --> AboutPage
```

---

## 2. 세부 라우팅 설계

### 2.1. 루트 경로 (`/`) 및 언어 감지
* **역할:** 기본적으로 영어 타자 연습 SPA 역할을 수행하되, 한국어 환경의 사용자가 들어오면 `/ko`로 즉시 보냅니다.
* **구현:** Next.js Middleware 또는 `src/app/page.tsx`의 클라이언트 측 리다이렉트를 활용하여 브라우저의 `navigator.language`를 감지해 `/ko`로 토스합니다.

### 2.2. 다이나믹 언어 경로 (`/[lang]`) - SPA 워크스페이스
* **경로:** `/ko` (한국어 워크스페이스), `/en` (영어 워크스페이스)
* **구현:** Next.js의 다이나믹 라우팅 `src/app/[lang]/page.tsx`에서 모든 연습, 분석 대시보드, 설정을 담당합니다.
* **SPA 탭 관리:** `?tab=practice`, `?tab=dashboard`, `?tab=settings` 쿼리 스트링에 따라 내부 컴포넌트만 마운트/언마운트 및 CSS 전환 처리하여 연습 데이터와 상태를 100% 보존합니다.

### 2.3. 소개/랜딩 경로 (`/about` 또는 `/homepage`)
* **경로:** `/about` (or `/about?lang=ko` 형태로 다국어 대응 가능)
* **역할:** 서비스의 구체적인 특징, **공간 타건 동역학(SKDM)**의 수학적 원리, 라플라시안 평활화 이론 등을 자세하게 기술한 정적 콘텐츠 페이지입니다.
* **SEO 극대화:** 검색 로봇이 모든 텍스트와 메타 데이터를 온전히 수집할 수 있도록 풍부한 정보성 텍스트와 마크업을 제공합니다.

---

## 3. 레이아웃 및 UI 개편 사양

기존의 단순하고 끊어져 보였던 화면 배치를 프리미엄 감성으로 재구축합니다.

### 3.1. 타이핑 UI 통합 (Overlay Input)
* **AS-IS:** 문장 카드 밑에 별도의 대형 `<textarea>`가 배치되어 시선이 분산됨.
* **TO-BE:** 문장 카드 영역 자체가 입력 타겟이 됩니다. 실제 화면에는 문장만 존재하며, 보이지 않는 (혹은 극도로 정돈된) 입력창을 통해 포커스를 유지하고, 사용자가 타이핑하는 글자(Cursor)가 현재 문장에 바로 오버레이되어 덮어씌워지는 모던한 Monkeytype 스타일 타이핑 방식을 구현합니다.

### 3.2. 가상 키보드 & Delaunay 메쉬 결합
* [theme_preview.html](file:///Users/kutor/Documents/Projects_Kutor/typediag/theme_preview.html)의 스페이스 그레이 & 코발트 테마를 이식합니다.
* 연습 중에 키를 누르면 화면 하단 가상 키보드의 해당 키캡이 입체감 있게 내려앉고, 타건 속도/지연시간이 늘어난(망설인) 구간은 코발트 블루 계열로 하이라이트됩니다.
* 은은한 홀로그램 느낌의 **Delaunay 삼각분할 메쉬**가 가상 키보드 위에 백그라운드 워터마크(SVG)로 실시간 드로잉됩니다.

### 3.3. 사이드바 / 컴팩트 대시보드 레이아웃
* 세로로 길게 늘어지던 구조를 개선하여, 좌측(혹은 상단)에는 슬림한 탭 전환 바, 중앙에는 타이핑 & 가상 키보드 워크스페이스, 우측 또는 하단에는 컴팩트한 실시간 스탯 카드를 조화롭게 배치합니다.

---

## 4. 제안하는 파일 변경 목록

### [DELETE] 기존 개별 라우트 파일
* [page.tsx](file:///Users/kutor/Documents/Projects_Kutor/typediag/src/app/page.tsx) (기존 랜딩 페이지 코드 삭제 및 리다이렉트/진입 코드로 변경)
* `src/app/ko/` 디렉토리 전체 삭제 (신규 `[lang]` 구조로 통합)
* `src/app/dashboard/` 디렉토리 전체 삭제 (워크스페이스 내부 탭으로 흡수)

### [NEW] 다이나믹 워크스페이스 구조
* `src/app/[lang]/page.tsx`: 단일 페이지 앱 컨트롤러
* `src/app/about/page.tsx`: 검색 엔진 최적화 전용 정보성 랜딩 페이지
* `src/components/workspace/PracticePanel.tsx`: 모던 오버레이 타이핑 연습 컴포넌트
* `src/components/workspace/DashboardPanel.tsx`: 3D 히트맵 및 통계 분석 컴포넌트
* `src/components/workspace/SettingsPanel.tsx`: 자판 설정 및 테마 제어 컴포넌트
* `src/components/workspace/VirtualKeyboard.tsx`: PBT 키캡 렌더링 및 Delaunay 오버레이 컴포넌트

---

## 5. 검증 계획

### 수동 검증 (Manual Verification)
1. 브라우저로 `localhost:3000/` 접속 시, 크롬 언어 설정이 한국어이면 자동으로 `localhost:3000/ko`로 넘어가고, 영어이면 `localhost:3000/en`으로 남아있는지 검증.
2. `/ko` 및 `/en`에서 타자를 직접 쳐보며, 입력 텍스트가 별도 입력창 없이 문장에 바로 매핑되는지 확인.
3. 타건 중간에 `대시보드` 탭을 눌렀다가 다시 `연습` 탭으로 돌아왔을 때, 진행 중이던 연습 상태와 수집된 타건 이벤트 개수가 변함없이 보존되는지 확인.
4. `/about` 페이지로 들어갔을 때 공간 타건 동역학 소개 및 메타 데이터가 구글 서치봇 친화적으로 노출되는지 HTML 소스 확인.
