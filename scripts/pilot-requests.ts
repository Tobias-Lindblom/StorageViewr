import { Types } from "mongoose";
import { connectDb } from "../src/lib/server/db";
import { PilotRequest } from "../src/models/pilot-request";
import { pilotRequestExpiry } from "../src/features/pilot/retention";
import { recordPilotContact } from "../src/features/pilot/request-maintenance";

const usage = "pilot:requests -- list | show ID | contacted ID ISO_DATUM [--apply] | delete ID [--apply] | backfill [--apply]";

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const [command, id, timestamp, ...extra] = args.filter((arg) => arg !== "--apply");
  if (!["list", "show", "contacted", "delete", "backfill"].includes(command) ||
      extra.length || (timestamp && command !== "contacted") ||
      (id && ["list", "backfill"].includes(command)) ||
      (apply && ["list", "show"].includes(command))) throw new Error(usage);
  if (["show", "contacted", "delete"].includes(command) && !Types.ObjectId.isValid(id ?? "")) {
    throw new Error("Ange ett giltigt förfrågnings-ID.");
  }
  const contactedAt = timestamp ? new Date(timestamp) : null;
  if (command === "contacted" && (!contactedAt || !Number.isFinite(contactedAt.getTime()) || contactedAt > new Date())) {
    throw new Error("Ange faktisk kontakttid i ISO-format, exempelvis 2026-11-06T09:00:00Z.");
  }

  const db = await connectDb();
  try {
    const now = new Date();
    if (command === "list") {
      const active = await PilotRequest.find({ expiresAt: { $gt: now } })
        .select("_id status createdAt lastContactAt expiresAt").sort({ createdAt: 1 }).lean();
      console.table(active.map((row) => ({
        id: String(row._id), status: row.status, inkom: row.createdAt,
        senasteKontakt: row.lastContactAt, raderas: row.expiresAt,
        obesvaradOver24h: row.status === "NEW" && now.getTime() - row.createdAt.getTime() > 86_400_000,
      })));
      const legacy = await PilotRequest.countDocuments({ expiresAt: { $exists: false } });
      if (legacy) console.warn(legacy + " äldre förfrågningar saknar lagringstid. Granska med backfill.");
      const indexes = await PilotRequest.collection.indexes();
      if (!indexes.some((index) => index.key.expiresAt === 1 && index.expireAfterSeconds === 0)) {
        console.warn("TTL-index saknas. Radering är inte aktiverad: kör db:indexes efter granskning.");
      }
    } else if (command === "show") {
      const row = await PilotRequest.findOne({ _id: id, expiresAt: { $gt: now } }).lean();
      if (!row) throw new Error("Förfrågan saknas, har löpt ut eller saknar lagringstid.");
      // Explicit action: never emit contact details in list, logs or a CI job.
      console.log(JSON.stringify(row, null, 2));
    } else if (command === "contacted") {
      if (!apply) {
        console.log({ preview: true, id, lastContactAt: contactedAt, expiresAt: pilotRequestExpiry(contactedAt!) });
        return;
      }
      if (!await recordPilotContact(id, contactedAt!)) {
        throw new Error("Ingen aktiv förfrågan kunde uppdateras. Kontrollera ID och kontakttid.");
      }
      console.log("Kontakttid och lagringstid uppdaterade.");
    } else if (command === "delete") {
      if (!apply) {
        console.log({ preview: true, id, exists: Boolean(await PilotRequest.exists({ _id: id })) });
        return;
      }
      const result = await PilotRequest.deleteOne({ _id: id });
      console.log("Raderade förfrågningar: " + result.deletedCount);
    } else if (command === "backfill") {
      // Legacy updatedAt is not proof of contact. Use recorded lastContactAt, or submission.
      // Review external correspondence before --apply: already expired rows become TTL eligible.
      const rows = await PilotRequest.collection.find({ expiresAt: { $exists: false } })
        .project({ _id: 1, createdAt: 1, lastContactAt: 1 }).toArray();
      for (const row of rows) {
        const since = row.lastContactAt instanceof Date ? row.lastContactAt : row.createdAt;
        if (!(since instanceof Date) || !Number.isFinite(since.getTime()) || since > now) {
          throw new Error("Ogiltig historik för " + String(row._id) + ". Granska manuellt.");
        }
      }
      for (const row of rows) {
        const lastContactAt = row.lastContactAt instanceof Date ? row.lastContactAt : row.createdAt as Date;
        const expiresAt = pilotRequestExpiry(lastContactAt);
        console.log({ id: String(row._id), lastContactAt, expiresAt, alreadyExpired: expiresAt <= now, preview: !apply });
        if (apply) await PilotRequest.collection.updateOne(
          { _id: row._id, expiresAt: { $exists: false } },
          { $set: { lastContactAt, expiresAt } },
        );
      }
      console.log("Granskade förfrågningar: " + rows.length);
    }
  } finally { await db.disconnect(); }
}

main().catch((error) => {
  // DB errors can include credentials or personal data; only expose our validation messages.
  console.error(error instanceof Error && error.name === "Error"
    ? error.message : "Åtgärden misslyckades. Kontrollera databasanslutning och behörighet.");
  process.exitCode = 1;
});
