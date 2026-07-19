// import { MongoClient } from "mongodb";
import mongoose from "mongoose";

// const client = new MongoClient("mongodb://anuprabh:anu@localhost:27017/StorageApp?replicaSet=myReplicaSet");

export async function connectDB(){
    try{
        await mongoose.connect("mongodb://anuprabh:anu@localhost:27017/StorageApp?replicaSet=myReplicaSet");
        console.log("Database connnected !");
    }
    catch(err){
        console.error("Failed to connect to the database", err);
        process.exit(1); // Exit the process with an error code
    }
}

process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.log("Database Disconnected !");
    process.exit();
});