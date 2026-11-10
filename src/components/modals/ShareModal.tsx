import React, { useState } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import { LandingSite } from '../../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSite: LandingSite;
  targetDate: Date;
  missionDay: number;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  currentSite,
  targetDate,
  missionDay
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Build URL with query params
  const url = new URL(window.location.href);
  url.searchParams.set('site', currentSite.id);
  url.searchParams.set('date', targetDate.toISOString().slice(0, 10));
  url.searchParams.set('day', missionDay.toFixed(2));
  const shareableUrl = url.toString();

  const handleCopy = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-space-900 border border-slate-200 dark:border-space-700 shadow-2xl p-6 text-slate-800 dark:text-slate-100 text-xs select-none">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-space-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Share Mission Scenario
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Deep-link directly to this site, date, and simulation day.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-space-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-space-800 border border-slate-200 dark:border-space-700 font-mono text-[11px] break-all select-all text-slate-700 dark:text-slate-300">
            {shareableUrl}
          </div>

          <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-[11px]">
            Includes site <strong>{currentSite.name}</strong>, reference date <strong>{targetDate.toISOString().slice(0, 10)}</strong>, and day <strong>{missionDay.toFixed(2)}</strong>.
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-space-700 flex justify-end gap-2">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-md ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Share Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
