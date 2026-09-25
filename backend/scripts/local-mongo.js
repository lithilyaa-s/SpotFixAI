const { MongoMemoryServer } = require("mongodb-memory-server");
const path = require("path");
const fs = require("fs");

async function run() {
  const dbPath = path.resolve(__dirname, "../.mongo-data");
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  console.log("Starting local MongoDB instance on port 27017...");
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbPath: dbPath,
      storageEngine: "wiredTiger",
    },
  });

  console.log(`✅ Local MongoDB started: ${mongod.getUri()}`);
  console.log(`Storage location: ${dbPath}`);
}

run().catch((err) => {
  console.error("❌ Failed to start local MongoDB:", err.message);
  process.exit(1);
});
