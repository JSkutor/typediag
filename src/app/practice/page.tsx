import WorkspaceView from "../WorkspaceView";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function PracticePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { tab } = await searchParams;
  const lang = "ko";

  // Render the interactive workspace
  return <WorkspaceView lang={lang} tab={typeof tab === "string" ? tab : "practice"} />;
}
