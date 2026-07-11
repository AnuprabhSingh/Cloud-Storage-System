import {Schema, model} from 'mongoose';

const userSchema = new Schema({

    name:{
        type: String,
        required: true,
        minlength: [3,'name field should a string with at least three characters']
    },
    email:{
        type: String,
        required: true,
        match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,'Please enter a valid email address'],
        unique: true
    },
    password:{
        type: String,
        required: true,
        minlength: [2,'password field should a string with at least two characters']
    },
    rootDirId:{
        type: Schema.Types.ObjectId,
        ref: "Directory",
    }
},
{
    strict: "throw",
    versionKey: false
}
)

const User = model("User", userSchema);

export default User;