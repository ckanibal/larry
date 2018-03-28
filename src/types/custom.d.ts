interface Error {
  status?: number;
}

declare module Express {
  interface Request {
    body?: any;
    payload?: any;
    upload?: any;
    comment?: any;
    media?: any;
  }

  interface Response {
    body?: any;
  }

  namespace core {
    interface Router {
      includes: any;
    }
  }
}

declare module "mongoose" {
  export let gfs: any;

  interface Schema {
    options: {
      toObject: {
        transform?: Function,
      }
    }
  }

  interface Document {
    updatedAt?: Date|string;
    createdAt?: Date|string;
  }
}
