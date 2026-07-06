import { getFuzzTargetTexts } from "@/lib/dev/fuzzData";
import { FuzzSimulatorPanel } from "@/components/dev/FuzzSimulatorPanel";

export const metadata = {
  title: "[DEV] MVSA Chaos Monkey",
};

export default function DevSimulatePage() {
  const targets = getFuzzTargetTexts(500);

  return (
    <div className="min-h-screen bg-black" style={{ color: "var(--text-primary)" }}>
      <FuzzSimulatorPanel targets={targets} />
    </div>
  );
}
