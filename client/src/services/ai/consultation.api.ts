import api from "../api";

// ============================================================
// TYPES
// ============================================================

export interface ConsultationPatient {
    _id: string;
    name: string;
    patientCode: string;
    phone?: string;
    email?: string;
    age?: number;
    gender?: string;
    address?: string;
}

export interface ConsultationDoctor {
    _id: string;
    name: string;
    email?: string;
}

export interface ConsultationDepartment {
    _id: string;
    name: string;
    tokenPrefix?: string;
}

export interface ConsultationQueue {
    _id: string;
    tokenNumber: number;
    tokenLabel: string;
    status: string;
    queueDate: string;
}

export interface ConsultationMedication {
    name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
}

export interface AIClinicalAnalysis {
    clinicalSummary?: string;
    symptoms?: string[];
    possibleConditions?: string[];
    redFlags?: string[];
    suggestedInvestigations?: string[];
    medicationConsiderations?: string[];
    dietAndLifestyle?: string[];
    followUpSuggestions?: string[];
    generatedAt?: string | null;
    model?: string;
}

export interface Consultation {
    _id: string;
    hospitalId: string;

    patientId: ConsultationPatient;
    doctorId: ConsultationDoctor;
    queueId: ConsultationQueue;
    departmentId: ConsultationDepartment;

    status:
        | "ACTIVE"
        | "COMPLETED"
        | "CANCELLED";

    startedAt: string;
    completedAt?: string | null;

    chiefComplaint: string;
    symptoms: string[];
    clinicalNotes: string;
    examinationNotes: string;

    transcript: string;
    transcriptLanguage: string;

    aiAnalysis?: AIClinicalAnalysis | null;

    aiReviewedByDoctor: boolean;
    aiReviewedAt?: string | null;

    finalDiagnosis: string;
    finalPrescription: ConsultationMedication[];

    dietAdvice: string;
    lifestyleAdvice: string;
    followUpAdvice: string;

    doctorApproved: boolean;
    doctorApprovedAt?: string | null;

    createdAt: string;
    updatedAt: string;
}

// ============================================================
// TRANSCRIPTION TYPES
// ============================================================

export interface ConsultationTranscription {
    text: string;
    language?: string | null;
}

export interface TranscriptionResponse {
    success: boolean;
    message: string;
    data: ConsultationTranscription;
}

// ============================================================
// RESPONSE TYPES
// ============================================================

export interface StartConsultationResponse {
    success: boolean;
    message: string;
    data: Consultation;
}

export interface ConsultationHistoryResponse {
    success: boolean;
    data: {
        patient: ConsultationPatient;
        consultations: Consultation[];
    };
}




// ============================================================
// START CONSULTATION
// ============================================================

export const startConsultation =
    async (
        queueId: string,
    ): Promise<StartConsultationResponse> => {
        const response =
            await api.post<StartConsultationResponse>(
                "/consultations/start",
                {
                    queueId,
                },
            );

        return response.data;
    };

// ============================================================
// TRANSCRIBE CONSULTATION AUDIO
// ============================================================

export const transcribeConsultationAudio =
    async (
        audioBlob: Blob,
    ): Promise<TranscriptionResponse> => {
        if (
            !audioBlob ||
            audioBlob.size === 0
        ) {
            throw new Error(
                "Audio recording is empty",
            );
        }

        const formData =
            new FormData();

        const mimeType =
            audioBlob.type ||
            "audio/webm";

        let extension =
            "webm";

        if (
            mimeType.includes("mp4") ||
            mimeType.includes("m4a")
        ) {
            extension = "mp4";
        } else if (
            mimeType.includes("mpeg") ||
            mimeType.includes("mp3")
        ) {
            extension = "mp3";
        } else if (
            mimeType.includes("wav")
        ) {
            extension = "wav";
        } else if (
            mimeType.includes("ogg")
        ) {
            extension = "ogg";
        }

        formData.append(
            "audio",
            audioBlob,
            `consultation.${extension}`,
        );

        const response =
            await api.post<TranscriptionResponse>(
                "/transcriptions/consultation",
                formData,
                {
                    headers: {
                        "Content-Type":
                            "multipart/form-data",
                    },
                },
            );

        return response.data;
    };

// ============================================================
// PATIENT CONSULTATION HISTORY
// ============================================================

export const getPatientConsultationHistory =
    async (
        patientId: string,
    ): Promise<ConsultationHistoryResponse> => {
        const response =
            await api.get<ConsultationHistoryResponse>(
                `/consultations/patient/${patientId}`,
            );

        return response.data;
    };

// ============================================================
// GET ONE CONSULTATION
// ============================================================

export const getConsultationById =
    async (
        consultationId: string,
    ): Promise<{
        success: boolean;
        data: Consultation;
    }> => {
        const response =
            await api.get<{
                success: boolean;
                data: Consultation;
            }>(
                `/consultations/${consultationId}`,
            );

        return response.data;
    };

// ============================================================
// UPDATE CONSULTATION
// ============================================================

export const updateConsultation =
    async (
        consultationId: string,
        data: {
            chiefComplaint?: string;
            symptoms?: string[];
            clinicalNotes?: string;
            examinationNotes?: string;
            transcript?: string;
            transcriptLanguage?: string;
        },
    ): Promise<{
        success: boolean;
        message: string;
        data: Consultation;
    }> => {
        const response =
            await api.patch<{
                success: boolean;
                message: string;
                data: Consultation;
            }>(
                `/consultations/${consultationId}`,
                data,
            );

        return response.data;
    };

// ============================================================
// COMPLETE CONSULTATION
// ============================================================

export const completeConsultation =
    async (
        consultationId: string,
    ): Promise<{
        success: boolean;
        message: string;
        data: Consultation;
    }> => {
        const response =
            await api.post<{
                success: boolean;
                message: string;
                data: Consultation;
            }>(
                `/consultations/${consultationId}/complete`,
            );

        return response.data;
    };


