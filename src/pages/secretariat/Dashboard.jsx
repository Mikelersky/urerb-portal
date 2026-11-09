import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SecretariatLayout from '../../layouts/SecretariatLayout';
import { ROUTES } from '../../constants/routes';
import DocumentPreviewModal from '../../components/common/DocumentPreviewModal';
import { checkingApi } from '../../services/api';

const pad = (n) => String(n || 0).padStart(2, '0');

const STATUS_STYLES = {
  new: 'bg-[#e0e7ff] text-[#1e3a8a]',
  checking: 'bg-[#e8ecfb] text-slate-700',
  clarification: 'bg-[#fee2e2] text-[#991b1b]',
  assigned: 'bg-[#d1fae5] text-[#065f46]',
};

const ACTIONS = {
  route: { label: 'Route', icon: 'shortcut', primary: true },
  check: { label: 'Check Files', icon: 'fact_check', primary: true },
  continue: { label: 'Continue', icon: 'arrow_forward', primary: false },
  deficit: { label: 'View Deficit', icon: 'rule', primary: false },
  details: { label: 'Details', icon: 'visibility', primary: false },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [previewDoc, setPreviewDoc] = useState(null);
  const [routingProtocol, setRoutingProtocol] = useState(null);
  const [rows, setRows] = useState([]);
  const [metrics, setMetrics] = useState({
    newSubmissions: 0,
    underChecking: 0,
    piClarification: 0,
    readyToRoute: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const res = await checkingApi.queue();
      if (res && res.success) {
        const list = Array.isArray(res.queue) ? res.queue : (Array.isArray(res.protocols) ? res.protocols : []);
        setRows(list);
        if (res.metrics) setMetrics(res.metrics);
      }
    } catch (err) {
      console.error('Failed to load secretariat dashboard queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const handleSync = () => fetchQueue();
    window.addEventListener('urerb_secretariat_queue_sync', handleSync);
    window.addEventListener('urerb_secretariat_archives_sync', handleSync);
    return () => {
      window.removeEventListener('urerb_secretariat_queue_sync', handleSync);
      window.removeEventListener('urerb_secretariat_archives_sync', handleSync);
    };
  }, []);

  const priorityProtocol = rows.find((p) => p.isPriority);

  const handleRowAction = (row) => {
    if (row.actionType === 'route') {
      setRoutingProtocol(row);
      return;
    }
    if (row.actionType === 'check' || row.actionType === 'continue' || row.actionType === 'deficit') {
      const state = row.actionType === 'deficit' ? 'deficient' : 'verified';
      navigate(`${ROUTES.SECRETARIAT.APPLICATION_CHECKING}?id=${row.protocolId}&state=${state}`);
      return;
    }
    navigate(`${ROUTES.SECRETARIAT.APPLICATION_PROCESSING}?id=${row.protocolId}`);
  };

  return (
    <SecretariatLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Secretariat Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Receive new submissions, conduct initial completeness checks, and route research protocols under standards.
          </p>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => navigate(`${ROUTES.SECRETARIAT.APPLICATIONS_MANAGEMENT}?tab=new`)}
            className="text-left bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs hover:border-[#14432f]/40 hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2 w-full">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                NEW SUBMISSIONS
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#14432f]"></span>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="text-3xl font-extrabold text-[#14432f] tracking-tight">
                {pad(metrics.newSubmissions)}
              </span>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                IN QUEUE
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-snug mt-1">
              Awaiting initial completeness review
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate(`${ROUTES.SECRETARIAT.APPLICATIONS_MANAGEMENT}?tab=checking`)}
            className="text-left bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs hover:border-[#14432f]/40 hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2 w-full">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                UNDER CHECKING
              </span>
              <span className="material-symbols-outlined text-[18px] text-slate-500">
                assignment
              </span>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {pad(metrics.underChecking)}
              </span>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                IN-PROGRESS
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-snug mt-1">
              Document screening &amp; verification
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate(`${ROUTES.SECRETARIAT.APPLICATIONS_MANAGEMENT}?tab=assigned`)}
            className="text-left bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs hover:border-[#14432f]/40 hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2 w-full">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                CLEARED FOR REVIEW
              </span>
              <span className="material-symbols-outlined text-[18px] text-[#14432f]">
                check_circle
              </span>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {pad(metrics.clearedForReview)}
              </span>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                ROUTED
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-snug mt-1">
              Forwarded to committee chairs
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate(ROUTES.SECRETARIAT.RECORDS_AND_ARCHIVES)}
            className="text-left bg-white rounded-xl p-5 border border-slate-200/80 shadow-2xs hover:border-[#14432f]/40 hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2 w-full">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                DECISIONS / COMPLETED
              </span>
              <span className="material-symbols-outlined text-[18px] text-slate-400">
                check_circle
              </span>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="text-3xl font-extrabold text-slate-600 tracking-tight">
                {pad(metrics.decisionsCompleted)}
              </span>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                ARCHIVED
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-snug mt-1">
              Approved and certificates issued
            </p>
          </button>
        </div>

        {/* Priority Intake Card (only when a priority submission exists) */}
        {priorityProtocol && (
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#fee2e2] text-[#991b1b]">
                  <span className="material-symbols-outlined text-[13px]">warning</span>
                  Priority Intake
                </span>
                <span className="font-mono text-xs font-bold text-slate-800 bg-[#e8ecfb] px-2.5 py-0.5 rounded">
                  {priorityProtocol.protocolId}
                </span>
                <span className="text-xs text-slate-500">
                  • Received {priorityProtocol.dateReceived}, {priorityProtocol.timeReceived}
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {priorityProtocol.title}
              </h2>

              <p className="text-xs text-slate-600">
                Lead Investigator: <strong className="text-slate-900">{priorityProtocol.pi}</strong> ({priorityProtocol.college})
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `${ROUTES.SECRETARIAT.APPLICATION_CHECKING}?id=${priorityProtocol.protocolId}&state=verified`
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">fact_check</span>
                <span>Review Submission</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const doc = priorityProtocol.documents?.[0] || {
                    title: priorityProtocol.title,
                    version: 'v1.0',
                    description: `Priority intake dossier (${priorityProtocol.protocolId}) submitted by ${priorityProtocol.pi}.`,
                  };
                  setPreviewDoc(doc);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#e8ecfb] hover:bg-[#dce2f7] text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                <span>Preview</span>
              </button>
            </div>
          </div>
        )}

        {/* Intake Protocols Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f4f6fb] border-b border-slate-200/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-5 w-36">PROTOCOL ID</th>
                  <th className="py-3.5 px-4">RESEARCH TITLE &amp; PI</th>
                  <th className="py-3.5 px-4 w-32">DATE</th>
                  <th className="py-3.5 px-4 w-36">STATUS</th>
                  <th className="py-3.5 px-5 text-right w-36">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const action = ACTIONS[row.actionType] || ACTIONS.details;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-5 align-middle">
                        <div className="font-mono font-bold text-xs text-[#14432f]">
                          {row.protocolId}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {row.collegeShort}
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle max-w-md">
                        <div className="font-bold text-xs sm:text-[13px] text-slate-900 leading-snug">
                          {row.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{row.pi}</div>
                      </td>
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <div className="text-slate-700 font-medium">{row.dateReceived}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {row.timeReceived}
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            STATUS_STYLES[row.statusCategory] || STATUS_STYLES.checking
                          }`}
                        >
                          {row.dashboardStatus || row.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 align-middle text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleRowAction(row)}
                          className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            action.primary
                              ? 'bg-[#14432f] hover:bg-[#0f3323] text-white shadow-2xs'
                              : 'bg-[#e8ecfb] hover:bg-[#dce2f7] text-slate-800'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {action.icon}
                          </span>
                          <span>{action.label}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-14 text-center">
                      <div className="max-w-sm mx-auto space-y-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                          <span className="material-symbols-outlined text-[20px]">inbox</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900">No submissions in the intake queue</p>
                        <p className="text-xs text-slate-500">
                          New protocol submissions from researchers will appear here for completeness checking and routing.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Route Application to Review Coordination Modal */}
      {routingProtocol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#d1fae5] text-[#065f46] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">alt_route</span>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Route Application to Review Coordination?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Confirm routing to assign reviewers and set review timelines.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRoutingProtocol(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-4 leading-relaxed">
              This application has completed intake verification and is ready for review panel and reviewer coordination.
            </p>

            <div className="mt-4 p-4 rounded-xl bg-[#f4f6fb] border border-slate-200/70 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Protocol ID</span>
                <span className="font-mono font-bold text-slate-900">
                  {routingProtocol.protocolId}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Research Title</span>
                <span className="font-bold text-slate-900 leading-snug block">
                  {routingProtocol.title}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500">Principal Investigator</span>
                <span className="font-medium text-slate-900">{routingProtocol.pi}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500">Current Status</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#d1fae5] text-[#065f46]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#065f46]"></span>
                  Passed Intake
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRoutingProtocol(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = routingProtocol.protocolId;
                  setRoutingProtocol(null);
                  navigate(`${ROUTES.SECRETARIAT.APPLICATION_PROCESSING}?id=${id}`);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">send</span>
                <span>Route Application</span>
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
    </SecretariatLayout>
  );
}
