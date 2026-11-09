import React, { useState, useEffect } from 'react';

const FOOTER_MODALS = {
  privacy: {
    icon: 'shield_lock',
    badge: 'RA 10173 Compliance',
    title: 'Data Privacy Policy',
    subtitle: 'Mariano Marcos State University · URERB Data Protection Notice',
    intro:
      'In compliance with Republic Act No. 10173 (Data Privacy Act of 2012), the MMSU University Research Ethics Review Board (URERB) is committed to protecting the privacy and confidentiality of all researchers, reviewers, and human participants.',
    sections: [
      {
        heading: '1. Collection of Personal & Protocol Information',
        body: 'The portal collects institutional identity details (name, MMSU email, academic unit, PRC/ORCID credentials) and research protocol documents strictly for ethics review, accreditation auditing, and official issuance of ethics clearance certificates.',
      },
      {
        heading: '2. Confidentiality & Restricted Access',
        body: 'Submitted manuscripts, informed consent forms (Form 16), and reviewer deliberations are encrypted and restricted exclusively to the assigned URERB Panel Reviewers and authorized Secretariat Officers under strict Non-Disclosure Agreements.',
      },
      {
        heading: '3. Data Retention & Archiving',
        body: 'Approved and archived protocol dockets are retained in the PHREB-compliant digital vault in accordance with national research ethics retention schedules and University records management policies.',
      },
    ],
    footerNote: 'For data privacy inquiries, contact dpo@mmsu.edu.ph or urerb@mmsu.edu.ph.',
  },
  ethics: {
    icon: 'policy',
    badge: 'PHREB Level 2 Standard',
    title: 'Research Ethics Guidelines',
    subtitle: 'National Ethical Guidelines for Research Involving Human Participants',
    intro:
      'All research involving human participants, human tissue, or identifiable personal data conducted by MMSU faculty, staff, and students must undergo formal ethical review and clearance prior to implementation.',
    sections: [
      {
        heading: 'Review Classifications',
        items: [
          'Exempt from Review: Minimal-risk protocols using anonymized secondary data or standard educational assessments.',
          'Expedited Review (14 Calendar Days): Minimal-risk studies requiring primary data collection or surveys.',
          'Full Board Review: Protocols involving vulnerable populations, clinical interventions, or sensitive bio-behavioral risks.',
        ],
      },
      {
        heading: 'Mandatory Submission Package',
        items: [
          'Form 13 & Form 14: Application for Ethics Review and Study Protocol Assessment.',
          'Form 15: Research Protocol Summary & Technical Review Endorsement.',
          'Form 16: Informed Consent Form (English and Ilocano translations).',
          'Form 17: Non-Clinical / Social Action Research Checklist & Study Team CVs.',
        ],
      },
    ],
    footerNote: 'Adheres to PHREB 2022 National Ethical Guidelines & WHO Operational Guidelines.',
  },
  terms: {
    icon: 'gavel',
    badge: 'Institutional Policy',
    title: 'Portal Terms of Use',
    subtitle: 'MMSU URERB Electronic Submission & Review System',
    intro:
      'By accessing and using the MMSU URERB Portal, investigators, panel reviewers, and secretariat personnel agree to abide by the following institutional terms and security standards:',
    sections: [
      {
        heading: 'Authorized Institutional Use Only',
        body: 'Access is granted strictly to verified @mmsu.edu.ph account holders and accredited external affiliates. Sharing of account credentials, OTP verification codes, or confidential review assignments is strictly prohibited.',
      },
      {
        heading: 'Authenticity of Submitted Documents',
        body: 'Principal Investigators certify that all uploaded research proposals, adviser endorsements, and Official Receipt (O.R.) fee records are authentic, accurate, and free from plagiarism or fabrication.',
      },
      {
        heading: 'Conflict of Interest Disclosure',
        body: 'Reviewers and committee members must immediately disclose any academic, financial, or personal conflict of interest prior to accessing or evaluating an assigned protocol.',
      },
    ],
    footerNote: 'Violations are subject to MMSU Academic Integrity and Administrative Disciplinary policies.',
  },
  helpdesk: {
    icon: 'support_agent',
    badge: 'Technical & Secretariat Desk',
    title: 'ITC Helpdesk & URERB Support',
    subtitle: 'Mariano Marcos State University · Information Technology Center',
    intro:
      'Need help with institutional login, OTP email verification, document uploads, or ethics docket tracking? Reach out to our dedicated support channels below:',
    sections: [
      {
        heading: 'URERB Secretariat Office (Protocol & Forms Assistance)',
        items: [
          'Email: urerb@mmsu.edu.ph',
          'Office Location: Research & Development Building / Science Complex 2nd Floor, MMSU Main Campus, Batac City',
          'Operating Hours: Monday – Friday, 8:00 AM – 5:00 PM (excluding holidays)',
        ],
      },
      {
        heading: 'MMSU ITC Helpdesk (Account, Email & Portal Access)',
        items: [
          'Email: itc.helpdesk@mmsu.edu.ph',
          'Services: @mmsu.edu.ph account recovery, 2FA/OTP delivery issues, and portal bug reporting',
          'System Node: AUTH-01 · TLS 1.3 Institutional Gateway',
        ],
      },
    ],
    footerNote: 'Please include your Protocol Code (if applicable) and MMSU ID when requesting support.',
  },
};

