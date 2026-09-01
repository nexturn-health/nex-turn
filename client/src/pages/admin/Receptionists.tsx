import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Mail, Pencil, Plus, Search, Trash2, UserRound, X } from "lucide-react";

import { getReceptionists, createReceptionist, deleteReceptionist, type Receptionist } from "../../services/recieptionist.api";

interface ReceptionistFormState {
  name: string;
  email: string;
  password: string;
}

const EMPTY_FORM: ReceptionistFormState = { name: "", email: "", password: "" };

function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { message?: string } } };
  return err?.response?.data?.message ?? fallback;
}
function useReceptionistsData() {
  const [receptionists, setReceptionists] = useState<Receptionist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setReceptionists(await getReceptionists());
    } catch (err) {
      console.error("Load receptionists error:", err);
      setError(getErrorMessage(err, "Failed to load receptionists"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const removeReceptionist = useCallback((id: string) => {
    setReceptionists((current) => current.filter((receptionist) => receptionist._id !== id));
  }, []);

  return { receptionists, loading, error, setError, reload: load, removeReceptionist };
}

// Root component

const Receptionists = () => {
  const navigate = useNavigate();

  const { receptionists, loading, error, setError, reload, removeReceptionist } = useReceptionistsData();

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ReceptionistFormState>(EMPTY_FORM);

  const updateField = (field: keyof ReceptionistFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(EMPTY_FORM);
    setError("");
  };

  const handleCreateReceptionist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();
    const password = form.password.trim();

    if (!name || !email || !password) {
      setError("Please fill all required fields");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await createReceptionist({ name, email, password });

      closeModal();
      await reload();
    } catch (err) {
      console.error("Create receptionist error:", err);
      setError(getErrorMessage(err, "Failed to create receptionist"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this receptionist?");
    if (!confirmed) return;

    try {
      await deleteReceptionist(id);
      removeReceptionist(id);
    } catch (err) {
      console.error("Delete receptionist error:", err);
      alert(getErrorMessage(err, "Failed to delete receptionist"));
    }
  };

  const filteredReceptionists = receptionists.filter((receptionist) => {
    const query = search.toLowerCase();
    return receptionist.name.toLowerCase().includes(query) || receptionist.email.toLowerCase().includes(query);
  });

  return (
    <div className="min-h-screen bg-slate-100">
      <ReceptionistsHeader onBack={() => navigate("/admin/dashboard")} onAdd={openCreateModal} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error && !showModal && <ErrorBanner message={error} />}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="relative max-w-md">
            <Search size={19} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search receptionists..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : filteredReceptionists.length === 0 ? (
          <EmptyState onAdd={openCreateModal} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredReceptionists.map((receptionist) => (
              <ReceptionistCard
                key={receptionist._id}
                receptionist={receptionist}
                onDelete={() => handleDelete(receptionist._id)}
              />
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <ReceptionistFormModal
          form={form}
          submitting={submitting}
          error={error}
          onChange={updateField}
          onSubmit={handleCreateReceptionist}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default Receptionists;

// Header / states

function ReceptionistsHeader({ onBack, onAdd }: { onBack: () => void; onAdd: () => void }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-xl font-bold text-slate-900">Receptionists</h1>
            <p className="mt-1 text-sm text-slate-500">Manage hospital reception staff</p>
          </div>
        </div>

        <button
          onClick={onAdd}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Add Receptionist</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>
    </header>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{message}</div>
  );
}

function LoadingState() {
  return (
    <div className="flex justify-center py-20">
      <Loader2 size={35} className="animate-spin text-blue-600" />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
      <UserRound size={42} className="mx-auto text-slate-300" />
      <h3 className="mt-4 font-semibold text-slate-900">No receptionists found</h3>
      <p className="mt-2 text-sm text-slate-500">Add your first receptionist to get started.</p>
      <button onClick={onAdd} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
        Add Receptionist
      </button>
    </div>
  );
}

// Receptionist card

function ReceptionistCard({ receptionist, onDelete }: { receptionist: Receptionist; onDelete: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <UserRound size={22} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{receptionist.name}</h3>
            <p className="mt-1 text-xs text-slate-500">Receptionist</p>
          </div>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            receptionist.isActive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          }`}
        >
          {receptionist.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="my-5 border-t border-slate-100" />

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Mail size={16} className="text-slate-400" />
        <span className="truncate">{receptionist.email}</span>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-400">Reception Staff</p>

        <div className="flex gap-2">
          <button className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600" title="Edit">
            <Pencil size={17} />
          </button>
          <button onClick={onDelete} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600" title="Delete">
            <Trash2 size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Create receptionist modal

function ReceptionistFormModal({
  form,
  submitting,
  error,
  onChange,
  onSubmit,
  onClose,
}: {
  form: ReceptionistFormState;
  submitting: boolean;
  error: string;
  onChange: (field: keyof ReceptionistFormState) => (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Add Receptionist</h2>
            <p className="mt-1 text-sm text-slate-500">Add a receptionist to your hospital.</p>
          </div>

          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {error && <ErrorBanner message={error} />}

        <form onSubmit={onSubmit} className="space-y-5">
          <FormField label="Full Name">
            <input
              type="text"
              value={form.name}
              onChange={onChange("name")}
              placeholder="Rahul Sharma"
              className={INPUT_CLASSES}
            />
          </FormField>

          <FormField label="Email Address">
            <input
              type="email"
              value={form.email}
              onChange={onChange("email")}
              placeholder="reception@hospital.com"
              className={INPUT_CLASSES}
            />
          </FormField>

          <FormField label="Password">
            <input
              type="password"
              value={form.password}
              onChange={onChange("password")}
              placeholder="Minimum 6 characters"
              className={INPUT_CLASSES}
            />
          </FormField>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Receptionist"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const INPUT_CLASSES =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100";

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}