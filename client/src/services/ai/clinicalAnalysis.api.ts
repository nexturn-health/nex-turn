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

// ============================================================
// GENERATE AI ANALYSIS
// ============================================================

export const generateClinicalAnalysis =
  async (
    consultationId: string,
  ): Promise<GenerateAIAnalysisResponse> => {
    if (!consultationId) {
      throw new Error(
        "Consultation ID is required",
      );
    }

    const response =
      await api.post<GenerateAIAnalysisResponse>(
        `/consultations/${consultationId}/ai-analysis`,
      );

    return response.data;
  };