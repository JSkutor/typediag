import { MaximumValidSequenceAligner } from './src/utils/mvsa';
import { getCharQwertyIndices, assembleHangulWithPunctuation } from './src/utils/keyboardMap';

// Let's monkey-patch or just test the logic here.
const qwertyBuffer = 'dlsgf';
const qEnds = getCharQwertyIndices(qwertyBuffer);
const typedChars = assembleHangulWithPunctuation(qwertyBuffer);
const qIdxToVCharIdx = new Array(qwertyBuffer.length).fill(-1);
let start = 0;
for (let i = 0; i < typedChars.length; i++) {
  const end = qEnds[i] + 1;
  for (let q = start; q < end; q++) {
    qIdxToVCharIdx[q] = i;
  }
  start = end;
}
console.log("qIdxToVCharIdx:", qIdxToVCharIdx);
