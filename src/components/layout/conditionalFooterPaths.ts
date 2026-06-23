/** Routes that render their own footer or are full-bleed — skip the global footer. */
export function shouldHideFooter(pathname: string | null): boolean {
  if (!pathname) return false;
  if (/^\/(ko|en)$/.test(pathname)) return true;
  if (/^\/(ko|en)\/practice/.test(pathname)) return true;
  return false;
}
