import { useTypingStore } from "@/store/useTypingStore";
import type { AlignResult } from "@/utils/mvsa";

export interface AssertionResult {
  passed: boolean;
  reason?: string;
}

/**
 * 키 입력 직후의 TypingStore 상태를 검사하여 MVSA 엔진의 버그를 찾아냅니다.
 */
export function assertMvsaState(prevCursor: number): AssertionResult {
  const state = useTypingStore.getState();
  const currentCursor = state.typedText.length;
  
  // 1. 커서 점프 검사 (백스페이스 등 복잡한 상황이 있지만, 일단 너무 큰 점프는 의심)
  // 단, 복구(rollback) 로직에 의해 커서가 뒤로 가는 건 정상일 수 있으므로 
  // 양의 방향으로 비정상적으로 뛰었는지만 체크
  if (currentCursor - prevCursor > 2) {
    return {
      passed: false,
      reason: `Cursor Jump Detected: ${prevCursor} -> ${currentCursor}`
    };
  }

  // 2. MVSA False Positive 검사
  // 타겟 문장(전체)에 대해, 유저가 입력한 부분이 완벽히 맞다면 
  // (물론 Fuzz 테스트 중 오타가 섞여 있으면 다를 수 있음)
  // 현재 입력 중인 단어(word) 내에서 panicMode가 비정상적으로 터졌는지 검사.
  // (현재 TypingStore에서는 panicMode를 노출하지 않으므로 생략)

  // 3. 렌더링용 배열 검사 (EQUAL인데 이상한 값?)
  // 만약 봇이 오타를 냈다가 완벽히 지우고(Backspace) 다시 쳤는데
  // REPLACE나 INSERT 잔재가 남아있다면 버그임.
  // (이는 봇 시퀀스 전체가 끝난 '완료' 시점에 체크하는 게 더 정확함)

  return { passed: true };
}

/**
 * 한 문장의 타자가 끝났을 때(또는 에러 상황) 현재까지의 입력을 분석합니다.
 */
export function assertSentenceCompletion(target: string, typed: string, mvsaArray: AlignResult[]): AssertionResult {
  // 타겟과 타이핑한 문장이 완벽히 일치하는데 mvsaArray에 REPLACE/INSERT가 남아있는지
  if (target === typed) {
    const hasErrorMark = mvsaArray.some(item => 
      item.op === "REPLACE" || item.op === "INSERT"
    );
    
    if (hasErrorMark) {
      return {
        passed: false,
        reason: "False Positive: Target and Typed are identical, but MVSA output has REPLACE/INSERT states."
      };
    }
  }
  
  return { passed: true };
}
