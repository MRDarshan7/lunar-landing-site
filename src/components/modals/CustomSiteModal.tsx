import React, { useState } from 'react';
import { LandingSite } from '../../types';
import { X, Upload, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface CustomSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomSite: (site: LandingSite) => void;
}

export const CustomSiteModal: React.FC<CustomSiteModalProps> = ({
  isOpen,
  onClose,
  onAddCustomSite
}) => {
  const [name, setName] = useState('');
  const [lat, setLat] = useState<number>(-89.5);
  const [lon, setLon] = useState<number>(0.0);
  const [elevationKm, setElevationKm] = useState<number>(1.0);
  const [horizonProfile, setHorizonProfile] = useState<number[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed) || parsed.length !== 360 || parsed.some(v => typeof v !== 'number')) {
        throw new Error('File must be a JSON array containing exactly 360 numbers (azimuth 0° to 359°, elevation in degrees).');
      }

      setHorizonProfile(parsed.map(v => Math.max(0, Number(v) || 0)));
      setFileName(file.name);
    } catch (err: any) {
      setError(err.message || 'Invalid JSON horizon format.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for the custom site.');
      return;
    }
    if (lat < -90 || lat > 90) {
      setError('Latitude must be between -90° and +90°.');
      return;
    }
    if (lon < -180 || lon > 360) {
      setError('Longitude must be between -180° and +360°.');
      return;
    }

    // If no custom profile was uploaded, generate a synthetic horizon profile based on latitude
    const profile = horizonProfile || new Array(360).fill(0).map((_, i) => {
      const base = Math.abs(lat) > 80 ? 2.5 : 0.8;
      return Math.round((base + 1.2 * Math.sin((i * Math.PI) / 90) + 0.4 * Math.cos((i * Math.PI) / 30)) * 100) / 100;
    });

    const newSite: LandingSite = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      category: 'Custom',
      lat: Number(lat),
      lon: Number(lon),
      elevationKm: Number(elevationKm),
      description: `User-defined site at ${Math.abs(lat).toFixed(2)}° ${lat < 0 ? 'S' : 'N'}, ${Math.abs(lon).toFixed(2)}° ${lon < 0 ? 'W' : 'E'}.`,
      lightingConditions: 'Custom calculated ephemeris.',
      communicationConditions: 'Custom line-of-sight analysis.',
      scienceTarget: 'User-specified lunar exploration target.',
      isApproximateTerrain: horizonProfile === null,
      horizonProfile: profile
    };

    onAddCustomSite(newSite);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-space-900 border border-slate-200 dark:border-space-700 shadow-2xl p-6 text-slate-800 dark:text-slate-100 text-xs select-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-space-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Add Custom Landing Site
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Specify lunar coordinates or import custom LOLA 360° horizon JSON.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-space-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Site Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Connecting Ridge Crest Alpha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-space-800 border border-slate-200 dark:border-space-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Latitude (deg)
              </label>
              <input
                type="number"
                step="0.01"
                min="-90"
                max="90"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value))}
                className="w-full p-2 text-xs font-mono font-semibold rounded-xl bg-slate-50 dark:bg-space-800 border border-slate-200 dark:border-space-700 text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">South is negative</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Longitude (deg)
              </label>
              <input
                type="number"
                step="0.01"
                min="-180"
                max="360"
                value={lon}
                onChange={(e) => setLon(parseFloat(e.target.value))}
                className="w-full p-2 text-xs font-mono font-semibold rounded-xl bg-slate-50 dark:bg-space-800 border border-slate-200 dark:border-space-700 text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">East is positive</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Elevation (km)
              </label>
              <input
                type="number"
                step="0.1"
                value={elevationKm}
                onChange={(e) => setElevationKm(parseFloat(e.target.value))}
                className="w-full p-2 text-xs font-mono font-semibold rounded-xl bg-slate-50 dark:bg-space-800 border border-slate-200 dark:border-space-700 text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Rel to 1737.4 km</span>
            </div>
          </div>

          {/* LOLA Horizon JSON File Upload */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Load LOLA Horizon Profile (Optional JSON)
            </label>
            <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-space-700 bg-slate-50 dark:bg-space-800 flex flex-col items-center justify-center gap-1.5 text-center">
              <Upload className="w-5 h-5 text-slate-400" />
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
              />
              {fileName ? (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Loaded {fileName} (360 azimuth bins)</span>
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">
                  JSON array of 360 numbers (degrees). If omitted, a synthetic horizon is generated.
                </span>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-space-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-space-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-space-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20"
            >
              Add Site & Calculate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
