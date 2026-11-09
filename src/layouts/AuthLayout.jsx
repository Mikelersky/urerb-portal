import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/layout/Footer';
import { ROUTES } from '../constants/routes';

const AUTH_HEADER_MODALS = {
  help: {
    icon: 'help_center',
    badge: 'User Guide',
    title: 'URERB Portal Access & Help Guide',
    subtitle: 'Mariano Marcos State University · Research Ethics System',
    intro:
      'Welcome to the MMSU University Research Ethics Review Board (URERB) Portal. Follow the guidelines below to access your workspace or submit a research protocol for ethical clearance:',
    sections: [
      {
        heading: '1. Signing In to Your Workspace',
        body: 'Enter your official @mmsu.edu.ph email address and password. The portal automatically routes you to the Researcher Portal, Reviewer Workspace, or Secretariat Desk based on your assigned institutional role.',
      },
      {
        heading: '2. Creating a New Researcher Account',
        body: 'Active MMSU faculty, staff, graduate students, and undergraduate investigators can register via the "Create Account" link. A 6-digit single-use OTP verification code will be sent to your @mmsu.edu.ph inbox.',
      },
      {
        heading: '3. Preparing Your Protocol Submission',
        body: 'Before starting a new application, prepare PDF copies of your Study Protocol, Form 13–17 package, Informed Consent Forms (English & Ilocano), and Cashier Official Receipt (if applicable).',
      },
    ],
    footerNote: 'Need technical help? Contact itc.helpdesk@mmsu.edu.ph.',
  },
  faq: {
    icon: 'quiz',
    badge: 'Frequently Asked Questions',
    title: 'URERB Portal FAQs',
    subtitle: 'Common Questions on Account Access & Ethics Review',
    intro:
      'Find quick answers to common questions regarding MMSU institutional authentication and URERB review procedures:',
    sections: [
      {
        heading: 'Who can register on the URERB Portal?',
        body: 'All active MMSU faculty researchers, staff, graduate students, and undergraduate thesis advisees with a valid @mmsu.edu.ph email address, as well as accredited external investigators.',
      },
      {
        heading: 'How long does the ethics review process take?',
        body: 'Secretariat completeness screening takes 1–3 working days. Expedited reviews follow a 14-calendar-day turnaround, while Full Board protocols are deliberated during scheduled monthly board sessions.',
      },
      {
        heading: 'What should I do if I forgot my password or did not receive my OTP?',
        body: 'Use the "Forgot Password?" link on the login screen to generate a 15-minute recovery link, or check your university spam/quarantine folder. For persistent issues, contact the MMSU ITC Helpdesk.',
      },
      {
        heading: 'Which forms are required for initial submission?',
        body: 'Initial submissions require Form 13 (Application), Form 14/15 (Protocol Assessment & Summary), Form 16 (Informed Consent in English and Ilocano), and Form 17 (Checklist).',
      },
    ],
    footerNote: 'Aligned with PHREB Level 2 Accreditation Standards.',
  },
  contact: {
    icon: 'contact_mail',
    badge: 'Directory & Support',
    title: 'Contact URERB & ITC Support',
    subtitle: 'Mariano Marcos State University · Main Campus, Batac City',
    intro:
      'For inquiries regarding ethics protocol submissions, clearance certificates, or portal account credentials, please reach out to our offices:',
    sections: [
      {
        heading: 'URERB Secretariat Office',
        items: [
          'Email: urerb@mmsu.edu.ph',
          'Chair Office: chair.urerb@mmsu.edu.ph (Local 2104)',
          'Location: Science Complex 2nd Floor, Room 204, MMSU Main Campus, Batac City, Ilocos Norte',
          'Office Hours: Monday – Friday, 8:00 AM – 5:00 PM',
        ],
      },
      {
        heading: 'MMSU Information Technology Center (ITC)',
        items: [
          'Email: itc.helpdesk@mmsu.edu.ph',
          'Support Scope: Institutional @mmsu.edu.ph email, SSO/OTP verification, and portal connectivity',
        ],
      },
    ],
    footerNote: 'Include your MMSU ID or Protocol Reference Code in all official correspondence.',
  },
};

