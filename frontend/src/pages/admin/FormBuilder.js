import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus, Trash2, GripVertical, Pencil, Eye, Globe, FilePlus2, RotateCcw, Monitor, Smartphone,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { API, fmtError } from "@/api";
import DynamicForm from "@/components/DynamicForm";

const FIELD_TYPES = [
  ["text", "Texte"], ["textarea", "Texte long"], ["name", "Nom"], ["firstname", "Prénom"],
  ["email", "E-mail"], ["phone", "Téléphone"], ["date", "Date"], ["number", "Nombre"],
  ["amount", "Montant"], ["select", "Liste déroulante"], ["radio", "Choix unique"],
  ["multichoice", "Choix multiple"], ["cards", "Cartes sélectionnables"], ["checkbox", "Case à cocher"],
  ["yesno", "Oui / Non"], ["address", "Adresse"], ["postal_code", "Code postal"],
  ["city", "Ville"], ["custom", "Champ personnalisé"],
];

const TYPE_LABELS = Object.fromEntries(FIELD_TYPES);
const OPTION_TYPES = ["select", "radio", "multichoice", "cards"];

let tempCounter = 0;
const tempId = () => `temp-${++tempCounter}-${Math.random().toString(36).slice(2, 8)}`;

const EMPTY_QUESTION = {
  question_key: "", label: "", description: "", field_type: "text",
  required: false, placeholder: "", options: [], validation_rules: {}, enabled: true,
};