export default function Footer() {
  const [activeModalKey, setActiveModalKey] = useState(null);

  useEffect(() => {
    const handleOpenModal = (e) => {
      if (e.detail && FOOTER_MODALS[e.detail]) {
        setActiveModalKey(e.detail);
      }
    };
    window.addEventListener('urerb_open_footer_modal', handleOpenModal);
    return () => window.removeEventListener('urerb_open_footer_modal', handleOpenModal);
  }, []);

  const activeModal = activeModalKey ? FOOTER_MODALS[activeModalKey] : null;

  return (
    <>
      <footer className="w-full shrink-0 border-t border-slate-200/80 bg-white py-3 px-6 sm:px-8 z-30 select-none">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          {/* Left: Institution credits */}
          <div className="sm:flex-1 font-medium text-slate-700 text-xs flex items-center justify-center sm:justify-start gap-1.5">
            <span>Mariano Marcos State University</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-600 font-semibold">URERB</span>
          </div>

          {/* Center: Quick institutional policy links */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px] text-slate-500 font-medium shrink-0">
            <button
              type="button"
              onClick={() => setActiveModalKey('privacy')}
              className="hover:text-[#1e513b] hover:underline transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => setActiveModalKey('ethics')}
              className="hover:text-[#1e513b] hover:underline transition-colors cursor-pointer"
            >
              Ethics Guidelines
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => setActiveModalKey('terms')}
              className="hover:text-[#1e513b] hover:underline transition-colors cursor-pointer"
            >
              Terms of Use
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => setActiveModalKey('helpdesk')}
              className="hover:text-[#1e513b] hover:underline transition-colors cursor-pointer"
            >
              ITC Helpdesk
            </button>
          </div>

          {/* Right: Copyright notice */}
          <div className="sm:flex-1 text-slate-400 text-[11px] text-center sm:text-right">
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* Institutional Footer Policy / Support Modal */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setActiveModalKey(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#1e513b]/10 text-[#1e513b] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[22px]">
                    {activeModal.icon}
                  </span>
                </div>
                <div>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#1e513b] bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded mb-1">
                    {activeModal.badge}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    {activeModal.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {activeModal.subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalKey(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs text-slate-600 leading-relaxed max-h-[65vh] overflow-y-auto">
              <p className="text-slate-700">{activeModal.intro}</p>

              <div className="space-y-3">
                {activeModal.sections.map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1.5"
                  >
                    <div className="font-bold text-slate-800 text-xs">
                      {sec.heading}
                    </div>
                    {sec.body && <p className="text-slate-600">{sec.body}</p>}
                    {sec.items && (
                      <ul className="list-disc pl-4 space-y-1 text-slate-600">
                        {sec.items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              {activeModal.footerNote && (
                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                  <span className="material-symbols-outlined text-[15px] text-[#1e513b] shrink-0">
                    verified_user
                  </span>
                  <span>{activeModal.footerNote}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setActiveModalKey(null)}
                className="px-4 py-2 bg-[#1e513b] hover:bg-[#163f2e] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
