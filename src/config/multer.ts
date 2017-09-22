// config/multer.ts

import * as multer from "multer";

/**
 * multer file upload configuration
 */
const upload = multer({ dest: "./tmp/", });
export = upload;
