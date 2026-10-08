/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  FileText, 
  Code, 
  Play, 
  RefreshCw, 
  Maximize2, 
  X, 
  Check, 
  Compass, 
  Apple, 
  ShieldAlert, 
  TreePine,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export default function App() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [activeFile, setActiveFile] = useState<'game.js' | 'style.css' | 'index.html' | 'README.md'>('game.js');
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load standalone files for in-browser inspector
  useEffect(() => {
    const files = ['/game.js', '/style.css', '/standalone.html', '/README.md'];
    Promise.all(files.map(f => fetch(f).then(r => r.text())))
      .then(([game, style, html, readme]) => {
        setFileContents({
          'game.js': game,
          'style.css': style,
          'index.html': html,
          'README.md': readme
        });
      })
      .catch(console.error);
  }, []);

  // Forward keyboard events to iframe so controls respond instantly without requiring iframe focus click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showDocs || showFiles) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'Enter'].includes(e.code)) {
        if (iframeRef.current?.contentWindow) {
          const evt = new KeyboardEvent('keydown', {
            code: e.code,
            key: e.key,
            bubbles: true,
            cancelable: true
          });
          iframeRef.current.contentWindow.dispatchEvent(evt);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (showDocs || showFiles) return;
      if (iframeRef.current?.contentWindow) {
        const evt = new KeyboardEvent('keyup', {
          code: e.code,
          key: e.key,
          bubbles: true,
          cancelable: true
        });
        iframeRef.current.contentWindow.dispatchEvent(evt);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [showDocs, showFiles]);

  const handleRestart = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        // Trigger exposed reset or reload
        const win = iframeRef.current.contentWindow as any;
        if (typeof win.__snakeReset === 'function') {
          win.__snakeReset();
        } else {
          iframeRef.current.src = '/standalone.html';
        }
      } catch {
        iframeRef.current.src = '/standalone.html';
      }
    }
  };

  const handleDownloadZip = () => {
    setDownloading(true);
    const link = document.createElement('a');
    link.href = '/snake_game_realistic_v5.zip';
    link.download = 'snake_game_realistic_v5.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 1500);
  };

  const handleSendVirtualKey = (code: string, isDown: boolean) => {
    if (!iframeRef.current?.contentWindow) return;
    const type = isDown ? 'keydown' : 'keyup';
    const evt = new KeyboardEvent(type, { code, key: code, bubbles: true });
    iframeRef.current.contentWindow.dispatchEvent(evt);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Application Bar */}
      <header className="h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <TreePine className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide text-slate-100 flex items-center gap-2">
                Realistic 3D Chaser Snake
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  v5 Wildlife Edition
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Endless procedural world &bull; Organic serpent physics &bull; Wild forage
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDocs(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition"
            title="View Changelog & Guide"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Guide &amp; Specs</span>
          </button>

          <button
            onClick={() => setShowFiles(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition"
            title="View Source Files"
          >
            <Code className="w-3.5 h-3.5 text-purple-400" />
            <span>Source Code</span>
          </button>

          <button
            onClick={handleRestart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition"
            title="Reset Game"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Restart</span>
          </button>

          {/* Primary Download ZIP Button */}
          <button
            onClick={handleDownloadZip}
            disabled={downloading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 border border-emerald-400/30 shadow-sm shadow-emerald-950/50 transition cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? 'Preparing ZIP...' : 'Download ZIP Package'}</span>
          </button>
        </div>
      </header>

      {/* Main Interactive Game Container */}
      <main className="relative flex-1 w-full h-full overflow-hidden bg-slate-900">
        <iframe
          ref={iframeRef}
          src="/standalone.html"
          title="Realistic 3D Snake Game"
          className="w-full h-full border-none outline-none block"
          tabIndex={0}
        />

        {/* Mobile / Touch On-Screen Controls Overlay */}
        <div className="absolute bottom-6 left-6 flex gap-3 pointer-events-auto md:opacity-40 hover:opacity-100 transition z-20">
          <button
            onMouseDown={() => handleSendVirtualKey('ArrowLeft', true)}
            onMouseUp={() => handleSendVirtualKey('ArrowLeft', false)}
            onTouchStart={() => handleSendVirtualKey('ArrowLeft', true)}
            onTouchEnd={() => handleSendVirtualKey('ArrowLeft', false)}
            className="w-12 h-12 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-white font-bold flex items-center justify-center active:bg-emerald-600 transition shadow-lg"
          >
            &larr;
          </button>
          <button
            onMouseDown={() => handleSendVirtualKey('ArrowRight', true)}
            onMouseUp={() => handleSendVirtualKey('ArrowRight', false)}
            onTouchStart={() => handleSendVirtualKey('ArrowRight', true)}
            onTouchEnd={() => handleSendVirtualKey('ArrowRight', false)}
            className="w-12 h-12 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-white font-bold flex items-center justify-center active:bg-emerald-600 transition shadow-lg"
          >
            &rarr;
          </button>
        </div>

        <div className="absolute bottom-6 right-6 flex gap-3 pointer-events-auto md:opacity-40 hover:opacity-100 transition z-20">
          <button
            onMouseDown={() => handleSendVirtualKey('ArrowDown', true)}
            onMouseUp={() => handleSendVirtualKey('ArrowDown', false)}
            onTouchStart={() => handleSendVirtualKey('ArrowDown', true)}
            onTouchEnd={() => handleSendVirtualKey('ArrowDown', false)}
            className="px-4 h-12 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-white font-semibold text-xs flex items-center justify-center active:bg-amber-600 transition shadow-lg"
          >
            SLOW (S)
          </button>
          <button
            onMouseDown={() => handleSendVirtualKey('ArrowUp', true)}
            onMouseUp={() => handleSendVirtualKey('ArrowUp', false)}
            onTouchStart={() => handleSendVirtualKey('ArrowUp', true)}
            onTouchEnd={() => handleSendVirtualKey('ArrowUp', false)}
            className="px-4 h-12 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-white font-semibold text-xs flex items-center justify-center active:bg-emerald-600 transition shadow-lg"
          >
            BOOST (W)
          </button>
        </div>
      </main>

      {/* Guide & Documentation Modal */}
      {showDocs && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h2 className="font-bold text-base text-white">v5 Upgrade Specs &amp; Documentation</h2>
              </div>
              <button 
                onClick={() => setShowDocs(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-300 leading-relaxed">
              <section className="space-y-2">
                <h3 className="font-semibold text-white text-base flex items-center gap-2">
                  <Apple className="w-4 h-4 text-red-400" />
                  1. Crystals Replaced by Varied Wild Foods
                </h3>
                <p>
                  All arcade crystal pickups have been removed. The terrain is now naturally populated with varied forage items, each with 3D models and realistic textures:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    <span className="font-bold text-red-400 block mb-0.5">Orchard Apple (+10 pts)</span>
                    Primary growth food. Classic red apple with wood stem and leaf. Increases snake length by 1.
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    <span className="font-bold text-amber-400 block mb-0.5">Wild Red Apple (+15 pts)</span>
                    Fresh wild apple found across meadows and groves.
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    <span className="font-bold text-orange-300 block mb-0.5">Forest Mushroom (+30 pts)</span>
                    Boletus mushroom with a domed chestnut cap and pale stalk.
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    <span className="font-bold text-purple-400 block mb-0.5">Wild Berries (+45 pts)</span>
                    Plump cluster of glossy forest blackberries.
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 col-span-2">
                    <span className="font-bold text-yellow-400 block mb-0.5">Golden Apple (+90 pts)</span>
                    Rare high-value golden fruit with warm earthen sheen (replaces rare gold crystal).
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-white text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  2. Realistic 3D Serpent &amp; Movement
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
                  <li><strong>Natural Viper Anatomy:</strong> Slender triangular skull, tapered snout, reptilian golden irises with vertical slit pupils, and forked tongue. Cartoon pink cones and spots removed.</li>
                  <li><strong>Procedural Scale Bumps:</strong> Procedural diamond/hex scale bump mapping for natural specular highlights and reptilian sheen.</li>
                  <li><strong>Connected Movement:</strong> Segments orient along spine tangents with tapered ellipsoid proportions, overlapping naturally into a continuous muscular serpent.</li>
                  <li><strong>Natural Sunlight &amp; Shadows:</strong> Warm directional sunlight, balanced sky/earth hemisphere bounce, and PCF soft shadow maps.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-white text-base flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-400" />
                  3. Optimized UI &amp; Radar Minimap
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
                  <li><strong>Frosted-Glass HUD:</strong> High-contrast badges for Score, Length, and Food with crisp icons.</li>
                  <li><strong>Radar Minimap:</strong> Circular compass displaying player heading, obstacles, and color-coded forage items.</li>
                  <li><strong>Forage &amp; Terrain Legend:</strong> Clean reference guide for items and zone slowdown penalties (Swamp -50%, Tall Grass -40%, Rocky -35%).</li>
                </ul>
              </section>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-between">
              <span className="text-xs text-slate-400">All crystal references removed across code, UI, and docs.</span>
              <button
                onClick={handleDownloadZip}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download Zip Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Source Code Viewer Modal */}
      {showFiles && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-850">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-sm text-white">ZIP Archive File Inspector</span>
              </div>
              <div className="flex items-center gap-2">
                {(['game.js', 'style.css', 'index.html', 'README.md'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFile(f)}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition ${
                      activeFile === f
                        ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
                <button 
                  onClick={() => setShowFiles(false)}
                  className="p-1 ml-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-300">
              <pre className="whitespace-pre-wrap select-text">
                {fileContents[activeFile] || 'Loading file content...'}
              </pre>
            </div>

            <div className="p-3 border-t border-slate-800 bg-slate-850 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                {activeFile} &bull; {fileContents[activeFile]?.length || 0} characters
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(fileContents[activeFile] || '');
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy File Content'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
