export default function (req,res,next,id){
    if(id.length !== 36){
      return res.status(400).json({error: `Invalid ${id}`})
    }
    next()
  }