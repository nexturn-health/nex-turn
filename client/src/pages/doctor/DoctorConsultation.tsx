import {
    useEffect,
    useState,
    type ReactNode,
} from "react";

import {
    AlertCircle,
    Brain,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Eye,
    FileText,
    FlaskConical,
    HeartPulse,
    Loader2,
    Mic,
    Pill,
    RefreshCw,
    Save,
    ShieldAlert,
    Sparkles,
    Stethoscope,
    User,
    X,
} from "lucide-react";

import toast from "react-hot-toast";

import {
    completeConsultation,
    getConsultationById,
    updateConsultation,
    type Consultation,
} from "../../services/ai/consultation.api";

import {
    transcribeConsultationAudio,
} from "../../services/ai/transcription.api";

import {
    generateClinicalAnalysis,
} from "../../services/ai/clinicalAnalysis.api";

import VoiceRecorder from "../../components/consultation/VoiceRecorder";

import {
    createLabOrder,
    getActiveLabTests,
    getTodayPatientLabOrders,
    getLabReportBlob,
    type LabTest,
    type LabOrder,
} from "../../services/lab/lab.api";

// ============================================================
// TYPES
// ============================================================

interface StartConsultationProps {
    consultationId: string;
    onClose: () => void;
    onCompleted: () => void | Promise<void>;
}

interface AIListSectionProps {
    title: string;
    items: string[];
    icon: ReactNode;
    emptyText?: string;
    danger?: boolean;
}

// ============================================================
// SMALL UI COMPONENT
// ============================================================

