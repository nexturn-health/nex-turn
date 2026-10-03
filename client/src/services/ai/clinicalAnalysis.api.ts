import api from "../api";

import type {
  Consultation,
} from "./consultation.api";

// ============================================================
// RESPONSE
// ============================================================

export interface GenerateAIAnalysisResponse {
  success: boolean;

  message: string;

  data: Consultation;
}


export interface ClinicalAnalysisResponse {
    success: boolean;
    message: string;
    data: {
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
    };
}

export const generateClinicalAnalysis =
    async (
        consultationId: string,
    ): Promise<ClinicalAnalysisResponse> => {
        const response =
            await api.post<ClinicalAnalysisResponse>(
                `/consultations/${consultationId}/ai-analysis`,
                {},
                {
                    timeout: 120000,
                },
            );

        return response.data;
    };