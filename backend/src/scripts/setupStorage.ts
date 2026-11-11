// One-time: create (or update) the private file bucket. Run: npm run storage:setup
import { env } from '../env';
import { ensureBucket } from '../storage';

if (!env.storageKey) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY in backend/.env first.');
  process.exit(1);
}
ensureBucket()
  .then((r) => console.log(`Bucket "${env.storageBucket}" ${r} (private, max 10 MB, images/audio/pdf only).`))
  .catch((e: Error) => {
    console.error(e.message);
    process.exit(1);
  });
