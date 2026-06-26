import { getGuestAuthHeaders, applyGuestTokenFromResponse } from "@/utils/guestUser";

export interface NormalTarget {
  id: string;
  content: string;
  language: string;
}

export async function fetchRandomNormalTarget(
  language: string,
  excludeId?: string,
): Promise<NormalTarget> {
  const params = new URLSearchParams({ language });
  if (excludeId) {
    params.set("exclude", excludeId);
  }

  const res = await fetch(`/api/practice/target?${params.toString()}`, {
    headers: getGuestAuthHeaders(),
  });

  const payload = await res.json().catch(() => ({}));
  applyGuestTokenFromResponse(payload);

  if (!res.ok) {
    throw new Error(
      typeof payload.error === "string" ? payload.error : "Failed to load practice sentence",
    );
  }

  const data = payload.data;
  if (!data?.id || !data?.content || !data?.language) {
    throw new Error("Invalid practice sentence response");
  }

  return {
    id: data.id,
    content: data.content,
    language: data.language,
  };
}
