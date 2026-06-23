"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { formatSimilarity, type CosineSearchResponse } from "@/lib/dev/cosineDev";

import styles from "@/app/dev/dev.module.css";

export function DevCosineSimilarityPanel() {
  const [query, setQuery] = useState("우주 여행");
  const [searchData, setSearchData] = useState<CosineSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async (topic: string) => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/cosine-similarity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, limit: 20 }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "검색에 실패했습니다.");
      }
      setSearchData(data as CosineSearchResponse);
    } catch (err) {
      setSearchData(null);
      setError(err instanceof Error ? err.message : "검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <>
      <nav className={styles.devNav}>
        <Link href="/dev" className={styles.devNavLink}>
          ← Dev 홈
        </Link>
      </nav>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>주제 유사도 검색 (상위 20개 문장)</h2>
        <p className={styles.helpText}>
          주제를 입력하고 검색하면 데이터베이스의 전체 문장 중 유사도가 높은 순으로 20개 문장을
          보여줍니다.
        </p>

        <div className={styles.controlRow}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runSearch(query);
            }}
            className={styles.textInput}
            placeholder="주제 입력 (예: 우주 여행, 고양이 등)"
          />
          <button
            type="button"
            className={styles.primaryButton}
            disabled={loading}
            onClick={() => void runSearch(query)}
          >
            {loading ? "검색 중…" : "검색"}
          </button>
        </div>

        {error && <p className={styles.errorText}>{error}</p>}

        {searchData && (
          <div style={{ marginTop: "var(--space-6)" }}>
            <div className={styles.resultTableWrap}>
              <table className={styles.resultTable}>
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>순위</th>
                    <th style={{ width: "100px" }}>유사도</th>
                    <th style={{ width: "120px" }}>등록 주제</th>
                    <th>문장 내용</th>
                  </tr>
                </thead>
                <tbody>
                  {searchData.results.map((row, index) => (
                    <tr key={row.id}>
                      <td style={{ textAlign: "center" }}>{index + 1}</td>
                      <td>
                        <span
                          className={styles.simBadge}
                          style={{
                            color: "var(--accent)",
                            borderColor: "var(--accent)",
                            fontFamily: "var(--font-mono)",
                            fontWeight: "bold",
                          }}
                        >
                          {formatSimilarity(row.similarity)}
                        </span>
                      </td>
                      <td>{row.topic ?? "—"}</td>
                      <td className={styles.contentCell}>{row.content}</td>
                    </tr>
                  ))}
                  {searchData.results.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "2rem" }}>
                        검색 결과가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
