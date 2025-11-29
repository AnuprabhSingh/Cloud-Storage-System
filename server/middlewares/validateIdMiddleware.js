import { ObjectId } from "mongodb"

export default function (req,res,next,id){
    // mogodb ObjectId validation
    if(!ObjectId.isValid(id)){
        return res.status(400).json({message: "Invalid ID format"})
    }
    next()
  }