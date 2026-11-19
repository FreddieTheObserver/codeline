const TABS = ["exercises", "run", "dashboard", "sessions"] as const;
export type CourseTab = (typeof TABS)[number];

export function parseTab(value: string | string[] | undefined): CourseTab {
  return TABS.find((t) => t === value) ?? "exercises";
}

export function courseHref(courseId: string, tab: CourseTab = "exercises"): string {
  return `/teach/courses/${courseId}${tab === "exercises" ? "" : `?tab=${tab}`}`;
}
