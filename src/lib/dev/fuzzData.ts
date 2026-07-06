import Database from "better-sqlite3";
import path from "path";

/**
 * Fuzz 테스트를 위해 더미 타겟 문장 500개를 로컬 SQLite(targets.db)에서 가져옵니다.
 * 이 모듈은 서버 컴포넌트나 API 라우트에서만 실행되어야 합니다.
 */
export function getFuzzTargetTexts(limit: number = 500): string[] {
  try {
    const dbPath = path.join(process.cwd(), "scripts", "data", "targets.db");
    const db = new Database(dbPath, { readonly: true });
    
    // 한국어 문장 중 적당히 짧은/중간 길이 문장을 랜덤하게 가져옴
    const rows = db
      .prepare(`
        SELECT content 
        FROM target_texts 
        WHERE language = 'ko' 
          AND length(content) BETWEEN 10 AND 100
        ORDER BY RANDOM() 
        LIMIT ?
      `)
      .all(limit) as { content: string }[];
      
    db.close();
    
    return rows.map(r => r.content);
  } catch (err) {
    console.error("Failed to load targets.db:", err);
    // fallback 
    return [
      "무궁화 꽃이 피었습니다.",
      "안녕하세요. 반가워요.",
      "타이핑 진단 테스트 문장입니다."
    ];
  }
}
