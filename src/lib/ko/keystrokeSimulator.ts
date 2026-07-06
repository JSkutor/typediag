import { disassemble } from "es-hangul";

// 자모 -> 물리적 키보드 코드 (e.code) 및 shift 여부 매핑
export const JAMO_TO_KEY_MAP: Record<string, { code: string; shift: boolean }> = {
  // 초성/종성 (자음)
  'ㅂ': { code: 'KeyQ', shift: false },
  'ㅃ': { code: 'KeyQ', shift: true },
  'ㅈ': { code: 'KeyW', shift: false },
  'ㅉ': { code: 'KeyW', shift: true },
  'ㄷ': { code: 'KeyE', shift: false },
  'ㄸ': { code: 'KeyE', shift: true },
  'ㄱ': { code: 'KeyR', shift: false },
  'ㄲ': { code: 'KeyR', shift: true },
  'ㅅ': { code: 'KeyT', shift: false },
  'ㅆ': { code: 'KeyT', shift: true },
  'ㅁ': { code: 'KeyA', shift: false },
  'ㄴ': { code: 'KeyS', shift: false },
  'ㅇ': { code: 'KeyD', shift: false },
  'ㄹ': { code: 'KeyF', shift: false },
  'ㅎ': { code: 'KeyG', shift: false },
  'ㅋ': { code: 'KeyZ', shift: false },
  'ㅌ': { code: 'KeyX', shift: false },
  'ㅊ': { code: 'KeyC', shift: false },
  'ㅍ': { code: 'KeyV', shift: false },
  // 겹받침 (es-hangul disassemble은 겹받침을 2개의 자음으로 분리해주지만, 혹시 모를 대비)
  'ㄳ': { code: 'KeyR', shift: false }, // 실제 입력 시 ㄱ, ㅅ 두 번이지만 일단 단일 매핑은 대표값
  'ㄵ': { code: 'KeyS', shift: false },
  'ㄶ': { code: 'KeyS', shift: false },
  'ㄺ': { code: 'KeyF', shift: false },
  'ㄻ': { code: 'KeyF', shift: false },
  'ㄼ': { code: 'KeyF', shift: false },
  'ㄽ': { code: 'KeyF', shift: false },
  'ㄾ': { code: 'KeyF', shift: false },
  'ㄿ': { code: 'KeyF', shift: false },
  'ㅀ': { code: 'KeyF', shift: false },
  'ㅄ': { code: 'KeyQ', shift: false },
  
  // 중성 (모음)
  'ㅛ': { code: 'KeyY', shift: false },
  'ㅕ': { code: 'KeyU', shift: false },
  'ㅑ': { code: 'KeyI', shift: false },
  'ㅐ': { code: 'KeyO', shift: false },
  'ㅒ': { code: 'KeyO', shift: true },
  'ㅔ': { code: 'KeyP', shift: false },
  'ㅖ': { code: 'KeyP', shift: true },
  'ㅗ': { code: 'KeyH', shift: false },
  'ㅓ': { code: 'KeyJ', shift: false },
  'ㅏ': { code: 'KeyK', shift: false },
  'ㅣ': { code: 'KeyL', shift: false },
  'ㅠ': { code: 'KeyB', shift: false },
  'ㅜ': { code: 'KeyN', shift: false },
  'ㅡ': { code: 'KeyM', shift: false },
  
  // 기호
  ' ': { code: 'Space', shift: false },
  '.': { code: 'Period', shift: false },
  ',': { code: 'Comma', shift: false },
  '?': { code: 'Slash', shift: true },
  '!': { code: 'Digit1', shift: true },
};

export type FuzzActionType = 'NORMAL' | 'INSERT' | 'REPLACE' | 'OMIT' | 'BACKSPACE';

export interface FuzzAction {
  type: FuzzActionType;
  code: string;
  shift: boolean;
  char: string;
}

export interface FuzzConfig {
  insertRate: number;   // 0.0 ~ 1.0
  replaceRate: number;  // 0.0 ~ 1.0
  omitRate: number;     // 0.0 ~ 1.0
  backspaceRate: number; // 0.0 ~ 1.0
}

/**
 * 타겟 문장을 받아 자모 단위로 쪼갠 후, 오타가 섞인 Action 시퀀스로 변환합니다.
 */
export function generateFuzzActions(targetText: string, config: FuzzConfig): FuzzAction[] {
  // es-hangul disassemble은 겹받침/겹모음을 완벽하게 분리해줍니다.
  // (예: "앉아" -> ㅇㅏㄴㅈㅇㅏ)
  const disassembled = disassemble(targetText).split('');
  const actions: FuzzAction[] = [];
  
  const randomKey = () => {
    const keys = Object.values(JAMO_TO_KEY_MAP);
    const idx = Math.floor(Math.random() * keys.length);
    return keys[idx];
  };

  for (let i = 0; i < disassembled.length; i++) {
    const char = disassembled[i];
    const keyMap = JAMO_TO_KEY_MAP[char];
    
    // 매핑에 없는 특수문자 등은 일단 그대로 치도록
    const defaultCode = keyMap ? keyMap.code : 'Space';
    const defaultShift = keyMap ? keyMap.shift : false;
    
    const r = Math.random();
    
    if (r < config.omitRate) {
      // 누락 오타
      continue;
    }
    
    if (r < config.omitRate + config.insertRate) {
      // 추가 오타 (엉뚱한 키 한 번 누르고 본 키 누름)
      const wrong = randomKey();
      actions.push({ type: 'INSERT', code: wrong.code, shift: wrong.shift, char: '?' });
      // 백스페이스로 복구할지 말지도 50% 확률로 넣을 수 있지만 
      // 일단 Fuzz 목적상 그냥 추가하고 다음 글자를 치게 함
      actions.push({ type: 'NORMAL', code: defaultCode, shift: defaultShift, char });
      continue;
    }
    
    if (r < config.omitRate + config.insertRate + config.replaceRate) {
      // 대체 오타 (본 키 대신 엉뚱한 키 누름)
      const wrong = randomKey();
      actions.push({ type: 'REPLACE', code: wrong.code, shift: wrong.shift, char: '?' });
      continue;
    }
    
    if (r < config.omitRate + config.insertRate + config.replaceRate + config.backspaceRate) {
      // 백스페이스 오타 (오타 입력 후 백스페이스, 그 다음 정타)
      const wrong = randomKey();
      actions.push({ type: 'INSERT', code: wrong.code, shift: wrong.shift, char: '?' });
      actions.push({ type: 'BACKSPACE', code: 'Backspace', shift: false, char: '⌫' });
      actions.push({ type: 'NORMAL', code: defaultCode, shift: defaultShift, char });
      continue;
    }
    
    // 정상 입력
    actions.push({ type: 'NORMAL', code: defaultCode, shift: defaultShift, char });
  }
  
  return actions;
}
