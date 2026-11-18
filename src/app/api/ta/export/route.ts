import { requireViewer } from "@/server/auth";
import { handle } from "@/server/http";
import { taExportCsv } from "@/server/services/dashboard";

export const GET = handle(async () => {
  const csv = await taExportCsv(await requireViewer("ta"));
  const day = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="codeline-report-${day}.csv"`,
    },
  });
});