const SectionHeader = ({
    title,
    description,
    icon,
}: {
    number: string;
    title: string;
    description: string;
    icon: ReactNode;
}) => {
    return (
        <div className="scribe-section-heading flex items-start gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white">
                {icon}
            </div>

            <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-gray-900">
                            {title}
                        </h2>

                        
                    </div>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// AI LIST SECTION
// ============================================================

const AIListSection = ({
    title,
    items,
    icon,
    emptyText = "No information available.",
    danger = false,
}: AIListSectionProps) => {
    return (
        <div
            className={`rounded-xl border p-4 ${
                danger
                    ? "border-red-200 bg-red-50"
                    : "border-gray-200 bg-white"
            }`}
        >
            <div className="mb-3 flex items-center gap-2">
                <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        danger
                            ? "bg-red-100 text-red-600"
                            : "bg-teal-50 text-teal-600"
                    }`}
                >
                    {icon}
                </div>

                <h3
                    className={`text-sm font-semibold ${
                        danger
                            ? "text-red-700"
                            : "text-gray-900"
                    }`}
                >
                    {title}
                </h3>
            </div>

            {items.length > 0 ? (
                <ul className="space-y-2">
                    {items.map(
                        (
                            item,
                            index,
                        ) => (
                            <li
                                key={`${title}-${index}`}
                                className="flex items-start gap-2 text-sm leading-6 text-gray-700"
                            >
                                <span
                                    className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                                        danger
                                            ? "bg-red-500"
                                            : "bg-teal-500"
                                    }`}
                                />

                                <span>
                                    {item}
                                </span>
                            </li>
                        ),
                    )}
                </ul>
            ) : (
                <p className="text-xs text-gray-500">
                    {emptyText}
                </p>
            )}
        </div>
    );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const StartConsultation = ({
    consultationId,
    onClose,
    onCompleted,
}: StartConsultationProps) => {
    const [activeView, setActiveView] = useState<"capture" | "review" | "labs">("capture");
    // ========================================================
    // CONSULTATION STATE
    // ========================================================

    const [
        consultation,
        setConsultation,
    ] = useState<Consultation | null>(
        null,
    );

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [completing, setCompleting] =
        useState(false);

    const [transcribing, setTranscribing] =
        useState(false);

    const [analyzing, setAnalyzing] =
        useState(false);

    const [error, setError] =
        useState("");

    const [
        successMessage,
        setSuccessMessage,
    ] = useState("");

    // ========================================================
    // AUDIO
    // ========================================================

    const [audioBlob, setAudioBlob] =
        useState<Blob | null>(null);

    // ========================================================
    // FORM
    // ========================================================

    const [
        chiefComplaint,
        setChiefComplaint,
    ] = useState("");

    const [
        symptomsText,
        setSymptomsText,
    ] = useState("");

    const [
        clinicalNotes,
        setClinicalNotes,
    ] = useState("");

    const [
        examinationNotes,
        setExaminationNotes,
    ] = useState("");

    const [
        transcript,
        setTranscript,
    ] = useState("");

    const [
        transcriptLanguage,
        setTranscriptLanguage,
    ] = useState("en");

    // ========================================================
    // AI
    // ========================================================

    const [showAI, setShowAI] =
        useState(true);

    // ========================================================
    // LAB TESTS
    // ========================================================

    const [labTests, setLabTests] =
        useState<LabTest[]>([]);

    const [
        selectedLabTestIds,
        setSelectedLabTestIds,
    ] = useState<string[]>([]);

    const [labSearch, setLabSearch] =
        useState("");

    const [
        labDropdownOpen,
        setLabDropdownOpen,
    ] = useState(false);

    const [
        labTestsLoading,
        setLabTestsLoading,
    ] = useState(false);

    const [
        labOrdering,
        setLabOrdering,
    ] = useState(false);

    const [
        labOrderCreated,
        setLabOrderCreated,
    ] = useState(false);

    // ========================================================
    // TODAY'S LAB ORDERS
    // ========================================================

    const [
        todayLabOrders,
        setTodayLabOrders,
    ] = useState<LabOrder[]>([]);

    const [
        todayLabOrdersLoading,
        setTodayLabOrdersLoading,
    ] = useState(false);

    const [
        viewingReport,
        setViewingReport,
    ] = useState<string | null>(
        null,
    );

    // ========================================================
    // HELPERS
    // ========================================================

    const clearMessages = () => {
        setError("");
        setSuccessMessage("");
    };

    // ========================================================
    // LOAD LAB TESTS
    // ========================================================

    const loadLabTests =
        async () => {
            try {
                setLabTestsLoading(
                    true,
                );

                const response =
                    await getActiveLabTests();

                setLabTests(
                    response ?? [],
                );
            } catch (err) {
                console.error(
                    "Failed to load lab tests:",
                    err,
                );

                setError(
                    "Unable to load available lab tests.",
                );
            } finally {
                setLabTestsLoading(
                    false,
                );
            }
        };

    // ========================================================
    // LOAD TODAY'S PATIENT LAB ORDERS
    // ========================================================

    const loadTodayLabOrders =
        async (
            patientId: string,
        ) => {
            try {
                setTodayLabOrdersLoading(
                    true,
                );

                const orders =
                    await getTodayPatientLabOrders(
                        patientId,
                    );

                setTodayLabOrders(
                    orders ?? [],
                );
            } catch (err) {
                console.error(
                    "Failed to load today's lab orders:",
                    err,
                );

                setError(
                    "Unable to load today's laboratory tests.",
                );
            } finally {
                setTodayLabOrdersLoading(
                    false,
                );
            }
        };

    // ========================================================
    // TODAY'S ORDERED TEST IDS
    // ========================================================

    const todayOrderedTestIds =
        new Set(
            todayLabOrders.flatMap(
                (
                    order,
                ) =>
                    order.items
                        .filter(
                            (
                                item,
                            ) =>
                                item.status !==
                                "CANCELLED",
                        )
                        .map(
                            (
                                item,
                            ) =>
                                typeof item.labTestId ===
                                "string"
                                    ? item.labTestId
                                    : (
                                        item.labTestId as {
                                            _id: string;
                                        }
                                    )._id,
                        ),
            ),
        );

    // ========================================================
    // CHECK SAME-DAY DUPLICATE
    // ========================================================

    const isTestAlreadyOrderedToday =
        (
            testId: string,
        ): boolean => {
            return todayOrderedTestIds.has(
                testId,
            );
        };

    // ========================================================
    // FILTERED LAB TESTS
    // ========================================================

    const filteredLabTests =
        labTests.filter(
            (
                test,
            ) => {
                const query =
                    labSearch
                        .trim()
                        .toLowerCase();

                if (!query) {
                    return true;
                }

                return (
                    test.name
                        .toLowerCase()
                        .includes(
                            query,
                        ) ||
                    (
                        test.code ??
                        ""
                    )
                        .toLowerCase()
                        .includes(
                            query,
                        ) ||
                    (
                        test.category ??
                        ""
                    )
                        .toLowerCase()
                        .includes(
                            query,
                        )
                );
            },
        );

    // ========================================================
    // SELECTED LAB TESTS
    // ========================================================

    const selectedLabTests =
        labTests.filter(
            (
                test,
            ) =>
                selectedLabTestIds.includes(
                    test._id,
                ),
        );

    // ========================================================
    // TOGGLE LAB TEST
    // ========================================================

    const toggleLabTest =
        (
            testId: string,
        ) => {
            if (
                isTestAlreadyOrderedToday(
                    testId,
                )
            ) {
                setError(
                    "This laboratory test has already been ordered for this patient today.",
                );

                return;
            }

            setSelectedLabTestIds(
                (
                    current,
                ) =>
                    current.includes(
                        testId,
                    )
                        ? current.filter(
                            (
                                id,
                            ) =>
                                id !==
                                testId,
                        )
                        : [
                            ...current,
                            testId,
                        ],
            );

            clearMessages();
        };

    // ========================================================
    // REMOVE LAB TEST
    // ========================================================

    const removeLabTest =
        (
            testId: string,
        ) => {
            setSelectedLabTestIds(
                (
                    current,
                ) =>
                    current.filter(
                        (
                            id,
                        ) =>
                            id !==
                            testId,
                    ),
            );
        };

    // ========================================================
    // CREATE LAB ORDER
    // ========================================================

    const handleCreateLabOrder =
        async () => {
            if (
                !selectedLabTestIds.length
            ) {
                setError(
                    "Please select at least one lab test.",
                );

                return;
            }

            if (
                !consultation?.patientId?._id
            ) {
                setError(
                    "Patient information is unavailable.",
                );

                return;
            }

            if (
                !consultation?.queueId?._id
            ) {
                setError(
                    "Queue information is unavailable.",
                );

                return;
            }

            // =================================================
            // DUPLICATE CHECK
            // =================================================

            const duplicateTests =
                selectedLabTestIds.filter(
                    (
                        testId,
                    ) =>
                        isTestAlreadyOrderedToday(
                            testId,
                        ),
                );

            if (
                duplicateTests.length >
                0
            ) {
                setError(
                    "One or more selected tests have already been ordered for this patient today.",
                );

                return;
            }

            try {
                setLabOrdering(
                    true,
                );

                clearMessages();

                const order =
                    await createLabOrder(
                        {
                            consultationId,
                            queueId:
                                consultation
                                    .queueId
                                    ._id,
                            patientId:
                                consultation
                                    .patientId
                                    ._id,
                            testIds:
                                selectedLabTestIds,
                        },
                    );

                // =================================================
                // ADD NEW ORDER TO TODAY'S ORDERS
                // =================================================

                setTodayLabOrders(
                    (
                        current,
                    ) => [
                        ...current,
                        order,
                    ],
                );

                setSelectedLabTestIds(
                    [],
                );

                setLabOrderCreated(
                    true,
                );

                setSuccessMessage(
                    `${order.items.length} lab test${
                        order.items.length >
                        1
                            ? "s"
                            : ""
                    } ordered successfully.`,
                );
            } catch (err) {
                console.error(
                    "Create lab order error:",
                    err,
                );

                const axiosError =
                    err as {
                        response?: {
                            data?: {
                                message?: string;
                            };
                        };
                    };

                setError(
                    axiosError
                        .response
                        ?.data
                        ?.message ??
                        "Unable to create the lab order. Please try again.",
                );
            } finally {
                setLabOrdering(
                    false,
                );
            }
        };

    // ========================================================
    // LOAD CONSULTATION
    // ========================================================

    const loadConsultation =
        async () => {
            try {
                setLoading(
                    true,
                );

                setError("");

                const response =
                    await getConsultationById(
                        consultationId,
                    );

                const data =
                    response.data;

                setConsultation(
                    data,
                );

                setChiefComplaint(
                    data.chiefComplaint ??
                        "",
                );

                setSymptomsText(
                    Array.isArray(
                        data.symptoms,
                    )
                        ? data.symptoms.join(
                            ", ",
                        )
                        : "",
                );

                setClinicalNotes(
                    data.clinicalNotes ??
                        "",
                );

                setExaminationNotes(
                    data.examinationNotes ??
                        "",
                );

                setTranscript(
                    data.transcript ??
                        "",
                );

                setTranscriptLanguage(
                    data.transcriptLanguage ??
                        "en",
                );

                if (
                    data.aiAnalysis
                ) {
                    setShowAI(
                        true,
                    );
                }
            } catch (err) {
                console.error(
                    "Failed to load consultation:",
                    err,
                );

                setError(
                    "Unable to load consultation.",
                );
            } finally {
                setLoading(
                    false,
                );
            }
        };

    // ========================================================
    // INITIAL LOAD
    // ========================================================

    useEffect(() => {
        if (
            !consultationId
        ) {
            return;
        }

        const loadData =
            async () => {
                await Promise.all([
                    loadConsultation(),
                    loadLabTests(),
                ]);
            };

        loadData();
    }, [
        consultationId,
    ]);

    // ========================================================
    // LOAD TODAY'S LAB ORDERS
    // ========================================================

    useEffect(() => {
        const patientId =
            consultation?.patientId?._id;

        if (!patientId) {
            return;
        }

        loadTodayLabOrders(
            patientId,
        );
    }, [
        consultation?.patientId?._id,
    ]);

    // ========================================================
    // ESCAPE
    // ========================================================

    useEffect(() => {
        const handleKeyDown =
            (
                event: KeyboardEvent,
            ) => {
                if (
                    event.key ===
                    "Escape"
                ) {
                    onClose();
                }
            };

        window.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [
        onClose,
    ]);

    // ========================================================
    // SYMPTOMS
    // ========================================================

    const getSymptomsArray =
        (): string[] => {
            return symptomsText
                .split(",")
                .map(
                    (
                        item,
                    ) =>
                        item.trim(),
                )
                .filter(
                    Boolean,
                );
        };

    // ========================================================
    // FORM DATA
    // ========================================================

    const getFormData =
        () => {
            return {
                chiefComplaint:
                    chiefComplaint.trim(),

                symptoms:
                    getSymptomsArray(),

                clinicalNotes:
                    clinicalNotes.trim(),

                examinationNotes:
                    examinationNotes.trim(),

                transcript:
                    transcript.trim(),

                transcriptLanguage:
                    transcriptLanguage ||
                    "en",
            };
        };

    // ========================================================
    // RECORDING COMPLETE
    // ========================================================

    const handleRecordingComplete =
        (
            blob: Blob,
        ) => {
            setAudioBlob(
                blob,
            );

            clearMessages();
        };

    // ========================================================
    // TRANSCRIBE
    // ========================================================

    const handleTranscribe =
        async () => {
            if (
                !audioBlob
            ) {
                setError(
                    "Please record the consultation first.",
                );

                return;
            }

            try {
                setTranscribing(
                    true,
                );

                clearMessages();

                const response =
                    await transcribeConsultationAudio(
                        audioBlob,
                    );

                const text =
                    response.data
                        ?.text ??
                    "";

                const language =
                    response.data
                        ?.language ??
                    "en";

                setTranscript(
                    text,
                );

                setTranscriptLanguage(
                    language,
                );

                setSuccessMessage(
                    "Transcript generated successfully. Please review it before AI analysis.",
                );
            } catch (err) {
                console.error(
                    "Transcription error:",
                    err,
                );

                setError(
                    "Unable to transcribe the recording. Please try again.",
                );
            } finally {
                setTranscribing(
                    false,
                );
            }
        };

    // ========================================================
    // SAVE
    // ========================================================

    const handleSave =
        async () => {
            try {
                setSaving(
                    true,
                );

                clearMessages();

                const response =
                    await updateConsultation(
                        consultationId,
                        getFormData(),
                    );

                setConsultation(
                    response.data,
                );

                setSuccessMessage(
                    "Consultation saved successfully.",
                );
            } catch (err) {
                console.error(
                    "Save consultation error:",
                    err,
                );

                setError(
                    "Unable to save consultation.",
                );
            } finally {
                setSaving(
                    false,
                );
            }
        };

    // ========================================================
    // AI ANALYSIS
    // ========================================================

    const handleGenerateAIAnalysis =
        async () => {
            try {
                setAnalyzing(
                    true,
                );

                clearMessages();

                // Save latest doctor input
                const saveResponse =
                    await updateConsultation(
                        consultationId,
                        getFormData(),
                    );

                setConsultation(
                    saveResponse.data,
                );

                // Generate AI analysis
                const aiResponse =
                    await generateClinicalAnalysis(
                        consultationId,
                    );

                setConsultation(
                    aiResponse.data,
                );

                setShowAI(
                    true,
                );

                setSuccessMessage(
                    "AI analysis generated. Please review the suggestions carefully.",
                );
            } catch (err) {
                console.error(
                    "AI analysis error:",
                    err,
                );

                setError(
                    "Unable to generate AI analysis.",
                );
            } finally {
                setAnalyzing(
                    false,
                );
            }
        };

    // ========================================================
    // COMPLETE CONSULTATION
    // ========================================================

    const handleComplete =
        async () => {
            try {
                setCompleting(
                    true,
                );

                clearMessages();

                await updateConsultation(
                    consultationId,
                    getFormData(),
                );

                await completeConsultation(
                    consultationId,
                );

                await onCompleted();
            } catch (err) {
                console.error(
                    "Complete consultation error:",
                    err,
                );

                setError(
                    "Unable to complete consultation.",
                );
            } finally {
                setCompleting(
                    false,
                );
            }
        };

    // ========================================================
    // VIEW LAB REPORT
    // ========================================================

    const handleViewReport =
        async (
            orderId: string,
            itemId: string,
            fileName?: string,
        ) => {
            if (!fileName) {
                toast.error(
                    "Laboratory report is not available.",
                );

                return;
            }

            // Open immediately to prevent popup blocker
            const reportWindow =
                window.open(
                    "",
                    "_blank",
                );

            try {
                setViewingReport(
                    itemId,
                );

                const blob =
                    await getLabReportBlob(
                        orderId,
                        itemId,
                    );

                const reportUrl =
                    URL.createObjectURL(
                        blob,
                    );

                if (
                    reportWindow
                ) {
                    reportWindow.location.href =
                        reportUrl;
                } else {
                    window.open(
                        reportUrl,
                        "_blank",
                    );
                }

                setTimeout(
                    () => {
                        URL.revokeObjectURL(
                            reportUrl,
                        );
                    },
                    60000,
                );
            } catch (error) {
                console.error(
                    "View lab report error:",
                    error,
                );

                if (
                    reportWindow
                ) {
                    reportWindow.close();
                }

                toast.error(
                    "Unable to open the laboratory report.",
                );
            } finally {
                setViewingReport(
                    null,
                );
            }
        };

    // ========================================================
    // NORMALIZED AI DATA
    // ========================================================

    const aiAnalysis =
        consultation?.aiAnalysis ??
        null;

    const aiSymptoms =
        aiAnalysis?.symptoms ??
        [];

    const aiPossibleConditions =
        aiAnalysis?.possibleConditions ??
        [];

    const aiRedFlags =
        aiAnalysis?.redFlags ??
        [];

    const aiSuggestedInvestigations =
        aiAnalysis?.suggestedInvestigations ??
        [];

    const aiMedicationConsiderations =
        aiAnalysis?.medicationConsiderations ??
        [];

    const aiDietAndLifestyle =
        aiAnalysis?.dietAndLifestyle ??
        [];

    const aiFollowUpSuggestions =
        aiAnalysis?.followUpSuggestions ??
        [];

    // ========================================================
    // LOADING
    // ========================================================

    if (loading) {
        return (
            <div className="scribe-design scribe-overlay fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                <div className="rounded-2xl bg-white px-8 py-7 text-center shadow-2xl">
                    <ScribeDesignStyles />
                    <Loader2
                        size={30}
                        className="mx-auto animate-spin text-teal-600"
                    />

                    <p className="mt-3 text-sm font-medium text-gray-700">
                        Loading consultation...
                    </p>
                </div>
            </div>
        );
    }

    // ========================================================
    // MAIN UI
    // ========================================================

    return (
        <div className="scribe-design scribe-overlay fixed inset-0 z-[100] overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-label="AI consultation scribe">
            <div className="scribe-frame mx-auto flex min-h-full max-w-5xl items-center justify-center">
                <div className="scribe-shell flex max-h-[96vh] w-full flex-col overflow-hidden rounded-2xl bg-[#f7f9fc] shadow-2xl">

                    {/* ==================================================
                        HEADER
                    ================================================== */}

                    <ScribeDesignStyles />
                    <header className="scribe-header shrink-0 border-b border-gray-200 bg-white px-5 py-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
                                    <Stethoscope
                                        size={20}
                                    />
                                </div>

                                <div className="min-w-0">
                                    <h1 className="truncate text-base font-bold text-gray-900">
                                        AI Consultation Scribe
                                    </h1>

                                    <p className="text-xs text-gray-500">
                                        Record • Review • Complete
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    onClose
                                }
                                disabled={
                                    saving ||
                                    completing
                                }
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                            >
                                <X
                                    size={20}
                                />
                            </button>
                        </div>
                    </header>

                    {/* ==================================================
                        CONTENT
                    ================================================== */}

                    <nav className="scribe-nav" aria-label="Consultation views">
  <button type="button" aria-pressed={activeView === "capture"} onClick={() => setActiveView("capture")}><Mic size={17} /><span>Record & notes</span></button>
  <button type="button" aria-pressed={activeView === "review"} onClick={() => setActiveView("review")}><Sparkles size={17} /><span>AI review</span>{aiAnalysis && <span className="scribe-dot" aria-label="Analysis available" />}</button>
  <button type="button" aria-pressed={activeView === "labs"} onClick={() => setActiveView("labs")}><FlaskConical size={17} /><span>Lab tests</span></button>
</nav>
<main className="scribe-body flex-1 overflow-y-auto">
                        <div className="mx-auto max-w-4xl space-y-5 p-5 sm:p-6">

                            {/* ==================================================
                                MESSAGES
                            ================================================== */}

                            {error && (
                                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                                    <AlertCircle
                                        size={18}
                                        className="mt-0.5 shrink-0 text-red-600"
                                    />

                                    <p className="text-sm leading-5 text-red-700">
                                        {
                                            error
                                        }
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setError(
                                                "",
                                            )
                                        }
                                        className="ml-auto text-red-500 hover:text-red-700"
                                    >
                                        <X
                                            size={16}
                                        />
                                    </button>
                                </div>
                            )}

                            {successMessage && (
                                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                                    <CheckCircle2
                                        size={18}
                                        className="mt-0.5 shrink-0 text-emerald-600"
                                    />

                                    <p className="text-sm leading-5 text-emerald-700">
                                        {
                                            successMessage
                                        }
                                    </p>
                                </div>
                            )}

                            {/* ==================================================
                                PATIENT
                            ================================================== */}

                            {consultation?.patientId && (
                                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                                            <User
                                                size={22}
                                            />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <h2 className="text-base font-bold text-gray-900">
                                                {
                                                    consultation
                                                        .patientId
                                                        .name
                                                }
                                            </h2>

                                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                                <span>
                                                    ID:{" "}
                                                    {
                                                        consultation
                                                            .patientId
                                                            .patientCode
                                                    }
                                                </span>

                                                {consultation.patientId.age !==
                                                    undefined && (
                                                    <span>
                                                        Age:{" "}
                                                        {
                                                            consultation
                                                                .patientId
                                                                .age
                                                        }
                                                    </span>
                                                )}

                                                {consultation.patientId.gender && (
                                                    <span>
                                                        {
                                                            consultation
                                                                .patientId
                                                                .gender
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="shrink-0 rounded-xl bg-teal-50 px-4 py-2.5 text-center">
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-500">
                                                Token
                                            </p>

                                            <p className="mt-0.5 text-lg font-bold text-teal-700">
                                                {
                                                    consultation
                                                        .queueId
                                                        .tokenLabel
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* ==================================================
                                STEP 1
                            ================================================== */}

                            <div hidden={activeView !== "capture"} className="scribe-view">
<div className="scribe-intro"><span>YOUR AI SCRIBE</span><h2>Focus on your patient.</h2><p>Record, review the transcript, then ask AI for suggestions.</p></div>
<section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                                <SectionHeader
                                    number="1"
                                    title="Record the conversation"
                                    description="Record the conversation between the doctor and patient."
                                    icon={
                                        <Mic
                                            size={16}
                                        />
                                    }
                                />

                                <div className="mt-6">
                                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                                        <VoiceRecorder
                                            onRecordingComplete={
                                                handleRecordingComplete
                                            }
                                        />
                                    </div>

                                    {audioBlob && (
                                        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-teal-100 bg-teal-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-teal-600">
                                                    <Mic
                                                        size={17}
                                                    />
                                                </div>

                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        Recording ready
                                                    </p>

                                                    <p className="text-xs text-gray-500">
                                                        Convert this recording into text.
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={
                                                    handleTranscribe
                                                }
                                                disabled={
                                                    transcribing
                                                }
                                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {transcribing ? (
                                                    <>
                                                        <Loader2
                                                            size={
                                                                16
                                                            }
                                                            className="animate-spin"
                                                        />

                                                        Transcribing
                                                    </>
                                                ) : (
                                                    <>
                                                        <FileText
                                                            size={
                                                                16
                                                            }
                                                        />

                                                        Generate Transcript
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </section><section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                                <SectionHeader
                                    number="2"
                                    title="Review the transcript"
                                    description="Correct the text, or type your consultation notes directly."
                                    icon={
                                        <FileText
                                            size={16}
                                        />
                                    }
                                />

                                <div className="mt-6">
                                    <div className="mb-3 flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-700">
                                            Consultation Transcript
                                        </label>

                                        <select
                                            value={
                                                transcriptLanguage
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setTranscriptLanguage(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                        >
                                            <option value="en">
                                                English
                                            </option>

                                            <option value="hi">
                                                Hindi
                                            </option>

                                            <option value="hinglish">
                                                Hinglish
                                            </option>
                                        </select>
                                    </div>

                                    <textarea
                                        value={
                                            transcript
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setTranscript(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        rows={7}
                                        placeholder="Your consultation transcript will appear here..."
                                        className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                                    />

                                    <div className="mt-3 flex items-center justify-between">
                                        <p className="text-xs text-gray-400">
                                            {
                                                transcript.length
                                            }{" "}
                                            characters
                                        </p>

                                        {transcript && (
                                            <span className="text-xs font-medium text-emerald-600">
                                                Transcript available
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </section><details className="scribe-details"><summary>Clinical notes <span>Complaint, symptoms & examination</span><ChevronDown size={17} /></summary><section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                                <SectionHeader
                                    number="4"
                                    title="Clinical notes"
                                    description="Add your findings before generating AI suggestions."
                                    icon={
                                        <Stethoscope
                                            size={
                                                16
                                            }
                                        />
                                    }
                                />

                                <div className="mt-6 space-y-5">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">
                                            Chief Complaint
                                        </label>

                                        <textarea
                                            value={
                                                chiefComplaint
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setChiefComplaint(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            rows={
                                                3
                                            }
                                            placeholder="Enter the patient's main complaint..."
                                            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">
                                            Symptoms
                                        </label>

                                        <input
                                            value={
                                                symptomsText
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setSymptomsText(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            placeholder="Fever, cough, headache, fatigue..."
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                                        />

                                        <p className="mt-1.5 text-xs text-gray-400">
                                            Separate symptoms with commas.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">
                                            Clinical Notes
                                        </label>

                                        <textarea
                                            value={
                                                clinicalNotes
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setClinicalNotes(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            rows={
                                                5
                                            }
                                            placeholder="Write your clinical assessment..."
                                            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">
                                            Examination Findings
                                        </label>

                                        <textarea
                                            value={
                                                examinationNotes
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setExaminationNotes(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            rows={
                                                5
                                            }
                                            placeholder="Enter physical examination findings..."
                                            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                                        />
                                    </div>
                                </div>
                            </section></details><div className="scribe-next"><p>Your transcript is editable. Review it before analysis.</p><button type="button" onClick={() => setActiveView("review")} className="scribe-primary">Continue to AI review <Sparkles size={16} /></button></div>
</div><div hidden={activeView !== "review"} className="scribe-view"><section className="overflow-hidden rounded-2xl border border-teal-100 bg-white">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowAI(
                                            (
                                                value,
                                            ) =>
                                                !value,
                                        )
                                    }
                                    className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-teal-50/40 sm:p-6"
                                >
                                    <SectionHeader
                                        number="3"
                                        title="AI suggestions"
                                        description="Review the summary and suggestions before making your clinical decision."
                                        icon={
                                            <Sparkles
                                                size={
                                                    16
                                                }
                                            />
                                        }
                                    />

                                    <div className="shrink-0 text-gray-400">
                                        {showAI ? (
                                            <ChevronUp
                                                size={
                                                    19
                                                }
                                            />
                                        ) : (
                                            <ChevronDown
                                                size={
                                                    19
                                                }
                                            />
                                        )}
                                    </div>
                                </button>

                                {showAI && (
                                    <div className="border-t border-gray-100 p-5 sm:p-6">
                                        <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-teal-600">
                                                        <Brain
                                                            size={
                                                                18
                                                            }
                                                        />
                                                    </div>

                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            Clinical analysis
                                                        </p>

                                                        <p className="mt-1 max-w-xl text-xs leading-5 text-gray-600">
                                                            AI will review the consultation transcript,
                                                            symptoms and clinical notes and provide
                                                            suggestions for doctor review.
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={
                                                        handleGenerateAIAnalysis
                                                    }
                                                    disabled={
                                                        analyzing ||
                                                        !transcript.trim()
                                                    }
                                                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {analyzing ? (
                                                        <>
                                                            <Loader2
                                                                size={
                                                                    16
                                                                }
                                                                className="animate-spin"
                                                            />

                                                            Analyzing
                                                        </>
                                                    ) : aiAnalysis ? (
                                                        <>
                                                            <RefreshCw
                                                                size={
                                                                    16
                                                                }
                                                            />

                                                            Analyze Again
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sparkles
                                                                size={
                                                                    16
                                                                }
                                                            />

                                                            Analyze
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {!aiAnalysis ? (
                                            <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
                                                <Brain
                                                    size={
                                                        30
                                                    }
                                                    className="mx-auto text-gray-300"
                                                />

                                                <p className="mt-3 text-sm font-semibold text-gray-700">
                                                    AI analysis will appear here
                                                </p>

                                                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-gray-500">
                                                    Generate the transcript first, review it,
                                                    then click Analyze.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="mt-5 space-y-4">
                                                {aiAnalysis.clinicalSummary && (
                                                    <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-5">
                                                        <div className="mb-3 flex items-center gap-2">
                                                            <HeartPulse
                                                                size={
                                                                    18
                                                                }
                                                                className="text-teal-600"
                                                            />

                                                            <h3 className="text-sm font-semibold text-gray-900">
                                                                Clinical Summary
                                                            </h3>
                                                        </div>

                                                        <p className="text-sm leading-6 text-gray-700">
                                                            {
                                                                aiAnalysis.clinicalSummary
                                                            }
                                                        </p>
                                                    </div>
                                                )}

                                                <AIListSection
                                                    title="Red Flags"
                                                    items={
                                                        aiRedFlags
                                                    }
                                                    icon={
                                                        <><ShieldAlert
                                                            size={16} /><div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                                <AIListSection
                                                                    title="Symptoms"
                                                                    items={aiSymptoms}
                                                                    icon={<Stethoscope
                                                                        size={16} />} />

                                                                <AIListSection
                                                                    title="Possible Conditions"
                                                                    items={aiPossibleConditions}
                                                                    icon={<HeartPulse
                                                                        size={16} />} />

                                                                <AIListSection
                                                                    title="Suggested Investigations"
                                                                    items={aiSuggestedInvestigations}
                                                                    icon={<FlaskConical
                                                                        size={16} />} />

                                                                <AIListSection
                                                                    title="Medication Considerations"
                                                                    items={aiMedicationConsiderations}
                                                                    icon={<Pill
                                                                        size={16} />} />

                                                                <AIListSection
                                                                    title="Diet & Lifestyle"
                                                                    items={aiDietAndLifestyle}
                                                                    icon={<HeartPulse
                                                                        size={16} />} />

                                                                <AIListSection
                                                                    title="Follow-up Suggestions"
                                                                    items={aiFollowUpSuggestions}
                                                                    icon={<RefreshCw
                                                                        size={16} />} />
                                                            </div></>

                                                
                                                    }
                                                    emptyText="No red flags identified from the available information."
                                                    danger
                                                />

                                                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                                    <AlertCircle
                                                        size={
                                                            17
                                                        }
                                                        className="mt-0.5 shrink-0 text-amber-600"
                                                    />

                                                    <p className="text-xs leading-5 text-amber-800">
                                                        AI output is for clinical
                                                        decision-support only. The doctor
                                                        must independently review the
                                                        information and make the final
                                                        clinical decision.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section><details className="scribe-details scribe-draft"><summary>Treatment draft <span>Not saved</span><ChevronDown size={17} /></summary><section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                                <SectionHeader
                                    number="6"
                                    title="Treatment draft"
                                    description="Draft only. These three fields are not saved or submitted by the existing consultation API."
                                    icon={
                                        <Pill
                                            size={
                                                16
                                            }
                                        />
                                    }
                                />

                                <div className="mt-6 space-y-5">
                                    {aiAnalysis && (
                                        <div className="flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50 p-4">
                                            <Sparkles
                                                size={
                                                    17
                                                }
                                                className="mt-0.5 shrink-0 text-teal-600"
                                            />

                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    AI suggestions are available above
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-gray-600">
                                                    Review the AI-generated information
                                                    before entering your final clinical
                                                    decision.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">
                                            Final Diagnosis
                                        </label>

                                        <textarea
                                            rows={
                                                3
                                            }
                                            placeholder="Enter the final diagnosis..."
                                            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">
                                            Prescription / Treatment Plan
                                        </label>

                                        <textarea
                                            rows={
                                                7
                                            }
                                            placeholder={`Example:

Medicine name — dosage — frequency — duration
Medicine name — dosage — frequency — duration

Additional instructions...`}
                                            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">
                                            Follow-up Instructions
                                        </label>

                                        <textarea
                                            rows={
                                                3
                                            }
                                            placeholder="Enter follow-up instructions..."
                                            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                                        />
                                    </div>

                                    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                                        <ShieldAlert
                                            size={
                                                17
                                            }
                                            className="mt-0.5 shrink-0 text-gray-500"
                                        />

                                        <p className="text-xs leading-5 text-gray-600">
                                            The final diagnosis and prescription are
                                            entered and approved by the doctor. AI
                                            suggestions are not automatically added
                                            to the prescription.
                                        </p>
                                    </div>
                                </div>
                            </section></details></div><div hidden={activeView !== "labs"} className="scribe-view"><section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                                <SectionHeader
                                    number="5"
                                    title="Laboratory Tests"
                                    description="Select laboratory investigations required for this patient."
                                    icon={
                                        <FlaskConical
                                            size={
                                                16
                                            }
                                        />
                                    }
                                />

                                <div className="mt-6">
                                    {/* ==================================================
                                        SEARCH / SELECT
                                    ================================================== */}

                                    <div className="relative">
                                        <label className="mb-2 block text-sm font-medium text-gray-700">
                                            Search & Select Lab Tests
                                        </label>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setLabDropdownOpen(
                                                    (
                                                        value,
                                                    ) =>
                                                        !value,
                                                )
                                            }
                                            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left transition hover:border-gray-300 focus:border-teal-500 focus:bg-white"
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                <FlaskConical
                                                    size={
                                                        17
                                                    }
                                                    className="shrink-0 text-teal-500"
                                                />

                                                <span className="truncate text-sm text-gray-500">
                                                    {selectedLabTests.length
                                                        ? `${selectedLabTests.length} test${
                                                            selectedLabTests.length >
                                                            1
                                                                ? "s"
                                                                : ""
                                                        } selected`
                                                        : "Search and select laboratory tests..."}
                                                </span>
                                            </span>

                                            {labDropdownOpen ? (
                                                <ChevronUp
                                                    size={
                                                        17
                                                    }
                                                    className="shrink-0 text-gray-400"
                                                />
                                            ) : (
                                                <ChevronDown
                                                    size={
                                                        17
                                                    }
                                                    className="shrink-0 text-gray-400"
                                                />
                                            )}
                                        </button>

                                        {labDropdownOpen && (
                                            <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                                                <div className="border-b border-gray-100 p-3">
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        value={
                                                            labSearch
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            setLabSearch(
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Search by test name, code or category..."
                                                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
                                                    />
                                                </div>

                                                <div className="max-h-72 overflow-y-auto p-2">
                                                    {labTestsLoading ? (
                                                        <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-gray-500">
                                                            <Loader2
                                                                size={
                                                                    17
                                                                }
                                                                className="animate-spin text-teal-600"
                                                            />

                                                            Loading lab tests...
                                                        </div>
                                                    ) : filteredLabTests.length ===
                                                      0 ? (
                                                        <div className="px-4 py-8 text-center">
                                                            <FlaskConical
                                                                size={
                                                                    25
                                                                }
                                                                className="mx-auto text-gray-300"
                                                            />

                                                            <p className="mt-2 text-sm font-medium text-gray-700">
                                                                No lab tests found
                                                            </p>

                                                            <p className="mt-1 text-xs text-gray-400">
                                                                Ask the hospital admin to add an active test.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        filteredLabTests.map(
                                                            (
                                                                test,
                                                            ) => {
                                                                const selected =
                                                                    selectedLabTestIds.includes(
                                                                        test._id,
                                                                    );

                                                                const alreadyOrderedToday =
                                                                    isTestAlreadyOrderedToday(
                                                                        test._id,
                                                                    );

                                                                return (
                                                                    <button
                                                                        key={
                                                                            test._id
                                                                        }
                                                                        type="button"
                                                                        disabled={
                                                                            alreadyOrderedToday
                                                                        }
                                                                        onClick={() =>
                                                                            toggleLabTest(
                                                                                test._id,
                                                                            )
                                                                        }
                                                                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${
                                                                            alreadyOrderedToday
                                                                                ? "cursor-not-allowed bg-gray-50 opacity-60"
                                                                                : selected
                                                                                    ? "bg-teal-50"
                                                                                    : "hover:bg-gray-50"
                                                                        }`}
                                                                    >
                                                                        <span
                                                                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                                                                alreadyOrderedToday
                                                                                    ? "border-emerald-500 bg-emerald-500 text-white"
                                                                                    : selected
                                                                                        ? "border-teal-600 bg-teal-600 text-white"
                                                                                        : "border-gray-300 bg-white"
                                                                            }`}
                                                                        >
                                                                            {alreadyOrderedToday ? (
                                                                                <CheckCircle2
                                                                                    size={
                                                                                        14
                                                                                    }
                                                                                />
                                                                            ) : selected ? (
                                                                                <CheckCircle2
                                                                                    size={
                                                                                        14
                                                                                    }
                                                                                />
                                                                            ) : null}
                                                                        </span>

                                                                        <span className="min-w-0 flex-1">
                                                                            <span className="flex items-center gap-2">
                                                                                <span className="block truncate text-sm font-medium text-gray-800">
                                                                                    {
                                                                                        test.name
                                                                                    }
                                                                                </span>

                                                                                {alreadyOrderedToday && (
                                                                                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                                                                        Already Ordered
                                                                                    </span>
                                                                                )}
                                                                            </span>

                                                                            <span className="mt-0.5 block text-xs text-gray-400">
                                                                                {test.code
                                                                                    ? `${test.code}${
                                                                                        test.category
                                                                                            ? ` • ${test.category}`
                                                                                            : ""
                                                                                    }`
                                                                                    : test.category ||
                                                                                      "Laboratory test"}
                                                                            </span>
                                                                        </span>

                                                                        <span className="shrink-0 text-xs font-semibold text-gray-600">
                                                                            ₹
                                                                            {
                                                                                test.price
                                                                            }
                                                                        </span>
                                                                    </button>
                                                                );
                                                            },
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ==================================================
                                        SELECTED TESTS
                                    ================================================== */}

                                    {selectedLabTests.length >
                                        0 && (
                                        <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/50 p-4">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        Selected Tests
                                                    </p>

                                                    <p className="mt-0.5 text-xs text-gray-500">
                                                        These tests will be sent to the hospital laboratory.
                                                    </p>
                                                </div>

                                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-teal-700">
                                                    {
                                                        selectedLabTests.length
                                                    }{" "}
                                                    selected
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {selectedLabTests.map(
                                                    (
                                                        test,
                                                    ) => (
                                                        <span
                                                            key={
                                                                test._id
                                                            }
                                                            className="inline-flex items-center gap-2 rounded-lg border border-teal-100 bg-white px-3 py-2 text-xs font-medium text-gray-700"
                                                        >
                                                            <FlaskConical
                                                                size={
                                                                    14
                                                                }
                                                                className="text-teal-500"
                                                            />

                                                            {
                                                                test.name
                                                            }

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    removeLabTest(
                                                                        test._id,
                                                                    )
                                                                }
                                                                className="rounded-md p-0.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                                                                aria-label={`Remove ${test.name}`}
                                                            >
                                                                <X
                                                                    size={
                                                                        14
                                                                    }
                                                                />
                                                            </button>
                                                        </span>
                                                    ),
                                                )}
                                            </div>

                                            <div className="mt-4 flex flex-col gap-3 border-t border-teal-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                                <p className="text-xs text-gray-500">
                                                    Payment is handled separately by the receptionist.
                                                </p>

                                                <button
                                                    type="button"
                                                    onClick={
                                                        handleCreateLabOrder
                                                    }
                                                    disabled={
                                                        labOrdering ||
                                                        labOrderCreated
                                                    }
                                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {labOrdering ? (
                                                        <>
                                                            <Loader2
                                                                size={
                                                                    16
                                                                }
                                                                className="animate-spin"
                                                            />

                                                            Ordering...
                                                        </>
                                                    ) : labOrderCreated ? (
                                                        <>
                                                            <CheckCircle2
                                                                size={
                                                                    16
                                                                }
                                                            />

                                                            Lab Order Created
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FlaskConical
                                                                size={
                                                                    16
                                                                }
                                                            />

                                                            Order Selected Tests
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ==================================================
                                        TODAY'S LAB TESTS / REPORTS
                                    ================================================== */}

                                    <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50">
                                        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    Today's Laboratory Tests
                                                </p>

                                                <p className="mt-0.5 text-xs text-gray-500">
                                                    Tests already ordered for this patient today.
                                                </p>
                                            </div>

                                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-600">
                                                {todayLabOrders.reduce(
                                                    (
                                                        total,
                                                        order,
                                                    ) =>
                                                        total +
                                                        order.items.filter(
                                                            (
                                                                item,
                                                            ) =>
                                                                item.status !==
                                                                "CANCELLED",
                                                        ).length,
                                                    0,
                                                )}{" "}
                                                tests
                                            </span>
                                        </div>

                                        {todayLabOrdersLoading ? (
                                            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-gray-500">
                                                <Loader2
                                                    size={
                                                        17
                                                    }
                                                    className="animate-spin text-teal-600"
                                                />

                                                Loading today's laboratory tests...
                                            </div>
                                        ) : todayLabOrders.length ===
                                          0 ? (
                                            <div className="px-4 py-8 text-center">
                                                <FlaskConical
                                                    size={
                                                        26
                                                    }
                                                    className="mx-auto text-gray-300"
                                                />

                                                <p className="mt-2 text-sm font-medium text-gray-700">
                                                    No laboratory tests ordered today
                                                </p>

                                                <p className="mt-1 text-xs text-gray-400">
                                                    Select a test above to create a laboratory order.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-200">
                                                {todayLabOrders.map(
                                                    (
                                                        order,
                                                    ) =>
                                                        order.items
                                                            .filter(
                                                                (
                                                                    item,
                                                                ) =>
                                                                    item.status !==
                                                                    "CANCELLED",
                                                            )
                                                            .map(
                                                                (
                                                                    item,
                                                                ) => {
                                                                    const reportReady =
                                                                        item.status ===
                                                                            "COMPLETED" &&
                                                                        Boolean(
                                                                            item.reportFileName,
                                                                        );

                                                                    return (
                                                                        <div
                                                                            key={`${order._id}-${item._id}`}
                                                                            className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                                                                        >
                                                                            <div className="flex min-w-0 items-start gap-3">
                                                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-teal-600">
                                                                                    <FlaskConical
                                                                                        size={
                                                                                            17
                                                                                        }
                                                                                    />
                                                                                </div>

                                                                                <div className="min-w-0">
                                                                                    <p className="truncate text-sm font-semibold text-gray-900">
                                                                                        {
                                                                                            item.testName
                                                                                        }
                                                                                    </p>

                                                                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                                                                        {item.testCode && (
                                                                                            <span className="text-xs text-gray-400">
                                                                                                {
                                                                                                    item.testCode
                                                                                                }
                                                                                            </span>
                                                                                        )}

                                                                                        <span
                                                                                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                                                                item.status ===
                                                                                                "COMPLETED"
                                                                                                    ? "bg-emerald-100 text-emerald-700"
                                                                                                    : item.status ===
                                                                                                        "PROCESSING"
                                                                                                        ? "bg-blue-100 text-blue-700"
                                                                                                        : item.status ===
                                                                                                            "SAMPLE_COLLECTED"
                                                                                                            ? "bg-amber-100 text-amber-700"
                                                                                                            : "bg-gray-100 text-gray-600"
                                                                                            }`}
                                                                                        >
                                                                                            {
                                                                                                item.status ===
                                                                                                "COMPLETED"
                                                                                                    ? "REPORT READY"
                                                                                                    : item.status.replace(
                                                                                                        /_/g,
                                                                                                        " ",
                                                                                                    )
                                                                                            }
                                                                                        </span>
                                                                                    </div>

                                                                                    {item.result && (
                                                                                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-600">
                                                                                            <span className="font-semibold text-gray-700">
                                                                                                Result:
                                                                                            </span>{" "}
                                                                                            {
                                                                                                item.result
                                                                                            }
                                                                                        </p>
                                                                                    )}

                                                                                    {item.reportFileName && (
                                                                                        <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                                                                                            <FileText
                                                                                                size={
                                                                                                    13
                                                                                                }
                                                                                            />

                                                                                            {
                                                                                                item.reportFileName
                                                                                            }
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            <div className="shrink-0">
                                                                                {reportReady ? (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            handleViewReport(
                                                                                                order._id,
                                                                                                item._id,
                                                                                                item.reportFileName,
                                                                                            )
                                                                                        }
                                                                                        disabled={
                                                                                            viewingReport ===
                                                                                            item._id
                                                                                        }
                                                                                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                                                                    >
                                                                                        {viewingReport ===
                                                                                        item._id ? (
                                                                                            <>
                                                                                                <Loader2
                                                                                                    size={
                                                                                                        16
                                                                                                    }
                                                                                                    className="animate-spin"
                                                                                                />

                                                                                                Opening...
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                <Eye
                                                                                                    size={
                                                                                                        16
                                                                                                    }
                                                                                                />

                                                                                                View Report
                                                                                            </>
                                                                                        )}
                                                                                    </button>
                                                                                ) : (
                                                                                    <span className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium capitalize text-gray-500">
                                                                                        {item.status ===
                                                                                        "PROCESSING"
                                                                                            ? "Processing"
                                                                                            : "Report pending"}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                },
                                                            ),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section></div>
                        </div>
                    </main>

                    {/* ==================================================
                        FOOTER
                    ================================================== */}

                    <footer className="scribe-footer shrink-0 border-t border-gray-200 bg-white px-5 py-4">
                        <div className="mx-auto flex max-w-4xl flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <button
                                type="button"
                                onClick={
                                    onClose
                                }
                                disabled={
                                    saving ||
                                    completing
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X
                                    size={
                                        16
                                    }
                                />

                                Close
                            </button>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={
                                        handleSave
                                    }
                                    disabled={
                                        saving ||
                                        completing
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-5 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2
                                                size={
                                                    16
                                                }
                                                className="animate-spin"
                                            />

                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save
                                                size={
                                                    16
                                                }
                                            />

                                            Save
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        handleComplete
                                    }
                                    disabled={
                                        saving ||
                                        completing
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {completing ? (
                                        <>
                                            <Loader2
                                                size={
                                                    17
                                                }
                                                className="animate-spin"
                                            />

                                            Completing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2
                                                size={
                                                    17
                                                }
                                            />

                                            Complete Consultation
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
};


const ScribeDesignStyles = () => (
    <style>{`
      .scribe-design { font-family: "Inter", "Segoe UI", sans-serif; color: #173d3b; -webkit-font-smoothing: antialiased; }
      .scribe-overlay { background: #102c287a; }
      .scribe-design *, .scribe-design *::before, .scribe-design *::after { box-sizing: border-box; }
      .scribe-frame { max-width: 1050px; }
      .scribe-shell { height: min(920px, calc(100dvh - 40px)); max-height: calc(100dvh - 40px); border: 1px solid #d8e3d6; border-radius: 22px; background: #f5f6f2; }
      .scribe-header { background: #123d39; border-color: #ffffff14; padding: 18px 24px; }
      .scribe-header h1 { color: #fff; font-size: 17px; letter-spacing: -.3px; }
      .scribe-header p { color: #b3cec2; margin-top: 3px; font-size: 11px; }
      .scribe-header > div > div > div:first-child { background: #d7efe3; color: #173d39; border-radius: 13px; }
      .scribe-header button { color: #d4e5dc; }
      .scribe-header button:hover { background: #ffffff15; color: #fff; }
      .scribe-nav { display: flex; gap: 8px; flex-shrink: 0; padding: 12px 24px; border-bottom: 1px solid #dfe6da; background: #fafbf8; }
      .scribe-nav button { display: flex; align-items: center; justify-content: center; gap: 9px; padding: 11px 17px; border-radius: 10px; color: #64786c; font-size: 13px; font-weight: 600; border: 1px solid transparent; }
      .scribe-nav button[aria-pressed="true"] { background: #e8f0e3; border-color: #d0dfc9; color: #245e43; }
      .scribe-nav button:hover { background: #eef3e9; }
      .scribe-dot { width: 6px; height: 6px; background: #4b9164; border-radius: 50%; }
      .scribe-body { min-height: 0; overscroll-behavior: contain; }
      .scribe-body > div { max-width: 880px; }
      .scribe-view { display: flex; flex-direction: column; gap: 18px; }
      .scribe-view[hidden] { display: none !important; }
      .scribe-intro { padding: 4px 0 2px; }
      .scribe-intro > span { font-size: 9px; font-weight: 800; letter-spacing: 1.8px; color: #69866d; }
      .scribe-intro h2 { margin: 5px 0; color: #204638; font-size: 25px; font-weight: 600; letter-spacing: -.7px; }
      .scribe-intro p { font-size: 13px; color: #677a6d; }
      .scribe-body section { border-color: #e0e7db; border-radius: 16px; box-shadow: 0 2px 14px #173d3b02; }
      .scribe-body > div > section { background: #eaf0e1; border-color: #dbe5d7; padding: 16px 20px; }
      .scribe-body > div > section h2 { color: #204638; }
      .scribe-section-heading { gap: 12px; }
      .scribe-section-heading > div:first-child { background: #edf4e9; color: #46755a; border-radius: 10px; }
      .scribe-section-heading h2 { color: #234638; font-size: 15px; letter-spacing: -.2px; }
      .scribe-section-heading p { color: #718071; line-height: 1.6; }
      .scribe-body textarea, .scribe-body input:not([type="checkbox"]), .scribe-body select { background: #fafbf8; border-color: #dce4d8; color: #294137; border-radius: 10px; }
      .scribe-body textarea { resize: vertical; min-height: 80px; line-height: 1.7; }
      .scribe-body textarea:focus, .scribe-body input:focus, .scribe-body select:focus { background: #fff; border-color: #81aa8e; box-shadow: 0 0 0 3px #edf4e8; outline: none; }
      .scribe-design button:focus-visible, .scribe-design summary:focus-visible { outline: 3px solid #38bdb0; outline-offset: 3px; }
      .scribe-design button:not(:disabled), .scribe-design summary { cursor: pointer; }
      .scribe-design button:disabled { cursor: not-allowed; opacity: .5; }
      .scribe-design button[class~="bg-teal-600"], .scribe-primary { background: #176957; color: #fff; border-radius: 10px; }
      .scribe-design button[class~="bg-teal-600"]:hover:not(:disabled), .scribe-primary:hover { background: #104f42; }
      .scribe-details { border: 1px solid #dfe6d9; border-radius: 14px; background: #fff; overflow: hidden; }
      .scribe-details > summary { display: flex; align-items: center; gap: 12px; list-style: none; padding: 18px 20px; font-size: 14px; font-weight: 600; color: #315d45; }
      .scribe-details > summary::-webkit-details-marker { display: none; }
      .scribe-details > summary > span { font-size: 11px; font-weight: 400; color: #798777; margin-left: auto; }
      .scribe-details[open] > summary { border-bottom: 1px solid #e5eadf; }
      .scribe-details[open] > summary > svg { transform: rotate(180deg); }
      .scribe-details > section { border: 0; box-shadow: none; }
      .scribe-draft > summary > span { color: #976627; background: #faf1df; border-radius: 20px; padding: 4px 10px; }
      .scribe-next { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 4px 0; }
      .scribe-next p { font-size: 12px; color: #74816f; max-width: 280px; }
      .scribe-primary { display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 12px 18px; font-size: 13px; font-weight: 600; flex-shrink: 0; }
      .scribe-footer { background: #fafbf8; border-color: #dfe6d9; padding: 14px 24px; }
      .scribe-footer button { min-height: 44px; font-size: 13px; border-radius: 10px; }
      .scribe-footer button[class~="bg-teal-50"] { background: #fff; border-color: #c9d8c4; color: #315e45; }
      @media (max-width: 639px) {
        .scribe-overlay { padding: 0; }
        .scribe-shell { height: 100dvh; max-height: 100dvh; border-radius: 0; border: 0; }
        .scribe-header { padding: 14px 16px; }
        .scribe-nav { padding: 9px 12px; gap: 4px; }
        .scribe-nav button { flex: 1; gap: 5px; padding: 10px 5px; font-size: 11px; }
        .scribe-nav button > svg { width: 14px; }
        .scribe-body > div { padding: 16px; }
        .scribe-next { flex-direction: column; align-items: stretch; }
        .scribe-details > summary > span { max-width: 120px; text-align: right; }
        .scribe-footer { padding: 10px 12px max(10px, env(safe-area-inset-bottom)); }
        .scribe-footer > div { flex-direction: row; align-items: center; gap: 6px; }
        .scribe-footer > div > button { padding: 8px; }
        .scribe-footer > div > button > svg { display: none; }
        .scribe-footer > div > div { flex-direction: row; gap: 6px; }
        .scribe-footer button { padding: 8px 10px; font-size: 11px; }
      }
      @media (prefers-reduced-motion: reduce) { .scribe-design *, .scribe-design *::before, .scribe-design *::after { animation: none !important; transition: none !important; } }
    `}</style>
);

export default StartConsultation;