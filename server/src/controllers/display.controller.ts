import type { Request, Response } from "express";
import crypto from "crypto";

import { Queue } from "../models/Queue.model";
import { DisplayConfig } from "../models/DisplayConfig.model";
import { User } from "../models/User.model";

// =====================================================
// DISPLAY LANGUAGE
// =====================================================

export type DisplayLanguage = "EN" | "HI" | "BN" | "MR" | "TA" | "TE" | "KN" | "GU" | "PA" | "ML";

const ALLOWED_LANGUAGES: DisplayLanguage[] = ["EN", "HI", "BN", "MR", "TA", "TE", "KN", "GU", "PA", "ML"];

const isDisplayLanguage = (value: unknown): value is DisplayLanguage => {
    return typeof value === "string" && ALLOWED_LANGUAGES.includes(value as DisplayLanguage);
};

const getFrontendUrl = (): string => {
    return process.env.FRONTEND_URL || "http://localhost:5173";
};

// =====================================================
// CREATE DISPLAY
// POST /api/display
// ADMIN ONLY
// =====================================================

export const createDisplay = async (req: Request, res: Response) => {
    try {
        const hospitalId = req.user?.hospitalId;

        if (!hospitalId) {
            return res.status(401).json({
                success: false,
                message: "Hospital ID not found in logged-in user",
            });
        }

        // CHECK EXISTING DISPLAY

        const existing = await DisplayConfig.findOne({ hospitalId });

        if (existing) {
            const displayUrl = `${getFrontendUrl()}/display/${existing.displayKey}`;

            return res.status(200).json({
                success: true,
                message: "Display already exists",
                display: existing,
                displayKey: existing.displayKey,
                displayUrl,
            });
        }

        const {
            hospitalName,
            heading,
            logoUrl,
            primaryColor,
            secondaryColor,
            displayLanguage,
            voiceEnabled,
            announcementEnabled,
            announcementRepeat,
            showEmergency,
            showReferred,
            showWaiting,
            showNext,
            showCurrent,
        } = req.body || {};

        const language: DisplayLanguage = isDisplayLanguage(displayLanguage) ? displayLanguage : "EN";

        const repeat = announcementRepeat === undefined ? 2 : Number(announcementRepeat);

        if (!Number.isInteger(repeat) || repeat < 1 || repeat > 5) {
            return res.status(400).json({
                success: false,
                message: "announcementRepeat must be between 1 and 5",
            });
        }

        const displayKey = crypto.randomBytes(32).toString("hex");

        const display = await DisplayConfig.create({
            hospitalId,
            displayKey,
            hospitalName:
                typeof hospitalName === "string" && hospitalName.trim() ? hospitalName.trim() : "NexTurn Hospital",
            heading: typeof heading === "string" && heading.trim() ? heading.trim() : "Hospital Queue",
            logoUrl: typeof logoUrl === "string" ? logoUrl.trim() : "",
            primaryColor: typeof primaryColor === "string" && primaryColor.trim() ? primaryColor.trim() : "#2563EB",
            secondaryColor:
                typeof secondaryColor === "string" && secondaryColor.trim() ? secondaryColor.trim() : "#0F172A",
            displayLanguage: language,
            voiceEnabled: typeof voiceEnabled === "boolean" ? voiceEnabled : true,
            announcementEnabled: typeof announcementEnabled === "boolean" ? announcementEnabled : true,
            announcementRepeat: repeat,
            showEmergency: typeof showEmergency === "boolean" ? showEmergency : true,
            showReferred: typeof showReferred === "boolean" ? showReferred : true,
            showWaiting: typeof showWaiting === "boolean" ? showWaiting : true,
            showNext: typeof showNext === "boolean" ? showNext : true,
            showCurrent: typeof showCurrent === "boolean" ? showCurrent : true,
            isActive: true,
        });

        const displayUrl = `${getFrontendUrl()}/display/${displayKey}`;

        return res.status(201).json({
            success: true,
            message: "Display created successfully",
            display,
            displayKey,
            displayUrl,
        });
    } catch (error: unknown) {
        console.error("CREATE DISPLAY ERROR:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        return res.status(500).json({
            success: false,
            message: "Failed to create display",
            error: errorMessage,
        });
    }
};

