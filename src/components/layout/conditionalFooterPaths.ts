/** Routes that render their own footer or are full-bleed — skip the global footer. */
export function shouldHideFooter(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/") return true;
  if (pathname.startsWith("/practice")) return true;
  return false;
}
