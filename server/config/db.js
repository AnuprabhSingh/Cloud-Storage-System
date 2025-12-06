import { MongoClient } from "mongodb";
const client = new MongoClient("mongodb://anuprabh:anu@localhost:27017/StorageApp?replicaSet=myReplicaSet");

export async function connectDB(){
    await client.connect();
    console.log("Database connnected !");
    const db = client.db();
    return db;
}

export { client };

process.on("SIGINT", async () => {
    await client.close();
    console.log("Database Disconnected !");
    process.exit();
});