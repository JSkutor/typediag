import WorkspaceView from "../WorkspaceView";

type Params = Promise<{ lang: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { lang } = await params;
  const { tab } = await searchParams;

  // Render the interactive workspace
  return <WorkspaceView lang={lang} tab={typeof tab === "string" ? tab : "practice"} />;
}