export default function AuthLayout({ children }) {
  const [activeHeaderModalKey, setActiveHeaderModalKey] = useState(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeModal = activeHeaderModalKey
    ? AUTH_HEADER_MODALS[activeHeaderModalKey]
    : null;

  return (
    <div className="h-screen w-full flex flex-col bg-[#f2f3ff] text-slate-800 font-sans antialiased overflow-hidden selection:bg-[#1e513b]/10 selection:text-[#1e513b]">
      {/* Institutional Top Header - Stays at top of screen */}
      <header className="h-16 shrink-0 z-30 bg-white border-b border-slate-200 px-6 sm:px-10 flex items-center justify-between shadow-xs select-none">
        <div className="max-w-[80rem] w-full mx-auto flex items-center justify-between">
          {/* Left: MMSU Logo & Portal Title */}
          <Link to="/login" className="flex items-center gap-3.5 group">
            <img
              src="/logos/mmsu-seal.png"
              alt="Mariano Marcos State University Logo"
              className="h-10 w-auto object-contain shrink-0"
            />
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex flex-col">
              <span className="font-bold text-base sm:text-lg text-slate-900 leading-tight tracking-tight">
                URERB Portal
              </span>
              <span className="text-[11px] text-slate-500 font-medium leading-tight">
                University Research Ethics Review Board
              </span>
            </div>
          </Link>

          {/* Right: Institutional Subtext, Nav Links, User Circle */}
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs sm:text-sm font-semibold text-slate-700 leading-tight">
                Mariano Marcos State University
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Research Ethics System
              </span>
            </div>
            <div className="hidden lg:block h-7 w-px bg-slate-200"></div>
            <nav className="hidden sm:flex items-center gap-5 text-xs sm:text-sm font-medium text-slate-600">
              <button
                type="button"
                onClick={() => setActiveHeaderModalKey('help')}
                className="hover:text-[#1e513b] transition-colors cursor-pointer"
              >
                Help
              </button>
              <button
                type="button"
                onClick={() => setActiveHeaderModalKey('faq')}
                className="hover:text-[#1e513b] transition-colors cursor-pointer"
              >
                FAQ
              </button>
              <button
                type="button"
                onClick={() => setActiveHeaderModalKey('contact')}
                className="hover:text-[#1e513b] transition-colors cursor-pointer"
              >
                Contact
              </button>
            </nav>

            {/* Account Button + Quick Access Popover */}
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setShowAccountMenu((prev) => !prev)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1e513b] text-white flex items-center justify-center shadow-xs hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                title="Account Access"
              >
                <span className="material-symbols-outlined text-[20px] sm:text-[22px]">
                  person
                </span>
              </button>

              {showAccountMenu && (
                <div className="absolute right-0 top-12 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-xs animate-in fade-in duration-150 space-y-2.5">
                  <div className="pb-2 border-b border-slate-100">
                    <div className="font-bold text-slate-900">Guest Session</div>
                    <div className="text-[11px] text-slate-500">
                      Sign in with your @mmsu.edu.ph credentials
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Link
                      to={ROUTES.AUTH.LOGIN}
                      onClick={() => setShowAccountMenu(false)}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#1e513b]">
                        login
                      </span>
                      <span>Sign In to Portal</span>
                    </Link>
                    <Link
                      to={ROUTES.AUTH.REGISTER}
                      onClick={() => setShowAccountMenu(false)}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-slate-400">
                        person_add
                      </span>
                      <span>Create Researcher Account</span>
                    </Link>
                    <Link
                      to={ROUTES.AUTH.FORGOT_PASSWORD}
                      onClick={() => setShowAccountMenu(false)}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-slate-400">
                        lock_reset
                      </span>
                      <span>Reset Password</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Canvas - Scrollable container with generous top space and natural bottom clearance */}
      <main className="w-full flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-10 flex flex-col items-center">
        <div className="w-full flex flex-col items-center justify-center my-auto">
          {children}
        </div>
      </main>

      {/* Institutional Fixed Footer */}
      <Footer />

      {/* Header Help / FAQ / Contact Modal */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setActiveHeaderModalKey(null)}
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
                onClick={() => setActiveHeaderModalKey(null)}
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
                onClick={() => setActiveHeaderModalKey(null)}
                className="px-4 py-2 bg-[#1e513b] hover:bg-[#163f2e] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
