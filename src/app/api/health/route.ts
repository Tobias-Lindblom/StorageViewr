import { connectDb } from "@/lib/server/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const connection = await connectDb();
    await connection.connection.db!.command({ ping: 1 });
    return Response.json({ data: { status: "ok" } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: { code: "UNAVAILABLE", message: "Tjänsten är inte tillgänglig." } }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
