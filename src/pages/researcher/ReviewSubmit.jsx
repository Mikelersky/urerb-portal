import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import ResearcherLayout from '../../layouts/ResearcherLayout';
import { ROUTES } from '../../constants/routes';
import { getCurrentUser } from '../../utils/auth';
import { protocolsApi } from '../../services/api';
import DocumentPreviewModal from '../../components/common/DocumentPreviewModal';

const FORM_DEFINITIONS = [
  {
    key: 'form15',
    id: 'doc-form15',
    title: 'URERB Form 15 — Application for Protocol Ethics Review',
    icon: 'description',
    description: 'Comprehensive study rationale, methodology, and human subject risks.',
    required: true,
  },
  {
    key: 'form16',
    id: 'doc-form16',
    title: 'URERB Form 16 — Informed Consent Form (ICF)',
    icon: 'description',
    description: 'English and localized Ilokano dialect participant consent forms.',
    required: true,
  },
  {
    key: 'form17',
    id: 'doc-form17',
    title: 'URERB Form 17 — Study Protocol & Data Gathering Instruments',
    icon: 'description',
    description: 'Questionnaires, interview guides, and observation matrix.',
    required: true,
  },
  {
    key: 'form13',
    id: 'doc-form13',
    title: 'URERB Form 13 — Curriculum Vitae of Researchers & GCP Training',
    icon: 'description',
    description: 'Good Clinical Practice (GCP) or Ethics Training Certificates.',
    required: true,
  },
  {
    key: 'form14',
    id: 'doc-form14',
    title: 'URERB Form 14 — Department Endorsement Sheet',
    icon: 'description',
    description: 'Signed endorsement from Department Chair and College Dean.',
    required: true,
  },
  {
    key: 'supporting',
    id: 'doc-supporting',
    title: 'Supporting Documents (Barangay Clearance / NCIP / LGU Permits)',
    icon: 'attach_file',
    description: 'Prior Informed Consent from indigenous elders or LGU certification if applicable.',
    required: false,
  },
  {
    key: 'receipt',
    id: 'doc-receipt',
    title: 'Official Cashier Payment Receipt',
    icon: 'receipt_long',
    description: 'MMSU Official Receipt (O.R.) copy for Ethics Review Processing Fee.',
    required: true,
  },
];

