import type {
    UserRole,
} from "../models/User.model";

declare global {

    namespace Express {

        interface Request {

            user?: {

                userId: string;

                role: UserRole;

                hospitalId?: string;

            };

        }

    }

}

export {};