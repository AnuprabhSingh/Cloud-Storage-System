import userData from "../usersDB.json" with {type: "json"};


export default function CheckAuth(req,res,next){
    const { uid } = req.cookies;
    const user = userData.find(user => user.id === uid);
    if (!uid || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = user
    next()
}