const API_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api";

const getToken = () => {
    return localStorage.getItem("token");
};

export interface SuperAdminNotification {
    _id: string;
    title: string;
    message: string;
    type: "CONTACT_LEAD" | "SYSTEM";
    isRead: boolean;
    entityId?: string;
    entityModel?: string;
    metadata?: {
        leadId?: string;
        name?: string;
        phone?: string;
        email?: string;
        organization?: string;
        city?: string;
        interest?: string;
        message?: string;
    };
    createdAt: string;
    updatedAt: string;
}

export const getSuperAdminNotifications = async () => {
    const token = getToken();

    const response =
        await fetch(
            `${API_URL}/super-admin/notifications`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

    const data =
        await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            data?.message ||
                "Unable to load notifications.",
        );
    }

    return data.data as {
        notifications: SuperAdminNotification[];
        unreadCount: number;
    };
};

export const markNotificationRead = async (
    id: string,
) => {
    const token = getToken();

    const response =
        await fetch(
            `${API_URL}/super-admin/notifications/${id}/read`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

    const data =
        await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            data?.message ||
                "Unable to mark notification as read.",
        );
    }

    return data;
};

export const markAllNotificationsRead = async () => {
    const token = getToken();

    const response =
        await fetch(
            `${API_URL}/super-admin/notifications/read-all`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

    const data =
        await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            data?.message ||
                "Unable to mark all notifications as read.",
        );
    }

    return data;
};