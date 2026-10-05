import { processActivity, type ActivityWork, type ActivityWorkReply } from "./activity-processing";

const scope = self as unknown as {
  onmessage: (event: MessageEvent<ActivityWork>) => void;
  postMessage: (message: ActivityWorkReply) => void;
};

scope.onmessage = async ({ data }) => {
  try {
    scope.postMessage({ ok: true, result: await processActivity(data) });
  } catch (error) {
    scope.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "This export could not be read.",
    });
  }
};
