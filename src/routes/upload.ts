import * as multer from "multer";


const upload = multer({ dest: "./tmp/", });
export = upload;