// =====================================================
// GET PUBLIC DISPLAY BOARD
// GET /api/display/:displayKey
// PUBLIC
// =====================================================

export const getPublicDisplayBoard = async (req: Request, res: Response) => {
    try {
        const { displayKey } = req.params;

        if (!displayKey) {
            return res.status(400).json({
                success: false,
                message: "Display key is required",
            });
        }

        const config = await DisplayConfig.findOne({ displayKey }).lean();

        if (!config) {
            return res.status(404).json({
                success: false,
                message: "Display not found",
            });
        }

        if (config.isActive === false) {
            return res.status(403).json({
                success: false,
                message: "Display is inactive",
            });
        }

        const hospitalId = config.hospitalId;
        const today = new Date().toISOString().split("T")[0];

        // DOCTOR PRESENCE

        const doctors = await User.find({
            hospitalId: config.hospitalId,
            role: "DOCTOR",
            isActive: true,
        })
            .select("_id name isOnline lastSeenAt isOnBreak breakStartedAt breakReason")
            .lean();

        const onlineDoctor = doctors.find((doctor) => doctor.isOnline === true);
        const selectedDoctor = onlineDoctor || doctors[0] || null;

        // GLOBAL DOCTOR STATUS

        const doctorId = selectedDoctor ? String(selectedDoctor._id) : null;
        const doctorName = selectedDoctor?.name || "Doctor";
        const doctorOnline = selectedDoctor?.isOnline === true;
        const doctorLastSeenAt = selectedDoctor?.lastSeenAt ?? null;
        const presence = selectedDoctor as unknown as VoiceDoctor | null;
        // A hospital-wide board is paused only when every online doctor is on break.
        const onlineDoctors = doctors.filter((doctor) => doctor.isOnline === true);
        const doctorOnBreak = onlineDoctors.length > 0 && onlineDoctors.every(
            (doctor) => (doctor as unknown as VoiceDoctor).isOnBreak === true,
        );

        // QUEUES

        const queues = await Queue.find({
            hospitalId,
            queueDate: today,
            status: { $in: ["WAITING", "CALLED", "SERVING"] },
        })
            .populate("departmentId", "name tokenPrefix")
            .populate("doctorId", "name isOnline lastSeenAt isOnBreak breakStartedAt breakReason")
            .sort({ priority: -1, tokenNumber: 1 })
            .lean();

        const current = queues.filter((queue) => queue.status === "SERVING" || queue.status === "CALLED");
        const waiting = queues.filter((queue) => queue.status === "WAITING");
        const next = waiting.slice(0, 8);
        const emergency = queues.filter((queue) => queue.priority === "EMERGENCY");

        // ADD DOCTOR STATUS TO CURRENT QUEUES
        //
        // Queue doctor status is kept for cards, but the GLOBAL doctorOnline
        // above is independent.

        const currentWithDoctorStatus = current.map((queue) => {
            let queueDoctorId: string | null = null;

            if (queue.doctorId) {
                queueDoctorId =
                    typeof queue.doctorId === "object" && "_id" in queue.doctorId
                        ? String(queue.doctorId._id)
                        : String(queue.doctorId);
            }

            const queueDoctor = doctors.find((doctor) => String(doctor._id) === queueDoctorId);

            return {
                ...queue,
                doctorOnline: queueDoctor ? queueDoctor.isOnline === true : false,
                doctorLastSeenAt: queueDoctor?.lastSeenAt ?? null,
            };
        });

        const display = {
            hospitalName: config.hospitalName,
            heading: config.heading,
            logoUrl: config.logoUrl,
            primaryColor: config.primaryColor,
            secondaryColor: config.secondaryColor,
            displayLanguage: config.displayLanguage,
            voiceEnabled: config.voiceEnabled,
            announcementEnabled: config.announcementEnabled,
            announcementRepeat: config.announcementRepeat,
            showEmergency: config.showEmergency,
            showReferred: config.showReferred,
            showWaiting: config.showWaiting,
            showNext: config.showNext,
            showCurrent: config.showCurrent,
        };

        // FINAL RESPONSE
        //
        // IMPORTANT: doctorOnline is TOP-LEVEL. Frontend should use
        // displayData.doctorOnline, NOT currentQueue.doctorOnline.

        return res.status(200).json({
            success: true,
            display,

            // DOCTOR PRESENCE
            doctorId,
            doctorName,
            doctorOnline,
            doctorLastSeenAt,
            doctorOnBreak,
            doctorBreakStartedAt: doctorOnBreak ? presence?.breakStartedAt ?? null : null,
            doctorBreakReason: doctorOnBreak ? presence?.breakReason ?? null : null,

            // QUEUES
            current: currentWithDoctorStatus,
            next,
            waiting,
            emergency,
        });
    } catch (error) {
        console.error("GET PUBLIC DISPLAY BOARD ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load display board",
        });
    }
};

