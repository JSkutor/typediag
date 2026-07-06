"use client";

import { useFuzzBot } from "@/hooks/dev/useFuzzBot";
import { useTypingStore } from "@/store/useTypingStore";
import { PracticePanel } from "@/components/workspace/PracticePanel";
import { useShallow } from "zustand/react/shallow";

export function FuzzSimulatorPanel({ targets }: { targets: string[] }) {
  const {
    isRunning,
    currentIndex,
    config,
    setConfig,
    delayMs,
    setDelayMs,
    crashLog,
    startFuzzing,
    stopFuzzing,
  } = useFuzzBot(targets);

  const { targetText, typedText } = useTypingStore(
    useShallow((s) => ({
      targetText: s.targetText,
      typedText: s.typedText,
    })),
  );

  return (
    <div
      className="flex flex-col w-full max-w-5xl gap-6 p-6 mx-auto mt-10"
      style={{ color: "var(--text-primary)" }}
    >
      <header className="flex justify-between items-center pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold">MVSA Chaos Monkey (Fuzz Tester)</h1>
          <p className="text-sm opacity-70 mt-1">
            Running automated typing simulations to detect MVSA engine edge cases.
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="text-sm font-mono opacity-80">
            Progress: {currentIndex} / {targets.length}
          </div>
          {isRunning ? (
            <button
              onClick={stopFuzzing}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
            >
              Stop Fuzzing
            </button>
          ) : (
            <button
              onClick={startFuzzing}
              className="px-4 py-2 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
            >
              Start Fuzzing
            </button>
          )}
        </div>
      </header>

      {/* Controls */}
      <section className="grid grid-cols-5 gap-4 p-4 rounded-xl bg-black/20 border border-white/5">
        <label className="flex flex-col gap-2 text-sm">
          <span className="opacity-70">Insert Error Rate (%)</span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={config.insertRate * 100}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setConfig({ ...config, insertRate: isNaN(val) ? 0 : val / 100 });
            }}
            disabled={isRunning}
            className="px-2 py-1 bg-black/50 border border-white/20 rounded font-mono text-right"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="opacity-70">Replace Error Rate (%)</span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={config.replaceRate * 100}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setConfig({ ...config, replaceRate: isNaN(val) ? 0 : val / 100 });
            }}
            disabled={isRunning}
            className="px-2 py-1 bg-black/50 border border-white/20 rounded font-mono text-right"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="opacity-70">Omit Error Rate (%)</span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={config.omitRate * 100}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setConfig({ ...config, omitRate: isNaN(val) ? 0 : val / 100 });
            }}
            disabled={isRunning}
            className="px-2 py-1 bg-black/50 border border-white/20 rounded font-mono text-right"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="opacity-70">Backspace Rate (%)</span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={config.backspaceRate * 100}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setConfig({ ...config, backspaceRate: isNaN(val) ? 0 : val / 100 });
            }}
            disabled={isRunning}
            className="px-2 py-1 bg-black/50 border border-white/20 rounded font-mono text-right"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="opacity-70">Typing Delay (ms)</span>
          <input
            type="range"
            min="0"
            max="200"
            step="5"
            value={delayMs}
            onChange={(e) => setDelayMs(parseInt(e.target.value))}
          />
          <span className="text-xs text-right font-mono">{delayMs}ms</span>
        </label>
      </section>

      {/* Live Preview */}
      <section className="flex flex-col p-8 rounded-xl bg-black/40 border border-white/10 min-h-[200px] justify-center relative">
        {targetText ? (
          <PracticePanel hideToolbar={true} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-30 text-xl font-medium tracking-wide">
            Ready to simulate
          </div>
        )}
      </section>

      {/* Crash Reporter */}
      {crashLog && (
        <section className="flex flex-col gap-4 p-6 rounded-xl border border-red-500/30 bg-red-950/20">
          <h2 className="text-red-400 font-bold text-xl flex items-center gap-2">
            ⚠️ Crash Detected!
          </h2>
          <div className="text-sm">
            <span className="font-semibold text-red-300">Reason:</span> {crashLog.reason}
          </div>
          <div className="text-sm">
            <span className="font-semibold opacity-70">Target:</span> {crashLog.target}
          </div>

          <div className="mt-4">
            <div className="text-sm font-semibold opacity-70 mb-2">Key Log (Last 10 Actions)</div>
            <div className="bg-black/50 p-4 rounded font-mono text-xs whitespace-pre-wrap max-h-64 overflow-y-auto">
              {crashLog.logs.slice(-10).map((log, i) => (
                <div key={i} className="flex gap-4 mb-1">
                  <span className="w-16 opacity-50">#{i}</span>
                  <span
                    className={`w-20 ${log.action.type === "NORMAL" ? "text-green-400" : "text-red-400"}`}
                  >
                    [{log.action.type}]
                  </span>
                  <span className="w-24">Key: {log.action.char}</span>
                  <span className="opacity-60">
                    Cursor: {log.cursorBefore} &rarr; {log.cursorAfter}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
