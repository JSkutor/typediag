import prompts from "./prompts.json";

export const STYLES = prompts.styles as readonly string[];

export type PracticeStyle = (typeof STYLES)[number];
