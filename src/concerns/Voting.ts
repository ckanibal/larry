// concerns/Voting.ts

import { Schema, Model, model, Document, Types } from "mongoose";
import httpStatus = require("http-status");

/**
 * Voting Model
 */

export interface IVote extends Document {
  impact: number;
  author: {};
  ref: {
    model: string,
    document: Document,
  };
}


export interface IVoteModel extends Model<IVote> {
}


const VoteSchema = new Schema({
  author: {
    type: Schema.Types.ObjectId, ref: "User",
    required: true,
  },
  ref: {
    model: Schema.Types.String,
    document: {type: Schema.Types.ObjectId, refPath: "ref.model", required: true},
  },
  impact: {
    type: Schema.Types.Number,
    required: true,
  }
}, {timestamps: true});
VoteSchema.index({author: 1, "ref.document": 1}, {unique: true});

VoteSchema.pre("save", true, function (next, done) {
  this.populate("ref.document", function (err: Error, vote: IVote) {
    if (!err) {
      next();

      // update referenced Document
      vote.ref.document.update({
        $inc: {
          "voting.sum": vote.impact,
        }
      }, {}, function (err, raw) {
        if (!err) {
          done();
        } else {
          // Todo: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/19954
          (<any>done)(err);
        }
      });
    } else {
      next(err);
    }
  });
});

VoteSchema.pre("remove", true, function (next, done) {
  // undo vote impact
  this.populate("ref.document", function (err: Error, vote: IVote) {
    if (!err) {
      next();

      // update referenced Document
      vote.ref.document.update({
        $inc: {
          "voting.sum": -vote.impact,
        }
      }, {}, function (err, raw) {
        if (!err) {
          done();
        } else {
          // Todo: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/19954
          (<any>done)(err);
        }
      });
    } else {
      next(err);
    }
  });
});

export const Vote = model<IVote>("Vote", VoteSchema) as IVoteModel;


export interface Votable {
  voting: {
    sum: number
  };

  vote(impact: Number): Function;
}

export function votingPlugin<T extends Document>
(schema: Schema, options: { user?: Model<T>, validate?: { validator: Function, message?: string } } = {validate: {validator: () => true}}) {

  schema.add({
    voting: {
      sum: {
        type: Schema.Types.Number,
        default: 0,
      }
    }
  });

  schema.methods.vote = function (impact: number = 1, user: T, cb?: Function) {
    if (options.validate.validator(impact)) {
      Vote.find({author: user.id, "ref.document": this.id}, (err: Error, votes: IVote[]) => {
        if (err) {
          return cb(err);
        } else {
          // Remove previous votes
          Promise.all(votes.map(vote => vote.remove()))
            .then(() => {
              Vote.create({
                impact,
                author: user,
                ref: {
                  document: this,
                  model: this.constructor.modelName // Todo: This is probably not api-safe
                },
              }, (err: Error, vote: IVote) => {
                if (err) {
                  return cb(err);
                } else {
                  return cb(undefined, vote);
                }
              });
            })
            .catch(reason => cb(reason));
        }
      });
    } else {
      const err = new Error(options.validate.message);
      err.status = httpStatus.BAD_REQUEST;
      return cb(err);
    }
  };
}
