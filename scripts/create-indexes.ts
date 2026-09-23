import { Product } from "../src/models/product";
import { Warehouse } from "../src/models/warehouse";
import { Location } from "../src/models/location";
import { connectDb } from "../src/lib/server/db";
import { User } from "../src/models/user";
import { Organization } from "../src/models/organization";
import { Membership } from "../src/models/membership";
import { Session } from "../src/models/session";
import { RateLimit } from "../src/models/rate-limit";

async function main() {
  const db = await connectDb();
  try {
    for (const model of [User, Organization, Membership, Session, RateLimit, Warehouse, Location, Product]) {
      await model.createCollection();
      await model.createIndexes();
      console.log(model.collection.name + ": index klara");
    }
  } finally { await db.disconnect(); }
}
main().catch(() => { console.error("Kunde inte skapa index. Kontrollera MongoDB-konfigurationen."); process.exitCode = 1; });
