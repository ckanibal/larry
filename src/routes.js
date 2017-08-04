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
    Upload.index(req.query).then((uploads) => {
      res.json({
        'message': 'Success',
        uploads
      });
    }).catch(next);
  })
  .post((req, res, next) => {
    Upload.create(req.body)
      .then((upload) => {
        res.json({
          'message': 'Success',
          upload
        })
      })
      .catch(next);
  });

routes.route('/uploads/:uploadId')
  .get(({ params: { uploadId: id } }, res, next) => {
    Upload.get(id).then((upload) => {
      res.json({
        'message': 'Success',
        upload
      });
    }).catch(next);
  })
  .patch((req, res, next) => next)
  .delete((req, res, next) => next);

export default routes;
