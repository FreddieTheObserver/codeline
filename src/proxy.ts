import { NextResponse, type NextRequest } from "next/server";

// An optimistic check only: every route handler verifies the session itself.
export function proxy(request: NextRequest) {
  if (request.cookies.has("cl_auth")) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/signin";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/home", "/profile", "/play/:path*", "/teach/:path*", "/teach", "/console/:path*", "/projector/:path*", "/ta"],
};
