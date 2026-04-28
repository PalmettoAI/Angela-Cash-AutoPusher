import { db, schema } from "./index";
import { destinationAdapters } from "../destinations";

async function seed() {
  console.log("Seeding destinations...");
  for (const adapter of destinationAdapters) {
    await db
      .insert(schema.destinations)
      .values({ key: adapter.key, displayName: adapter.displayName, enabled: true })
      .onConflictDoUpdate({
        target: schema.destinations.key,
        set: { displayName: adapter.displayName },
      });
    console.log(`  ✓ ${adapter.key} (${adapter.displayName})`);
  }
  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
