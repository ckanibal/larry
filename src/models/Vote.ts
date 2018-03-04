// models/Voting.ts

import { mongoose } from "../config/database";
import { Schema, Model, Document, Types } from "mongoose";
import httpStatus = require("http-status");

import { User, IUser } from "./User";

/**
 * Voting Model
 */
export interface IVote extends Document {
  impact: number;
  author: IUser;
  ref: {
    model: string,
    document: Document,
    required: true,
  };
}


export interface IVoteModel extends Model<IVote> {
  // tbd.
}


const VoteSchema = new Schema({
  author: {
    type: Schema.Types.ObjectId,
    ref: "User"
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


VoteSchema.methods.updateReferenced = async function (next: Function) {
  try {
    const vote = await Vote.findById(this.id).populate("ref.document");
    await vote.ref.document.update({
      $inc: {
        "voting.sum": this.impact,
      },
      updatedAt: vote.ref.document.updatedAt // TODO: find a better solution to disable timestamp-update
    });
    next();
  } catch (e) {
    next(e);
  }
};

VoteSchema.post("save", function (doc, next) {
  (<any>doc).updateReferenced(next);
});

VoteSchema.pre("remove", true, function (next, done) {
  next();

  // undo vote impact
  this.impact = -this.impact;
  this.updateReferenced(done);
});

export const Vote = mongoose.model<IVote>("Vote", VoteSchema) as IVoteModel;


/**
 * Voting Plugin
 */
export interface Votable {
  voting: {
    sum: number
  };

  vote(impact: Number, user: IUser, cb?: Function): Function;
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

  schema.virtual("voting.votes", {
    ref: "Vote",
    localField: "_id",
    foreignField: "ref.document",
    justOne: false
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
              return Vote.create({
                impact,
                author: user,
                ref: {
                  document: this.id,
                  model: this.constructor.modelName // Todo: This is probably not api-safe
                },
              }, cb);
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
