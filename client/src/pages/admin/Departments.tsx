import {
  Activity,
  ArrowLeft,
  Building2,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  type Department,
} from "../../services/department.api";

const Departments = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  const [departments, setDepartments] = useState<
    Department[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [departmentName, setDepartmentName] =
    useState("");

  const [tokenPrefix, setTokenPrefix] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [editingDepartment, setEditingDepartment] =
    useState<Department | null>(null);

  // ==============================
  // LOAD DEPARTMENTS
  // ==============================

  const loadDepartments = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getDepartments();

      setDepartments(data);
    } catch (error: any) {
      console.error(
        "Failed to load departments:",
        error,
      );

      setError(
        error?.response?.data?.message ||
          "Failed to load departments",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  // ==============================
  // OPEN CREATE MODAL
  // ==============================

  const handleOpenCreate = () => {
    setEditingDepartment(null);

    setDepartmentName("");
    setTokenPrefix("");

    setShowModal(true);
  };

  // ==============================
  // OPEN EDIT MODAL
  // ==============================

  const handleOpenEdit = (
    department: Department,
  ) => {
    setEditingDepartment(department);

    setDepartmentName(department.name);

    setTokenPrefix(department.tokenPrefix);

    setShowModal(true);
  };

  // ==============================
  // CLOSE MODAL
  // ==============================

  const handleCloseModal = () => {
    if (submitting) return;

    setShowModal(false);

    setEditingDepartment(null);

    setDepartmentName("");
    setTokenPrefix("");
  };

  // ==============================
  // CREATE / UPDATE DEPARTMENT
  // ==============================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!departmentName.trim()) {
      return;
    }

    if (!tokenPrefix.trim()) {
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: departmentName.trim(),
        tokenPrefix: tokenPrefix.trim().toUpperCase(),
      };

      // ==========================
      // UPDATE
      // ==========================

      if (editingDepartment) {
        const updatedDepartment =
          await updateDepartment(
            editingDepartment._id,
            payload,
          );

        setDepartments((current) =>
          current.map((department) =>
            department._id ===
            editingDepartment._id
              ? updatedDepartment
              : department,
          ),
        );
      } else {
        // ==========================
        // CREATE
        // ==========================

        const newDepartment =
          await createDepartment(payload);

        setDepartments((current) => [
          ...current,
          newDepartment,
        ]);
      }

      handleCloseModal();
    } catch (error: any) {
      console.error(
        "Failed to save department:",
        error,
      );

      alert(
        error?.response?.data?.message ||
          "Failed to save department",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ==============================
  // DELETE DEPARTMENT
  // ==============================

  const handleDelete = async (
    id: string,
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this department?",
    );

    if (!confirmed) return;

    try {
      await deleteDepartment(id);

      setDepartments((current) =>
        current.filter(
          (department) =>
            department._id !== id,
        ),
      );
    } catch (error: any) {
      console.error(
        "Failed to delete department:",
        error,
      );

      alert(
        error?.response?.data?.message ||
          "Failed to delete department",
      );
    }
  };

  // ==============================
  // SEARCH
  // ==============================

  const filteredDepartments =
    departments.filter((department) =>
      department.name
        .toLowerCase()
        .includes(search.toLowerCase()),
    );

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ============================== */}
      {/* HEADER */}
      {/* ============================== */}

      <header className="border-b border-slate-200 bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">

          <div className="flex items-center gap-4">

            <button
              onClick={() =>
                navigate("/admin/dashboard")
              }
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Departments
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage hospital departments
              </p>
            </div>

          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <Plus size={18} />

            <span className="hidden sm:inline">
              Add Department
            </span>

            <span className="sm:hidden">
              Add
            </span>
          </button>

        </div>

      </header>

      {/* ============================== */}
      {/* CONTENT */}
      {/* ============================== */}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* SEARCH */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">

          <div className="relative max-w-md">

            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search departments..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />

          </div>

        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">

            <p>{error}</p>

            <button
              onClick={loadDepartments}
              className="mt-2 font-semibold underline"
            >
              Try again
            </button>

          </div>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">

            <Loader2
              size={32}
              className="animate-spin text-blue-600"
            />

          </div>
        ) : filteredDepartments.length === 0 ? (

          /* EMPTY STATE */

          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">

            <Building2
              size={42}
              className="mx-auto text-slate-300"
            />

            <h3 className="mt-4 font-semibold text-slate-900">
              No departments found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Create a department to get started.
            </p>

            <button
              onClick={handleOpenCreate}
              className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Create Department
            </button>

          </div>

        ) : (

          /* DEPARTMENT GRID */

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

            {filteredDepartments.map(
              (department) => (

                <div
                  key={department._id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
                >

                  {/* TOP */}

                  <div className="flex items-start justify-between">

                    <div className="flex items-center gap-3">

                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                        <Activity size={22} />

                      </div>

                      <div>

                        <h3 className="font-semibold text-slate-900">
                          {department.name}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">

                          Token prefix:{" "}

                          <span className="font-semibold text-slate-700">
                            {department.tokenPrefix}
                          </span>

                        </p>

                      </div>

                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        department.isActive
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {department.isActive
                        ? "Active"
                        : "Inactive"}
                    </span>

                  </div>

                  {/* DIVIDER */}

                  <div className="my-5 border-t border-slate-100" />

                  {/* BOTTOM */}

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-xs text-slate-400">
                        Queue
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        Ready
                      </p>

                    </div>

                    {/* ACTIONS */}

                    <div className="flex gap-2">

                      <button
                        onClick={() =>
                          handleOpenEdit(
                            department,
                          )
                        }
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                        title="Edit"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(
                            department._id,
                          )
                        }
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={17} />
                      </button>

                    </div>

                  </div>

                </div>

              ),
            )}

          </div>

        )}

      </main>

      {/* ============================== */}
      {/* CREATE / EDIT MODAL */}
      {/* ============================== */}

      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">

          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

            {/* MODAL HEADER */}

            <div className="mb-6 flex items-start justify-between">

              <div>

                <h2 className="text-xl font-bold text-slate-900">

                  {editingDepartment
                    ? "Edit Department"
                    : "Add Department"}

                </h2>

                <p className="mt-1 text-sm text-slate-500">

                  {editingDepartment
                    ? "Update department information."
                    : "Create a new hospital department."}

                </p>

              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>

            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* NAME */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">

                  Department Name

                </label>

                <input
                  type="text"
                  value={departmentName}
                  onChange={(event) =>
                    setDepartmentName(
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Cardiology"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />

              </div>

              {/* TOKEN PREFIX */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">

                  Token Prefix

                </label>

                <input
                  type="text"
                  maxLength={3}
                  value={tokenPrefix}
                  onChange={(event) =>
                    setTokenPrefix(
                      event.target.value.toUpperCase(),
                    )
                  }
                  placeholder="e.g. C"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm uppercase outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />

                <p className="mt-2 text-xs text-slate-400">

                  Example: Cardiology → C-001

                </p>

              </div>

              {/* BUTTONS */}

              <div className="flex gap-3 pt-2">

                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >

                  {submitting && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  {editingDepartment
                    ? "Update Department"
                    : "Create Department"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
};

export default Departments;