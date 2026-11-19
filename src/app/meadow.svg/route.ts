import { meadowSvg } from "@/components/pixel/meadow";

export function GET() {
  return new Response(meadowSvg(), { headers: { "Content-Type": "image/svg+xml" } });
}
