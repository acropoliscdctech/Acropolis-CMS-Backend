import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload | string;
      cookies: {
        token?: string;
        [key: string]: string | undefined;
      };
      headers: {
        authorization?: string;
        [key: string]: string | string[] | undefined;
      };
      body: any;
      query: any;
    }
  }
}

export interface AuthenticatedRequest extends Express.Request {
  user: {
    id: string;
    role: string;
    [key: string]: any;
  };
}
