import OpenAI from "openai";

import {
    Hospital,
} from "../models/Hospital.model";

import {
    Department,
} from "../models/Department.model";

import {
    User,
} from "../models/User.model";

import {
    DoctorSlot,
} from "../models/DoctorSlot.model";

export type AppointmentAssistantIntentType =
    | "APPOINTMENT_SEARCH"
    | "MEDICAL_QUESTION"
    | "UNCLEAR";

export interface AppointmentAssistantIntent {
    intent:
        AppointmentAssistantIntentType;

    hospitalQuery:
        string;

    departmentQuery:
        string;

    doctorQuery:
        string;

    stateQuery:
        string;

    districtQuery:
        string;

    requestedDate:
        string | null;
}

export interface AppointmentAssistantSlot {
    _id: string;
    date: string;
    startTime: string;
    endTime: string;
}

export interface AppointmentAssistantResult {
    hospital: {
        _id: string;
        name: string;
        state: string;
        district: string;
        city: string;
        address: string;
        bookingSlug?: string;
    };

    department: {
        _id: string;
        name: string;
    };

    doctor: {
        _id: string;
        name: string;
    };

    dates: Array<{
        date: string;
        slots: AppointmentAssistantSlot[];
    }>;
}

export interface AppointmentAssistantResponse {
    message: string;
    intent: AppointmentAssistantIntent;
    bookingWindow: {
        from: string;
        to: string;
    };
    hospitals: Array<AppointmentAssistantResult["hospital"]>;
    results: AppointmentAssistantResult[];
}

export type AppointmentAssistantChatMessage = {
    role: "user" | "assistant";
    content: string;
};

type SearchContext = {
    today: string;
    lastBookableDate: string;
};

type AnyRecord = Record<string, any>;

let openAIClient:
    OpenAI | null = null;

function getOpenAIClient(): OpenAI {
    const apiKey =
        process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
        throw new Error(
            "OPENAI_API_KEY is not configured",
        );
    }

    if (!openAIClient) {
        openAIClient = new OpenAI({
            apiKey,
        });
    }

    return openAIClient;
}

function cleanText(
    value: unknown,
    maxLength = 120,
): string {
    return String(value || "")
        .replace(/[<>]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);
}

function validDate(
    value: unknown,
    context: SearchContext,
): string | null {
    const date = cleanText(
        value,
        10,
    );

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return null;
    }

    if (
        date < context.today ||
        date > context.lastBookableDate
    ) {
        return null;
    }

    return date;
}

function normalizeIntent(
    value: unknown,
    context: SearchContext,
): AppointmentAssistantIntent {
    const raw =
        value && typeof value === "object"
            ? (value as AnyRecord)
            : {};

    const rawIntent =
        cleanText(raw.intent, 40)
            .toUpperCase();

    const intent:
        AppointmentAssistantIntentType =
        rawIntent === "MEDICAL_QUESTION"
            ? "MEDICAL_QUESTION"
            : rawIntent === "APPOINTMENT_SEARCH"
                ? "APPOINTMENT_SEARCH"
                : "UNCLEAR";

    return {
        intent,
        hospitalQuery: cleanText(
            raw.hospitalQuery,
        ),
        departmentQuery: cleanText(
            raw.departmentQuery,
        ),
        doctorQuery: cleanText(
            raw.doctorQuery,
        ),
        stateQuery: cleanText(
            raw.stateQuery,
        ),
        districtQuery: cleanText(
            raw.districtQuery,
        ),
        requestedDate: validDate(
            raw.requestedDate,
            context,
        ),
    };
}

async function extractIntent(
    message: string,
    context: SearchContext,
    history: AppointmentAssistantChatMessage[] = [],
): Promise<AppointmentAssistantIntent> {
    const client = getOpenAIClient();
    const model = process.env.OPENAI_APPOINTMENT_MODEL || "gpt-4o-mini";
    const recentHistory = history.slice(-8).map((item) => ({
        role: item.role,
        content: cleanText(item.content, 1200),
    }));

    const response = await client.chat.completions.create({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
            {
                role: "system",
                content: [
                    "You classify the patient's latest message for a hospital appointment assistant.",
                    "Return only JSON with keys: intent, hospitalQuery, departmentQuery, doctorQuery, stateQuery, districtQuery, requestedDate.",
                    "intent must be APPOINTMENT_SEARCH, MEDICAL_QUESTION, or UNCLEAR.",
                    "Use conversation history to resolve follow-ups like 'tomorrow?', 'what about that hospital?', or 'show me more'.",
                    "Use empty strings for absent filters. requestedDate must be YYYY-MM-DD only if within the allowed booking window, otherwise null.",
                    `Today is ${context.today}; last allowed booking date is ${context.lastBookableDate}. Convert relative dates using these dates.`,
                    "Map specialties such as cardiologist to departmentQuery Cardiology when possible.",
                    "A greeting, thanks, or general non-medical question is UNCLEAR. If the latest message clearly says the patient wants to see a doctor, book/find an appointment, or consult a hospital but gives no filters, classify it as APPOINTMENT_SEARCH. A symptom/health question is MEDICAL_QUESTION.",
                    "Do not diagnose or provide medical advice.",
                ].join(" "),
            },
            ...recentHistory,
            { role: "user", content: message },
        ],
    });

    let parsed: unknown = {};
    try {
        parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    } catch {
        parsed = {};
    }
    return normalizeIntent(parsed, context);
}

