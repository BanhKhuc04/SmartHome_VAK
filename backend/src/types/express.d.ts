import { TokenPayload } from '../middleware/auth.middleware';

declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

export { };
