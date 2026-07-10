import express from 'express';
import filesData from '../filesDB.json' with { type: "json" };
import directoriesData from '../directoriesDB.json' with { type: "json" };
import validateIdMiddleware from '../middlewares/validateIdMiddleware.js';
import { getFile,uploadFile,deleteFile,renameFile } from '../controllers/fileControllers.js';


const router = express.Router();

router.param("parentDirId",validateIdMiddleware)
router.param("id",validateIdMiddleware)


router.get("/:id", getFile)


router.post("/:parentDirId?", uploadFile);


router.delete("/:id", deleteFile);

router.patch("/:id", renameFile);

   
    
export default router;