async function generateConversationalReply(
    message: string,
    history: AppointmentAssistantChatMessage[],
    medicalQuestion: boolean,
): Promise<string> {
    const client = getOpenAIClient();
    const model = process.env.OPENAI_APPOINTMENT_MODEL || "gpt-4o-mini";
    const response = await client.chat.completions.create({
        model,
        temperature: 0.5,
        messages: [
            {
                role: "system",
                content: [
                    "You are a friendly conversational assistant on a hospital appointment booking website.",
                    "Reply in the same language as the patient's latest message. If they write Hindi, answer naturally in Hindi; if English, answer in English. Match their language rather than forcing English.",
                    "Handle greetings, thanks, simple general conversation, and clarify what appointment help they need.",
                    "You can help find appointments, but do not claim to have booked anything.",
                    "Do not invent hospitals, doctors, prices, or availability. Real appointment availability comes only from the booking search.",
                    "For medical questions, provide a brief safe response, do not diagnose or prescribe, and advise urgent local care for emergency symptoms.",
                    "Keep replies warm, concise, and suitable for being read aloud.",
                ].join(" "),
            },
            ...history.slice(-8).map((item) => ({
                role: item.role,
                content: cleanText(item.content, 1200),
            })),
            { role: "user", content: message },
        ],
    });
    const reply = response.choices[0]?.message?.content?.trim();
    if (reply) return reply;
    return medicalQuestion
        ? "I can share general information, but I can’t diagnose or prescribe. If this may be urgent, please seek medical care."
        : "Hi! I can chat with you and help find available hospital appointments. Which doctor, department, or city are you looking for?";
}

function escapeRegex(
    value: string,
): string {
    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
    );
}

function containsText(
    value: unknown,
    query: string,
): boolean {
    if (!query) {
        return true;
    }

    return String(value || "")
        .toLocaleLowerCase()
        .includes(
            query.toLocaleLowerCase(),
        );
}

function objectIdString(
    value: unknown,
): string {
    if (
        value &&
        typeof value === "object" &&
        "_id" in value
    ) {
        return String(
            (value as AnyRecord)._id,
        );
    }

    return String(value || "");
}

function addressText(
    hospital: AnyRecord,
): string {
    if (typeof hospital.address === "string") {
        return hospital.address;
    }

    if (
        hospital.address &&
        typeof hospital.address === "object"
    ) {
        return [
            hospital.address.line1,
            hospital.address.line2,
            hospital.address.city,
            hospital.address.state,
            hospital.address.pincode,
        ]
            .map((part) => cleanText(part))
            .filter(Boolean)
            .join(", ");
    }

    return cleanText(
        hospital.publicAddress ||
        hospital.city ||
        hospital.district,
    );
}

function parseTimeToMinutes(
    value: unknown,
): number | null {
    const match = String(value || "")
        .trim()
        .match(
            /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i,
        );

    if (!match) {
        return null;
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridiem = match[3]?.toUpperCase();

    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes) ||
        minutes > 59
    ) {
        return null;
    }

    if (meridiem === "PM" && hours < 12) {
        hours += 12;
    }

    if (meridiem === "AM" && hours === 12) {
        hours = 0;
    }

    if (hours > 23) {
        return null;
    }

    return hours * 60 + minutes;
}

function currentIndiaMinutes(
    value = new Date(),
): number {
    const time =
        new Intl.DateTimeFormat(
            "en-GB",
            {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
            },
        ).format(value);

    const [hours, minutes] = time
        .split(":")
        .map(Number);

    return hours * 60 + minutes;
}

function slotIsStillBookable(
    slot: AnyRecord,
    today: string,
): boolean {
    if (slot.date !== today) {
        return true;
    }

    const start = parseTimeToMinutes(
        slot.startTime,
    );

    return (
        start === null ||
        start > currentIndiaMinutes()
    );
}

function uniqueStrings(
    values: string[],
): string[] {
    return Array.from(
        new Set(
            values.filter(Boolean),
        ),
    );
}

