import { useTypingStore } from "@/store/useTypingStore";
import type { AlignResult } from "@/utils/mvsa";
import type { FuzzAction } from "@/lib/ko/keystrokeSimulator";

export interface AssertionResult {
  passed: boolean;
  reason?: string;
}

/**
 * 키 입력 직후의 TypingStore 상태를 검사하여 MVSA 엔진의 버그를 찾아냅니다.
 */
export function assertMvsaState(prevCursor: number, action: FuzzAction): AssertionResult {
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


  // 2. 비정상적인 백워드 점프 감지
  // 백스페이스 액션이 아닌데 커서가 뒤로 간 경우 심각한 렌더링 꼬임일 수 있음.
  if (currentCursor < prevCursor && action.code !== "Backspace") {
    return {
      passed: false,
      reason: `Abnormal Backward Jump: Cursor moved ${prevCursor} -> ${currentCursor} without Backspace (Action: ${action.type})`
    };
  }

  // 3. MVSA 배열 길이 비동기화 감지 (Length Mismatch)
  // mvsaArray(alignments) 길이는 정상적인 경우 target 길이 또는 typed 길이와 비슷하게 유지됨.
  // 매우 비정상적으로 큰 경우 (메모리 릭, 무한 생성 버그)
  const mvsaLength = state.alignments.length;
  const typedLength = state.typedText.length;
  const targetLength = state.targetText.length;
  
  if (mvsaLength > typedLength + 10 && mvsaLength > targetLength + 10) {
    return {
      passed: false,
      reason: `Length Mismatch: MVSA array length (${mvsaLength}) is abnormally large (typed: ${typedLength}, target: ${targetLength}).`
    };
  }

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
