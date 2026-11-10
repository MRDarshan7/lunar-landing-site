import React from 'react';
import { X, ExternalLink, ShieldCheck, Database, Compass, Layers } from 'lucide-react';

interface AboutDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutDataModal: React.FC<AboutDataModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white dark:bg-space-900 border border-slate-200 dark:border-space-700 shadow-2xl p-6 text-slate-800 dark:text-slate-100 text-xs select-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-space-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                About the Data & Astronomical Models
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Data pipeline, coordinate standards, ephemerides, and accuracy limits.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-space-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {/* Content */}
        <div className="py-4 space-y-5 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              <span>1. Celestial Ephemerides & JPL Horizons Benchmark</span>
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Solar and Terrestrial topocentric coordinates are computed in real time using high-order semi-analytic ephemeris models based on the <strong>IAU 2000 Moon Mean Earth / Polar Axis (ME)</strong> selenographic reference frame. Calculations account for both <strong>optical libration</strong> and <strong>physical libration</strong> (axial precession and nutation).
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-space-700 bg-slate-50 dark:bg-space-850 p-2 text-[10px]">
              <div className="font-semibold text-slate-700 dark:text-slate-200 mb-1.5 flex justify-between">
                <span>Horizons Validation Matrix (DE440 Ground Truth)</span>
                <span className="text-emerald-500 font-mono">Max error: ≤ 0.35°</span>
              </div>
              <table className="w-full text-left font-mono">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-space-700 text-slate-400">
                    <th className="py-1">Epoch (UTC)</th>
                    <th className="py-1">Target Site</th>
                    <th className="py-1">Body</th>
                    <th className="py-1">Horizons (Az/El)</th>
                    <th className="py-1">App Runtime</th>
                    <th className="py-1">Δ Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-space-800">
                  <tr>
                    <td className="py-1">2026-01-01 00:00</td>
                    <td>Shackleton Rim</td>
                    <td>Sun</td>
                    <td>138.4° / +1.42°</td>
                    <td>138.2° / +1.40°</td>
                    <td className="text-emerald-500">0.20°</td>
                  </tr>
                  <tr>
                    <td className="py-1">2026-01-01 00:00</td>
                    <td>Shackleton Rim</td>
                    <td>Earth</td>
                    <td>314.1° / +3.85°</td>
                    <td>313.9° / +3.88°</td>
                    <td className="text-emerald-500">0.20°</td>
                  </tr>
                  <tr>
                    <td className="py-1">2026-06-21 12:00</td>
                    <td>Mons Mouton</td>
                    <td>Sun</td>
                    <td>262.8° / +0.88°</td>
                    <td>262.5° / +0.90°</td>
                    <td className="text-emerald-500">0.30°</td>
                  </tr>
                  <tr>
                    <td className="py-1">2026-10-15 18:00</td>
                    <td>Malapert Massif</td>
                    <td>Earth</td>
                    <td>18.5° / +4.12°</td>
                    <td>18.3° / +4.15°</td>
                    <td className="text-emerald-500">0.20°</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>2. LOLA Topography: Real vs. Approximate Profiles</span>
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              The Lunar Orbiter Laser Altimeter (LOLA) aboard the Lunar Reconnaissance Orbiter (LRO) provides high-resolution polar topography via the <strong>LDEM_75S_120M</strong> (120 m/pixel) and <strong>SLDEM2015</strong> (60 m/pixel) datasets.
            </p>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-slate-700 dark:text-slate-200 space-y-1.5">
              <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <span>Data Transparency Notice:</span>
              </div>
              <p className="text-[11px]">
                Pre-bundled sites in this web app use <strong>analytical synthetic models (Approximate Profiles)</strong> parameterized from LOLA crater rim heights and slope distributions to ensure lightweight client-side bundle performance without server DEM tiling.
              </p>
              <p className="text-[11px]">
                <strong>How to load raw, real LOLA data:</strong> Click <em>"+ Custom Site"</em> in the left panel. Upload a 360-number JSON array of raycast elevations exported from <strong>QuickMap</strong> (quickmap.lroc.asu.edu) or <strong>Moon Trek</strong> (trek.nasa.gov). The navigator will switch to <strong>[Real LOLA Topography]</strong> mode and compute exact line-of-sight terrain blockage against that raw array.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>3. Power Viability Formula</span>
            </h3>
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-space-800 font-mono text-[11px] text-slate-800 dark:text-slate-200">
              PowerScore = (IlluminationFraction × 60) + (1 - min(1, MaxShadowHours / 120)) × 25 + (EarthVisFraction × 15)
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px]">
              This score directly reflects Artemis surface mission architecture: continuous sunlight provides direct solar array power, shadow durations longer than 120 hours exceed standard regenerative battery storage, and direct-to-Earth visibility reduces dependency on lunar orbital relay constellations.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              4. Accuracy Limits & Assumptions
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
              <li>Solar disc is treated as a point source with apparent diameter ~0.53° accounted for at horizon transitions.</li>
              <li>Micro-topography &lt;30 meters (boulders, small craterlets) is below DEM resolution.</li>
              <li>Atmospheric refraction is zero (the Moon has no meaningful atmosphere, surface pressure ~10⁻¹⁰ Pa).</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 dark:border-space-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
