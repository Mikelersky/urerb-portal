import React, { useState, useEffect } from 'react';

export default function COIDeclarationModal({
  isOpen,
  onClose,
  protocol,
  onCertify,
  onRecuse,
}) {
  const [certifyNoConflict, setCertifyNoConflict] = useState(false);
  const [certifyConfidentiality, setCertifyConfidentiality] = useState(false);

  useEffect(() => {
    setCertifyNoConflict(false);
    setCertifyConfidentiality(false);
  }, [isOpen, protocol?.protocolCode, protocol?.id]);

  if (!isOpen || !protocol) return null;

  const canProceed = certifyNoConflict && certifyConfidentiality;

  const handleConfirm = () => {
    if (canProceed && onCertify) {
      onCertify(protocol);
    }
  };

  const handleRecusal = () => {
    if (onRecuse) {
      onRecuse(protocol);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 relative">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">policy</span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Conflict of Interest (COI) Declaration
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                MMSU URERB · PHREB Level 2 Ethics Requirement
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

        {/* Protocol Context */}
        <div className="mt-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200/90 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
              {protocol.protocolCode}
            </span>
            <span className="text-[11px] font-semibold text-slate-600">
              {protocol.track}
            </span>
          </div>
          <h4 className="font-bold text-slate-900 line-clamp-2">
            {protocol.title}
          </h4>
          <p className="text-slate-500">
            Principal Investigator: <strong className="text-slate-700">{protocol.pi}</strong>
          </p>
        </div>

        {/* Checkboxes */}
        <div className="mt-4 space-y-3 text-xs">
          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50/70 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              checked={certifyNoConflict}
              onChange={(e) => setCertifyNoConflict(e.target.checked)}
              className="mt-0.5 rounded text-[#1e513b] focus:ring-[#1e513b] cursor-pointer"
            />
            <span className="text-slate-700 leading-snug">
              <strong>No Conflict of Interest:</strong> I certify that I have no personal, financial, academic (co-authorship within 3 years), or institutional conflict of interest with the Principal Investigator or funding body.
            </span>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50/70 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              checked={certifyConfidentiality}
              onChange={(e) => setCertifyConfidentiality(e.target.checked)}
              className="mt-0.5 rounded text-[#1e513b] focus:ring-[#1e513b] cursor-pointer"
            />
            <span className="text-slate-700 leading-snug">
              <strong>Confidentiality Pledge:</strong> I agree to safeguard all proprietary study data, participant information, and deliberations in strict adherence to PHREB 2024 ethical criteria.
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleRecusal}
            className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
          >
            Declare COI &amp; Recuse
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canProceed}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1e513b] hover:bg-[#163f2e] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>Certify &amp; Proceed</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
