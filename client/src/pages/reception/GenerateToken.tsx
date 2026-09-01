import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Loader2, Search, Ticket, User, X } from "lucide-react";

import { getTokenEligiblePatients } from "../../services/patient.api";
import type { Patient } from "../../types/patient";
import { createQueue, type QueueData } from "../../services/queue.api";
import { getDepartments, type Department } from "../../services/department.api";

// =============================================================================
// Types
// =============================================================================

type Priority = "NORMAL" | "EMERGENCY";

const PRIORITIES: { value: Priority; label: string; description: string }[] = [
  { value: "NORMAL", label: "Normal", description: "Regular queue priority" },
  { value: "EMERGENCY", label: "Emergency", description: "Higher queue priority" },
];

// =============================================================================
// Helpers
// =============================================================================

function getErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message ?? fallback;
}

function matchesSearch(patient: Patient, query: string): boolean {
  return Boolean(
    patient.name?.toLowerCase().includes(query) ||
      patient.phone?.includes(query) ||
      patient.patientCode?.toLowerCase().includes(query),
  );
}

// =============================================================================
// Hook: patients + departments needed to fill out the form
// =============================================================================

function useTokenFormData() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [patientsResponse, departmentsResponse] = await Promise.all([
        getTokenEligiblePatients(),
        getDepartments(),
      ]);

      setPatients(patientsResponse || []);
      setDepartments(departmentsResponse || []);
    } catch (err) {
      console.error("Load data error:", err);
      setError(getErrorMessage(err, "Failed to load patients and departments"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const removePatient = useCallback((patientId: string) => {
    setPatients((prev) => prev.filter((patient) => patient._id !== patientId));
  }, []);

  return { patients, departments, loading, error, setError, removePatient };
}

// =============================================================================
// Root component
// =============================================================================

const GenerateToken = () => {
  const { patients, departments, loading, error, setError, removePatient } = useTokenFormData();

  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [departmentId, setDepartmentId] = useState("");
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [submitting, setSubmitting] = useState(false);
  const [generatedQueue, setGeneratedQueue] = useState<QueueData | null>(null);

  const filteredPatients = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return [];
    return patients.filter((patient) => matchesSearch(patient, query)).slice(0, 6);
  }, [search, patients]);

  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearch(`${patient.name} - ${patient.phone}`);
  };

  const clearSelectedPatient = () => {
    setSelectedPatient(null);
    setSearch("");
  };

  const handleGenerateToken = async () => {
    if (!selectedPatient) {
      setError("Please select a patient");
      return;
    }
    if (!departmentId) {
      setError("Please select a department");
      return;
    }

    try {
      setError("");
      setSubmitting(true);

      const response = await createQueue({
        patientId: selectedPatient._id,
        departmentId,
        priority,
      });

      setGeneratedQueue(response.data.queue);
      removePatient(selectedPatient._id);
    } catch (err) {
      console.error("Generate token error:", err);
      setError(getErrorMessage(err, "Failed to generate token"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewToken = () => {
    setGeneratedQueue(null);
    setSelectedPatient(null);
    setSearch("");
    setDepartmentId("");
    setPriority("NORMAL");
    setError("");
  };

  if (loading) return <LoadingState />;
  if (generatedQueue) return <SuccessCard queue={generatedQueue} onReset={handleNewToken} />;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Generate Token</h1>
        <p className="mt-1 text-sm text-slate-500">Search for a patient and generate a queue token.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

        <PatientSearchField
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setSelectedPatient(null);
          }}
          selectedPatient={selectedPatient}
          results={filteredPatients}
          onSelect={selectPatient}
          onClearSelection={clearSelectedPatient}
        />

        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Select Department</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">Select Department</option>
            {departments
              .filter((department) => department.isActive)
              .map((department) => (
                <option key={department._id} value={department._id}>
                  {department.name}
                </option>
              ))}
          </select>
        </div>

        <PrioritySelector value={priority} onChange={setPriority} />

        <button
          type="button"
          onClick={handleGenerateToken}
          disabled={submitting}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Generating Token...
            </>
          ) : (
            <>
              <Ticket size={20} />
              Generate Token
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default GenerateToken;

// =============================================================================
// States
// =============================================================================

function LoadingState() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <Loader2 size={35} className="mx-auto animate-spin text-blue-600" />
        <p className="mt-4 text-sm text-slate-500">Loading patients and departments...</p>
      </div>
    </div>
  );
}

