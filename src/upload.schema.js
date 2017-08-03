import mongoose from 'mongoose';
import httpStatus from 'http-status';

/**
 * Upload Schema
 */
const UploadSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    text: true
  },
  description: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
    text: true
  },
  tags: {
    type: [String],
    text: true
  },
  pic: {
    type: String
  },
  file: {
    type: String
  },
  meta: {
    favs: {
      type: Number
    },
    votes: [{
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Author',
        required: true,
        unique: true
      },
      upvote: {
        type: Boolean,
        required: true,
      },
      createdAt: {
        type: Date,
        required: true,
        default: Date.now
      }
    }]
  }
}, {
  timestamps: true
});

/**
 * Implement CRUD methods
 */
class UploadClass {
  /**
   * List uploads
   * @param {number} skip - Number of uploads to be skipped.
   * @param {number} limit - Limit number of uploads to be returned.
   * @param sort - Sort uploads
   * @param query - Query uploads
   * @returns {Promise<Upload[]>}
   */
  static index({skip = 0, limit = 50, sort = {createdAt: -1}, query = {}} = {}) {
    return this.find()
      .where(query)
      .sort(sort)
      .skip(+skip)
      .limit(+limit)
      .exec();
  }

  /**
   * Get upload
   * @param {ObjectId} id - The objectId of upload.
   * @returns {Promise<Upload, APIError>}
   */
  static get(id) {
    return this.findById(id)
      .exec()
      .then((upload) => {
        if (upload) {
          return upload;
        }
        const err = new Error('No such upload exists!', httpStatus.NOT_FOUND);
        return Promise.reject(err);
      });
  }
}
UploadSchema.loadClass(UploadClass);


/**
 * @typedef Upload
 */
export default mongoose.model('Upload', UploadSchema);
