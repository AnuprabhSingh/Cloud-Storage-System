import { MongoClient } from "mongodb";
const client = new MongoClient("mongodb://localhost:27017/StorageApp");

export async function connectDB(){
    await client.connect();
    console.log("Database connnected !");
    const db = client.db();
    return db;
}

process.on("SIGINT", async () => {
    await client.close();
    console.log("Database Disconnected !");
    process.exit();
});