export default function FormBuilder() {
  const [versions, setVersions] = useState([]);
  const [current, setCurrent] = useState(null); // {version, steps, questions}
  const [editSteps, setEditSteps] = useState([]);
  const [editQuestions, setEditQuestions] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null); // 'desktop' | 'mobile'
  const [dialogQ, setDialogQ] = useState(null); // question en cours d'édition
  const [dialogStep, setDialogStep] = useState(null);
  const [optionsText, setOptionsText] = useState("");
  const [formTexts, setFormTexts] = useState(null);
  const [dragId, setDragId] = useState(null);

  const loadVersions = useCallback(async () => {
    try {
      const r = await API.get("/admin/form/versions");
      setVersions(r.data.versions);
      const target = r.data.versions.find((v) => v.status === "draft") || r.data.versions.find((v) => v.status === "published");
      if (target) await openVersion(target.id);
    } catch (e) {
      toast.error(fmtError(e));
    }
  }, []);

  useEffect(() => {
    loadVersions();
    API.get("/admin/content").then((r) => setFormTexts(r.data?.form_texts)).catch(() => {});
  }, [loadVersions]);

  const openVersion = async (id) => {
    const r = await API.get(`/admin/form/versions/${id}`);
    setCurrent(r.data);
    setEditSteps(r.data.steps.map((s) => ({ ...s })));
    setEditQuestions(r.data.questions.map((q) => ({ ...q })));
    setDirty(false);
    setPreview(null);
  };

  const createDraft = async (fromId) => {
    try {
      const r = await API.post("/admin/form/versions", { from_version_id: fromId || "" });
      toast.success(`Brouillon v${r.data.version.version_number} créé.`);
      await loadVersions();
      await openVersion(r.data.version.id);
    } catch (e) {
      toast.error(fmtError(e));
    }
  };

  const deleteDraft = async () => {
    if (!current || current.version.status !== "draft") return;
    try {
      await API.delete(`/admin/form/versions/${current.version.id}`);
      toast.success("Brouillon supprimé.");
      setCurrent(null);
      loadVersions();
    } catch (e) {
      toast.error(fmtError(e));
    }
  };

  const save = async () => {
    if (!current || saving) return;
    setSaving(true);
    try {
      const r = await API.put(`/admin/form/versions/${current.version.id}`, {
        steps: editSteps,
        questions: editQuestions,
      });
      setCurrent(r.data);
      setEditSteps(r.data.steps.map((s) => ({ ...s })));
      setEditQuestions(r.data.questions.map((q) => ({ ...q })));
      setDirty(false);
      toast.success("Formulaire enregistré.");
    } catch (e) {
      toast.error(fmtError(e));
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (dirty) await save();
    try {
      await API.post(`/admin/form/versions/${current.version.id}/publish`);
      toast.success("Formulaire publié : il est maintenant visible sur la landing page.");
      loadVersions();
    } catch (e) {
      toast.error(fmtError(e));
    }
  };

  // ----- Édition -----
  const updateStep = (id, patch) => {
    setEditSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setDirty(true);
  };

  const addStep = () => {
    setEditSteps((prev) => [...prev, { id: tempId(), title: `Étape ${prev.length + 1}`, description: "", position: prev.length }]);
    setDirty(true);
  };

  const removeStep = (id) => {
    setEditSteps((prev) => prev.filter((s) => s.id !== id));
    setEditQuestions((prev) => prev.filter((q) => q.step_id !== id));
    setDirty(true);
  };

  const moveStep = (id, dir) => {
    setEditSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return arr;
    });
    setDirty(true);
  };

  const openQuestionDialog = (q, stepId) => {
    setDialogQ(q ? { ...q } : { ...EMPTY_QUESTION, id: tempId(), step_id: stepId });
    setOptionsText((q?.options || []).join("\n"));
  };

  const saveQuestion = () => {
    const q = {
      ...dialogQ,
      options: optionsText.split("\n").map((o) => o.trim()).filter(Boolean),
      question_key: (dialogQ.question_key || dialogQ.label || "question").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "question",
    };
    setEditQuestions((prev) => {
      const exists = prev.some((x) => x.id === q.id);
      return exists ? prev.map((x) => (x.id === q.id ? q : x)) : [...prev, q];
    });
    setDialogQ(null);
    setDirty(true);
  };

  const removeQuestion = (id) => {
    setEditQuestions((prev) => prev.filter((q) => q.id !== id));
    setDirty(true);
  };

  // ----- Drag & drop -----
  const onDropQuestion = (targetId, targetStepId) => {
    if (!dragId || dragId === targetId) return;
    setEditQuestions((prev) => {
      const arr = [...prev];
      const from = arr.findIndex((q) => q.id === dragId);
      if (from < 0) return prev;
      const [moved] = arr.splice(from, 1);
      moved.step_id = targetStepId;
      if (targetId) {
        const to = arr.findIndex((q) => q.id === targetId);
        arr.splice(to, 0, moved);
      } else {
        arr.push(moved);
      }
      return arr;
    });
    setDirty(true);
    setDragId(null);
  };

  if (!current) {
    return (
      <div className="space-y-5" data-testid="form-builder-empty">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-[#0B111B]">Gestion du formulaire</h1>
        <button type="button" data-testid="create-draft-btn" onClick={() => createDraft("")} className="btn-primary-orange !py-3 !px-6 !text-sm">
          <FilePlus2 className="h-4 w-4" /> Créer un formulaire
        </button>
      </div>
    );
  }

  const isDraft = current.version.status === "draft";
  const previewForm = { version: current.version, steps: editSteps, questions: editQuestions.filter((q) => q.enabled) };

  return (
    <div className="space-y-5" data-testid="form-builder">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#0B111B]">Gestion du formulaire</h1>
          <p className="text-sm text-gray-500 mt-1">
            Version {current.version.version_number} —{" "}
            <span className={`font-semibold ${isDraft ? "text-amber-600" : current.version.status === "published" ? "text-emerald-600" : "text-gray-400"}`}>
              {isDraft ? "Brouillon" : current.version.status === "published" ? "Publiée (en ligne)" : "Archivée"}
            </span>
            {dirty && <span className="ml-2 text-[#FF683D] font-semibold">• Modifications non enregistrées</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isDraft && (
            <button type="button" data-testid="new-draft-btn" onClick={() => createDraft(current.version.id)} className="btn-primary-orange !py-2.5 !px-5 !text-sm">
              <Pencil className="h-4 w-4" /> Modifier ce formulaire
            </button>
          )}
          <button type="button" data-testid="preview-desktop-btn" onClick={() => setPreview(preview === "desktop" ? null : "desktop")} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 transition-colors ${preview === "desktop" ? "border-[#FF683D] text-[#FF683D] bg-[#FF683D]/5" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
            <Monitor className="h-4 w-4" /> Ordinateur
          </button>
          <button type="button" data-testid="preview-mobile-btn" onClick={() => setPreview(preview === "mobile" ? null : "mobile")} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 transition-colors ${preview === "mobile" ? "border-[#FF683D] text-[#FF683D] bg-[#FF683D]/5" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
            <Smartphone className="h-4 w-4" /> Mobile
          </button>
          {isDraft && (
            <>
              <button type="button" data-testid="save-form-btn" onClick={save} disabled={saving} className="rounded-xl bg-[#101722] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a2436] transition-colors disabled:opacity-60">
                {saving ? "ENREGISTREMENT…" : "ENREGISTRER"}
              </button>
              <button type="button" data-testid="publish-form-btn" onClick={publish} className="btn-primary-orange !py-2.5 !px-5 !text-sm">
                <Globe className="h-4 w-4" /> PUBLIER
              </button>
              <button type="button" data-testid="delete-draft-btn" onClick={deleteDraft} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Historique des versions */}
      <div className="flex flex-wrap gap-2" data-testid="versions-history">
        {versions.map((v) => (
          <div key={v.id} className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${v.id === current.version.id ? "border-[#FF683D] bg-[#FF683D]/5 text-[#FF683D]" : "border-gray-200 bg-white text-gray-600"}`}>
            <button type="button" data-testid={`version-${v.version_number}`} onClick={() => openVersion(v.id)}>
              v{v.version_number} — {v.status === "published" ? "en ligne" : v.status === "draft" ? "brouillon" : "archive"}
            </button>
            {v.status === "archived" && (
              <button type="button" data-testid={`restore-${v.version_number}`} title="Restaurer cette version" onClick={() => createDraft(v.id)} className="text-gray-400 hover:text-[#FF683D]">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {preview ? (
        <div className="rounded-2xl border border-gray-200 bg-[#101722] p-6 md:p-10" data-testid="form-preview">
          <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-[#F8F6F2]/70">
            <Eye className="h-4 w-4" /> Prévisualisation {preview === "mobile" ? "mobile" : "ordinateur"} (saisie désactivée)
          </p>
          <div className={`mx-auto ${preview === "mobile" ? "max-w-[380px]" : "max-w-lg"}`}>
            <div className="bg-[#F8F6F2] rounded-2xl shadow-2xl p-6 md:p-8 text-[#0B111B]">
              <DynamicForm form={previewForm} texts={formTexts || {}} tracking={{}} preview />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {!isDraft && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4" data-testid="readonly-notice">
              <p className="text-sm text-amber-800 font-medium mb-1">
                Ce formulaire est actuellement {current.version.status === "published" ? "en ligne (publié)" : "archivé"} et verrouillé.
              </p>
              <p className="text-sm text-amber-700 mb-3">
                Pour ajouter, retirer ou réorganiser des étapes et des questions, créez une copie modifiable. Vos visiteurs continueront de voir la version actuelle jusqu'à ce que vous publiiez vos modifications.
              </p>
              <button type="button" data-testid="readonly-edit-btn" onClick={() => createDraft(current.version.id)} className="btn-primary-orange !py-2.5 !px-5 !text-sm">
                <Pencil className="h-4 w-4" /> Modifier ce formulaire
              </button>
            </div>
          )}
          {editSteps.map((step, stepIdx) => {
            const qs = editQuestions.filter((q) => q.step_id === step.id);
            return (
              <div
                key={step.id}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm"
                data-testid={`step-block-${stepIdx}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dragId && onDropQuestion(null, step.id)}
              >
                <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF683D]/10 text-sm font-bold text-[#FF683D]">{stepIdx + 1}</span>
                  <input
                    data-testid={`step-title-${stepIdx}`}
                    className="min-w-[180px] flex-1 rounded-lg border border-transparent px-2 py-1.5 text-base font-semibold text-[#0B111B] outline-none hover:border-gray-200 focus:border-[#FF683D]"
                    value={step.title}
                    disabled={!isDraft}
                    onChange={(e) => updateStep(step.id, { title: e.target.value })}
                  />
                  <input
                    data-testid={`step-desc-${stepIdx}`}
                    className="min-w-[180px] flex-[2] rounded-lg border border-transparent px-2 py-1.5 text-sm text-gray-500 outline-none hover:border-gray-200 focus:border-[#FF683D]"
                    placeholder="Description de l'étape (facultatif)"
                    value={step.description}
                    disabled={!isDraft}
                    onChange={(e) => updateStep(step.id, { description: e.target.value })}
                  />
                  {isDraft && (
                    <div className="flex gap-1">
                      <button type="button" data-testid={`step-up-${stepIdx}`} onClick={() => moveStep(step.id, -1)} className="rounded-lg px-2 py-1.5 text-xs text-gray-400 hover:bg-gray-100">↑</button>
                      <button type="button" data-testid={`step-down-${stepIdx}`} onClick={() => moveStep(step.id, 1)} className="rounded-lg px-2 py-1.5 text-xs text-gray-400 hover:bg-gray-100">↓</button>
                      {editSteps.length > 1 && (
                        <button type="button" data-testid={`step-delete-${stepIdx}`} onClick={() => removeStep(step.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  )}
                </div>
                <div className="divide-y divide-gray-50">
                  {qs.map((q) => (
                    <div
                      key={q.id}
                      draggable={isDraft}
                      onDragStart={() => setDragId(q.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.stopPropagation(); onDropQuestion(q.id, step.id); }}
                      className={`flex items-center gap-3 px-5 py-3 ${isDraft ? "cursor-grab hover:bg-gray-50/70" : ""} ${!q.enabled ? "opacity-45" : ""}`}
                      data-testid={`question-row-${q.question_key}`}
                    >
                      <GripVertical className="h-4 w-4 shrink-0 text-gray-300" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">{q.label} {q.required && <span className="text-[#FF683D]">*</span>}</p>
                        <p className="text-xs text-gray-400">{q.question_key} · {TYPE_LABELS[q.field_type] || q.field_type}{!q.enabled && " · désactivée"}</p>
                      </div>
                      {isDraft && (
                        <div className="flex shrink-0 gap-1">
                          <button type="button" data-testid={`edit-question-${q.question_key}`} onClick={() => openQuestionDialog(q)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-[#FF683D]"><Pencil className="h-4 w-4" /></button>
                          <button type="button" data-testid={`delete-question-${q.question_key}`} onClick={() => removeQuestion(q.id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      )}
                    </div>
                  ))}
                  {qs.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">Aucune question dans cette étape.</p>}
                </div>
                {isDraft && (
                  <div className="border-t border-gray-100 px-5 py-3">
                    <button type="button" data-testid={`add-question-${stepIdx}`} onClick={() => openQuestionDialog(null, step.id)} className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF683D] hover:text-[#FF914D] transition-colors">
                      <Plus className="h-4 w-4" /> AJOUTER UNE QUESTION
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {isDraft && (
            <button type="button" data-testid="add-step-btn" onClick={addStep} className="w-full rounded-2xl border-2 border-dashed border-gray-300 py-4 text-sm font-semibold text-gray-500 hover:border-[#FF683D] hover:text-[#FF683D] transition-colors inline-flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> AJOUTER UNE ÉTAPE
            </button>
          )}
        </div>
      )}

      {/* Dialog question */}
      <Dialog open={!!dialogQ} onOpenChange={() => setDialogQ(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="question-dialog">
          {dialogQ && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{editQuestions.some((x) => x.id === dialogQ.id) ? "Modifier la question" : "Nouvelle question"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre de la question</label>
                  <input data-testid="q-label" className="form-input-premium !p-3" value={dialogQ.label} onChange={(e) => setDialogQ({ ...dialogQ, label: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clé technique</label>
                    <input data-testid="q-key" className="form-input-premium !p-3" placeholder="ex. code_postal" value={dialogQ.question_key} onChange={(e) => setDialogQ({ ...dialogQ, question_key: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de champ</label>
                    <select data-testid="q-type" className="form-input-premium !p-3" value={dialogQ.field_type} onChange={(e) => setDialogQ({ ...dialogQ, field_type: e.target.value })}>
                      {FIELD_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (facultatif)</label>
                  <input data-testid="q-description" className="form-input-premium !p-3" value={dialogQ.description} onChange={(e) => setDialogQ({ ...dialogQ, description: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                  <input data-testid="q-placeholder" className="form-input-premium !p-3" value={dialogQ.placeholder} onChange={(e) => setDialogQ({ ...dialogQ, placeholder: e.target.value })} />
                </div>
                {OPTION_TYPES.includes(dialogQ.field_type) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Options (une par ligne)</label>
                    <textarea data-testid="q-options" className="form-input-premium !p-3" rows={4} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
                  </div>
                )}
                {dialogQ.field_type === "date" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Âge minimum (0 = aucun)</label>
                    <input data-testid="q-min-age" type="number" min="0" className="form-input-premium !p-3" value={dialogQ.validation_rules?.min_age || 0} onChange={(e) => setDialogQ({ ...dialogQ, validation_rules: { ...dialogQ.validation_rules, min_age: Number(e.target.value) || 0 } })} />
                  </div>
                )}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input type="checkbox" data-testid="q-required" checked={dialogQ.required} onChange={(e) => setDialogQ({ ...dialogQ, required: e.target.checked })} className="h-4 w-4 accent-[#FF683D]" />
                    Obligatoire
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input type="checkbox" data-testid="q-enabled" checked={dialogQ.enabled} onChange={(e) => setDialogQ({ ...dialogQ, enabled: e.target.checked })} className="h-4 w-4 accent-[#FF683D]" />
                    Activée
                  </label>
                </div>
                <button type="button" data-testid="q-save-btn" onClick={saveQuestion} className="btn-primary-orange w-full !py-3 !text-sm">ENREGISTRER LA QUESTION</button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
