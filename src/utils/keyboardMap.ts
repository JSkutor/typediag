import { assemble, convertQwertyToAlphabet } from "es-hangul";

// Physical code to qwerty character mapping
const PHYSICAL_CODE_TO_QWERTY: Record<string, string> = {
  KeyQ: "q",
  KeyW: "w",
  KeyE: "e",
  KeyR: "r",
  KeyT: "t",
  KeyY: "y",
  KeyU: "u",
  KeyI: "i",
  KeyO: "o",
  KeyP: "p",
  KeyA: "a",
  KeyS: "s",
  KeyD: "d",
  KeyF: "f",
  KeyG: "g",
  KeyH: "h",
  KeyJ: "j",
  KeyK: "k",
  KeyL: "l",
  KeyZ: "z",
  KeyX: "x",
  KeyC: "c",
  KeyV: "v",
  KeyB: "b",
  KeyN: "n",
  KeyM: "m",
  Space: " ",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
};

const PHYSICAL_CODE_TO_QWERTY_SHIFT: Record<string, string> = {
  KeyQ: "Q",
  KeyW: "W",
  KeyE: "E",
  KeyR: "R",
  KeyT: "T",
  KeyY: "Y",
  KeyU: "U",
  KeyI: "I",
  KeyO: "O",
  KeyP: "P",
  KeyA: "A",
  KeyS: "S",
  KeyD: "D",
  KeyF: "F",
  KeyG: "G",
  KeyH: "H",
  KeyJ: "J",
  KeyK: "K",
  KeyL: "L",
  KeyZ: "Z",
  KeyX: "X",
  KeyC: "C",
  KeyV: "V",
  KeyB: "B",
  KeyN: "N",
  KeyM: "M",
  Space: " ",
  Minus: "_",
  Equal: "+",
  BracketLeft: "{",
  BracketRight: "}",
  Backslash: "|",
  Semicolon: ":",
  Quote: '"',
  Comma: "<",
  Period: ">",
  Slash: "?",
};

export function getQwertyChar(code: string, shiftKey: boolean): string | null {
  if (code.startsWith("Digit")) {
    const num = code.replace("Digit", "");
    if (!shiftKey) return num;
    const shiftNums = [")", "!", "@", "#", "$", "%", "^", "&", "*", "("]; // 0 to 9
    return shiftNums[parseInt(num, 10)];
  }

  const map = shiftKey ? PHYSICAL_CODE_TO_QWERTY_SHIFT : PHYSICAL_CODE_TO_QWERTY;
  return map[code] || null;
}

export function assembleHangulWithPunctuation(qwerty: string): string {
  const alphabet = convertQwertyToAlphabet(qwerty);
  let result = "";
  let jamoBuffer: string[] = [];

  const isJamo = (char: string) => /[ㄱ-ㅎㅏ-ㅣ]/.test(char);

  for (const char of alphabet) {
    if (isJamo(char)) {
      jamoBuffer.push(char);
    } else {
      if (jamoBuffer.length > 0) {
        result += assemble(jamoBuffer);
        jamoBuffer = [];
      }
      result += char;
    }
  }

  if (jamoBuffer.length > 0) {
    result += assemble(jamoBuffer);
  }

  return result;
}

/**
 * Checks if a character is a complete precomposed Hangul syllable (가-힣).
 */
export function isCompleteHangul(char: string): boolean {
  if (char.length !== 1) return false;
  const code = char.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3;
}
