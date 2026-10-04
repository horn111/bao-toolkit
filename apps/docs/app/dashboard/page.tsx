import { pageMetadata } from "../seo";
import { Workspace } from "./workspace";
import { ActivityDashboard } from "./activity-view";
import {
  ACTIVITY_DAYS,
  validBuilderCode,
  type ActivityDays,
  type ActivityNetwork,
} from "./activity";
import { activitySourceConfigured, loadDuneActivity, publishedActivity } from "./activity-source";
import { dashboardProjects } from "./registry";
import "./activity.css";

export const metadata = pageMetadata(
  "/dashboard",
  "Base App Activity Dashboard",
  "Explore Base app activity by Builder Code: operations, active wallets, execution results and transaction evidence.",
);
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    project?: string;
    network?: string;
    days?: string;
    source?: string;
  }>;
}) {
  const query = await searchParams;
  const code = (query.code ?? query.project ?? "bc_vwmzy653").trim();
  const days = ACTIVITY_DAYS.includes(Number(query.days) as ActivityDays)
    ? (Number(query.days) as ActivityDays)
    : 30;
  const network: ActivityNetwork = query.network === "84532" ? 84532 : 8453;
  const configured = activitySourceConfigured();
  const examples = dashboardProjects.map((project) => ({
    code: project.code,
    title: project.code === "bc_vwmzy653" ? "BAO Toolkit" : project.title,
    network: project.transactions[0]?.chainId === 84532 ? (84532 as const) : (8453 as const),
    dataset: publishedActivity(project.code)!,
  }));
  let dataset =
    query.source === "published" || (!query.code && !query.project)
      ? publishedActivity(code)
      : null;
  let message = "";
  if (!validBuilderCode(code)) message = "Enter a valid Builder Code, for example bc_abc123.";
  else if (query.source === "import")
    message = "This link saves the selection. Import the same file to reopen its data.";
  else if (!dataset && configured) {
    const result = await loadDuneActivity(code, network);
    if (result.state === "ready") dataset = result.dataset;
    else
      message =
        result.state === "pending"
          ? "Press Load activity to prepare this Builder Code's history."
          : result.message;
  } else if (!dataset)
    message =
      "Indexed history is not connected yet. Import a Dune export or open a published example.";
  return (
    <Workspace>
      <ActivityDashboard
        initialCode={code}
        initialDays={days}
        initialNetwork={network}
        initialDataset={dataset}
        initialMessage={message}
        configured={configured}
        examples={examples}
      />
    </Workspace>
  );
}
