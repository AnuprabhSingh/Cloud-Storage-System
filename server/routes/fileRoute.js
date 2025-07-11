import express from 'express';
import { rm, writeFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import filesData from '../filesDB.json' with { type: "json" };
import directoriesData from '../directoriesDB.json' with { type: "json" };
import { error } from 'console';
import validateIdMiddleware from '../middlewares/validateIdMiddleware.js';



const router = express.Router();

router.param("parentDirId",validateIdMiddleware)
router.param("id",validateIdMiddleware)


router.get("/:id", (req,res)=>{
    const {id} = req.params
    const fileData = filesData.find((file)=> file.id === id)
    if(!fileData){
        return res.status(404).json({
            message: "File Not Found"
        })
    }
    const parentDir = directoriesData.find((dir) => dir.id === fileData.parentDirId )
    if (!parentDir) {
        return res.status(404).json({ error: "Parent directory not found!" });
      }
    if(parentDir.userId !== req.user.id){
        return res.status(401).json({error : "Access Denied"})
    }
    const extension = fileData.extension;
    const filePath = `${process.cwd()}/storage/${id}${extension}`;
    //res.setHeader('Access-Control-Expose-Headers', 'Content-Range');
    console.log(req.query.action);
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
   
   // Add this validation check
   const parentDirData = directoriesData.find(dir => dir.id === parentDirId);
   if (!parentDirData) {
     return res.status(404).json({ error: "Parent directory not found" });
   }

   if (parentDirData.userId !== req.user.id) {
    return res
      .status(403)
      .json({ error: "You do not have permission to upload to this directory." });
  }


   const id = crypto.randomUUID();
   const extension = path.extname(filename);
   const fullFileName = `${id}${extension}`;
   const writeStream = createWriteStream(`./storage/${fullFileName}`);
   
   req.pipe(writeStream);
   
   req.on('end', async () => {
     filesData.push({
       id,
       extension,
       name: filename,
       parentDirId
     });
     
     parentDirData.files.push(id); // Now safe
     
     try{
        await writeFile('./directoriesDB.json', JSON.stringify(directoriesData));
        await writeFile("./filesDB.json", JSON.stringify(filesData));
        return res.json({
             message: "File Uploaded"
     });
     }
     catch(err){
        return res.status(500).json({
            message: "could not write to file",
        })
     }

   });
});


router.delete("/:id", async (req, res, next) => {
    const { id } = req.params;
    const fileIndex = filesData.findIndex((file) => file.id === id);
  
    // Check if file exists
    if (fileIndex === -1) {
      return res.status(404).json({ error: "File not found!" });
    }
  
    const fileData = filesData[fileIndex];
  
    // Check parent directory ownership
    const parentDir = directoriesData.find((dir) => dir.id === fileData.parentDirId);
    if (!parentDir) {
      return res.status(404).json({ error: "Parent directory not found!" });
    }
    if (parentDir.userId !== req.user.id) {
      return res.status(403).json({ error: "You don't have access to this file." });
    }
  
    try {
      // Remove file from filesystem
      await rm(`./storage/${id}${fileData.extension}`, { recursive: true });
  
      // Remove file from DB
      filesData.splice(fileIndex, 1);
      parentDir.files = parentDir.files.filter((fileId) => fileId !== id);
  
      // Persist changes
      await writeFile("./filesDB.json", JSON.stringify(filesData));
      await writeFile("./directoriesDB.json", JSON.stringify(directoriesData));
  
      return res.status(200).json({ message: "File Deleted Successfully" });
    } catch (err) {
      next(err);
    }
  });
    router.patch("/:id",async(req,res)=>{
        
        // const filename = path.join("/" ,req.params[0])
        const {id} = req.params
        const fileData = filesData.find((file)=> file.id === id)
        if (!fileData) {
            return res.status(404).json({ error: "File not found!" });
          }

          const parentDir = directoriesData.find((dir) => dir.id === fileData.parentDirId);
          if (!parentDir) {
            return res.status(404).json({ error: "Parent directory not found!" });
          }

          if (parentDir.userId !== req.user.id) {
            return res.status(403).json({ error: "You don't have access to this file." });
          }
        fileData.name = req.body.newFileName




        try{
            await writeFile("./filesDB.json",JSON.stringify(filesData))
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