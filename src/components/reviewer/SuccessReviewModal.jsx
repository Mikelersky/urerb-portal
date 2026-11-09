import React from 'react';

export default function SuccessReviewModal({
  isOpen,
  onClose,
  protocol,
  recommendedAction = '',
  submittedDate = '',
}) {
  if (!isOpen || !protocol) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-200 text-center relative">
        {/* Success Icon */}
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100/80 text-emerald-700 flex items-center justify-center mb-4 ring-8 ring-emerald-50">
          <span className="material-symbols-outlined text-[32px]">check_circle</span>
        </div>

        {/* Headings */}
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
          Review Submitted Successfully
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Your review has been recorded and submitted to the URERB workflow.
        </p>

        {/* Summary Card */}
        <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-left text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Protocol:</span>
            <span className="font-mono font-bold text-slate-900">
              {protocol.protocolCode}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Recommended Action:</span>
            <span className="font-semibold text-slate-800">
              {recommendedAction}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Status:</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              Review Submitted
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Submitted on:</span>
            <span className="font-semibold text-slate-800">
              {submittedDate}
            </span>
          </div>
        </div>

        {/* Done Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-[#1e513b] hover:bg-[#163f2e] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
