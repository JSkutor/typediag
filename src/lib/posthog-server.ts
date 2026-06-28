import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

// No-op mock client to prevent crashes when token is missing (e.g., local development)
const mockPostHogClient = {
  capture: () => {},
  identify: () => {},
  alias: () => {},
  shutdown: async () => {},
} as unknown as PostHog;

export function getPostHogClient(): PostHog {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token) {
    return mockPostHogClient;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(token, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
}