// =====================================================
// GET DISPLAY CONFIG
// GET /api/display/config
// ADMIN
// =====================================================

export const getDisplayConfig = async (req: Request, res: Response) => {
    try {
        const hospitalId = req.user?.hospitalId;

        if (!hospitalId) {
            return res.status(401).json({
                success: false,
                message: "Hospital not found",
            });
        }

        const display = await DisplayConfig.findOne({ hospitalId }).lean();

        if (!display) {
            return res.status(404).json({
                success: false,
                message: "Display configuration not found",
            });
        }

        return res.status(200).json({
            success: true,
            display,
            displayUrl: `${getFrontendUrl()}/display/${display.displayKey}`,
        });
    } catch (error) {
        console.error("GET DISPLAY CONFIG ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to get display configuration",
        });
    }
};

// =====================================================
// UPDATE DISPLAY CONFIG
// PUT /api/display/config
// ADMIN
// =====================================================

export const updateDisplayConfig = async (req: Request, res: Response) => {
    try {
        const hospitalId = req.user?.hospitalId;

        if (!hospitalId) {
            return res.status(401).json({
                success: false,
                message: "Hospital not found",
            });
        }

        const display = await DisplayConfig.findOne({ hospitalId });

        if (!display) {
            return res.status(404).json({
                success: false,
                message: "Display configuration not found",
            });
        }

        const {
            hospitalName,
            heading,
            logoUrl,
            primaryColor,
            secondaryColor,
            displayLanguage,
            voiceEnabled,
            announcementEnabled,
            announcementRepeat,
            showEmergency,
            showReferred,
            showWaiting,
            showNext,
            showCurrent,
            isActive,
        } = req.body;

        // BASIC SETTINGS

        if (typeof hospitalName === "string") display.hospitalName = hospitalName.trim();
        if (typeof heading === "string") display.heading = heading.trim();
        if (typeof logoUrl === "string") display.logoUrl = logoUrl.trim();
        if (typeof primaryColor === "string") display.primaryColor = primaryColor;
        if (typeof secondaryColor === "string") display.secondaryColor = secondaryColor;

        // LANGUAGE

        if (displayLanguage !== undefined) {
            if (!isDisplayLanguage(displayLanguage)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid display language",
                });
            }

            display.displayLanguage = displayLanguage;
        }

        // VOICE

        if (typeof voiceEnabled === "boolean") display.voiceEnabled = voiceEnabled;
        if (typeof announcementEnabled === "boolean") display.announcementEnabled = announcementEnabled;

        // ANNOUNCEMENT REPEAT

        if (announcementRepeat !== undefined) {
            const repeat = Number(announcementRepeat);

            if (!Number.isInteger(repeat) || repeat < 1 || repeat > 5) {
                return res.status(400).json({
                    success: false,
                    message: "Announcement repeat must be between 1 and 5",
                });
            }

            display.announcementRepeat = repeat;
        }

        // DISPLAY SECTIONS

        if (typeof showEmergency === "boolean") display.showEmergency = showEmergency;
        if (typeof showReferred === "boolean") display.showReferred = showReferred;
        if (typeof showWaiting === "boolean") display.showWaiting = showWaiting;
        if (typeof showNext === "boolean") display.showNext = showNext;
        if (typeof showCurrent === "boolean") display.showCurrent = showCurrent;

        // ACTIVE

        if (typeof isActive === "boolean") display.isActive = isActive;

        await display.save();

        return res.status(200).json({
            success: true,
            message: "Display settings updated",
            display,
            displayUrl: `${getFrontendUrl()}/display/${display.displayKey}`,
        });
    } catch (error) {
        console.error("UPDATE DISPLAY CONFIG ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update display",
        });
    }
};

