import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import ResearcherLayout from '../../layouts/ResearcherLayout';
import { ROUTES } from '../../constants/routes';
import { getCurrentUser } from '../../utils/auth';
import { protocolsApi } from '../../services/api';
import DocumentPreviewModal from '../../components/common/DocumentPreviewModal';

const DEFAULT_DOCUMENTS = {
  form15: {
    id: 'form15',
    title: 'URERB Form 15 — Application for Protocol Ethics Review',
    description: 'Comprehensive study rationale, methodology, and human subject risks.',
    fileName: null,
    fileSize: null,
    uploaded: false,
    version: 'v1.0',
    required: true,
  },
  form16: {
    id: 'form16',
    title: 'URERB Form 16 — Informed Consent Form (ICF)',
    description: 'English and localized Ilokano dialect participant consent forms.',
    fileName: null,
    fileSize: null,
    uploaded: false,
    version: 'v1.0',
    required: true,
  },
  form17: {
    id: 'form17',
    title: 'URERB Form 17 — Study Protocol & Data Gathering Instruments',
    description: 'Questionnaires, interview guides, and observation matrix.',
    fileName: null,
    fileSize: null,
    uploaded: false,
    version: 'v1.0',
    required: true,
  },
  form13: {
    id: 'form13',
    title: 'URERB Form 13 — Curriculum Vitae of Researchers & GCP Training',
    description: 'Good Clinical Practice (GCP) or Ethics Training Certificates.',
    fileName: null,
    fileSize: null,
    uploaded: false,
    version: 'v1.0',
    required: true,
  },
  form14: {
    id: 'form14',
    title: 'URERB Form 14 — Department Endorsement Sheet',
    description: 'Signed endorsement from Department Chair and College Dean.',
    fileName: null,
    fileSize: null,
    uploaded: false,
    version: 'v1.0',
    required: true,
  },
  supporting: {
    id: 'supporting',
    title: 'Supporting Documents (Barangay Clearance / NCIP / LGU Permits)',
    description: 'Prior Informed Consent from indigenous elders or LGU certification if applicable.',
    fileName: null,
    fileSize: null,
    uploaded: false,
    version: 'v1.0',
    required: false,
  },
  receipt: {
    id: 'receipt',
    title: 'Official Cashier Payment Receipt',
    description: 'MMSU Official Receipt (O.R.) copy for Ethics Review Processing Fee.',
    fileName: null,
    fileSize: null,
    uploaded: false,
    version: 'v1.0',
    required: true,
  },
};

