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
): Promise<AppointmentAssistantIntent> {
    const client = getOpenAIClient();
    const model =
        process.env.OPENAI_APPOINTMENT_MODEL ||
        "gpt-4o-mini";

    const response =
        await client.chat.completions.create({
            model,
            temperature: 0,
            response_format: {
                type: "json_object",
            },
            messages: [
                {
                    role: "system",
                    content: [
                        "You extract appointment-search filters for a hospital booking website.",
                        "Return only valid JSON with exactly these keys:",
                        "intent, hospitalQuery, departmentQuery, doctorQuery, stateQuery, districtQuery, requestedDate.",
                        "intent must be APPOINTMENT_SEARCH, MEDICAL_QUESTION, or UNCLEAR.",
                        "Use empty strings when a filter is not present.",
                        "requestedDate must be YYYY-MM-DD only when the patient clearly asks for a date inside the allowed window; otherwise use null.",
                        "Today is " + context.today + ". The last allowed booking date is " + context.lastBookableDate + ".",
                        "Convert relative dates such as today, tomorrow, and day after tomorrow using those dates.",
                        "Convert a doctor specialty such as cardiologist into departmentQuery such as Cardiology when possible.",
                        "Do not diagnose symptoms and do not provide medical advice.",
                    ].join(" "),
                },
                {
                    role: "user",
                    content: message,
                },
            ],
        });

    const content =
        response.choices[0]?.message?.content ||
        "{}";

    let parsed: unknown = {};

    try {
        parsed = JSON.parse(content);
    } catch {
        parsed = {};
    }

    return normalizeIntent(
        parsed,
        context,
    );
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
): Promise<AppointmentAssistantResponse> {
    const intent =
        await extractIntent(
            message,
            context,
        );

    if (
        intent.intent !==
        "APPOINTMENT_SEARCH"
    ) {
        return {
            message:
                intent.intent ===
                "MEDICAL_QUESTION"
                    ? "I can help you find a hospital appointment, but I cannot diagnose symptoms. For an emergency, contact local emergency services or go to the nearest emergency department."
                    : "Tell me the hospital, department, doctor, city, or date for which you want an appointment.",
            intent,
            bookingWindow: {
                from: context.today,
                to: context.lastBookableDate,
            },
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
