import { sessionService } from "./src/services/sessionService";
import { db } from "./src/utils/db";

async function run() {
  try {
    const user = await db.getOrCreateUserByClerkId("test-user-" + Date.now());
    const runId = await sessionService.startPage(user.id, new Date());

    const newRunId = await sessionService.finishPage(
      user.id,
      runId,
      "hello world",
      "hello world",
      [
        {
          fromKey: null,
          toKey: "h",
          latencyMs: 100,
          keyChar: "h",
          holdDurationMs: 50,
          isCorrect: true,
          expectedChar: "h",
        },
        {
          fromKey: "h",
          toKey: "e",
          latencyMs: 100,
          keyChar: "e",
          holdDurationMs: 50,
          isCorrect: true,
          expectedChar: "e",
        },
      ],
      Date.now() - 200,
      Date.now(),
    );
    console.log("Success:", newRunId);
  } catch (e) {
    console.error("Error running finishPage:", e);
  }
}
run();
