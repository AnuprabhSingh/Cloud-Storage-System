import { rm } from 'fs/promises';
import Directory from '../models/directoryModels.js';
import File from '../models/fileModel.js';

export const getDirectoryById = async (req, res) => {
    try {
      //console.log(req.cookies);
      // const db = req.db; // Use shared DB connection
      // console.log(db);
      const user = req.user
      // const _id = req.params.id ? new ObjectId(req.params.id) : user.rootDirId;
      const _id = req.params.id || user.rootDirId.toString();
      // const directoryData = directoriesData.find((directory) => directory.id === id && directory.userId === user.id);
      const directoryData  = await Directory.findOne({_id}).lean();
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

      const files = await File.find({parentDirId: directoryData._id}).lean();
      const directories = await Directory.find({parentDirId: _id}).lean();
  
      return res.json({ 
        ...directoryData, 
        files: files.map((file)=> ({...file,id:file._id})), 
        directories: directories.map((dir)=> ({...dir,id:dir._id}))
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  export const createDirectory = async (req, res) => {
      const user = req.user
      // const db = req.db; // Use shared DB connection
      
      const parentDirId = req.params.parentDirId || user.rootDirId.toString();
      const  dirname  = req.headers.dirname || 'New Directory'
      
      try {
        // await writeFile('./directoriesDB.json', JSON.stringify(directoriesData))
      // const parentDir = directoriesData.find((dir) => dir.id === parentDirId)
      const parentDir = await Directory.findOne({_id: parentDirId}).lean();
  
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
      await Directory.create({
        name: dirname,
        parentDirId: parentDirId,
        userId: user._id,
      })
  
        res.json({ message: "Directory Created!" })
      } catch (err) {
  console.dir(err.errInfo.details, { depth: null });
  res.status(500).json({ err: err.message });
}
    }

    export const renameDirectory = async (req, res, next) => {
        const user = req.user;
        const { id } = req.params;
        const { newDirName } = req.body;
        // const db = req.db;
        // const dirCollection = db.collection("directories");
        
      
        // const dirData = directoriesData.find((dir) => dir.id === id);
      
        // if (!dirData) return res.status(404).json({ message: "Directory not found!" });
      
        // Check if the directory belongs to the user
        // if (dirData.userId !== user.id) {
        //   return res.status(403).json({ message: "You are not authorized to rename this directory!" });
        // }
      
        // dirData.name = newDirName;
        try {
          // await writeFile('./directoriesDB.json', JSON.stringify(directoriesData));
            const a = await Directory.findByIdAndUpdate(
          { _id: id, userId: user._id },
          { $set: { name: newDirName } }
        );
          // console.log(a);
          res.status(200).json({ message: "Directory Renamed!" });
        } catch (err) {
          next(err);
        }
      }

    export const deleteDirectory = async (req, res, next) => {
    const user = req.user;
    const { id } = req.params;
    // const db = req.db;
    // const dirCollection = db.collection("directories");
    // const fileCollection = db.collection("files");

    // need to use recursion to delete all subdirectories and files
    try{
    async function deleteDirectoryRecursively(dirId) {
      // Find all subdirectories
      const subDirs = await Directory.find({ parentDirId: dirId, userId: user._id }).lean();
      for (const subDir of subDirs) {
        await deleteDirectoryRecursively(subDir._id);
      }
  
      // Find and delete all files in this directory
      const files = await File.find({ parentDirId: dirId, userId: user._id }).lean();
      for (const file of files) {
        // Delete file from filesystem
        await rm(`./storage/${file._id}${file.extension}`);
        // Delete file from DB
        await File.findByIdAndDelete({ _id: file._id });
      }
  
      // Finally, delete the directory itself
      await Directory.deleteOne({ _id: dirId, userId: user._id });
    }
  }
  catch (err) {
    next(err);
  }
  
    try {
      const dirData = await Directory.findOne({ _id:id, userId: user._id }).select('_id').lean();
      if (!dirData) {
        return res.status(404).json({ message: "Directory not found!" });
      }
  
      await deleteDirectoryRecursively(id);
  
      return res.status(200).json({ message: "Directory and its contents deleted successfully!" });
    } catch (err) {
      next(err);
    }

  }