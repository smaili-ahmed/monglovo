const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const BACKUP_DIR = path.join(__dirname, '..', '..', 'data', 'backup-before-glovo-sync');

async function main() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/glovo-oujda';
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log('=== MONGODB BACKUP ===');
  console.log('Connected to:', uri);

  const collections = ['restaurants', 'categories', 'products'];

  for (const col of collections) {
    const docs = await db.collection(col).find({}).toArray();
    const file = path.join(BACKUP_DIR, `${col}-${docs.length}.json`);
    fs.writeFileSync(file, JSON.stringify(docs, null, 2));
    console.log(`[${col}] ${docs.length} documents backed up to ${path.basename(file)}`);
  }

  await mongoose.disconnect();
  console.log('=== BACKUP COMPLETE ===');
}

main().catch(e => { console.error('BACKUP FAILED:', e.message); process.exit(1); });
