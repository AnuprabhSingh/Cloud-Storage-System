import express from 'express';
import filesData from '../filesDB.json' with { type: "json" };
import { ObjectId } from 'mongodb';
import directoriesData from '../directoriesDB.json' with { type: "json" };
import userData from '../usersDB.json' with { type: "json" };
import CheckAuth from '../middlewares/authMiddleware.js';
import { writeFile } from 'fs/promises';
import { rm } from 'fs/promises';
import validateIdMiddleware from '../middlewares/validateIdMiddleware.js';

//console.log(directoriesData);
const router = express.Router();

// router.get("/?*",async(req,res)=>{
//     const dirname = path.join("/" ,req.params[0])
//     console.log(dirname);
//     const filePath = dirname ? `./storage/${dirname}` : './storage';
//     try{
//         const fileList = await readdir(filePath);
//     const resData = []
//     for(const file of fileList){
//         const stats = await stat(`${filePath}/${file}`);
//         resData.push({name: file, isDirectory: stats.isDirectory()})
//     }
//     res.json(resData)
//     }
//     catch(err){
//         res.status(500).json({
//             message: err.message
//         })
//     }
// })

router.param("parentDirId",validateIdMiddleware)
router.param("id",validateIdMiddleware)


router.get("/:id?", async (req, res) => {
    try {
      //console.log(req.cookies);
      const db = req.db; // Use shared DB connection
      // console.log(db);
      const user = req.user
      const _id = req.params.id ? new ObjectId(req.params.id) : user.rootDirId;
      // const directoryData = directoriesData.find((directory) => directory.id === id && directory.userId === user.id);
      const directoryData  = await db.collection("directories").findOne({_id: _id});
      // console.log(directoryData);
      if (!directoryData) {
        return res.status(404).json({ error: "Directory not found or you do not have access to it!" });
      }
  
      // const files = directoryData.files
      //   .map(fileId => filesData.find(file => file.id === fileId))
      //   .filter(Boolean);
  
      // const directories = directoryData.directories
      //   .map(dirId => directoriesData.find(dir => dir.id === dirId))
      //   .filter(Boolean)
      //   .map(({ id, name }) => ({ id, name }));

      const files = await db.collection("files").find({parentDirId: directoryData._id}).toArray();
      const directories = await db.collection("directories").find({parentDirId: _id}).toArray();
  
      return res.json({ 
        ...directoryData, 
        files: files.map((file)=> ({...file,id:file._id})), 
        directories: directories.map((dir)=> ({...dir,id:dir._id}))
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

router.post("/:parentDirId?", async (req, res) => {
    const user = req.user
    const db = req.db; // Use shared DB connection
    
    const parentDirId = req.params.parentDirId ? new ObjectId(req.params.parentDirId) : user.rootDirId;
    const  dirname  = req.headers.dirname || 'New Directory'
    
    try {
      // await writeFile('./directoriesDB.json', JSON.stringify(directoriesData))
      const dirCollection = db.collection("directories");
    // const parentDir = directoriesData.find((dir) => dir.id === parentDirId)
    const parentDir = await dirCollection.findOne({_id: parentDirId});

    if (!parentDir) { return res.status(404).json({ error: "Parent directory not found" }) }

    // parentDir.directories.push(id)
    // directoriesData.push({
    //   id,
    //   name: dirname,
    //   parentDirId,
    //   files: [],
    //   userId: user.id,
    //   directories: []
    // })
    await dirCollection.insertOne({
      name: dirname,
      parentDirId: parentDirId,
      userId: user._id,
    })

      res.json({ message: "Directory Created!" })
    } catch (err) {
      res.status(404).json({ err: err.message });
    }
  });

  router.patch('/:id', async (req, res, next) => {
    const user = req.user;
    const { id } = req.params;
    const { newDirName } = req.body;
    const db = req.db;
    const dirCollection = db.collection("directories");
  
    // const dirData = directoriesData.find((dir) => dir.id === id);
  
    // if (!dirData) return res.status(404).json({ message: "Directory not found!" });
  
    // Check if the directory belongs to the user
    // if (dirData.userId !== user.id) {
    //   return res.status(403).json({ message: "You are not authorized to rename this directory!" });
    // }
  
    // dirData.name = newDirName;
    try {
      // await writeFile('./directoriesDB.json', JSON.stringify(directoriesData));
        const a = await dirCollection.updateOne(
      { _id: new ObjectId(id), userId: user._id },
      { $set: { name: newDirName } }
    );
      // console.log(a);
      res.status(200).json({ message: "Directory Renamed!" });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    const user = req.user;
    const { id } = req.params;
    const db = req.db;
    const dirCollection = db.collection("directories");
    const fileCollection = db.collection("files");

    // need to use recursion to delete all subdirectories and files
    async function deleteDirectoryRecursively(dirId) {
      // Find all subdirectories
      const subDirs = await dirCollection.find({ parentDirId: dirId, userId: user._id }).toArray();
      for (const subDir of subDirs) {
        await deleteDirectoryRecursively(subDir._id);
      }
  
      // Find and delete all files in this directory
      const files = await fileCollection.find({ parentDirId: dirId, userId: user._id }).toArray();
      for (const file of files) {
        // Delete file from filesystem
        await rm(`./storage/${file._id}${file.extension}`);
        // Delete file from DB
        await fileCollection.deleteOne({ _id: file._id });
      }
  
      // Finally, delete the directory itself
      await dirCollection.deleteOne({ _id: dirId, userId: user._id });
    }
  
    try {
      const dirData = await dirCollection.findOne({ _id: new ObjectId(id), userId: user._id });
      if (!dirData) {
        return res.status(404).json({ message: "Directory not found!" });
      }
  
      await deleteDirectoryRecursively(new ObjectId(id));
  
      return res.status(200).json({ message: "Directory and its contents deleted successfully!" });
    } catch (err) {
      next(err);
    }

  });
  
   
export default router;

//