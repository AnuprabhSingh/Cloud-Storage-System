import express from 'express';
import filesData from '../filesDB.json' with { type: "json" };
import directoriesData from '../directoriesDB.json' with { type: "json" };
import userData from '../usersDB.json' with { type: "json" };
import CheckAuth from '../middlewares/authMiddleware.js';
import { writeFile } from 'fs/promises';
import validateIdMiddleware from '../middlewares/validateIdMiddleware.js';
import { createDirectory, deleteDirectory, getDirectoryById, renameDirectory } from '../controllers/directoryControllers.js';

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


router.get("/:id?", getDirectoryById);

router.post("/:parentDirId?", createDirectory);

router.patch('/:id', renameDirectory);

router.delete("/:id", deleteDirectory);
  
   
export default router;

//