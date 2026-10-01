import { activityQuery } from "../activity";
import { loadDuneActivity } from "../activity-source";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  return respond(new URL(request.url).searchParams, false);
}

export async function POST(request: Request) {
  // Requests are same-origin form actions; an unrelated website cannot spend query credits.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json(
      { state: "error", message: "Open the dashboard to run this lookup." },
      { status: 403 },
    );
  }
  return respond(new URL(request.url).searchParams, true);
}

async function respond(params: URLSearchParams, execute: boolean) {
  try {
    const { builderCode, network } = activityQuery(params);
    const result = await loadDuneActivity(builderCode, network, execute);
    return Response.json(result, {
      status:
        result.state === "ready"
          ? 200
          : result.state === "pending"
            ? 202
            : result.state === "unconfigured"
              ? 503
              : 502,
      headers: {
        "Cache-Control": "no-store",
        ...(result.state === "pending" ? { "Retry-After": String(result.retryAfter) } : {}),
      },
    });
  } catch (error) {
    return Response.json(
      {
        state: "error",
        message: error instanceof Error ? error.message : "Check the lookup settings.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
