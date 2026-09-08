
export type QueuePriority =
  | "NORMAL"
  | "EMERGENCY";

export type QueueStatus =
  | "WAITING"
  | "CALLED"
  | "SERVING"
  | "COMPLETED"
  | "SKIPPED"
  | "CANCELLED";

export interface CreateQueuePayload {
  patientId: string;
  departmentId: string;
  priority: QueuePriority;
}

export interface QueuePatient {
  _id: string;
  name: string;
  phone: string;
  patientCode?: string;
  age?: number;
  gender?: "MALE" | "FEMALE" | "OTHER";
}

export interface QueueDepartment {
  _id: string;
  name: string;
  description?: string;
  tokenPrefix?: string;
}

export interface QueueDoctor {
  _id: string;
  name: string;
  email?: string;
}
export interface QueueData {
    _id: string;

    tokenNumber: number;

    tokenLabel: string;

    name:string;

    priority:
        | "NORMAL"
        | "EMERGENCY";

    status:
        | "WAITING"
        | "CALLED"
        | "SERVING"
        | "COMPLETED"
        | "SKIPPED"
        | "CANCELLED";

    patientId: QueuePatient;

    departmentId: QueueDepartment;
    doctorId?: QueueDoctor;

    queueDate: string;

    estimatedWaitTime?: number;

    estimatedTurnTime?: string;

    trackingToken?: string;

    trackingExpiresAt?: string;

    trackingLinkActive?: boolean;

    createdAt: string;
}
