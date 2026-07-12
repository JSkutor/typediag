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

export type {  TypingMode } from "./typingSlices/types";
;