export default function NewApplication() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isDraftMode = searchParams.get('mode') === 'draft';
  const currentUser = getCurrentUser();

  const fileInputRef = useRef(null);
  const [activeUploadKey, setActiveUploadKey] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [draftId, setDraftId] = useState(
    () => location.state?.protocolId || (searchParams.get('id') ? Number(searchParams.get('id')) || null : null)
  );
  const draftIdRef = useRef(draftId);
  useEffect(() => {
    draftIdRef.current = draftId;
  }, [draftId]);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);

  const handleDiscardDraft = async () => {
    if (!draftId) {
      navigate(ROUTES.RESEARCHER.MY_APPLICATIONS);
      return;
    }
    setIsDeletingDraft(true);
    try {
      await protocolsApi.deleteDraft(draftId);
      window.dispatchEvent(new Event('urerb_applications_sync'));
      navigate(ROUTES.RESEARCHER.MY_APPLICATIONS);
    } catch (err) {
      console.error('Failed to discard draft:', err);
      alert(err.message || 'Failed to discard draft');
      setIsDeletingDraft(false);
    }
  };

  // Step state (1, 2, or 3)
  const [activeStep, setActiveStep] = useState(
    location.state?.returnStep || (isDraftMode ? 3 : 1)
  );

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    reviewCategory: 'Expedited Review (Minimal Risk / Non-Invasive)',
    academicUnit: 'College of Arts and Sciences (CAS) - Department of Biological Sciences',
    otherAcademicUnit: '',
    natureStudy: 'faculty',
    otherNatureStudy: '',
    facultyAdviser: '',
    isIndependentPI: false,
    fieldworkLocation: '',
    isLabOrDeskOnly: false,
    contactNumber: currentUser?.contactNumber || '',
    studySummary: '',
    studyObjectives: '',
    vulnerableGroups: {
      minors: false,
      indigenous: false,
      patients: false,
      pregnant: false,
      elderly: false,
      pwd: false,
      generalAdults: false,
      notApplicable: false,
      other: false,
    },
    otherParticipantText: '',
  });

  // Co-investigators state
  const [coInvestigators, setCoInvestigators] = useState([]);
  const [newCoInvName, setNewCoInvName] = useState('');
  const [showAddCoInv, setShowAddCoInv] = useState(false);

  // Document repository state
  const [documents, setDocuments] = useState(DEFAULT_DOCUMENTS);
  const [saveStatus, setSaveStatus] = useState('Ready to start new application');

  // Load active draft on mount
  useEffect(() => {
    let isMounted = true;
    async function loadActiveDraft() {
      try {
        const queryId = searchParams.get('id');
        const targetId = draftId || queryId;
        const res = await protocolsApi.getDraft(targetId || undefined);
        if (!isMounted) return;

        if (res && res.success && res.draft) {
          const d = res.draft;
          setDraftId(d.id);
          setLastSavedTime(d.dateSubmitted || 'Recently');
          setSaveStatus(`Draft loaded (${d.dateSubmitted || 'Recently'})`);

          setFormData((prev) => ({
            ...prev,
            title: d.title || prev.title,
            reviewCategory: d.reviewCategory || prev.reviewCategory,
            academicUnit: d.academicUnit || prev.academicUnit,
            otherAcademicUnit: d.otherAcademicUnit || prev.otherAcademicUnit,
            natureStudy: d.natureStudy || prev.natureStudy,
            otherNatureStudy: d.natureStudyOther || prev.otherNatureStudy,
            facultyAdviser: d.facultyAdviser || prev.facultyAdviser,
            isIndependentPI: Boolean(d.isIndependentPi),
            fieldworkLocation: d.fieldworkLocation || prev.fieldworkLocation,
            isLabOrDeskOnly: Boolean(d.isLabOnly),
            contactNumber: d.contactNumber || prev.contactNumber,
            studySummary: d.studySummary || prev.studySummary,
            studyObjectives: d.studyObjectives || prev.studyObjectives,
            vulnerableGroups: {
              ...prev.vulnerableGroups,
              ...((d.targetPopulations || []).reduce((acc, curr) => ({ ...acc, [curr]: true }), {})),
            },
            otherParticipantText: d.otherTargetPop || prev.otherParticipantText,
          }));

          if (Array.isArray(d.coInvestigators) && d.coInvestigators.length > 0) {
            setCoInvestigators(d.coInvestigators);
          }

          if (Array.isArray(d.documents) && d.documents.length > 0) {
            setDocuments((prev) => {
              const updated = { ...prev };
              d.documents.forEach((serverDoc) => {
                const key = serverDoc.documentKey;
                if (updated[key]) {
                  updated[key] = {
                    ...updated[key],
                    uploaded: serverDoc.status !== 'Missing' && Boolean(serverDoc.fileName),
                    fileName: serverDoc.fileName,
                    fileSize: serverDoc.fileSizeFormatted || serverDoc.fileSize,
                    fileUrl: serverDoc.fileUrl,
                    downloadUrl: serverDoc.downloadUrl,
                    version: serverDoc.version || 'v1.0',
                  };
                }
              });
              return updated;
            });
          }

          if (isDraftMode) {
            setActiveStep(location.state?.returnStep || 3);
          } else if (d.activeStep && d.activeStep > 1 && !location.state?.returnStep) {
            setActiveStep(Math.min(3, d.activeStep));
          }
        }
      } catch (err) {
        console.warn('Could not load draft from server:', err);
      }
    }

    loadActiveDraft();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (groupKey) => {
    setFormData((prev) => ({
      ...prev,
      vulnerableGroups: {
        ...prev.vulnerableGroups,
        [groupKey]: !prev.vulnerableGroups[groupKey],
      },
    }));
  };

  const handleSaveDraft = async (stepToPersist = activeStep) => {
    if (isSaving) return draftIdRef.current || draftId;
    setIsSaving(true);
    setSaveStatus('Saving draft...');
    try {
      const activeVulnerable = Object.keys(formData.vulnerableGroups).filter(
        (k) => formData.vulnerableGroups[k]
      );
      const currentId = draftIdRef.current || draftId;
      const payload = {
        id: currentId,
        title: formData.title || 'Untitled Research Protocol',
        reviewTrack: formData.reviewCategory,
        reviewType: formData.reviewCategory,
        academicUnit: formData.academicUnit,
        otherAcademicUnit: formData.otherAcademicUnit,
        natureStudy: formData.natureStudy,
        otherNatureStudy: formData.otherNatureStudy,
        facultyAdviser: formData.facultyAdviser,
        isIndependentPi: formData.isIndependentPI,
        fieldworkLocation: formData.fieldworkLocation,
        isLabOnly: formData.isLabOrDeskOnly,
        contactNumber: formData.contactNumber,
        studySummary: formData.studySummary,
        studyObjectives: formData.studyObjectives,
        activeStep: stepToPersist,
        targetPopulations: activeVulnerable,
        otherTargetPop: formData.otherParticipantText,
        coInvestigators,
      };

      const res = await protocolsApi.saveDraft(payload);
      const resolvedId = res?.protocolId || res?.protocol?.id || res?.id || currentId;
      if (res && res.success && resolvedId) {
        setDraftId(resolvedId);
        draftIdRef.current = resolvedId;
        if (!searchParams.get('id') || searchParams.get('id') !== String(resolvedId)) {
          window.history.replaceState(null, '', `?id=${resolvedId}&mode=draft`);
        }
        const timeNow = new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
        setLastSavedTime(timeNow);
        setSaveStatus(`Draft saved (${timeNow})`);
        setIsSaving(false);
        return resolvedId;
      }
    } catch (err) {
      console.error('Save draft failed:', err);
      setSaveStatus('Error saving draft');
    } finally {
      setIsSaving(false);
    }
    return draftIdRef.current || draftId;
  };

  const triggerFilePicker = (docKey) => {
    setActiveUploadKey(docKey);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadKey) return;

    setSaveStatus(`Uploading ${file.name}...`);
    try {
      let targetDraftId = draftIdRef.current || draftId;
      // Auto-save form draft silently if none exists yet, so nothing is lost
      if (!targetDraftId) {
        targetDraftId = await handleSaveDraft(3);
      }

      // Upload file directly (backend will also auto-resolve or create draft if 0)
      const res = await protocolsApi.uploadDoc(targetDraftId || 0, activeUploadKey, file);
      if (res && res.success && res.document) {
        const resolvedId = res.protocolId || targetDraftId;
        if (resolvedId) {
          setDraftId(resolvedId);
          draftIdRef.current = resolvedId;
          if (!searchParams.get('id') || searchParams.get('id') !== String(resolvedId)) {
            window.history.replaceState(null, '', `?id=${resolvedId}&mode=draft`);
          }
        }
        const doc = res.document;
        setDocuments((prev) => ({
          ...prev,
          [activeUploadKey]: {
            ...prev[activeUploadKey],
            uploaded: true,
            fileName: doc.fileName,
            fileSize: doc.fileSizeFormatted || doc.fileSize,
            fileUrl: doc.fileUrl,
            downloadUrl: doc.downloadUrl,
            version: doc.version || 'v1.0',
          },
        }));
        setSaveStatus(`Uploaded ${file.name}`);
      }
    } catch (err) {
      console.error('File upload failed:', err);
      setSaveStatus(`Upload failed for ${file.name}`);
      alert(err.message || 'File upload failed. Ensure the file is under 15MB (.pdf, .doc, .docx, .png, .jpg).');
    } finally {
      setActiveUploadKey(null);
    }
  };

  const handleProceedToReview = async () => {
    const savedId = await handleSaveDraft(3);
    navigate(ROUTES.RESEARCHER.REVIEW_SUBMIT, {
      state: {
        protocolId: savedId || draftId,
        ...formData,
        documents,
        coInvestigators,
      },
    });
  };

  const handleAddCoInvestigator = (e) => {
    e.preventDefault();
    if (!newCoInvName.trim()) return;
    const nextList = [
      ...coInvestigators,
      {
        id: Date.now().toString(),
        name: newCoInvName.trim(),
        role: 'Co-Investigator',
        affiliation: formData.academicUnit.split(' - ')[0] || 'MMSU Academic Unit',
      },
    ];
    setCoInvestigators(nextList);
    setNewCoInvName('');
    setShowAddCoInv(false);
  };

  const handleRemoveCoInvestigator = (id) => {
    const nextList = coInvestigators.filter((c) => c.id !== id);
    setCoInvestigators(nextList);
  };

  const uploadedDocsCount = Object.values(documents).filter((d) => d.uploaded).length;
  const totalDocsCount = Object.values(documents).length;

  return (
    <ResearcherLayout>
      {/* Hidden File Input for Document Uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        onChange={handleFileSelected}
        className="hidden"
      />

      <div className="space-y-6 pb-20">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {isDraftMode ? 'Draft Application' : 'New Protocol Application'}
              </h1>
              {isDraftMode && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
                  Draft
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isDraftMode
                ? 'Continue preparing your research ethics application and upload missing mandatory documents.'
                : 'Complete the institutional protocol documentation and submit your study for ethical review.'}
            </p>
          </div>

          {lastSavedTime && (
            <div className="flex items-center space-x-3 shrink-0">
              <div className="text-right">
                <div className="text-xs font-medium text-slate-500">Last saved</div>
                <div className="text-xs font-bold text-slate-800">{lastSavedTime}</div>
              </div>
            </div>
          )}
        </div>

        {/* Draft Notice Banner */}
        {isDraftMode && (
          <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-3">
            <span className="material-symbols-outlined text-[#1e513b] shrink-0 mt-0.5 text-[20px]">
              info
            </span>
            <div className="text-xs text-slate-700 leading-relaxed">
              <strong className="font-bold text-slate-900">Draft Application:</strong> You are
              resuming your previously saved application. Inputs and files have been preserved. You can
              complete Step 3 and continue to final review.
            </div>
          </div>
        )}

        {/* 4-Step Stepper Progress Bar */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs" data-purpose="stepper">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Step 1: Study Identification */}
            <div
              onClick={() => setActiveStep(1)}
              className={`flex items-center space-x-3 p-2.5 rounded-md cursor-pointer transition ${
                activeStep === 1
                  ? 'bg-emerald-50/70 border-2 border-[#1e513b]'
                  : activeStep > 1
                  ? 'bg-emerald-50/40 border border-emerald-200 hover:bg-emerald-50'
                  : 'bg-slate-50/80 border border-slate-200'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  activeStep === 1
                    ? 'bg-[#1e513b] text-white ring-2 ring-emerald-200'
                    : activeStep > 1
                    ? 'bg-[#1e513b] text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {activeStep > 1 ? (
                  <span className="material-symbols-outlined text-[16px]">check</span>
                ) : (
                  '1'
                )}
              </div>
              <div className="min-w-0">
                <div
                  className={`text-[11px] uppercase tracking-wider font-bold ${
                    activeStep === 1 ? 'text-[#1e513b]' : 'text-emerald-800'
                  }`}
                >
                  Step 1
                </div>
                <div className="text-xs font-bold text-slate-900 truncate">Study Identification</div>
              </div>
            </div>

            {/* Step 2: Researcher & Details */}
            <div
              onClick={() => setActiveStep(2)}
              className={`flex items-center space-x-3 p-2.5 rounded-md cursor-pointer transition ${
                activeStep === 2
                  ? 'bg-emerald-50/70 border-2 border-[#1e513b]'
                  : activeStep > 2
                  ? 'bg-emerald-50/40 border border-emerald-200 hover:bg-emerald-50'
                  : 'bg-slate-50/80 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  activeStep === 2
                    ? 'bg-[#1e513b] text-white ring-2 ring-emerald-200'
                    : activeStep > 2
                    ? 'bg-[#1e513b] text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {activeStep > 2 ? (
                  <span className="material-symbols-outlined text-[16px]">check</span>
                ) : (
                  '2'
                )}
              </div>
              <div className="min-w-0">
                <div
                  className={`text-[11px] uppercase tracking-wider font-bold ${
                    activeStep === 2 ? 'text-[#1e513b]' : 'text-slate-500'
                  }`}
                >
                  Step 2
                </div>
                <div className="text-xs font-bold text-slate-900 truncate">Researcher &amp; Mentors</div>
              </div>
            </div>

            {/* Step 3: Document Repository */}
            <div
              onClick={() => setActiveStep(3)}
              className={`flex items-center space-x-3 p-2.5 rounded-md cursor-pointer transition ${
                activeStep === 3
                  ? 'bg-emerald-50/70 border-2 border-[#1e513b]'
                  : 'bg-slate-50/80 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  activeStep === 3
                    ? 'bg-[#1e513b] text-white ring-2 ring-emerald-200'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                3
              </div>
              <div className="min-w-0">
                <div
                  className={`text-[11px] uppercase tracking-wider font-bold ${
                    activeStep === 3 ? 'text-[#1e513b]' : 'text-slate-500'
                  }`}
                >
                  Step 3
                </div>
                <div
                  className={`text-xs truncate ${
                    activeStep === 3 ? 'font-bold text-slate-900' : 'font-semibold text-slate-600'
                  }`}
                >
                  Document Repository
                </div>
              </div>
            </div>

            {/* Step 4: Review & Sign-Off */}
            <div
              onClick={handleProceedToReview}
              className="flex items-center space-x-3 p-2.5 rounded-md bg-slate-50/80 border border-slate-200 cursor-pointer hover:bg-slate-100 transition"
            >
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                4
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  Step 4
                </div>
                <div className="text-xs font-semibold text-slate-600 truncate">
                  Review &amp; Sign-Off
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 1: Study Identification & Scope */}
        {activeStep === 1 && (
          <section className="bg-white rounded-lg border border-slate-200 shadow-xs" data-purpose="step-1-content">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1e513b]" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  1. Study Identification &amp; Research Scope
                </h2>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
                <span className="material-symbols-outlined text-[14px] mr-1 text-emerald-600">
                  check
                </span>
                Step 1 of 4
              </span>
            </div>

            <div className="p-6 space-y-5">
              {/* Title full row */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="research-title">
                  Full Research Protocol Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="research-title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter research protocol title..."
                  className="w-full text-sm font-medium border border-slate-200 rounded-md shadow-xs p-2.5 focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] text-slate-900 bg-slate-50/50"
                />
              </div>

              {/* Two column grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Review Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="review-category">
                    Ethics Review Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="review-category"
                    name="reviewCategory"
                    value={formData.reviewCategory}
                    onChange={handleChange}
                    className="w-full text-sm font-medium border border-slate-200 rounded-md shadow-xs p-2.5 focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] text-slate-900 bg-white"
                  >
                    <option value="Expedited Review (Minimal Risk / Non-Invasive)">
                      Expedited Review (Minimal Risk / Non-Invasive)
                    </option>
                    <option value="Exempted Review (Negligible Risk)">
                      Exempted Review (Negligible Risk)
                    </option>
                    <option value="Full Board Review (More than Minimal Risk / Vulnerable Groups)">
                      Full Board Review (More than Minimal Risk / Vulnerable Groups)
                    </option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Classification based on MMSU REC SOP Rule 4.1
                  </p>
                </div>

                {/* Academic Unit */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="academic-unit">
                    Academic Unit / Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="academic-unit"
                    name="academicUnit"
                    value={formData.academicUnit}
                    onChange={handleChange}
                    className="w-full text-sm font-medium border border-slate-200 rounded-md shadow-xs p-2.5 focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] text-slate-900 bg-white"
                  >
                    <option value="College of Arts and Sciences (CAS) - Department of Biological Sciences">
                      College of Arts and Sciences (CAS) - Department of Biological Sciences
                    </option>
                    <option value="College of Arts and Sciences (CAS) - Other Departments">
                      College of Arts and Sciences (CAS) - Other Departments
                    </option>
                    <option value="College of Health Sciences (CHS) - Department of Nursing">
                      College of Health Sciences (CHS) - Department of Nursing
                    </option>
                    <option value="College of Health Sciences (CHS) - Department of Pharmacy">
                      College of Health Sciences (CHS) - Department of Pharmacy
                    </option>
                    <option value="College of Agriculture, Food and Sustainable Development (CAFSD)">
                      College of Agriculture, Food and Sustainable Development (CAFSD)
                    </option>
                    <option value="College of Teacher Education (CTE)">
                      College of Teacher Education (CTE)
                    </option>
                    <option value="College of Engineering (COE)">
                      College of Engineering (COE)
                    </option>
                    <option value="College of Business, Economics and Accountancy (CBEA)">
                      College of Business, Economics and Accountancy (CBEA)
                    </option>
                    <option value="College of Industrial Technology (CIT)">
                      College of Industrial Technology (CIT)
                    </option>
                    <option value="College of Medicine (COM)">
                      College of Medicine (COM)
                    </option>
                    <option value="College of Law (COL)">
                      College of Law (COL)
                    </option>
                    <option value="Graduate School">
                      Graduate School
                    </option>
                    <option value="Other Academic Unit / Center">
                      Other Academic Unit / Research Center (Specify)
                    </option>
                  </select>
                  {formData.academicUnit === 'Other Academic Unit / Center' && (
                    <div className="mt-2 animate-in fade-in duration-150">
                      <input
                        type="text"
                        name="otherAcademicUnit"
                        value={formData.otherAcademicUnit || ''}
                        onChange={handleChange}
                        placeholder="Specify your College, Research Institute, or Department..."
                        className="w-full text-xs sm:text-sm font-medium border border-slate-300 rounded-md shadow-xs p-2.5 bg-white text-slate-900 focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b]"
                      />
                    </div>
                  )}
                </div>

                {/* Nature of Research Study */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nature of Research Study <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <label className="flex items-center p-2.5 border border-slate-200 bg-white rounded-md text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="natureStudy"
                        value="undergrad"
                        checked={formData.natureStudy === 'undergrad'}
                        onChange={handleChange}
                        className="text-[#1e513b] focus:ring-[#1e513b] mr-2 accent-[#1e513b]"
                      />
                      <span>Undergrad Thesis</span>
                    </label>

                    <label className="flex items-center p-2.5 border border-slate-200 bg-white rounded-md text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="natureStudy"
                        value="masters"
                        checked={formData.natureStudy === 'masters'}
                        onChange={handleChange}
                        className="text-[#1e513b] focus:ring-[#1e513b] mr-2 accent-[#1e513b]"
                      />
                      <span>Master's Thesis</span>
                    </label>

                    <label className="flex items-center p-2.5 border border-slate-200 bg-white rounded-md text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="natureStudy"
                        value="dissertation"
                        checked={formData.natureStudy === 'dissertation'}
                        onChange={handleChange}
                        className="text-[#1e513b] focus:ring-[#1e513b] mr-2 accent-[#1e513b]"
                      />
                      <span>Ph.D. Dissertation</span>
                    </label>

                    <label className="flex items-center p-2.5 border border-slate-200 bg-white rounded-md text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="natureStudy"
                        value="faculty"
                        checked={formData.natureStudy === 'faculty'}
                        onChange={handleChange}
                        className="text-[#1e513b] focus:ring-[#1e513b] mr-2 accent-[#1e513b]"
                      />
                      <span>Faculty / Institution</span>
                    </label>

                    <label className="flex items-center p-2.5 border border-slate-200 bg-white rounded-md text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="natureStudy"
                        value="external"
                        checked={formData.natureStudy === 'external'}
                        onChange={handleChange}
                        className="text-[#1e513b] focus:ring-[#1e513b] mr-2 accent-[#1e513b]"
                      />
                      <span>Agency Funded</span>
                    </label>

                    <label className="flex items-center p-2.5 border border-slate-200 bg-white rounded-md text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="natureStudy"
                        value="other"
                        checked={formData.natureStudy === 'other'}
                        onChange={handleChange}
                        className="text-[#1e513b] focus:ring-[#1e513b] mr-2 accent-[#1e513b]"
                      />
                      <span>Other (Specify)</span>
                    </label>
                  </div>
                  {formData.natureStudy === 'other' && (
                    <div className="mt-2 animate-in fade-in duration-150">
                      <input
                        type="text"
                        name="otherNatureStudy"
                        value={formData.otherNatureStudy || ''}
                        onChange={handleChange}
                        placeholder="Specify nature of research study..."
                        className="w-full text-xs sm:text-sm font-medium border border-slate-300 rounded-md shadow-xs p-2.5 bg-white text-slate-900 focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b]"
                      />
                    </div>
                  )}
                </div>

                {/* Fieldwork Location */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="fieldwork-loc">
                      Fieldwork Location(s) &amp; Partner Sites <span className="text-red-500">*</span>
                    </label>
                    <label className="inline-flex items-center space-x-1.5 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.isLabOrDeskOnly)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData((prev) => ({
                            ...prev,
                            isLabOrDeskOnly: checked,
                            fieldworkLocation: checked
                              ? 'MMSU Campus Laboratories / Desk-Based Research (No External Field Sites)'
                              : prev.fieldworkLocation === 'MMSU Campus Laboratories / Desk-Based Research (No External Field Sites)'
                              ? ''
                              : prev.fieldworkLocation,
                          }));
                        }}
                        className="rounded text-[#1e513b] focus:ring-[#1e513b] accent-[#1e513b]"
                      />
                      <span>Desk-based / Lab Study (No Field Sites)</span>
                    </label>
                  </div>
                  <input
                    id="fieldwork-loc"
                    name="fieldworkLocation"
                    type="text"
                    value={formData.fieldworkLocation}
                    onChange={handleChange}
                    disabled={formData.isLabOrDeskOnly}
                    placeholder="Enter intended fieldwork locations & partner sites (e.g. Batac City, Laoag, Dingras...)"
                    className={`w-full text-sm font-medium border border-slate-200 rounded-md shadow-xs p-2.5 focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] text-slate-900 ${
                      formData.isLabOrDeskOnly ? 'bg-slate-50 text-slate-600' : 'bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Study Summary & Objectives */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="study-summary">
                    Brief Executive Summary / Rationale <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="study-summary"
                    name="studySummary"
                    rows={3}
                    value={formData.studySummary}
                    onChange={handleChange}
                    className="w-full text-sm font-normal border border-slate-200 rounded-md shadow-xs p-2.5 focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="study-objectives">
                    Specific Aims &amp; Ethical Considerations <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="study-objectives"
                    name="studyObjectives"
                    rows={3}
                    value={formData.studyObjectives}
                    onChange={handleChange}
                    className="w-full text-sm font-normal border border-slate-200 rounded-md shadow-xs p-2.5 focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] text-slate-900 bg-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* Target Participant Populations Checkboxes */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Target Participant Populations &amp; Cohorts
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Optional / Multiple Selection
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Specify all human participant cohorts involved in this protocol. If your study does not involve vulnerable groups or is non-human / laboratory-based, you may select <strong>General Adult Population</strong> or <strong>Not Applicable</strong>. You can also specify <strong>Other</strong> custom participant targets below.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  <label className="flex items-center space-x-2 text-xs p-2.5 border border-slate-200 bg-white rounded-md cursor-pointer text-slate-700 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.vulnerableGroups.minors)}
                      onChange={() => handleCheckboxChange('minors')}
                      className="rounded text-[#1e513b] focus:ring-[#1e513b] accent-[#1e513b]"
                    />
                    <span>Minors / Under 18</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs p-2.5 border border-slate-200 bg-white rounded-md cursor-pointer text-slate-700 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.vulnerableGroups.indigenous)}
                      onChange={() => handleCheckboxChange('indigenous')}
                      className="rounded text-[#1e513b] focus:ring-[#1e513b] accent-[#1e513b]"
                    />
                    <span>Indigenous Peoples (NCIP)</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs p-2.5 border border-slate-200 bg-white rounded-md cursor-pointer text-slate-700 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.vulnerableGroups.patients)}
                      onChange={() => handleCheckboxChange('patients')}
                      className="rounded text-[#1e513b] focus:ring-[#1e513b] accent-[#1e513b]"
                    />
                    <span>Hospital / Clinic Patients</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs p-2.5 border border-slate-200 bg-white rounded-md cursor-pointer text-slate-700 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.vulnerableGroups.pregnant)}
                      onChange={() => handleCheckboxChange('pregnant')}
                      className="rounded text-[#1e513b] focus:ring-[#1e513b] accent-[#1e513b]"
                    />
                    <span>Pregnant Women / Fetuses</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs p-2.5 border border-slate-200 bg-white rounded-md cursor-pointer text-slate-700 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.vulnerableGroups.elderly)}
                      onChange={() => handleCheckboxChange('elderly')}
                      className="rounded text-[#1e513b] focus:ring-[#1e513b] accent-[#1e513b]"
                    />
                    <span>Senior Citizens / Elderly (60+)</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs p-2.5 border border-slate-200 bg-white rounded-md cursor-pointer text-slate-700 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.vulnerableGroups.pwd)}
                      onChange={() => handleCheckboxChange('pwd')}
                      className="rounded text-[#1e513b] focus:ring-[#1e513b] accent-[#1e513b]"
                    />
                    <span>Persons with Disabilities (PWDs)</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs p-2.5 border border-slate-200 bg-white rounded-md cursor-pointer text-slate-700 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.vulnerableGroups.generalAdults)}
                      onChange={() => handleCheckboxChange('generalAdults')}
                      className="rounded text-[#1e513b] focus:ring-[#1e513b] accent-[#1e513b]"
                    />
                    <span>General Adult Population</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs p-2.5 border border-slate-200 bg-white rounded-md cursor-pointer text-slate-700 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.vulnerableGroups.notApplicable)}
                      onChange={() => handleCheckboxChange('notApplicable')}
                      className="rounded text-[#1e513b] focus:ring-[#1e513b] accent-[#1e513b]"
                    />
                    <span>Not Applicable (Non-Human / Lab)</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs p-2.5 border border-slate-200 bg-white rounded-md cursor-pointer text-slate-700 hover:bg-slate-50 transition-colors sm:col-span-2 md:col-span-3 lg:col-span-4">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.vulnerableGroups.other)}
                      onChange={() => handleCheckboxChange('other')}
                      className="rounded text-[#1e513b] focus:ring-[#1e513b] accent-[#1e513b]"
                    />
                    <span>Other Target Populations / Specific Groups (Optional Custom Specification)</span>
                  </label>
                </div>

                {/* Conditional Other / Custom Participants Input */}
                {formData.vulnerableGroups.other && (
                  <div className="mt-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="other-participants">
                        Specify Custom Target Cohort(s) or Specific Population:
                      </label>
                    </div>
                    <input
                      id="other-participants"
                      name="otherParticipantText"
                      type="text"
                      value={formData.otherParticipantText || ''}
                      onChange={handleChange}
                      placeholder="e.g. Primary Care Nurses, Barangay Health Workers (BHWs), Smallholder Farmers, Fisherfolk, High School Teachers..."
                      className="w-full text-xs sm:text-sm font-medium border border-slate-300 rounded-md shadow-xs p-2.5 bg-white text-slate-900 focus:border-slate-400 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500">
                      Enter any demographic, occupational, or regional participant groups specific to your study protocol.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* STEP 2: Researcher & Mentor Details */}
        {activeStep === 2 && (
          <section className="bg-white rounded-lg border border-slate-200 shadow-xs" data-purpose="step-2-content">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1e513b]" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  2. Principal Investigator &amp; Mentor Details
                </h2>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
                <span className="material-symbols-outlined text-[14px] mr-1 text-emerald-600">
                  check
                </span>
                Step 2 of 4
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* Primary Investigator Profile */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Lead Principal Investigator Profile
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Lead Investigator
                    </label>
                    <div className="text-sm font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-md border border-slate-200 truncate">
                      {currentUser?.fullName || currentUser?.name || 'Researcher'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      MMSU ID Number
                    </label>
                    <div className="text-sm font-medium text-slate-800 bg-slate-50 px-3 py-2 rounded-md border border-slate-200 font-mono truncate">
                      {currentUser?.researcherId || currentUser?.idNumber || '—'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Institutional Email</span>
                      {currentUser?.email && (
                        <span className="text-[10px] text-emerald-600 font-semibold lowercase">verified</span>
                      )}
                    </label>
                    <div className="text-sm font-medium text-slate-700 bg-slate-50 px-3 py-2 rounded-md border border-slate-200 truncate flex items-center justify-between font-mono">
                      <span className="truncate">{currentUser?.email || '—'}</span>
                      <span className="material-symbols-outlined text-[16px] text-slate-400 shrink-0 ml-1">
                        lock
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1" htmlFor="contact-num">
                      Primary Contact Number
                    </label>
                    <input
                      id="contact-num"
                      name="contactNumber"
                      type="text"
                      value={formData.contactNumber}
                      onChange={handleChange}
                      placeholder="Enter contact number..."
                      className="w-full text-sm font-medium border border-slate-200 rounded-md shadow-xs p-2 focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] text-slate-800 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Faculty Mentor */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Senior Faculty Mentor / Adviser
                  </h3>
                  <label className="inline-flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.isIndependentPI)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData((prev) => ({
                          ...prev,
                          isIndependentPI: checked,
                          facultyAdviser: checked
                            ? 'N/A — Independent Faculty Principal Investigator (Self-Directed Research)'
                            : prev.facultyAdviser === 'N/A — Independent Faculty Principal Investigator (Self-Directed Research)'
                            ? ''
                            : prev.facultyAdviser,
                        }));
                      }}
                      className="rounded text-[#1e513b] focus:ring-[#1e513b] accent-[#1e513b]"
                    />
                    <span className="font-medium">Independent Faculty PI (No Thesis Adviser required)</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="faculty-adviser">
                      Faculty Adviser Name &amp; Academic Rank {!formData.isIndependentPI && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      id="faculty-adviser"
                      name="facultyAdviser"
                      type="text"
                      disabled={formData.isIndependentPI}
                      value={formData.facultyAdviser}
                      onChange={handleChange}
                      placeholder="Enter faculty adviser name and academic rank..."
                      className={`w-full text-sm font-medium border border-slate-200 rounded-md shadow-xs p-2.5 focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] text-slate-900 ${
                        formData.isIndependentPI ? 'bg-slate-50 text-slate-600' : 'bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Adviser Ethics Endorsement Status
                    </label>
                    <div className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-2.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-slate-500">verified</span>
                        <span>{formData.isIndependentPI ? 'Exempted (Faculty Protocol)' : 'Pre-Endorsement Acknowledged'}</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">{formData.isIndependentPI ? 'Direct Submission' : 'Form 14 Prepared'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Co-Investigators & Research Team */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Study Team &amp; Co-Investigators ({coInvestigators.length})
                    </h3>
                    <p className="text-[11px] text-slate-400">All registered investigators covered under protocol liability.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddCoInv(true)}
                    className="inline-flex items-center text-xs font-semibold text-slate-700 hover:bg-slate-50 bg-white border border-slate-300 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] mr-1">person_add</span>
                    Add Co-Investigator
                  </button>
                </div>

                {showAddCoInv && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg mb-3 flex items-center gap-3">
                    <input
                      type="text"
                      value={newCoInvName}
                      onChange={(e) => setNewCoInvName(e.target.value)}
                      placeholder="Enter co-investigator full name and affiliation..."
                      className="flex-1 text-xs border border-slate-200 rounded p-2 bg-white text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleAddCoInvestigator}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-[#1e513b] rounded hover:bg-[#163f2e]"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCoInv(false)}
                      className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
                  {coInvestigators.map((co) => (
                    <div key={co.id} className="p-3 flex items-center justify-between hover:bg-slate-50/60">
                      <div>
                        <div className="text-xs font-bold text-slate-800">{co.name}</div>
                        <div className="text-[11px] text-slate-500">{co.role} · {co.affiliation}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCoInvestigator(co.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                        title="Remove co-investigator"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ethics Training & GCP Certification */}
              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Ethics Certification &amp; GCP Credentials
                </h3>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center space-x-3">
                    <span className="material-symbols-outlined text-[#1e513b] text-[20px]">school</span>
                    <div>
                      <span className="font-bold text-slate-800">PHREB Good Research Practices &amp; Ethics Training</span>
                      <div className="text-[11px] text-slate-500">
                        {currentUser?.gcpCertificateId
                          ? `Certificate ID: ${currentUser.gcpCertificateId}`
                          : documents.form13?.uploaded
                          ? `Attached with Form 13 (${documents.form13.fileName})`
                          : 'Upload your GCP / Research Ethics Training certificate with URERB Form 13 in Step 3.'}
                      </div>
                    </div>
                  </div>
                  {currentUser?.gcpCertificateId ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 shrink-0">
                      Verified
                    </span>
                  ) : documents.form13?.uploaded ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                      Attached
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 shrink-0">
                      Required in Step 3
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* STEP 3: Protocol Checklist & Document Repository */}
        {activeStep === 3 && (
          <section className="bg-white rounded-lg border border-slate-200 shadow-xs" data-purpose="step-3-content">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1e513b]" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    3. Protocol Checklist &amp; Document Repository
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Upload standard PDF templates. Official templates can be downloaded from the Help Center.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700">
                  <span className="material-symbols-outlined text-[16px] text-slate-500">
                    check_circle
                  </span>
                  <span>{uploadedDocsCount} of {totalDocsCount} documents uploaded</span>
                </div>
                <a
                  href="#download-forms"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(ROUTES.RESEARCHER.HELP_CENTER);
                  }}
                  className="inline-flex items-center text-xs font-semibold text-slate-700 hover:bg-slate-50 bg-white border border-slate-300 px-3 py-1.5 rounded-md self-start sm:self-auto transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] mr-1.5">download</span>
                  Download Blank Forms (.ZIP)
                </a>
              </div>
            </div>

            <div className="divide-y divide-slate-100 overflow-x-auto">
              {['form15', 'form16', 'form17', 'form13', 'form14', 'supporting', 'receipt'].map((docKey) => {
                const doc = documents[docKey];
                const isOptional = !doc.required;
                const isReceipt = docKey === 'receipt';

                return (
                  <div
                    key={docKey}
                    className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-slate-50/70"
                  >
                    <div className="flex items-start space-x-3.5 max-w-xl">
                      <div
                        className={`p-2 rounded mt-0.5 shrink-0 ${
                          doc.uploaded
                            ? 'bg-emerald-50 text-emerald-700'
                            : isOptional
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isReceipt
                            ? 'receipt_long'
                            : isOptional
                            ? 'attach_file'
                            : doc.uploaded
                            ? 'description'
                            : 'warning'}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center flex-wrap gap-2">
                          <span>{doc.title}</span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                              doc.uploaded
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : isOptional
                                ? 'bg-slate-100 text-slate-600 font-medium'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {doc.uploaded
                              ? '✓ Uploaded'
                              : isOptional
                              ? 'Optional'
                              : 'Required / Missing'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{doc.description}</div>
                        {doc.uploaded && doc.fileName && (
                          <div className="mt-1 flex items-center space-x-2 text-[11px]">
                            <span className="inline-flex items-center text-emerald-700 font-medium font-mono">
                              <span className="material-symbols-outlined text-[13px] mr-1">
                                check_circle
                              </span>
                              {doc.fileName}
                            </span>
                            {doc.fileSize && (
                              <>
                                <span className="text-slate-400">·</span>
                                <span className="text-slate-400 font-mono">{doc.fileSize}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 self-end sm:self-center">
                      {doc.uploaded ? (
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewDoc({
                                title: doc.title,
                                version: doc.version || 'v1.0',
                                name: doc.fileName,
                                fileSize: doc.fileSize,
                                description: doc.description,
                              })
                            }
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerFilePicker(docKey)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                          >
                            Replace
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => triggerFilePicker(docKey)}
                          className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-md text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px] mr-1">
                            {isOptional ? 'attach_file' : 'upload'}
                          </span>
                          <span>
                            {isReceipt
                              ? 'Upload Receipt'
                              : isOptional
                              ? 'Attach Files'
                              : 'Upload Document'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment Notice Callout */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-lg">
              <div className="flex items-start space-x-3 text-xs text-slate-600">
                <span className="text-emerald-700 font-bold mt-0.5 text-sm">ℹ</span>
                <div>
                  <span className="font-bold text-slate-800">Payment Notice: </span>
                  Protocol evaluation fees are paid directly at the MMSU Cashier's Office. Upload the official receipt copy here. The portal does not process direct financial payments.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Bottom Multi-Step Action Bar */}
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs" data-purpose="action-bar">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-slate-500">save</span>
              <span>Save Draft</span>
            </button>
            {draftId && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1"
                title="Discard and delete this draft application"
              >
                <span className="material-symbols-outlined text-[16px] text-red-500">delete</span>
                <span>Discard Draft</span>
              </button>
            )}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
              <span className="material-symbols-outlined text-[15px] text-emerald-600">check</span>
              <span>{saveStatus}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate(ROUTES.RESEARCHER.MY_APPLICATIONS)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {/* Back Button */}
            {activeStep > 1 && (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => prev - 1)}
                className="px-4 py-2 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back to Step {activeStep - 1}</span>
              </button>
            )}

            {/* Next / Continue Button */}
            {activeStep === 1 && (
              <button
                type="button"
                onClick={async () => {
                  await handleSaveDraft(2);
                  setActiveStep(2);
                }}
                className="inline-flex items-center px-6 py-2.5 bg-[#1e513b] hover:bg-[#163f2e] text-white text-xs font-bold rounded-md shadow-xs transition-colors cursor-pointer"
              >
                <span>Next: Researcher &amp; Mentors</span>
                <span className="material-symbols-outlined text-[16px] ml-1.5">arrow_forward</span>
              </button>
            )}

            {activeStep === 2 && (
              <button
                type="button"
                onClick={async () => {
                  await handleSaveDraft(3);
                  setActiveStep(3);
                }}
                className="inline-flex items-center px-6 py-2.5 bg-[#1e513b] hover:bg-[#163f2e] text-white text-xs font-bold rounded-md shadow-xs transition-colors cursor-pointer"
              >
                <span>Proceed to Document Uploads</span>
                <span className="material-symbols-outlined text-[16px] ml-1.5">arrow_forward</span>
              </button>
            )}

            {activeStep === 3 && (
              <button
                type="button"
                onClick={handleProceedToReview}
                className="inline-flex items-center px-6 py-2.5 bg-[#1e513b] hover:bg-[#163f2e] text-white text-xs font-bold rounded-md shadow-xs transition-colors cursor-pointer"
              >
                <span>Continue to Step 4: Review &amp; Submit</span>
                <span className="material-symbols-outlined text-[16px] ml-1.5">arrow_forward</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <DocumentPreviewModal document={previewDoc} onClose={() => setPreviewDoc(null)} />

      {/* Discard Draft Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">delete_forever</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Discard &amp; Delete Draft?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This will permanently delete this draft and all uploaded files.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs text-gray-600 leading-relaxed">
              <p>
                Are you sure you want to discard this application? All entered protocol information and uploaded documents for this draft will be erased.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                disabled={isDeletingDraft}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Keep Editing
              </button>
              <button
                type="button"
                disabled={isDeletingDraft}
                onClick={handleDiscardDraft}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingDraft ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Discarding...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Yes, Discard Draft</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ResearcherLayout>
  );
}
