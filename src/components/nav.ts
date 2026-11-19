import type { Role, Viewer } from "@/lib/api-types";

export type NavLink = { href: string; label: string; match: string[] };

export function homeFor(role: Role): string {
  return role === "student" ? "/home" : role === "ta" ? "/ta" : "/teach";
}

export function roleLabel(viewer: Viewer): string {
  if (viewer.role === "lecturer") return "Lecturer";
  if (viewer.role === "ta") return "Teaching assistant";
  return `Student · ${viewer.loginId}`;
}

export function navFor(viewer: Viewer | null | undefined): NavLink[] {
  if (!viewer) return [];
  const courses = { href: "/teach", label: "My courses", match: ["/teach", "/console"] };
  if (viewer.role === "student") {
    return [
      { href: "/home", label: "Valley", match: ["/home", "/play", "/join"] },
      { href: "/profile", label: "Profile", match: ["/profile"] },
    ];
  }
  if (viewer.role === "ta") return [{ href: "/ta", label: "Overview", match: ["/ta"] }, courses];
  return [courses];
}

export function isActive(link: NavLink, pathname: string | null): boolean {
  if (!pathname) return false;
  return link.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}
