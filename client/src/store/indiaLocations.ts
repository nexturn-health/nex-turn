export const INDIA_STATE_DISTRICTS: Record<
    string,
    string[]
> = {
    "Uttar Pradesh": [
        "Bhadohi",
        "Varanasi",
    ],
};

export const INDIA_STATES =
    Object.keys(
        INDIA_STATE_DISTRICTS,
    );

export const getDistrictsByState = (
    state: string,
): string[] => {
    return [
        ...(INDIA_STATE_DISTRICTS[state] || []),
    ];
};