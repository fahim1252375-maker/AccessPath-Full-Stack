import { db } from '../backend/src/repositories/db.ts';
import { seedDatabaseIfEmpty } from '../backend/src/jobs/seed.ts';

async function main() {
  await db.connect();
  await seedDatabaseIfEmpty();
  console.log('Seed check complete. Mode:', db.getMode());
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