function publicHospital(
    hospital: AnyRecord,
): AppointmentAssistantResult["hospital"] {
    return {
        _id: String(hospital._id),
        name: cleanText(
            hospital.publicName ||
            hospital.name,
            160,
        ),
        state: cleanText(
            hospital.state,
            80,
        ),
        district: cleanText(
            hospital.district,
            80,
        ),
        city: cleanText(
            hospital.city,
            80,
        ),
        address: addressText(
            hospital,
        ),
        ...(hospital.bookingSlug
            ? {
                bookingSlug: cleanText(
                    hospital.bookingSlug,
                    120,
                ),
            }
            : {}),
    };
}

function exactOrContains(
    value: unknown,
    query: string,
): boolean {
    return containsText(
        value,
        query,
    );
}

export async function searchAppointmentAvailability(
    message: string,
    context: SearchContext,
    history: AppointmentAssistantChatMessage[] = [],
): Promise<AppointmentAssistantResponse> {
    const intent = await extractIntent(message, context, history);

    if (intent.intent !== "APPOINTMENT_SEARCH") {
        const reply = await generateConversationalReply(
            message,
            history,
            intent.intent === "MEDICAL_QUESTION",
        );
        return {
            message: reply,
            intent,
            bookingWindow: { from: context.today, to: context.lastBookableDate },
            hospitals: [],
            results: [],
        };
    }

    const baseHospitalQuery: AnyRecord = {
        publicBookingEnabled: true,
        isActive: true,
    };

    if (intent.stateQuery) {
        baseHospitalQuery.state = {
            $regex: new RegExp(
                `^${escapeRegex(
                    intent.stateQuery,
                )}$`,
                "i",
            ),
        };
    }

    if (intent.districtQuery) {
        baseHospitalQuery.district = {
            $regex: new RegExp(
                `^${escapeRegex(
                    intent.districtQuery,
                )}$`,
                "i",
            ),
        };
    }

    if (intent.hospitalQuery) {
        const regex = new RegExp(
            escapeRegex(
                intent.hospitalQuery,
            ),
            "i",
        );

        baseHospitalQuery.$or = [
            { name: regex },
            { publicName: regex },
            { city: regex },
            { district: regex },
            { bookingSlug: regex },
            { publicAddress: regex },
            { "address.line1": regex },
        ];
    }

    const hospitals: AnyRecord[] =
        await Hospital.find(
            baseHospitalQuery,
        )
            .select(
                "_id name publicName state district city address publicAddress bookingSlug",
            )
            .sort({ name: 1 })
            .limit(12)
            .lean();

    const hospitalIds = hospitals.map(
        (hospital) => hospital._id,
    );

    const hospitalById = new Map(
        hospitals.map((hospital) => [
            String(hospital._id),
            hospital,
        ]),
    );

    if (!hospitalIds.length) {
        return {
            message:
                "I could not find a hospital matching that request. Try the hospital name, city, or department.",
            intent,
            bookingWindow: {
                from: context.today,
                to: context.lastBookableDate,
            },
            hospitals: [],
            results: [],
        };
    }

    const departments: AnyRecord[] =
        await Department.find({
            hospitalId: {
                $in: hospitalIds,
            },
            isActive: true,
        })
            .select(
                "_id hospitalId name description tokenPrefix",
            )
            .sort({ name: 1 })
            .lean();

    const departmentsByHospital =
        new Map<string, AnyRecord[]>();

    for (const department of departments) {
        const key = String(
            department.hospitalId,
        );

        const list =
            departmentsByHospital.get(key) ||
            [];

        list.push(department);
        departmentsByHospital.set(
            key,
            list,
        );
    }

    const doctors: AnyRecord[] =
        await User.find({
            hospitalId: {
                $in: hospitalIds,
            },
            role: "DOCTOR",
            isActive: {
                $ne: false,
            },
        })
            .select(
                "_id name hospitalId departmentId department bookingSlug",
            )
            .sort({ name: 1 })
            .lean();

    const matchingDoctors = doctors.filter(
        (doctor) => {
            const hospitalId = String(
                doctor.hospitalId,
            );

            if (!hospitalById.has(hospitalId)) {
                return false;
            }

            if (
                intent.doctorQuery &&
                !exactOrContains(
                    doctor.name,
                    intent.doctorQuery,
                )
            ) {
                return false;
            }

            const hospitalDepartments =
                departmentsByHospital.get(
                    hospitalId,
                ) || [];

            if (!intent.departmentQuery) {
                return hospitalDepartments.length > 0;
            }

            const doctorDepartmentIds =
                uniqueStrings([
                    objectIdString(
                        doctor.departmentId,
                    ),
                    objectIdString(
                        doctor.department,
                    ),
                ]);

            return hospitalDepartments.some(
                (department) =>
                    doctorDepartmentIds.includes(
                        String(department._id),
                    ) &&
                    exactOrContains(
                        department.name,
                        intent.departmentQuery,
                    ),
            );
        },
    );

    const selectedDoctors =
        matchingDoctors.slice(0, 40);

    if (!selectedDoctors.length) {
        return {
            message:
                "I found matching hospitals, but no active doctor or department matched that request.",
            intent,
            bookingWindow: {
                from: context.today,
                to: context.lastBookableDate,
            },
            hospitals: hospitals.map(
                publicHospital,
            ),
            results: [],
        };
    }

    const doctorIds = selectedDoctors.map(
        (doctor) => doctor._id,
    );

    const dateQuery = intent.requestedDate
        ? {
            $eq: intent.requestedDate,
        }
        : {
            $gte: context.today,
            $lte: context.lastBookableDate,
        };

    const slots: AnyRecord[] =
        await DoctorSlot.find({
            hospitalId: {
                $in: hospitalIds,
            },
            doctorId: {
                $in: doctorIds,
            },
            date: dateQuery,
            slotType: "APPOINTMENT",
            status: "AVAILABLE",
        })
            .select(
                "_id hospitalId doctorId date startTime endTime slotType status",
            )
            .sort({
                date: 1,
                startTime: 1,
            })
            .limit(300)
            .lean();

    const slotsByDoctor =
        new Map<string, AnyRecord[]>();

    for (const slot of slots) {
        if (
            !slotIsStillBookable(
                slot,
                context.today,
            )
        ) {
            continue;
        }

        const key = String(
            slot.doctorId,
        );

        const list =
            slotsByDoctor.get(key) ||
            [];

        if (list.length < 24) {
            list.push(slot);
        }

        slotsByDoctor.set(
            key,
            list,
        );
    }

    const results: AppointmentAssistantResult[] = [];

for (const doctor of selectedDoctors) {
    const doctorSlots: AnyRecord[] =
        slotsByDoctor.get(
            String(doctor._id),
        ) || [];

    if (!doctorSlots.length) {
        continue;
    }

    const hospital =
        hospitalById.get(
            String(doctor.hospitalId),
        );

    if (!hospital) {
        continue;
    }

    const hospitalDepartments =
        departmentsByHospital.get(
            String(doctor.hospitalId),
        ) || [];

    const doctorDepartmentIds =
        uniqueStrings([
            objectIdString(
                doctor.departmentId,
            ),
            objectIdString(
                doctor.department,
            ),
        ]);

    let resultDepartments =
        hospitalDepartments.filter(
            (department) =>
                doctorDepartmentIds.includes(
                    String(department._id),
                ),
        );

    if (intent.departmentQuery) {
        resultDepartments =
            resultDepartments.filter(
                (department) =>
                    exactOrContains(
                        department.name,
                        intent.departmentQuery,
                    ),
            );
    }

    // Department ID is required for safe booking.
    const department =
        resultDepartments[0];

    if (!department) {
        continue;
    }

    const slotsByDate: Map<
        string,
        AppointmentAssistantSlot[]
    > = new Map();

    for (const slot of doctorSlots) {
        const date =
            String(slot.date);

        const current =
            slotsByDate.get(date) || [];

        if (current.length < 12) {
            current.push({
                _id: String(
                    slot._id,
                ),
                date,
                startTime: String(
                    slot.startTime,
                ),
                endTime: String(
                    slot.endTime,
                ),
            });
        }

        slotsByDate.set(
            date,
            current,
        );
    }

    const dates: Array<{
        date: string;
        slots: AppointmentAssistantSlot[];
    }> = [];

    slotsByDate.forEach(
        (
            dateSlots,
            date,
        ) => {
            dates.push({
                date,
                slots: dateSlots,
            });
        },
    );

    results.push({
        hospital: publicHospital(
            hospital,
        ),

        department: {
            _id: String(
                department._id,
            ),
            name: cleanText(
                department.name,
                120,
            ),
        },

        doctor: {
            _id: String(
                doctor._id,
            ),
            name: cleanText(
                doctor.name,
                120,
            ),
        },

        dates,
    });

    if (results.length >= 20) {
        break;
    }
}
    return {
        message: results.length
            ? "I found these real available appointment slots. Select a result to continue booking."
            : intent.requestedDate
                ? "I found matching doctors, but no appointment slot is available on that date. Try another date within the next 7 days."
                : "I found matching doctors, but no appointment slot is currently available within the next 7 days.",
        intent,
        bookingWindow: {
            from: context.today,
            to: context.lastBookableDate,
        },
        hospitals: hospitals.map(
            publicHospital,
        ),
        results,
    };
}
