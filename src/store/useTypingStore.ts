import { create } from "zustand";

import { TypingStore } from "./typingSlices/types";
import { createInputSlice } from "./typingSlices/createInputSlice";
import { createKeystrokeSlice } from "./typingSlices/createKeystrokeSlice";
import { createSessionSlice } from "./typingSlices/createSessionSlice";

export const useTypingStore = create<TypingStore>((set, get, api) => ({
  ...createInputSlice(set, get, api),
  ...createKeystrokeSlice(set, get, api),
  ...createSessionSlice(set, get, api),
}));

export type { SessionStatus } from "./typingSlices/types";
export { getKeyToken } from "./typingSlices/utils";
