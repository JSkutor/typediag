"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ResultsPanel } from "@/components/practice/ResultsPanel";
import { useKeystrokeCapture } from "@/hooks/useKeystrokeCapture";
import { pickText } from "@/lib/practice/texts";
import { useTypingStore } from "@/store/useTypingStore";
import styles from "./ko.module.css";

export default function KoPracticePage() {
  const { onKeyDown } = useKeystrokeCapture();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const targetText = useTypingStore((s) => s.targetText);
  const typed = useTypingStore((s) => s.typed);
  const events = useTypingStore((s) => s.events);
  const status = useTypingStore((s) => s.status);
  const startedAt = useTypingStore((s) => s.startedAt);
  const finishedAt = useTypingStore((s) => s.finishedAt);
  const setTarget = useTypingStore((s) => s.setTarget);
  const setTyped = useTypingStore((s) => s.setTyped);
  const finish = useTypingStore((s) => s.finish);
  const reset = useTypingStore((s) => s.reset);

  const [now, setNow] = useState(0);

  // Seed a target sentence on first mount.
  useEffect(() => {
    if (!targetText) setTarget(pickText());
  }, [targetText, setTarget]);

  // Lightweight ticking clock while typing.
  useEffect(() => {
    if (status !== "running") return;
    const id = window.setInterval(() => setNow(performance.now()), 200);
    return () => window.clearInterval(id);
  }, [status]);

  const correctChars = useMemo(() => {
    let n = 0;
    for (let i = 0; i < typed.length && i < targetText.length; i++) {
      if (typed[i] === targetText[i]) n++;
    }
    return n;
  }, [typed, targetText]);

  const accuracy =
    typed.length > 0 ? Math.round((correctChars / typed.length) * 100) : 100;

  const elapsedMs =
    startedAt === null
      ? 0
      : (finishedAt ?? (status === "running" ? now : startedAt)) - startedAt;
  const elapsedSec = elapsedMs / 1000;
  const cpm =
    elapsedSec > 0 ? Math.round((typed.length / elapsedSec) * 60) : 0;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setTyped(value);
    if (value.length >= targetText.length && targetText.length > 0) {
      finish();
    }
  };

  const newSentence = () => {
    setTarget(pickText(targetText));
    inputRef.current?.focus();
  };

  const retry = () => {
    reset();
    inputRef.current?.focus();
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <span className={styles.badge}>Phase 2 · 물리 타건 캡처</span>
        <h1 className={styles.title}>한국어 연습</h1>
        <p className={styles.sub}>
          한글 조합과 무관하게 물리적 키 입력(keydown)을 직접 측정합니다. 아래
          문장을 따라 입력하면 키 전이별 지연이 실시간으로 수집됩니다.
        </p>
      </header>

      <section className={styles.prompt} aria-label="목표 문장">
        {targetText.split("").map((ch, i) => {
          const typedCh = typed[i];
          let cls = styles.char;
          if (typedCh !== undefined) {
            cls += " " + (typedCh === ch ? styles.correct : styles.incorrect);
          }
          if (i === typed.length) cls += " " + styles.cursor;
          return (
            <span key={i} className={cls}>
              {ch}
            </span>
          );
        })}
      </section>

      <textarea
        ref={inputRef}
        className={styles.input}
        value={typed}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        placeholder="여기에 입력하세요…"
        rows={3}
        autoFocus
        spellCheck={false}
        lang="ko"
      />

      <section className={styles.stats}>
        <Stat label="경과" value={`${elapsedSec.toFixed(1)}s`} />
        <Stat label="분당 타수" value={`${cpm}`} />
        <Stat label="정확도" value={`${accuracy}%`} />
        <Stat label="캡처된 전이" value={`${events.length}`} accent="cool" />
      </section>

      <div className={styles.controls}>
        <button className={styles.secondaryBtn} onClick={retry} type="button">
          다시
        </button>
        <button className={styles.primaryBtn} onClick={newSentence} type="button">
          새 문장
        </button>
      </div>

      {status === "done" && <ResultsPanel events={events} />}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "cool";
}) {
  return (
    <div className={styles.stat}>
      <span
        className={
          accent === "cool" ? `${styles.statValue} ${styles.cool}` : styles.statValue
        }
      >
        {value}
      </span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
