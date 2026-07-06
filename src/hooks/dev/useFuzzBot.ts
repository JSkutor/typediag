import { useState, useRef, useCallback } from "react";
import { generateFuzzActions, FuzzConfig, FuzzAction } from "@/lib/ko/keystrokeSimulator";
import { assertMvsaState, assertSentenceCompletion } from "@/lib/dev/mvsaAssertion";
import { useTypingStore } from "@/store/useTypingStore";

export interface FuzzLog {
  action: FuzzAction;
  cursorBefore: number;
  cursorAfter: number;
  timestamp: number;
}

export function useFuzzBot(targetTexts: string[]) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [config, setConfig] = useState<FuzzConfig>({
    insertRate: 0.03,
    replaceRate: 0.03,
    omitRate: 0.03,
    backspaceRate: 0.03,
  });
  const [delayMs, setDelayMs] = useState(50);
  
  const [crashLog, setCrashLog] = useState<{
    target: string;
    reason: string;
    logs: FuzzLog[];
  } | null>(null);

  const loopRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);

  const startFuzzing = useCallback(async () => {
    if (targetTexts.length === 0) return;
    setIsRunning(true);
    isRunningRef.current = true;
    setCrashLog(null);
    
    // 타겟 인덱스 순회
    for (let i = currentIndex; i < targetTexts.length; i++) {
      if (!isRunningRef.current) break;
      setCurrentIndex(i);
      
      const target = targetTexts[i];
      // 1. TypingStore 초기화 및 타겟 설정
      useTypingStore.getState().setMode("normal");
      useTypingStore.getState().setTarget(target);
      // 강제로 시작 상태로 만들기 위해 아무 키나 한번 (포커스 효과)
      
      const actions = generateFuzzActions(target, config);
      const actionLogs: FuzzLog[] = [];
      
      // 2. 키 입력 시퀀스 재생
      for (const action of actions) {
        if (!isRunningRef.current) break;
        
        const store = useTypingStore.getState();
        const cursorBefore = store.typedText.length;
        
        // 딜레이 대기
        if (delayMs > 0) {
          await new Promise(r => setTimeout(r, delayMs));
        }
        
        // 키 입력 시뮬레이션
        store.handlePhysicalKeyPress(action.code, action.shift, performance.now());
        store.handlePhysicalKeyRelease(action.code, performance.now() + 10);
        
        const cursorAfter = useTypingStore.getState().typedText.length;
        actionLogs.push({
          action,
          cursorBefore,
          cursorAfter,
          timestamp: Date.now()
        });
        
        // Assertions per keystroke
        const result = assertMvsaState(cursorBefore, action);
        if (!result.passed) {
          setCrashLog({
            target,
            reason: result.reason || "Unknown Assertion Failure",
            logs: actionLogs,
          });
          setIsRunning(false);
          isRunningRef.current = false;
          return; // 봇 정지
        }
      }
      
      // 3. 한 문장 끝난 후 최종 Assertion
      if (isRunningRef.current) {
        // 끝났다고 판단되면,
        const finalState = useTypingStore.getState();
        const compResult = assertSentenceCompletion(target, finalState.typedText, finalState.alignments);
        if (!compResult.passed) {
          setCrashLog({
            target,
            reason: compResult.reason || "Completion Assertion Failure",
            logs: actionLogs,
          });
          setIsRunning(false);
          isRunningRef.current = false;
          return;
        }
      }
      
      // 잠시 대기 후 다음 문장으로
      if (isRunningRef.current) {
        await new Promise(r => setTimeout(r, Math.max(delayMs * 5, 200)));
      }
    }
    
    setIsRunning(false);
    isRunningRef.current = false;
  }, [targetTexts, config, delayMs, currentIndex]);

  const stopFuzzing = useCallback(() => {
    setIsRunning(false);
    isRunningRef.current = false;
  }, []);

  return {
    isRunning,
    currentIndex,
    config,
    setConfig,
    delayMs,
    setDelayMs,
    crashLog,
    startFuzzing,
    stopFuzzing
  };
}
