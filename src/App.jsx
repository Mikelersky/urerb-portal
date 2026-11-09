import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { initAuthSession } from './utils/auth';

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuthSession().finally(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-[#1e513b]/20 border-t-[#1e513b] rounded-full animate-spin mb-3"></div>
        <div className="text-xs font-semibold text-slate-600">Connecting to URERB Portal...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
