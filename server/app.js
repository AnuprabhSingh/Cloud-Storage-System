import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import fileRoute from './routes/fileRoute.js';
import directoryRoute from './routes/directoryRoute.js';
import userRoutes from './routes/userRoutes.js';
import CheckAuth from './middlewares/authMiddleware.js';
import { connectDB } from './db.js';


try{
    const db = await connectDB();
// console.log(db.databaseName);

const app = express();

app.use(cookieParser());

app.use(cors(
    {origin: "http://localhost:5173",
    credentials: true,}
))

app.use(express.json())

app.use((err,req,res,next)=>{
    res.status(err.status|| 500).json({
        message: "something went wrong",
    })
}
)

app.use((req, res, next) => {
    req.db = db;  // Share the single DB connection
    next();
});

app.use("/directory",CheckAuth ,directoryRoute)
app.use("/user",userRoutes)
app.use("/file",CheckAuth,fileRoute)





app.listen(80,'::',()=>{
    console.log("Server is running on port 80");
})

}
catch(err){
    console.error("Failed to connect to the database", err);
}
