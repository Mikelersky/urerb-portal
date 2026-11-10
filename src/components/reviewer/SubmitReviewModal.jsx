import React from 'react';

export default function SubmitReviewModal({
  isOpen,
  onClose,
  onConfirm,
  protocol,
  findingsCount = 0,
  recommendedAction = '',
  justification = '',
  panel = 'Panel Review',
  deficientDocs = [],
}) {
  if (!isOpen || !protocol) return null;

  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Minor Revisions':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'Major Revisions':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Disapproved':
        return 'bg-red-50 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 relative">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">fact_check</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Submit Review?
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                MMSU URERB Protocol Formal Disposition
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Protocol Summary Card */}
        <div className="mt-4 p-4 rounded-xl bg-[#faf8ff] border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
              {protocol.protocolCode}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${getActionBadgeColor(
                recommendedAction
              )}`}
            >
              {recommendedAction || 'Pending Selection'}
            </span>
          </div>

          <h4 className="text-sm font-bold text-slate-900 leading-snug">
            {protocol.title}
          </h4>

          {justification && (
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Recommendation Justification:
              </span>
              <p className="text-slate-700 line-clamp-2 leading-relaxed">
                {justification}
              </p>
            </div>
          )}

          {deficientDocs.length > 0 && (
            <div className="p-3 bg-red-50/70 rounded-lg border border-red-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-900 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-red-600">warning</span>
                  Flagged Form Deficiencies ({deficientDocs.length}):
                </span>
                <span className="text-[10px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                  Requires PI Action
                </span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {deficientDocs.map((doc, i) => (
                  <div key={doc.documentKey || doc.id || i} className="p-2 bg-white rounded border border-red-100 text-[11px]">
                    <div className="font-bold text-slate-800">{doc.title}</div>
                    <p className="text-slate-600 mt-0.5 line-clamp-2 italic">{doc.issueText || 'Specific correction requested.'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {deficientDocs.length === 0 && (recommendedAction === 'Minor Revisions' || recommendedAction === 'Major Revisions') && (
            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0 mt-0.5">info</span>
              <p className="text-[11px] leading-relaxed">
                No specific forms flagged as deficient. General review remarks will be sent to the researcher.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-slate-600 pt-1">
            <div className="flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[16px] text-slate-500">
                assignment_turned_in
              </span>
              <span>{findingsCount} findings recorded</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="text-slate-500 font-medium">
              {panel}
            </div>
          </div>
        </div>

        {/* Warning text */}
        <p className="mt-4 text-xs text-slate-600 leading-relaxed">
          Please confirm that your review is complete. Once submitted, the evaluation will be forwarded through the URERB workflow and will no longer be editable from this workspace.
        </p>

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#1e513b] hover:bg-[#163f2e] rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Confirm & Submit Review</span>
          </button>
        </div>
      </div>
    </div>
  );
}
