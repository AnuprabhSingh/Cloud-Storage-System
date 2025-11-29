import express from 'express';
import { rm, writeFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import filesData from '../filesDB.json' with { type: "json" };
import directoriesData from '../directoriesDB.json' with { type: "json" };
import validateIdMiddleware from '../middlewares/validateIdMiddleware.js';
import { ObjectId } from 'mongodb';



const router = express.Router();

router.param("parentDirId",validateIdMiddleware)
router.param("id",validateIdMiddleware)


router.get("/:id", async (req,res)=>{
    const {id} = req.params
    const db = req.db;
    const fileCollection = db.collection("files");
    const dirCollection = db.collection("directories");
    // const fileData = filesData.find((file)=> file.id === id)
    const fileData = await fileCollection.findOne({_id: new ObjectId(id), userId: req.user._id});
    console.log(fileData);
    
    if(!fileData){
        return res.status(404).json({
            message: "File Not Found"
        })
    }
    // const parentDir = directoriesData.find((dir) => dir.id === fileData.parentDirId )
    // const parentDir = await dirCollection.findOne({_id: fileData.parentDirId});
    // if (!parentDir) {
    //     return res.status(404).json({ error: "Parent directory not found!" });
    //   }
    // if(parentDir.userId !== req.user.id){
    //     return res.status(401).json({error : "Access Denied"})
    // }
    const extension = fileData.extension;
    const filePath = `${process.cwd()}/storage/${id}${extension}`;
    //res.setHeader('Access-Control-Expose-Headers', 'Content-Range');
    // console.log(req.query.action);
    if(req.query.action === 'download'){
        //res.setHeader('Content-Disposition', `attachment; filename="${fileData.name}"`);
        res.download(filePath, fileData.name)
       //console.log("hi");
    }
    return res.sendFile(`${process.cwd()}/storage/${id}${extension}`,(err)=>{
        if(!res.headersSent && err){
            return res.status(404).json({
                message: "File Not Found"
            })
        }
    })

})


router.post("/:parentDirId?", async (req, res) => {  
   const parentDirId = req.params.parentDirId || req.user.rootDirId;
   const filename = req.headers.filename || 'untitled';
   const db = req.db;

  //  const parentDirData = directoriesData.find(dir => dir.id === parentDirId);
    const dirCollection = db.collection("directories");
    const fileCollection = db.collection("files");
    const parentDirData = await dirCollection.findOne({_id: new ObjectId(parentDirId), userId: req.user._id});

   if (!parentDirData) {
     return res.status(404).json({ error: "Parent directory not found" });
   }
    const extension = path.extname(filename);
   const insertedFile = await fileCollection.insertOne({
       extension,
       name: filename,
       parentDirId: parentDirData._id,
       userId: req.user._id,
   });
   const id = insertedFile.insertedId.toString();
   
   const fullFileName = `${id}${extension}`;
   const writeStream = createWriteStream(`./storage/${fullFileName}`);
   
   req.pipe(writeStream);
   
   req.on('end', async () => {
      return res.json({
             message: "File Uploaded"
     });
   });

   req.on('error', async (err) => {
       await fileCollection.deleteOne({_id: insertedFile.insertedId});
       return res.status(500).json({
           message: "File upload failed",
           error: err.message,
       });
   });
});


router.delete("/:id", async (req, res, next) => {
    const { id } = req.params;
    const db = req.db;
    const fileCollection = db.collection("files");
    const dirCollection = db.collection("directories");
    // const fileIndex = filesData.findIndex((file) => file.id === id);
    const fileData = await fileCollection.findOne({_id: new ObjectId(id), userId: req.user._id});
    
  
    // Check if file exists
    if (!fileData) {
      return res.status(404).json({ error: "File not found!" });
    }
  
    // const fileData = filesData[fileIndex];
  
    // Check parent directory ownership
    // const parentDir = directoriesData.find((dir) => dir.id === fileData.parentDirId);
    // if (!parentDir) {
    //   return res.status(404).json({ error: "Parent directory not found!" });
    // }
    // if (parentDir.userId !== req.user.id) {
    //   return res.status(403).json({ error: "You don't have access to this file." });
    // }
  
    try {
      // Remove file from filesystem
      await rm(`./storage/${id}${fileData.extension}`);
  
      // Remove file from DB
      // filesData.splice(fileIndex, 1);
      // parentDir.files = parentDir.files.filter((fileId) => fileId !== id);
      await fileCollection.deleteOne({_id: new ObjectId(id)});
  
      // Persist changes
      // await writeFile("./filesDB.json", JSON.stringify(filesData));
      // await writeFile("./directoriesDB.json", JSON.stringify(directoriesData));
  
      return res.status(200).json({ message: "File Deleted Successfully" });
    } catch (err) {
      next(err);
    }
  });
    router.patch("/:id",async(req,res)=>{
        
        // const filename = path.join("/" ,req.params[0])
        const {id} = req.params
        const db = req.db;
        const fileCollection = db.collection("files");
        const dirCollection = db.collection("directories");

        const fileData = await fileCollection.findOne({_id: new ObjectId(id), userId: req.user._id});


        if (!fileData) {
            return res.status(404).json({ error: "File not found!" });
          }

          // const parentDir = directoriesData.find((dir) => dir.id === fileData.parentDirId);
          // if (!parentDir) {
          //   return res.status(404).json({ error: "Parent directory not found!" });
          // }

          // if (parentDir.userId !== req.user.id) {
          //   return res.status(403).json({ error: "You don't have access to this file." });
          // }
        // fileData.name = req.body.newFileName




        try{
            // await writeFile("./filesDB.json",JSON.stringify(filesData))
            await fileCollection.updateOne(
                {_id: new ObjectId(id)},
                {$set: {name: req.body.newFileName}}
            )
            return res.json({
            message: "File Renamed"
        })
        }
        catch(err){
            err.status = 510
            next(err)
        }
    // try{
    //     await rename(`./Storage/${filename}`,
    //         `./Storage/${req.body.newFileName}`);
    //         res.json({
    //             message: "File Renamed"
    //         })
    // }
    // catch{
    //     res.status(500).json({
    //         message: "File Not Found"
    //     })
    // }
    })

   
    
export default router;