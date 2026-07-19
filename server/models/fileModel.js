import {Schema, model} from 'mongoose';

const fileSchema = new Schema({

    name:{
        type: String,
        required: true
    },
    extension:{
        type: String,
        required: true
    },
    userId:{
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    parentDirId:{
        type: Schema.Types.ObjectId,
        ref: "Directory"
    }
},
{
    strict: "throw",
    versionKey: false
}
)

const File = model("File", fileSchema);

export default File;