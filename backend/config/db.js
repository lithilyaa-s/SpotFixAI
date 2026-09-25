const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const env = require("./env");

let localMongoServer = null;

const connectDB = async () => {
  try {
    if (
      !env.MONGO_URI ||
      env.MONGO_URI === "your_mongodb_atlas_connection_string" ||
      env.MONGO_URI === "your_mongodb_atlas_uri"
    ) {
      console.log("⚠️ MongoDB URI not set. Add MONGO_URI in backend/.env");
      return;
    }

    try {
      const conn = await mongoose.connect(env.MONGO_URI, {
        serverSelectionTimeoutMS: 2500,
      });

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (initialErr) {
      const isLocal = env.MONGO_URI.includes("127.0.0.1") || env.MONGO_URI.includes("localhost");

      if (isLocal && env.NODE_ENV !== "production") {
        console.log("📦 Local MongoDB server not running on port 27017. Starting local MongoDB instance...");
        try {
          const { MongoMemoryServer } = require("mongodb-memory-server");
          const dbPath = path.resolve(__dirname, "../.mongo-data");
          if (!fs.existsSync(dbPath)) {
            fs.mkdirSync(dbPath, { recursive: true });
          }

          localMongoServer = await MongoMemoryServer.create({
            instance: {
              port: 27017,
              dbPath: dbPath,
              storageEngine: "wiredTiger",
            },
          });

          const conn = await mongoose.connect(env.MONGO_URI);
          console.log(`✅ Local MongoDB started and connected: ${conn.connection.host}`);
          return;
        } catch (localMongoErr) {
          console.error(`❌ Could not auto-start local MongoDB: ${localMongoErr.message}`);
        }
      }

      throw initialErr;
    }
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    console.log("⚠️ Backend will continue running, but MongoDB operations require a valid MONGO_URI in backend/.env");
  }
};

module.exports = connectDB;