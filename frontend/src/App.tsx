import React, { useState } from 'react';
import { 
  Compass, 
  Ruler, 
  Upload, 
  Maximize, 
  Eye, 
  Layers, 
  DraftingCompass,
  ArrowRight,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';

const BlueprintBox = ({ title, children, className = "" }: { title?: string, children: React.ReactNode, className?: string }) => (
  <div className={`border-2 border-white/80 p-6 relative group ${className}`}>
    {title && (
      <div className="absolute -top-4 left-4 bg-[#0a2e5c] px-2 py-0.5 text-sm uppercase tracking-widest border border-white/40">
        {title}
      </div>
    )}
    {/* Corner marks */}
    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white"></div>
    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white"></div>
    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white"></div>
    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white"></div>
    {children}
  </div>
);

const SpecField = ({ label, value, unit, description }: { label: string, value: string | number, unit?: string, description?: string }) => (
  <div className="mb-4 relative">
    <div className="flex justify-between items-baseline mb-1 border-b border-dashed border-white/30 pb-1">
      <span className="text-xs uppercase opacity-70 tracking-tighter">{label}</span>
      <span className="text-xl">
        {value}
        {unit && <span className="text-xs ml-0.5 opacity-60 uppercase">{unit}</span>}
      </span>
    </div>
    {description && <div className="text-[10px] opacity-50 italic text-right leading-tight">{description}</div>}
  </div>
);

const DimensionLine = ({ label, className = "" }: { label: string, className?: string }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="h-px bg-white/40 flex-1 relative">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rotate-45"></div>
    </div>
    <span className="text-[10px] uppercase whitespace-nowrap opacity-80">{label}</span>
    <div className="h-px bg-white/40 flex-1 relative">
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rotate-45"></div>
    </div>
  </div>
);

export default function App() {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  return (
    <div className="min-h-screen p-8 md:p-12 lg:p-16 flex flex-col font-draft selection:bg-white selection:text-blue-900">
      {/* Header Section */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="relative">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <DraftingCompass className="w-12 h-12 text-white" strokeWidth={1.5} />
            <div>
              <h1 className="text-4xl md:text-5xl uppercase tracking-tighter leading-none mb-1">
                Spatial Optician
              </h1>
              <p className="text-sm opacity-60 uppercase tracking-[0.2em]">
                V.2.04 / Architectural Visual Analysis
              </p>
            </div>
          </motion.div>
          <div className="h-0.5 w-full bg-white/80 mt-4 relative">
             <div className="absolute -right-1 -top-1 w-2.5 h-2.5 bg-white rotate-45"></div>
          </div>
        </div>

        <div className="flex gap-4 items-center">
           <BlueprintBox className="p-3 bg-white/5 border-dashed">
             <div className="flex gap-4 text-xs uppercase tracking-widest opacity-80">
               <div className="flex items-center gap-1"><Compass size={14} /> 40.7128°N</div>
               <div className="flex items-center gap-1"><Maximize size={14} /> 74.0060°W</div>
             </div>
           </BlueprintBox>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input and Specs */}
        <div className="lg:col-span-4 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <BlueprintBox title="Technical Specification" className="h-full">
              <SpecField 
                label="Site Reference" 
                value="NY-HUD-01" 
                description="Project baseline grid identification"
              />
              <SpecField 
                label="Calibration Date" 
                value="25.05.2026" 
                description="Last astronomical alignment check"
              />
              <SpecField 
                label="Optical Scale" 
                value="1:500" 
                unit="mm"
                description="Calculated based on detected depth buffer"
              />
              
              <div className="mt-8 pt-8 border-t border-white/20">
                <h3 className="text-xs uppercase tracking-[0.3em] mb-4 opacity-50">Project Metadata</h3>
                <div className="grid grid-cols-2 gap-4 text-[10px] uppercase opacity-70">
                  <div className="border border-white/20 p-2">Drawn By: AGENT_SYSTEM</div>
                  <div className="border border-white/20 p-2">Check By: AI_CORE_01</div>
                </div>
              </div>
            </BlueprintBox>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <BlueprintBox title="Environmental Factors">
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase">Diffusion Coefficient</span>
                  <div className="flex-1 mx-4 h-px border-b border-dotted border-white/40"></div>
                  <span className="text-sm">0.842</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase">Rayleigh Scattering</span>
                  <div className="flex-1 mx-4 h-px border-b border-dotted border-white/40"></div>
                  <span className="text-sm">λ-4 η</span>
                </div>
              </div>
            </BlueprintBox>
          </motion.div>
        </div>

        {/* Center Column: Photo Upload Area */}
        <div className="lg:col-span-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="h-full"
          >
            <div 
              onDragEnter={handleDrag} 
              onDragLeave={handleDrag} 
              onDragOver={handleDrag}
              className={`h-full border-2 border-dashed border-white/40 bg-white/5 relative flex flex-col items-center justify-center p-12 transition-all duration-300 ${dragActive ? 'bg-white/10 scale-[1.01]' : ''}`}
            >
              {/* Corner brackets */}
              <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-white/60"></div>
              <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-white/60"></div>
              <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-white/60"></div>
              <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-white/60"></div>

              {/* Crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none opacity-40">
                <div className="absolute top-1/2 left-0 w-full h-px bg-white"></div>
                <div className="absolute top-0 left-1/2 w-px h-full bg-white"></div>
              </div>

              <div className="text-center group cursor-pointer">
                <div className="mb-6 relative inline-block">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="p-8 border border-white bg-[#0a2e5c]"
                  >
                    <Upload className="w-12 h-12 text-white" />
                  </motion.div>
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-white"></div>
                </div>
                <h2 className="text-2xl uppercase tracking-tighter mb-2">Photo Upload Area</h2>
                <p className="text-xs opacity-50 uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">
                  Drop architectural scan or site photo for depth extraction
                </p>
                
                <div className="mt-8 inline-flex items-center gap-2 text-xs border border-white/40 px-4 py-2 hover:bg-white hover:text-blue-900 transition-colors uppercase tracking-widest">
                  Browse Files <ArrowRight size={14} />
                </div>
              </div>

              {/* Specs at bottom of upload area */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between text-[8px] uppercase tracking-widest opacity-40">
                <span>BUFFER_STATUS: READY</span>
                <span>ENC: RSA-4096 / AUTH_SYSTEM_V2</span>
              </div>
            </div>
            
            <DimensionLine label="420mm x 297mm (A3 Standard)" className="mt-4" />
          </motion.div>
        </div>

        {/* Right Column: Data Displays (Lux, ROI) */}
        <div className="lg:col-span-3 space-y-8">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <BlueprintBox title="Luminous Flux Data">
              <div className="py-2">
                <div className="text-center mb-6">
                  <div className="text-[10px] uppercase opacity-50 mb-1">Current Lux Deficit</div>
                  <div className="text-6xl font-light tracking-tighter">-1.24</div>
                  <div className="text-[10px] uppercase opacity-50">Lumens / M²</div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-full bg-white/10 h-6 border border-white/20 relative overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '65%' }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-white/40 border-r border-white"
                      ></motion.div>
                      <div className="absolute inset-0 flex items-center px-2 text-[10px] uppercase mix-blend-difference">Intake Threshold</div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 p-3 text-[10px] leading-tight border-l-2 border-white uppercase flex gap-3">
                    <Info size={16} className="shrink-0" />
                    <span>Warning: Threshold suggests high optical variance in Section B-14. Recommend re-alignment.</span>
                  </div>
                </div>
              </div>
            </BlueprintBox>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <BlueprintBox title="Return on Investment">
              <div className="py-2 text-center">
                <div className="text-5xl tracking-tighter mb-1 mt-2">
                  <span className="text-2xl mr-1 opacity-50">+</span>
                  18.4
                  <span className="text-lg ml-1 opacity-60">%</span>
                </div>
                <div className="text-[10px] uppercase opacity-50 mb-6">Projected Spatial Efficiency</div>
                
                <div className="flex gap-1 justify-center h-12 items-end">
                  {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: 0.6 + (i * 0.05), duration: 0.5 }}
                      className="w-full max-w-[8px] bg-white/40 border border-white/20"
                    />
                  ))}
                </div>
              </div>
            </BlueprintBox>
          </motion.div>

          <div className="hidden lg:block pt-4">
             <div className="border-t-2 border-white/80 pt-4 opacity-40">
               <div className="flex justify-between items-center text-[10px] uppercase tracking-widest mb-1">
                 <span>Sheet No: A-101</span>
                 <span className="flex items-center gap-1"><Layers size={10} /> LAYER: 03_ANALYSIS</span>
               </div>
               <div className="flex justify-between items-center text-[10px] uppercase tracking-widest">
                 <span>Scale: AS NOTED</span>
                 <span className="flex items-center gap-1"><Ruler size={10} /> UNITS: METRIC</span>
               </div>
             </div>
          </div>
        </div>

      </main>

      {/* Floating System Notice (Work in Progress) */}
      <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-50">
        <div className="bg-[#0a2e5c]/85 border-2 border-white/80 p-5 relative backdrop-blur-xl shadow-2xl blueprint-border">
          {/* Corner marks */}
          <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white"></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white"></div>
          <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white"></div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white"></div>
          
          <div className="flex gap-4 items-start">
            <div className="shrink-0 w-8 h-8 rounded-full border border-white/40 flex items-center justify-center bg-white/10 text-white animate-pulse">
              <Info size={16} />
            </div>
            <div className="text-left">
              <h4 className="text-xs uppercase tracking-[0.2em] font-bold mb-1 flex items-center gap-2">
                System Status <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping"></span>
              </h4>
              <p className="text-[11px] leading-relaxed uppercase opacity-85">
                Notice: Spatial Optician systems are currently undergoing architectural updates and calibration. Localized depth buffer disturbances may occur.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="mt-16 pt-8 border-t border-white/20 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-[0.4em] opacity-40">
        <div className="flex gap-8">
           <span>Architectural Systems Group</span>
           <span>Spatial Dynamics Division</span>
        </div>
        <div className="flex items-center gap-2">
          <Eye size={12} /> Real-time Simulation Active
        </div>
      </footer>
    </div>
  );
}