function SuccessCard({ queue, onReset }: { queue: QueueData; onReset: () => void }) {
  const isSkipped = queue.status === "SKIPPED";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {isSkipped ? (
          <div className="bg-amber-500 px-6 py-10 text-center text-white sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <AlertCircle size={35} />
            </div>
            <h2 className="mt-5 text-2xl font-bold">Token Skipped</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-amber-50">
              Your token was skipped by the doctor. Please contact the reception desk for further assistance.
            </p>
          </div>
        ) : (
          <div className="bg-blue-600 px-6 py-10 text-center text-white sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <CheckCircle2 size={35} />
            </div>
            <h2 className="mt-5 text-2xl font-bold">Token Generated Successfully</h2>
            <p className="mt-2 text-sm text-blue-100">The patient has been added to the queue.</p>
          </div>
        )}

        <div className="p-6 sm:p-10">
          <div className={`rounded-2xl p-6 text-center ${isSkipped ? "border border-amber-100 bg-amber-50" : "bg-slate-50"}`}>
            <p className={`text-sm font-semibold ${isSkipped ? "text-amber-600" : "text-slate-500"}`}>TOKEN NUMBER</p>
            <h1
              className={`mt-2 text-5xl font-bold tracking-wider sm:text-6xl ${
                isSkipped ? "text-amber-600" : "text-blue-600"
              }`}
            >
              {queue.tokenLabel}
            </h1>

            <div className="mx-auto mt-5 h-px max-w-xs bg-slate-200" />

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Patient</p>
                <p className="mt-1 font-semibold text-slate-900">{queue.patientId?.name || "Unknown Patient"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Department</p>
                <p className="mt-1 font-semibold text-slate-900">{queue.departmentId?.name || "N/A"}</p>
              </div>
            </div>
          </div>

          {isSkipped ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={19} className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-800">Please contact reception</p>
                  <p className="mt-1 text-sm leading-6 text-amber-700">
                    The doctor has skipped this token. Please visit the reception desk to check whether your token
                    can be recalled or rescheduled.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <Clock size={19} className="mt-0.5 shrink-0 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-800">Please wait for your turn</p>
                  <p className="mt-1 text-sm leading-6 text-blue-700">
                    Please keep your token number with you and wait for it to be called.
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onReset}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-700"
          >
            <Ticket size={19} />
            Generate Another Token
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Form pieces
// =============================================================================

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
      <AlertCircle size={20} />
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-auto">
        <X size={18} />
      </button>
    </div>
  );
}

function PatientSearchField({
  search,
  onSearchChange,
  selectedPatient,
  results,
  onSelect,
  onClearSelection,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  selectedPatient: Patient | null;
  results: Patient[];
  onSelect: (patient: Patient) => void;
  onClearSelection: () => void;
}) {
  const showResults = !selectedPatient && search && results.length > 0;
  const showEmptyState = !selectedPatient && search && results.length === 0;

  return (
    <>
      <div className="relative">
        <label className="mb-2 block text-sm font-semibold text-slate-700">Search Patient</label>

        <div className="relative">
          <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, phone or patient ID"
            className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        {showResults && (
          <div className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {results.map((patient) => (
              <button
                key={patient._id}
                onClick={() => onSelect(patient)}
                className="flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left transition last:border-0 hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <User size={18} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{patient.name}</p>
                  <p className="text-sm text-slate-500">
                    {patient.phone}
                    {patient.patientCode && ` • ${patient.patientCode}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {showEmptyState && (
          <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500 shadow-lg">
            No patient found.
          </div>
        )}
      </div>

      {selectedPatient && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-600">
              <User size={19} />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{selectedPatient.name}</p>
              <p className="text-sm text-slate-500">{selectedPatient.phone}</p>
            </div>
          </div>

          <button onClick={onClearSelection} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-500">
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );
}

function PrioritySelector({ value, onChange }: { value: Priority; onChange: (priority: Priority) => void }) {
  return (
    <div className="mt-6">
      <label className="mb-3 block text-sm font-semibold text-slate-700">Priority</label>
      <div className="grid grid-cols-2 gap-3">
        {PRIORITIES.map((option) => {
          const active = value === option.value;
          const activeClasses = option.value === "EMERGENCY" ? "border-red-500 bg-red-50" : "border-blue-500 bg-blue-50";

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-xl border p-4 text-left transition ${
                active ? activeClasses : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <p className="font-semibold text-slate-900">{option.label}</p>
              <p className="mt-1 text-xs text-slate-500">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}