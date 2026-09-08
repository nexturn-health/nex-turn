import type {
  UserRole,
} from "../models/User.model";

import type {
  IHospital,
} from "../models/Hospital.model";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;

        role: UserRole;

        hospitalId?: string;
      };

      hospital?: IHospital;
    }
  }
}

export {};