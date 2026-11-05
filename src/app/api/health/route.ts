import { connectDb } from "@/lib/server/db";
import { api } from "@/lib/server/api";
import { AppError } from "@/lib/server/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return api(request, async () => {
    try {
      const connection = await connectDb();
      await connection.connection.db!.command({ ping: 1 });
      return { status: "ok" };
    } catch {
      throw new AppError(
        503,
        "UNAVAILABLE",
        "Tjänsten är inte tillgänglig.",
      );
    }
  });
}