// =====================================================
// REGENERATE DISPLAY KEY
// POST /api/display/regenerate-key
// ADMIN
// =====================================================

export const regenerateDisplayKey = async (req: Request, res: Response) => {
    try {
        const hospitalId = req.user?.hospitalId;

        if (!hospitalId) {
            return res.status(401).json({
                success: false,
                message: "Hospital not found",
            });
        }

        const display = await DisplayConfig.findOne({ hospitalId });

        if (!display) {
            return res.status(404).json({
                success: false,
                message: "Display configuration not found",
            });
        }

        display.displayKey = crypto.randomBytes(32).toString("hex");

        await display.save();

        const displayUrl = `${getFrontendUrl()}/display/${display.displayKey}`;

        return res.status(200).json({
            success: true,
            message: "Display key regenerated",
            displayKey: display.displayKey,
            displayUrl,
        });
    } catch (error) {
        console.error("REGENERATE DISPLAY KEY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to regenerate display key",
        });
    }
};

// =====================================================
// AI VOICE: text is built from server records, never client text.
// Requires Node.js 20+ (native fetch and AbortSignal.timeout).
// =====================================================
type VoiceDoctor = {
    _id?: unknown;
    name?: string;
    isOnline?: boolean;
    isOnBreak?: boolean;
    breakStartedAt?: string | Date | null;
    breakReason?: string | null;
};
type VoiceQueue = {
    _id: unknown;
    tokenLabel: string;
    status: string;
    doctorId?: VoiceDoctor | null;
    source?: string;
    scheduledStartTime?: string | Date | null;
};
type VoiceKind = "call" | "next" | "break" | "offline" | "test";
type VoiceLanguage = "HI" | "EN";
type VoiceName = "marin" | "cedar";

const audioCache = new Map<string, { audio: Buffer; expires: number }>();
const audioPending = new Map<string, Promise<Buffer>>();
const generationLimits = new Map<string, { count: number; expires: number }>();
const MAX_CACHE_BYTES = 20 * 1024 * 1024;
let cacheBytes = 0;

function consumeGenerationBudget(displayKey: string): boolean {
    const now = Date.now();
    for (const [key, entry] of generationLimits) {
        if (entry.expires <= now) generationLimits.delete(key);
    }
    const entry = generationLimits.get(displayKey);
    if (entry) {
        if (entry.count >= 20) return false;
        entry.count += 1;
    } else {
        if (generationLimits.size >= 2000) return false;
        generationLimits.set(displayKey, { count: 1, expires: now + 60_000 });
    }
    return true;
}

function spokenToken(token: string, language: VoiceLanguage): string {
    const letters: Record<string, string> = {
        A: "ए", B: "बी", C: "सी", D: "डी", E: "ई", F: "एफ", G: "जी", H: "एच",
        I: "आई", J: "जे", K: "के", L: "एल", M: "एम", N: "एन", O: "ओ", P: "पी",
        Q: "क्यू", R: "आर", S: "एस", T: "टी", U: "यू", V: "वी", W: "डब्ल्यू",
        X: "एक्स", Y: "वाई", Z: "ज़ेड",
    };
    // Explicit map preserves leading zeroes and avoids reading H-012 as H twelve.
    const hindiDigits: Record<string, string> = {
        "0": "शून्य", "1": "एक", "2": "दो", "3": "तीन", "4": "चार",
        "5": "पाँच", "6": "छह", "7": "सात", "8": "आठ", "9": "नौ",
    };
    const en = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
    return token.toUpperCase().replace(/[^A-Z0-9]/g, "").split("").map((char) => {
        if (language === "HI") return letters[char] ?? hindiDigits[char] ?? char;
        return /[0-9]/.test(char) ? en[Number(char)] : char;
    }).join(" ");
}

