import { Router } from 'express';
const routes = Router();

// import schemas
import Upload from './upload.schema.js';

/**
 * Uploads
 */
routes.route('/uploads')
  .all(function(req, res, next) {
    next();
  })
  .get((req, res, next) => {
    console.log(req.query);
    Upload.index(req.query).then((uploads) => {
      res.json(uploads);
    }).catch(next);
  })
  .post((req, res, next) => {
    Upload.create(req.body)
      .then((upload) => {
        res.json({
          'message': 'Success',
          'Upload': upload
        })
      })
      .catch(next);
  });

export default routes;
