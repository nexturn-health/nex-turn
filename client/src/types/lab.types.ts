// ============================================================
// LAB TYPES
// ============================================================

export interface LabDepartment {
    _id: string;

    hospitalId: string;

    name: string;

    code?: string;

    description?: string;

    isActive: boolean;

    createdAt: string;

    updatedAt: string;
}

// ============================================================
// LAB ROOM
// ============================================================

export interface LabRoom {
    _id: string;

    hospitalId: string;

    labDepartmentId:
        | string
        | LabDepartment;

    name: string;

    roomNumber: string;

    building: string;

    floor: string;

    description?: string;

    isActive: boolean;

    createdAt: string;

    updatedAt: string;
}

// ============================================================
// LAB TEST
// ============================================================

export interface LabTest {
    _id: string;

    hospitalId: string;

    name: string;

    code?: string;

    category?: string;

    description?: string;

    price: number;

    sampleType?: string;

    turnaroundTimeMinutes?: number;

    labDepartmentId:
        | string
        | LabDepartment;

    labRoomId:
        | string
        | LabRoom;

    isActive: boolean;

    createdAt: string;

    updatedAt: string;
}

// ============================================================
// LAB ORDER ITEM STATUS
// ============================================================

export type LabOrderItemStatus =
    | "ORDERED"
    | "SAMPLE_COLLECTED"
    | "PROCESSING"
    | "COMPLETED"
    | "CANCELLED";

// ============================================================
// LAB ORDER ITEM
// ============================================================

export interface LabOrderItem {
    _id: string;

    labTestId: string;

    testName: string;

    testCode?: string;

    price: number;

    // ========================================================
    // LAB ASSIGNMENT
    // ========================================================

    labDepartmentId:
        | string
        | LabDepartment;

    labRoomId:
        | string
        | LabRoom;

    technicianId?:
        | string
        | LabTechnician
        | null;

    // ========================================================
    // STATUS
    // ========================================================

    status: LabOrderItemStatus;

    // ========================================================
    // LAB RESULT
    // ========================================================

    result?: string;

    notes?: string;

    collectedAt?: string;

    completedAt?: string;

    // ========================================================
    // LAB REPORT FILE
    // ========================================================

    /**
     * Original/display name of the uploaded report.
     * Example: CBC_Report.pdf
     */
    reportFileName?: string;

    /**
     * Server-side relative path.
     * Do NOT expose this directly to the browser.
     */
    reportFilePath?: string;

    /**
     * MIME type of uploaded report.
     * Example:
     * application/pdf
     * image/jpeg
     * image/png
     */
    reportFileMimeType?: string;

    /**
     * File size in bytes.
     */
    reportFileSize?: number;

    /**
     * Date/time when technician uploaded the report.
     */
    reportUploadedAt?: string;

    /**
     * Technician who uploaded the report.
     */
    reportUploadedBy?:
        | string
        | LabTechnician
        | null;
}

// ============================================================
// LAB ORDER STATUS
// ============================================================

export type LabOrderStatus =
    | "ORDERED"
    | "READY_FOR_LAB"
    | "SAMPLE_COLLECTED"
    | "PROCESSING"
    | "REPORT_READY"
    | "COMPLETED"
    | "CANCELLED";

// ============================================================
// PAYMENT STATUS
// ============================================================

export type LabPaymentStatus =
    | "PENDING"
    | "PAID"
    | "FAILED"
    | "REFUNDED";

// ============================================================
// LAB ORDER
// ============================================================

export interface LabOrder {
    _id: string;

    hospitalId: string;

    patientId:
        | string
        | PatientReference;

    doctorId?:
        | string
        | UserReference;

    consultationId?: string;

    queueId?: string;

    items: LabOrderItem[];

    totalAmount: number;

    paymentStatus: LabPaymentStatus;

    status: LabOrderStatus;

    orderedAt: string;

    paidAt?: string;

    collectedAt?: string;

    completedAt?: string;

    createdAt: string;

    updatedAt: string;
}

// ============================================================
// PATIENT
// ============================================================

export interface PatientReference {
    _id: string;

    name: string;

    phone?: string;

    email?: string;

    age?: number;

    gender?: string;

    patientCode?: string;
}

// ============================================================
// USER
// ============================================================

export interface UserReference {
    _id: string;

    name: string;

    email?: string;
}

// ============================================================
// LAB TECHNICIAN
// ============================================================

export interface LabTechnician {
    _id: string;

    name: string;

    email: string;

    phone?: string;

    role: "LAB_TECHNICIAN";

    hospitalId: string;

    labDepartmentId?:
        | string
        | LabDepartment;

    labRoomId?:
        | string
        | LabRoom;

    isActive: boolean;

    isOnline?: boolean;

    createdAt: string;

    updatedAt: string;
}