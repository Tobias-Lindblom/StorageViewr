import "server-only";
import mongoose from "mongoose";

const cache = globalThis as typeof globalThis & { mongoosePromise?: Promise<typeof mongoose> };
export async function connectDb() {
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) {
    throw new Error("MONGODB_URI och MONGODB_DB måste konfigureras.");
  }
  if (!cache.mongoosePromise) {
    cache.mongoosePromise = mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB,
      autoIndex: false,
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    }).catch((error: unknown) => {
      cache.mongoosePromise = undefined;
      throw error;
    });
  }
  return cache.mongoosePromise;
}
