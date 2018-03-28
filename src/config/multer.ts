// config/multer.ts

import * as multer from "multer";

/**
 * multer file upload configuration
 */

// 100MB default max filesize
const MAX_FILESIZE = parseInt(process.env.MAX_SIZE) || 100 * 1024 * 1024;

const upload = multer({dest: "./tmp/", limits: {fileSize: MAX_FILESIZE}});
export = upload;