export default function ReviewSubmit() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentUser = getCurrentUser();
  const stateData = location.state || {};

  // Active Protocol ID
  const [activeProtocolId, setActiveProtocolId] = useState(
    stateData.protocolId || (searchParams.get('id') ? Number(searchParams.get('id')) || searchParams.get('id') : null)
  );

  // Modals state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [submittedProtocolId, setSubmittedProtocolId] = useState('');
  const [submittedDateStr, setSubmittedDateStr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editable details state
  const [protocolTitle, setProtocolTitle] = useState(stateData?.title || 'Untitled Research Protocol');
  const [adviser, setAdviser] = useState(stateData?.facultyAdviser || 'Not Specified');
  const [reviewCategory, setReviewCategory] = useState(
    stateData?.reviewCategory || 'Expedited Review (Minimal Risk / Non-Invasive)'
  );
  const [academicUnit, setAcademicUnit] = useState(stateData?.academicUnit || '');
  const [otherAcademicUnit, setOtherAcademicUnit] = useState(stateData?.otherAcademicUnit || '');
  const [natureStudy, setNatureStudy] = useState(stateData?.natureStudy || 'faculty');
  const [fieldworkLocation, setFieldworkLocation] = useState(stateData?.fieldworkLocation || '');
  const [studySummary, setStudySummary] = useState(stateData?.studySummary || '');
  const [studyObjectives, setStudyObjectives] = useState(stateData?.studyObjectives || '');
  const [vulnerableGroups, setVulnerableGroups] = useState(stateData?.vulnerableGroups || {});
  const [otherParticipantText, setOtherParticipantText] = useState(stateData?.otherParticipantText || '');
  const [coInvestigators, setCoInvestigators] = useState(stateData?.coInvestigators || []);

  const [documentItems, setDocumentItems] = useState(() => {
    const rawDocs = stateData?.documents;
    return FORM_DEFINITIONS.map((def) => {
      let entry = null;
      if (Array.isArray(rawDocs)) {
        entry = rawDocs.find((d) => (d.documentKey || d.key) === def.key);
      } else if (rawDocs && typeof rawDocs === 'object') {
        entry = rawDocs[def.key];
      }
      const isUploaded = Boolean(entry && (entry.uploaded || (entry.status !== 'Missing' && entry.fileName)));
      return {
        ...def,
        uploaded: isUploaded,
        fileName: entry?.fileName || 'No file attached',
        fileSize: entry?.fileSizeFormatted || entry?.fileSize || entry?.size || '—',
        fileUrl: entry?.fileUrl || null,
        downloadUrl: entry?.downloadUrl || null,
      };
    });
  });

  // Load latest protocol / draft from backend API
  useEffect(() => {
    let isMounted = true;
    async function loadProtocolData() {
      try {
        let res = null;
        if (activeProtocolId) {
          res = await protocolsApi.get(activeProtocolId);
        } else {
          res = await protocolsApi.getDraft();
        }

        if (!isMounted || !res || !res.success) return;
        const p = res.protocol || res.draft;
        if (!p) return;

        setActiveProtocolId(p.id);
        if (p.title) setProtocolTitle(p.title);
        if (p.facultyAdviser) setAdviser(p.facultyAdviser);
        if (p.reviewCategory) setReviewCategory(p.reviewCategory);
        if (p.academicUnit) setAcademicUnit(p.academicUnit);
        if (p.natureStudy) setNatureStudy(p.natureStudy);
        if (p.fieldworkLocation) setFieldworkLocation(p.fieldworkLocation);
        if (p.studySummary) setStudySummary(p.studySummary);
        if (p.studyObjectives) setStudyObjectives(p.studyObjectives);
        if (p.otherTargetPop) setOtherParticipantText(p.otherTargetPop);

        if (Array.isArray(p.coInvestigators)) {
          setCoInvestigators(p.coInvestigators);
        }

        if (Array.isArray(p.targetPopulations)) {
          const vgMap = {};
          p.targetPopulations.forEach((k) => {
            vgMap[k] = true;
          });
          setVulnerableGroups(vgMap);
        }

        if (Array.isArray(p.documents)) {
          setDocumentItems(
            FORM_DEFINITIONS.map((def) => {
              const match = p.documents.find((d) => (d.documentKey || d.key) === def.key);
              const isUploaded = Boolean(match && match.status !== 'Missing' && match.fileName);
              return {
                ...def,
                uploaded: isUploaded,
                fileName: match?.fileName || 'No file attached',
                fileSize: match?.fileSizeFormatted || match?.fileSize || match?.size || '—',
                fileUrl: match?.fileUrl || null,
                downloadUrl: match?.downloadUrl || null,
              };
            })
          );
        }
      } catch (err) {
        console.warn('Could not refresh protocol from server:', err);
      }
    }

    loadProtocolData();
    return () => {
      isMounted = false;
    };
  }, [activeProtocolId]);

  const uploadedCount = documentItems.filter((d) => d.uploaded).length;
  const totalCount = documentItems.length;

  const handleSaveDraftClick = async () => {
    try {
      const activeVulnerable = Object.keys(vulnerableGroups).filter((k) => vulnerableGroups[k]);
      const res = await protocolsApi.saveDraft({
        id: activeProtocolId,
        title: protocolTitle,
        facultyAdviser: adviser,
        reviewCategory,
        academicUnit,
        otherAcademicUnit,
        natureStudy,
        fieldworkLocation,
        studySummary,
        studyObjectives,
        targetPopulations: activeVulnerable,
        otherTargetPop: otherParticipantText,
        coInvestigators,
      });

      if (res && res.success && res.protocolId) {
        setActiveProtocolId(res.protocolId);
      }
      setToastMsg('Application draft saved.');
    } catch (err) {
      console.error('Failed to save draft:', err);
      setToastMsg('Failed to save draft.');
    }
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleConfirmSubmit = async () => {
    if (!activeProtocolId) {
      alert('Cannot submit without a saved draft protocol.');
      return;
    }

    setIsSubmitting(true);
    try {
      // First persist any edited metadata
      await handleSaveDraftClick();

      // Submit protocol
      const res = await protocolsApi.submit(activeProtocolId);
      if (res && res.success) {
        setSubmittedProtocolId(res.protocolCode);
        setSubmittedDateStr(res.dateSubmitted || new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }));
        setShowConfirmModal(false);
        setShowSuccessModal(true);
      } else {
        alert(res?.message || 'Submission failed.');
      }
    } catch (err) {
      console.error('Submission failed:', err);
      alert(err.message || 'Submission failed. Please check that all mandatory documents are uploaded.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getParticipantBadges = () => {
    const vg = stateData?.vulnerableGroups;
    if (!vg) return ['General Adult Population (Non-Vulnerable)'];
    const list = [];
    if (vg.minors) list.push('Minors / Under 18');
    if (vg.indigenous) list.push('Indigenous Peoples (NCIP)');
    if (vg.patients) list.push('Hospital / Clinic Patients');
    if (vg.pregnant) list.push('Pregnant Women / Fetuses');
    if (vg.elderly) list.push('Senior Citizens (60+)');
    if (vg.pwd) list.push('Persons with Disabilities');
    if (vg.generalAdults) list.push('General Adult Population');
    if (vg.notApplicable) list.push('Not Applicable (Non-Human / Lab)');
    if (vg.other) {
      if (stateData?.otherParticipantText) {
        list.push(`Other: ${stateData.otherParticipantText}`);
      } else {
        list.push('Other Custom Cohorts');
      }
    }
    return list.length > 0 ? list : ['General Adult Population (Non-Vulnerable)'];
  };

  const participantBadges = getParticipantBadges();

  const academicUnitDisplay =
    academicUnit ||
    stateData?.academicUnit === 'Other Academic Unit / Center' && stateData?.otherAcademicUnit
      ? stateData.otherAcademicUnit
      : stateData?.academicUnit || currentUser?.department || currentUser?.college || 'Not Specified';

  const natureStudyDisplay =
    stateData?.natureStudy === 'other' && stateData?.otherNatureStudy
      ? stateData.otherNatureStudy
      : stateData?.natureStudy === 'undergrad'
      ? 'Undergraduate Thesis'
      : stateData?.natureStudy === 'masters'
      ? "Master's Thesis"
      : stateData?.natureStudy === 'dissertation'
      ? 'Ph.D. Dissertation'
      : stateData?.natureStudy === 'external'
      ? 'Agency Funded Grant'
      : 'Faculty Funded Research';

  const fieldworkDisplay =
    stateData?.fieldworkLocation ||
    (stateData?.isLabOrDeskOnly ? 'MMSU Campus Laboratories / Desk-Based Research' : 'Not Specified');

  return (
    <ResearcherLayout>
      <div className="space-y-6 pb-20">
        {toastMsg && (
          <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[16px] text-emerald-400">
              check_circle
            </span>
            <span>{toastMsg}</span>
          </div>
        )}
        {/* Page Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Review &amp; Submit</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Review your application and submitted documents before sending them to the URERB.
            </p>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px] text-emerald-700">check_circle</span>
              <span>Ready for Review</span>
            </div>
          </div>
        </div>

        {/* 4-Step Progress Indicator (Step 4 is Active) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Step 1 - Completed */}
          <div
            onClick={() => navigate(ROUTES.RESEARCHER.NEW_APPLICATION)}
            className="bg-emerald-50/50 border border-emerald-200/80 rounded-md p-3 flex items-center space-x-3 cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[15px]">check</span>
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Step 1</div>
              <div className="text-xs font-semibold text-slate-800">Study Identification</div>
            </div>
          </div>

          {/* Step 2 - Completed */}
          <div
            onClick={() => navigate(ROUTES.RESEARCHER.NEW_APPLICATION)}
            className="bg-emerald-50/50 border border-emerald-200/80 rounded-md p-3 flex items-center space-x-3 cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[15px]">check</span>
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Step 2</div>
              <div className="text-xs font-semibold text-slate-800">Researcher &amp; Details</div>
            </div>
          </div>

          {/* Step 3 - Completed */}
          <div
            onClick={() => navigate(ROUTES.RESEARCHER.NEW_APPLICATION)}
            className="bg-emerald-50/50 border border-emerald-200/80 rounded-md p-3 flex items-center space-x-3 cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[15px]">check</span>
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Step 3</div>
              <div className="text-xs font-semibold text-slate-800">Document Repository</div>
            </div>
          </div>

          {/* Step 4 - Active */}
          <div className="bg-white border-2 border-[#1e513b] rounded-md p-3 flex items-center space-x-3 shadow-xs relative">
            <div className="w-6 h-6 rounded-full bg-[#1e513b] text-white flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-emerald-200">
              4
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold text-[#1e513b] uppercase tracking-wider">Step 4</span>
              </div>
              <div className="text-xs font-bold text-slate-900">Review &amp; Sign-Off</div>
            </div>
          </div>
        </div>

        {/* SECTION 1 — APPLICATION SUMMARY */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-[#1e513b]" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                1. Application Information
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="flex items-center space-x-1.5 text-xs font-semibold text-[#1e513b] hover:text-[#163f2e] bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded border border-slate-200 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">edit</span>
              <span>Edit Details</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
            <div className="md:col-span-2 bg-slate-50 p-3 rounded border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Full Research Protocol Title
              </span>
              <p className="text-sm font-semibold text-slate-900 leading-snug">
                {protocolTitle}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                Primary Researcher / Lead Investigator
              </span>
              <p className="font-medium text-slate-800">
                {currentUser.fullName || currentUser.name || 'Principal Investigator'}{' '}
                {(currentUser.researcherId || currentUser.idNumber) && (
                  <span className="text-[10px] text-slate-500">
                    (MMSU ID: {currentUser.researcherId || currentUser.idNumber})
                  </span>
                )}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                College / Academic Unit
              </span>
              <p className="font-medium text-slate-800">
                {academicUnitDisplay}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                Faculty Adviser / Senior Mentor
              </span>
              <p className="font-medium text-slate-800">{adviser}</p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                Nature of Research Study
              </span>
              <p className="font-medium text-slate-800">{natureStudyDisplay}</p>
            </div>

            {coInvestigators.length > 0 && (
              <div className="md:col-span-2 pt-1 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Co-Investigators ({coInvestigators.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {coInvestigators.map((ci, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      <span className="font-semibold text-slate-900">{ci.name}</span>
                      {ci.role && <span className="text-slate-500">({ci.role})</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Target Participants Summary */}
            <div className="md:col-span-2 pt-1 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Target Participant Populations &amp; Cohorts
              </span>
              <div className="flex flex-wrap gap-1.5">
                {participantBadges.map((badge, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    <span>{badge}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 pt-1 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                  Ethics Review Category
                </span>
                <p className="font-semibold text-[#1e513b]">{reviewCategory}</p>
                <span className="text-[10px] text-slate-400">
                  Classification verified based on MMSU REC SOP Rule 4.1
                </span>
              </div>
              <span className="text-[11px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded border border-slate-200 self-start sm:self-center">
                Fieldwork: {fieldworkDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2 — DOCUMENT CHECKLIST */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-[#1e513b]" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                2. Required Documents
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {uploadedCount} of {totalCount} Files Attached
            </span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-md overflow-hidden text-xs">
            {documentItems.map((doc) => (
              <div
                key={doc.key}
                className="p-3 bg-white flex items-center justify-between hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-7 h-7 rounded flex items-center justify-center font-bold ${
                      doc.uploaded
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{doc.icon}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{doc.title}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {doc.uploaded ? `${doc.fileName} · ${doc.fileSize}` : 'No file uploaded yet'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {doc.uploaded ? (
                    <>
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span>✓</span>
                        <span>Uploaded</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewDoc({
                            title: doc.title,
                            version: 'v1.0',
                            name: doc.fileName,
                            fileName: doc.fileName,
                            fileSize: doc.fileSize,
                            size: doc.fileSize,
                            description: doc.description,
                            fileUrl: doc.fileUrl,
                            downloadUrl: doc.downloadUrl,
                          })
                        }
                        className="text-slate-600 hover:text-[#1e513b] font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        View
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <span>Missing</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `${ROUTES.RESEARCHER.NEW_APPLICATION}?id=${activeProtocolId || ''}&mode=draft`,
                            {
                              state: {
                                protocolId: activeProtocolId,
                                returnStep: 3,
                              },
                            }
                          )
                        }
                        className="text-[#1e513b] hover:underline font-semibold px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Upload
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3 & SECTION 4 (SIDE BY SIDE ON DESKTOP) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SECTION 3 — REQUIREMENTS CHECK */}
          <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 mb-3">
                <div className="w-2 h-2 rounded-full bg-[#1e513b]" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                  3. Application Readiness
                </h2>
              </div>

              <ul className="space-y-2 text-xs">
                <li className="flex items-center space-x-2 text-slate-700">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                    ✓
                  </span>
                  <span className="font-medium">Research information completed</span>
                </li>
                <li className="flex items-center space-x-2 text-slate-700">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                    ✓
                  </span>
                  <span className="font-medium">
                    Required documents attached ({uploadedCount}/{totalCount})
                  </span>
                </li>
                <li className="flex items-center space-x-2 text-slate-700">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                    ✓
                  </span>
                  <span className="font-medium">Payment receipt provided &amp; validated</span>
                </li>
                <li className="flex items-center space-x-2 text-slate-700">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                    ✓
                  </span>
                  <span className="font-medium">Required information reviewed by investigator</span>
                </li>
              </ul>
            </div>

            {/* Readiness Badge */}
            <div className="mt-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded flex items-center space-x-2">
              <span className="material-symbols-outlined text-[16px] text-emerald-700">check_circle</span>
              <span className="text-xs font-bold text-emerald-900">
                Application Ready for Submission
              </span>
            </div>
          </div>

          {/* SECTION 4 — SUBMISSION NOTICE */}
          <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 mb-3">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                  4. Submission Notice
                </h2>
              </div>

              <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <p className="font-medium text-slate-800">
                  Please review all information and documents carefully before submitting your application.
                </p>
                <p className="text-slate-500 text-[11px]">
                  Once submitted, the application will proceed to the URERB administrative checking process.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION AREA */}
        <div className="mt-8 pt-5 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSaveDraftClick}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded shadow-xs transition-colors cursor-pointer"
          >
            Save Draft
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate(ROUTES.RESEARCHER.NEW_APPLICATION)}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="px-5 py-2.5 bg-[#1e513b] hover:bg-[#163f2e] text-white font-bold text-xs rounded shadow-xs flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <span>Submit Application</span>
              <span className="text-emerald-200">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL (Screenshot 4) */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 text-[#1e513b] flex items-center justify-center font-bold text-base shrink-0">
                  ?
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Submit Application?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Please confirm that all information and required documents are complete before submitting your application.
                  </p>
                </div>
              </div>

              {/* Summary Card inside Modal */}
              <div className="bg-slate-50 border border-slate-200 rounded p-3.5 my-4 text-xs space-y-2">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Research Title
                  </span>
                  <span className="font-semibold text-slate-800 leading-snug block">
                    {protocolTitle}
                  </span>
                </div>
                <div className="pt-1.5 flex items-center justify-between border-t border-slate-200 text-[11px]">
                  <span className="text-slate-500">Application Status:</span>
                  <span className="font-semibold text-emerald-800 bg-emerald-100/70 border border-emerald-200/70 px-2 py-0.5 rounded">
                    Ready for Submission
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Document Status:</span>
                  <span className="font-medium text-slate-700">
                    {uploadedCount} of {totalCount} required documents attached
                  </span>
                </div>
              </div>

              {/* Advisory Text */}
              <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                Once submitted, you will receive an official Protocol Tracking Number and the application will be routed to the Secretariat for intake verification.
              </p>

              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  className="px-4 py-2 bg-[#1e513b] text-white text-xs font-bold rounded shadow-xs hover:bg-[#163f2e] transition-colors cursor-pointer"
                >
                  Confirm Submission
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL (Screenshot 5) */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              <span className="material-symbols-outlined text-[26px] text-emerald-700 font-bold">check</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Application Submitted Successfully</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Your research ethics protocol has been officially submitted to the MMSU URERB.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-md p-4 mb-4 text-left text-xs space-y-2.5">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Protocol Tracking Number
                </span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block text-xs">
                  {submittedProtocolId}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Research Title
                </span>
                <span className="font-semibold text-slate-800 leading-snug block">
                  {protocolTitle}
                </span>
              </div>
              <div className="pt-1 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block mb-0.5">Initial Review Level:</span>
                  <span className="font-medium text-slate-800">
                    {reviewCategory.split(' (')[0] || reviewCategory}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Current Status:</span>
                  <span className="font-semibold text-emerald-800 bg-emerald-100/70 border border-emerald-200/70 px-2 py-0.5 rounded inline-block">
                    Under Secretariat Intake
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200">
                <span className="text-slate-500">Submission Date:</span>
                <span className="font-medium text-slate-800">{submittedDateStr}</span>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `${ROUTES.RESEARCHER.APPLICATION_TRACKING}?id=${submittedProtocolId}`
                  )
                }
                className="w-full py-2.5 bg-[#1e513b] text-white text-xs font-bold rounded shadow-xs flex items-center justify-center space-x-1.5 hover:bg-[#163f2e] transition-colors cursor-pointer"
              >
                <span>Done</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(ROUTES.RESEARCHER.MY_APPLICATIONS)}
                className="w-full py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 transition-colors cursor-pointer"
              >
                View My Applications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT APPLICATION INFORMATION MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Edit Application Information
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Full Research Protocol Title
                </label>
                <input
                  type="text"
                  value={protocolTitle}
                  onChange={(e) => setProtocolTitle(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-[#1e513b] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Adviser / Mentor
                  </label>
                  <input
                    type="text"
                    value={adviser}
                    onChange={(e) => setAdviser(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e513b] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Review Category
                  </label>
                  <select
                    value={reviewCategory}
                    onChange={(e) => setReviewCategory(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e513b] focus:outline-none bg-white"
                  >
                    <option value="Expedited Review (Minimal Risk / Non-Invasive)">
                      Expedited Review (Minimal Risk)
                    </option>
                    <option value="Full Board Review (More than Minimal Risk / Vulnerable Groups)">
                      Full Board Review
                    </option>
                    <option value="Exempted Review (Negligible Risk)">
                      Exempted Review
                    </option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2.5 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-1.5 bg-[#1e513b] text-white text-xs font-bold rounded hover:bg-[#163f2e] cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </ResearcherLayout>
  );
}
