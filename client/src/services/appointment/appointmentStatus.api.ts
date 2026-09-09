import publicApi from "../publicApi";

export interface PublicAppointmentStatus {
    appointmentCode: string;
    status: string;
    date: string;
    startTime: string;
    endTime: string;

    patient: {
        _id: string;
        name: string;
        phone: string;
        patientCode?: string;
    };

    doctor: {
        _id: string;
        name: string;
    };

    department: {
        _id: string;
        name: string;
    };

    hospital: {
        _id: string;
        name: string;
        publicName?: string;
        city?: string;
        district?: string;
        state?: string;
        publicAddress?: string;
        address?: unknown;
    };

    queue: {
        tokenLabel: string;
        status: string;
        trackingToken: string;
    } | null;
}

interface AppointmentStatusResponse {
    success: boolean;
    data: PublicAppointmentStatus;
}

export const getPublicAppointmentStatus =
    async (
        appointmentCode: string,
        phone: string,
    ): Promise<PublicAppointmentStatus> => {
        const response =
            await publicApi.get<AppointmentStatusResponse>(
                `/public/appointments/${appointmentCode}`,
                {
                    params: {
                        phone,
                    },
                },
            );

        return response.data.data;
    };