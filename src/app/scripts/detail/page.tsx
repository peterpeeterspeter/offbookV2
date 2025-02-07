import { ScriptDetailPageClient } from "./page.client";

const isTestEnvironment = process.env.NODE_ENV === "test";

export default function ScriptDetailPage() {
  return <ScriptDetailPageClient testMode={isTestEnvironment} />;
}