function cacheAudio(key: string, audio: Buffer) {
    const now = Date.now();
    for (const [id, item] of audioCache) {
        if (item.expires <= now) {
            cacheBytes -= item.audio.length;
            audioCache.delete(id);
        }
    }
    if (audio.length > MAX_CACHE_BYTES) return;
    while (audioCache.size >= 100 || cacheBytes + audio.length > MAX_CACHE_BYTES) {
        const oldest = audioCache.keys().next().value;
        if (!oldest) break;
        cacheBytes -= audioCache.get(oldest)!.audio.length;
        audioCache.delete(oldest);
    }
    audioCache.set(key, { audio, expires: now + 30 * 60_000 });
    cacheBytes += audio.length;
}

async function generateAudio(text: string, language: VoiceLanguage, voice: VoiceName): Promise<Buffer> {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(25_000),
        body: JSON.stringify({
            model: "gpt-4o-mini-tts",
            voice,
            input: text,
            response_format: "mp3",
            instructions: language === "HI"
                ? "Read the supplied Hindi announcement exactly. Calm, clear Indian hospital receptionist. Natural conversational Hindi, measured pace, short pause after the token. Do not add, translate or omit words."
                : "Read the supplied announcement exactly. Calm, clear Indian English hospital receptionist. Measured pace, short pause after the token. Do not add or omit words.",
        }),
    });
    if (!response.ok) throw new Error(`Speech provider returned ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
}

export const getDisplayAnnouncement = async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    try {
        const displayKey = req.params.displayKey;
        const { kind, queueId, doctorId, language, voice } = req.body ?? {};
        if (typeof displayKey !== "string" || !/^[a-f0-9]{64}$/i.test(displayKey)) {
            return res.status(400).json({ message: "Invalid display key" });
        }
        if (!["call", "next", "break", "offline", "test"].includes(kind)
            || !["EN", "HI"].includes(language) || !["marin", "cedar"].includes(voice)) {
            return res.status(400).json({ message: "Invalid announcement options" });
        }
        const config = await DisplayConfig.findOne({ displayKey }).lean();
        if (!config || config.isActive === false) {
            return res.status(404).json({ message: "Display unavailable" });
        }
        if (!config.voiceEnabled || !config.announcementEnabled) {
            return res.status(403).json({ message: "Announcements disabled by hospital" });
        }
        if (!process.env.OPENAI_API_KEY) {
            return res.status(503).json({ message: "AI voice is not configured on the server" });
        }

        const event = kind as VoiceKind;
        const locale = language as VoiceLanguage;
        const selectedVoice = voice as VoiceName;
        let text = "";
        if (event === "test") {
            text = locale === "HI"
                ? "यह आवाज़ का परीक्षण है। नेक्ससिंक हेल्थ में आपका स्वागत है।"
                : "This is a voice test. Welcome to NextSynq Health.";
        } else if (event === "call" || event === "next") {
            if (typeof queueId !== "string" || !/^[a-f0-9]{24}$/i.test(queueId)) {
                return res.status(400).json({ message: "Invalid queue ID" });
            }
            // Match the existing board's queueDate convention. Change both together
            // if your Queue model uses an India-local date rather than a UTC date.
            const today = new Date().toISOString().split("T")[0];
            const record = await Queue.findOne({
                _id: queueId, hospitalId: config.hospitalId, queueDate: today,
                status: event === "call" ? "CALLED" : "WAITING",
            }).populate("doctorId", "name isOnline isOnBreak").lean();
            const queue = record as unknown as VoiceQueue | null;
            if (!queue || !queue.doctorId || queue.doctorId.isOnline !== true || queue.doctorId.isOnBreak) {
                return res.status(409).json({ message: "Announcement no longer valid" });
            }
            if (event === "next") {
                const first = await Queue.findOne({
                    hospitalId: config.hospitalId, queueDate: today, status: "WAITING",
                }).sort({ priority: -1, tokenNumber: 1 }).select("_id").lean();
                const called = await Queue.exists({
                    hospitalId: config.hospitalId, queueDate: today, status: "CALLED",
                });
                // Future appointment slots must never be announced as ready.
                const appointment = queue.source === "APPOINTMENT" || queue.tokenLabel.includes("-A");
                const due = queue.scheduledStartTime ? new Date(queue.scheduledStartTime).getTime() : NaN;
                if (!first || String(first._id) !== queueId || called
                    || (appointment && (!Number.isFinite(due) || due > Date.now()))) {
                    return res.status(409).json({ message: "Next token is not ready for an announcement" });
                }
            }
            const token = spokenToken(queue.tokenLabel, locale);
            const name = (queue.doctorId.name ?? "").replace(/^dr\.?\s*/i, "").slice(0, 100);
            if (event === "call") {
                text = locale === "HI"
                    ? `टोकन नंबर ${token}। कृपया ${name ? `डॉक्टर ${name} के` : "डॉक्टर के"} कमरे में जाएँ।`
                    : `Token number ${token}. Please proceed to ${name ? `Doctor ${name}'s` : "the doctor's"} room.`;
            } else {
                text = locale === "HI"
                    ? `अगला नंबर टोकन ${token} का है। कृपया तैयार रहें। बुलाए जाने पर ही डॉक्टर के कमरे में जाएँ।`
                    : `Up next, token number ${token}. Please be ready. Wait for your call before entering the doctor's room.`;
            }
        } else {
            if (typeof doctorId !== "string" || !/^[a-f0-9]{24}$/i.test(doctorId)) {
                return res.status(400).json({ message: "Invalid doctor ID" });
            }
            const record = await User.findOne({ _id: doctorId, hospitalId: config.hospitalId, role: "DOCTOR", isActive: true })
                .select("name isOnline isOnBreak").lean();
            const doctor = record as unknown as VoiceDoctor | null;
            if (!doctor || (event === "break" ? doctor.isOnBreak !== true : doctor.isOnline !== false)) {
                return res.status(409).json({ message: "Doctor status changed" });
            }
            const name = (doctor.name ?? "").replace(/^dr\.?\s*/i, "").slice(0, 100);
            text = event === "break"
                ? locale === "HI" ? `डॉक्टर ${name} अभी ब्रेक पर हैं। कृपया अगली घोषणा की प्रतीक्षा करें।`
                    : `Doctor ${name} is on a break. Please wait for the next announcement.`
                : locale === "HI" ? `डॉक्टर ${name} अभी उपलब्ध नहीं हैं। कृपया रिसेप्शन से संपर्क करें।`
                    : `Doctor ${name} is currently unavailable. Please contact reception.`;
        }

        // Authorize and validate the event above even on a cache hit.
        const cacheKey = crypto.createHash("sha256").update(JSON.stringify([
            String(config.hospitalId), "voice-v1", locale, selectedVoice, text,
        ])).digest("hex");
        let cached = audioCache.get(cacheKey);
        if (cached && cached.expires <= Date.now()) {
            cacheBytes -= cached.audio.length;
            audioCache.delete(cacheKey);
            cached = undefined;
        }
        let audio = cached?.audio;
        if (!audio) {
            let pending = audioPending.get(cacheKey);
            if (!pending) {
                if (audioPending.size >= 4 || !consumeGenerationBudget(displayKey)) {
                    res.setHeader("Retry-After", "60");
                    return res.status(429).json({ message: "Voice service busy. Try again shortly." });
                }
                pending = generateAudio(text, locale, selectedVoice);
                audioPending.set(cacheKey, pending);
                try {
                    audio = await pending;
                    cacheAudio(cacheKey, audio);
                } finally {
                    audioPending.delete(cacheKey);
                }
            } else {
                audio = await pending;
            }
        }
        return res.type("audio/mpeg").send(audio);
    } catch (error) {
        // Do not log API keys, announcement text or patient records.
        console.error("DISPLAY AUDIO ERROR:", error instanceof Error ? error.message : "Unknown error");
        return res.status(502).json({ message: "AI voice temporarily unavailable. The visual queue remains active." });
    }
};
