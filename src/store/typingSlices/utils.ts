export function getKeyToken(code: string): string {
  let token = code.toLowerCase().replace("key", "");
  if (code === "Space") token = "space";
  if (code === "Backspace") token = "backspace";
  if (code === "ShiftLeft") token = "shift_l";
  if (code === "ShiftRight") token = "shift_r";
  if (code === "Enter") token = "enter";
  return token;
}
