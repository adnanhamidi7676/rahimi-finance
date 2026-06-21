import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed "middleware" to "proxy" (same functionality). This runs
// on every matched request to refresh the Supabase auth session and guard
// routes. Auth is still re-verified inside each page/Server Action — this is
// only an optimistic check.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets, image optimization, the
     * manifest, the service worker, and common icon/static files.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
