import api from "../api";

// ============================================================
// RESPONSE TYPES
// ============================================================

export interface TranscriptionResponse {
  success: boolean;
  message: string;

  data: {
    text: string;
    language?: string | null;
  };
}

// ============================================================
// TRANSCRIBE AUDIO
// ============================================================

export const transcribeConsultationAudio =
  async (
    audioBlob: Blob,
  ): Promise<TranscriptionResponse> => {
    const formData =
      new FormData();

    // --------------------------------------------------------
    // Determine file extension
    // --------------------------------------------------------

    let extension =
      "webm";

    if (
      audioBlob.type.includes(
        "mp4",
      )
    ) {
      extension = "mp4";
    } else if (
      audioBlob.type.includes(
        "mpeg",
      ) ||
      audioBlob.type.includes(
        "mp3",
      )
    ) {
      extension = "mp3";
    } else if (
      audioBlob.type.includes(
        "wav",
      )
    ) {
      extension = "wav";
    } else if (
      audioBlob.type.includes(
        "ogg",
      )
    ) {
      extension = "ogg";
    }

    const audioFile =
      new File(
        [audioBlob],
        `consultation-${Date.now()}.${extension}`,
        {
          type:
            audioBlob.type ||
            "audio/webm",
        },
      );

    formData.append(
      "audio",
      audioFile,
    );

    // --------------------------------------------------------
    // Send to backend
    // --------------------------------------------------------

    const response =
      await api.post<TranscriptionResponse>(
        "/transcriptions/consultation",
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
          timeout:
            120000,
        },
      );

    return response.data;
  };