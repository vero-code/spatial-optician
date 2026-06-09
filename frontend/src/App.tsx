import React, { useState, useRef } from 'react';
import { 
  Compass, 
  Ruler, 
  Upload, 
  Maximize, 
  Eye, 
  Layers, 
  DraftingCompass,
  ArrowRight,
  Info,
  Bot
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

const Skeleton = ({ className = "" }: { className?: string, key?: React.Key }) => (
  <span className={`animate-pulse bg-white/10 inline-block rounded-sm ${className}`} style={{ minHeight: '1em' }} />
);

const SpecField = ({ label, value, unit, description }: { label: string, value: React.ReactNode, unit?: string, description?: string }) => (
  <div className="mb-4 relative">
    <div className="flex justify-between items-baseline mb-1 border-b border-dashed border-white/30 pb-1">
      <span className="text-xs uppercase opacity-70 tracking-tighter">{label}</span>
      <span className="text-xl">
        {value}
        {unit && <span className="text-xs ml-0.5 opacity-60 uppercase">{unit}</span>}
      </span>
    </div>
    {description && <div className="text-xs opacity-50 italic text-right leading-tight">{description}</div>}
  </div>
);

const DimensionLine = ({ label, className = "" }: { label: string, className?: string }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="h-px bg-white/40 flex-1 relative">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rotate-45"></div>
    </div>
    <span className="text-xs uppercase whitespace-nowrap opacity-80">{label}</span>
    <div className="h-px bg-white/40 flex-1 relative">
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rotate-45"></div>
    </div>
  </div>
);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

const parseBoldText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const formatReportText = (text: string) => {
  if (!text) return null;
  
  // Split by newlines, handling both \r\n and \n
  const lines = text.split(/\r?\n/);
  
  return lines.map((line, index) => {
    const trimmed = line.trim();
    
    // Skip empty lines, but render spacing
    if (trimmed === '') {
      return <div key={index} className="h-3" />;
    }
    
    // 1. Check for horizontal rules
    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      return <hr key={index} className="border-t border-white/20 my-4" />;
    }

    // 2. Check for Headers
    const headerMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const titleText = headerMatch[2];
      const content = parseBoldText(titleText);
      
      if (level === 1) {
        return (
          <h2 key={index} className="text-sm font-bold uppercase tracking-[0.2em] text-white mt-6 mb-3 border-b border-white/30 pb-1.5 flex items-center gap-2 font-mono">
            <span className="w-1.5 h-3 bg-white shrink-0"></span>
            {content}
          </h2>
        );
      } else if (level === 2) {
        return (
          <h3 key={index} className="text-xs font-bold uppercase tracking-[0.15em] text-white/90 mt-5 mb-2 border-b border-white/15 pb-1 flex items-center gap-1.5 font-mono">
            <span className="w-1 h-2.5 bg-white/60 shrink-0"></span>
            {content}
          </h3>
        );
      } else {
        return (
          <h4 key={index} className="text-[11px] font-bold uppercase tracking-wider text-white/80 mt-4 mb-2 font-mono">
            {content}
          </h4>
        );
      }
    }

    // 3. Check for Bullet List Items
    const listMatch = trimmed.match(/^([*\-•+])\s+(.*)$/);
    if (listMatch) {
      const bulletContent = listMatch[2];
      // Skip empty bullet items
      if (bulletContent.trim() === '' || bulletContent.trim() === '---' || bulletContent.trim() === '--') {
        return null;
      }
      const content = parseBoldText(bulletContent);
      return (
        <div key={index} className="flex gap-2 items-start ml-4 my-1.5">
          <span className="text-white/60 mt-1.5 shrink-0 text-[8px]">▪</span>
          <span className="text-xs tracking-wide text-white/80 leading-relaxed font-sans">{content}</span>
        </div>
      );
    }

    // 4. Regular Paragraph
    const content = parseBoldText(trimmed);
    return (
      <p key={index} className="text-xs tracking-wide text-white/80 leading-relaxed my-1.5 font-sans">
        {content}
      </p>
    );
  });
};

export default function App() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageResolution, setImageResolution] = useState<{ width: number; height: number } | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [spatialData, setSpatialData] = useState<{
    site_reference: string;
    calibration_date: string;
    optical_scale: string;
    diffusion_coefficient: number;
    rayleigh_scattering: string;
    lux_deficit: number;
    spatial_efficiency: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsZoomed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // MCP Integration States
  const [activeTab, setActiveTab] = useState<'report' | 'catalog' | 'roi'>('report');
  const [catalogResult, setCatalogResult] = useState<string | null>(null);
  const [roiResult, setRoiResult] = useState<string | null>(null);

  const [isQueryingCatalog, setIsQueryingCatalog] = useState(false);
  const [isCalculatingRoi, setIsCalculatingRoi] = useState(false);
  const [isSavingAudit, setIsSavingAudit] = useState(false);
  const [auditSaveStatus, setAuditSaveStatus] = useState<{success: boolean, text: string, fullMessage?: string} | null>(null);
  const [showAuditDetails, setShowAuditDetails] = useState(false);

  const startNewRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    return controller.signal;
  };

  const handleCancelRequest = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setAnalysisError('ERROR: Unsupported file format. Please upload an image file (JPG, PNG, WEBP, etc.).');
      setAnalysisResult(null);
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setUploadedImage(dataUrl);
      const img = new Image();
      img.onload = () => {
        setImageResolution({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);

    setIsAnalyzingImage(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setSpatialData(null);

    // Reset MCP States for new scan
    setActiveTab('report');
    setCatalogResult(null);
    setRoiResult(null);
    setAuditSaveStatus(null);

    const signal = startNewRequest();

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Call both endpoints in parallel
      const [resVision, resSpatial] = await Promise.all([
        fetch(`${BACKEND_URL}/api/analyze-image`, {
          method: 'POST',
          body: formData,
          signal,
        }),
        fetch(`${BACKEND_URL}/api/analyze`, {
          method: 'POST',
          body: formData,
          signal,
        })
      ]);

      if (!resVision.ok) {
        const errData = await resVision.json();
        throw new Error(errData.detail || 'Vision analysis failed');
      }
      if (!resSpatial.ok) {
        const errData = await resSpatial.json();
        throw new Error(errData.detail || 'Spatial metrics extraction failed');
      }

      const visionData = await resVision.json();
      const spatialDataResult = await resSpatial.json();

      setAnalysisResult(visionData.description);
      setSpatialData(spatialDataResult);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setAnalysisError('VISION ANALYSIS CANCELLED BY USER.');
      } else {
        setAnalysisError(`VISION ERROR: ${err.message || 'FAILED TO CONNECT TO ANALYSIS AGENT'}`);
      }
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleQueryCatalog = async () => {
    if (!analysisResult) return;
    setIsQueryingCatalog(true);
    setAnalysisError(null);
    setCatalogResult(null);
    setActiveTab('catalog');
    const signal = startNewRequest();
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          session_id: "catalog-query",
          message: `Based on the following audit description: "${analysisResult}", use the MCP tools (such as query_documents or get_schema) to search the 'equipment_catalog' collection in the database. Find fixtures that are suitable for this facility type (site reference: "${spatialData?.site_reference || 'NY-HUD-01 (Hudson Logistics Hub)'}"). If no suitable fixtures for this facility type exist in the database catalog, use your Google search tool to find a real, commercially available LED fixture model for this use-case on the web, extract its technical details, and use the insert_document MCP tool to write it to the 'equipment_catalog' collection in MongoDB so it is saved for future calculations. Then report back the recommended models, listing their brand, model_id, power, luminous flux, and unit cost. Format the output with clear headers and bullet points.`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to query catalog");
      if (!data.message || data.message === "No response from agent.") {
        throw new Error("Agent returned no results. The MCP database connection may be unavailable.");
      }
      setCatalogResult(data.message);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setAnalysisError('CATALOG QUERY CANCELLED BY USER.');
      } else {
        setAnalysisError(`CATALOG ERROR: ${err.message || 'FAILED TO QUERY MCP DATABASE'}`);
      }
      setActiveTab('report');
    } finally {
      setIsQueryingCatalog(false);
    }
  };

  const handleCalculateRoi = async () => {
    if (!analysisResult) return;
    setIsCalculatingRoi(true);
    setAnalysisError(null);
    setRoiResult(null);
    setActiveTab('roi');
    const signal = startNewRequest();
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          session_id: "roi-query",
          message: `Based on this audit description: "${analysisResult}" and the site reference "${spatialData?.site_reference || 'NY-HUD-01'}", calculate the financial ROI and energy savings for upgrading the current lighting to the recommended LED fixtures in our catalog. Determine the geographic region (e.g. 'US-NY' for site references starting with 'NY') and query the 'energy_tariffs' collection in the database via MCP to find the electricity rates. Perform the calculations: current power draw vs proposed, annual cost savings, and payback period. Show your work, including database query results.`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to calculate ROI");
      if (!data.message || data.message === "No response from agent.") {
        throw new Error("Agent returned no results. The MCP database connection may be unavailable.");
      }
      setRoiResult(data.message);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setAnalysisError('ROI CALCULATION CANCELLED BY USER.');
      } else {
        setAnalysisError(`ROI ERROR: ${err.message || 'FAILED TO CALCULATE ENERGY SAVINGS'}`);
      }
      setActiveTab('report');
    } finally {
      setIsCalculatingRoi(false);
    }
  };

  const handleSaveAudit = async () => {
    if (!analysisResult) return;
    setIsSavingAudit(true);
    setAuditSaveStatus(null);
    setShowAuditDetails(false);
    setAnalysisError(null);
    const signal = startNewRequest();
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          session_id: "save-audit",
          message: `Please record this audit findings into the 'audit_history' collection in MongoDB using the insert_document MCP tool. Based on the audit description: "${analysisResult}" and the spatial data parameters (site reference: "${spatialData?.site_reference || 'NY-HUD-01 (Hudson Logistics Hub)'}", lux deficit: ${spatialData?.lux_deficit || -1.0}, spatial efficiency: ${spatialData?.spatial_efficiency || 15}%), dynamically determine appropriate values for: facility_type (e.g., 'office', 'residential', 'warehouse'), total_area_sqm (estimate a realistic size, e.g. ~50 sqm for a small office, ~30 sqm for a living room, ~2500 sqm for a large warehouse), ceiling_height_meters, measured_average_lux, target_required_lux, lux_deficit, current_lighting_type, current_estimated_power_kw, recommended_fixture_id, recommended_quantity, status (set to 'Needs Upgrade'), and created_at (set to the current ISO timestamp: '${new Date().toISOString()}'). Do not use hardcoded dimensions unless they match the analyzed space type. Output the confirmation with the exact insertedId returned by the database.`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to save audit");
      
      const idMatch = data.message.match(/[a-f\d]{24}/i);
      const insertedId = idMatch ? idMatch[0] : null;

      setAuditSaveStatus({
        success: true,
        text: insertedId 
          ? `Audit Saved Successfully. Registered ID: ${insertedId}`
          : 'Audit Saved Successfully to Database.',
        fullMessage: data.message
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setAuditSaveStatus({
          success: false,
          text: 'SAVE AUDIT CANCELLED BY USER.'
        });
      } else {
        setAuditSaveStatus({
          success: false,
          text: `Error saving: ${err.message}`
        });
      }
    } finally {
      setIsSavingAudit(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
    e.target.value = '';
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm("Are you sure you want to delete the uploaded image and clear all analysis data?");
    if (confirmed) {
      setUploadedImage(null);
      setImageResolution(null);
      setAnalysisResult(null);
      setAnalysisError(null);
      setCatalogResult(null);
      setRoiResult(null);
      setAuditSaveStatus(null);
      setSpatialData(null);
      setActiveTab('report');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
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
                Architectural Visual Analysis
              </p>
            </div>
          </motion.div>
          <div className="h-0.5 w-full bg-white/80 mt-4 relative">
             <div className="absolute -right-1 -top-1 w-2.5 h-2.5 bg-white rotate-45"></div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-end">
           <BlueprintBox className="p-3 bg-emerald-950/20 border-dashed border-emerald-500/50 flex items-center gap-3">
             <svg className="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 32 32" fill="currentColor">
               <path d="M16 2C16 2 9 8 9 16C9 23 14 28 16 30C18 28 23 23 23 16C23 8 16 2 16 2ZM16 26C16 26 13.5 22.5 13.5 16C13.5 10.5 16 7 16 7C16 7 18.5 10.5 18.5 16C18.5 22.5 16 26 16 26Z"/>
             </svg>
             <div className="text-xs uppercase tracking-widest text-emerald-300 font-mono leading-none">
               Supported by <span className="font-bold text-white whitespace-nowrap">MongoDB for Startups</span>
             </div>
           </BlueprintBox>

           {/* <BlueprintBox className="p-3 bg-white/5 border-dashed">
             <div className="flex gap-4 text-xs uppercase tracking-widest opacity-80">
               <div className="flex items-center gap-1"><Compass size={14} /> 40.7128°N</div>
               <div className="flex items-center gap-1"><Maximize size={14} /> 74.0060°W</div>
             </div>
           </BlueprintBox> */}
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
                value={spatialData ? spatialData.site_reference : <Skeleton className="w-24 h-5" />} 
                description="Project baseline grid identification"
              />
              <SpecField 
                label="Calibration Date" 
                value={spatialData ? spatialData.calibration_date : <Skeleton className="w-24 h-5" />} 
                description="Last astronomical alignment check"
              />
              <SpecField 
                label="Optical Scale" 
                value={spatialData ? spatialData.optical_scale : <Skeleton className="w-20 h-5" />} 
                unit={spatialData ? 'mm' : undefined}
                description="Calculated based on detected depth buffer"
              />
              
              <div className="mt-8 pt-8 border-t border-white/20">
                <h3 className="text-xs uppercase tracking-[0.3em] mb-4 opacity-50">Project Metadata</h3>
                <div className="grid grid-cols-2 gap-4 text-xs uppercase opacity-70">
                  <div className="border border-white/20 p-2">Drawn By: SPATIAL OPTICIAN</div>
                  <div className="border border-white/20 p-2">Check By: DR. ARIS (AI)</div>
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
                  <span className="text-sm">{spatialData ? spatialData.diffusion_coefficient.toFixed(3) : <Skeleton className="w-16 h-4" />}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase">Rayleigh Scattering</span>
                  <div className="flex-1 mx-4 h-px border-b border-dotted border-white/40"></div>
                  <span className="text-sm">{spatialData ? spatialData.rayleigh_scattering : <Skeleton className="w-20 h-4" />}</span>
                </div>
              </div>
            </BlueprintBox>
          </motion.div>
        </div>

        {/* Center Column: Photo Upload Area & Optical Analysis Output */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            id="photo-upload-input"
          />

          <div className={`transition-all duration-500 shrink-0 ${uploadedImage ? 'h-[480px]' : 'h-[280px]'}`}>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`h-full border-2 border-dashed border-white/40 bg-white/5 relative flex flex-col items-center justify-center p-6 transition-all duration-300 cursor-pointer ${
                dragActive ? 'bg-white/15 border-white/80 scale-[1.01]' : 'hover:bg-white/8 hover:border-white/60'
              } ${isAnalyzingImage ? 'pointer-events-none' : ''}`}
            >
              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/60"></div>
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/60"></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/60"></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/60"></div>

              {uploadedImage ? (
                /* Image preview */
                <div className="relative w-full h-full flex flex-col items-center justify-center gap-2">
                  <div className="relative border border-white/30 shadow-lg overflow-hidden h-full max-h-[430px] w-full flex items-center justify-center bg-black/10">
                    <img
                      src={uploadedImage}
                      alt="Uploaded scan"
                      className="max-h-full max-w-full object-contain cursor-zoom-in hover:scale-[1.01] transition-transform duration-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsZoomed(true);
                      }}
                    />
                    {!isAnalyzingImage && (
                      <>
                        <div className="absolute top-2 left-2 flex gap-2 z-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsZoomed(true);
                            }}
                            className="px-2.5 py-1 bg-[#0a2e5c]/95 border border-white/40 hover:bg-white/20 hover:border-white text-white transition-colors uppercase text-xs tracking-widest font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                            title="Zoom / View Fullscreen"
                          >
                            <Maximize size={12} /> Full Size
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearAll}
                          className="absolute top-2 right-2 px-2 py-1 bg-red-950/80 border border-red-500/60 hover:bg-red-700 hover:text-white hover:border-red-500 text-red-200 transition-colors uppercase text-xs tracking-widest font-mono font-bold z-10 cursor-pointer"
                          title="Delete Scan & Clear All"
                        >
                          ✕ Delete Scan
                        </button>
                      </>
                    )}
                    {isAnalyzingImage && (
                      <div className="absolute inset-0 bg-[#0a2e5c]/70 flex flex-col items-center justify-center gap-3 pointer-events-auto">
                        <div className="flex gap-1">
                          {[0,1,2,3,4].map(i => (
                            <motion.div
                              key={i}
                              className="w-1 bg-white"
                              animate={{ height: ['8px', '24px', '8px'] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
                            />
                          ))}
                        </div>
                        <span className="text-xs uppercase tracking-widest opacity-80">Vision Analysis Running...</span>
                        <button
                          onClick={handleCancelRequest}
                          className="mt-2 px-3 py-1 bg-red-950/80 border border-red-500/60 hover:bg-red-700 hover:text-white hover:border-red-500 text-red-200 transition-colors uppercase text-xs tracking-widest font-mono font-bold pointer-events-auto z-20"
                        >
                          ✕ Stop Analysis
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-center shrink-0">
                    <p className="text-xs uppercase tracking-widest opacity-50">Click or drop to replace image</p>
                  </div>
                </div>
              ) : (
                /* Default upload prompt */
                <>
                  {/* Crosshair */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none opacity-40">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-white"></div>
                    <div className="absolute top-0 left-1/2 w-px h-full bg-white"></div>
                  </div>

                  <div className="text-center group">
                    <div className="mb-3 relative inline-block">
                      <motion.div
                        whileHover={{ scale: 1.05, rotate: 2 }}
                        animate={dragActive ? { scale: 1.1, rotate: 3 } : { scale: 1, rotate: 0 }}
                        className="p-5 border border-white bg-[#0a2e5c]"
                      >
                        <Upload className="w-8 h-8 text-white" />
                      </motion.div>
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white"></div>
                    </div>
                    <h2 className="text-lg uppercase tracking-tighter mb-1">Photo Upload Area</h2>
                    {/* <p className="text-xs opacity-50 uppercase tracking-widest max-w-[220px] mx-auto leading-normal">
                      {dragActive ? 'Release to scan' : 'Drop architectural scan or site photo for depth extraction'}
                    </p> */}
                  </div>
                </>
              )}

              {/* Specs at bottom of upload area */}
              {/* <div className="absolute bottom-2 left-4 right-4 flex justify-between text-xs uppercase tracking-widest opacity-40">
                <span>BUFFER_STATUS: {isAnalyzingImage ? 'ANALYZING...' : uploadedImage ? 'SCAN_LOADED' : 'READY'}</span>
                <span>ENC: RSA-4096 / AUTH_SYSTEM_V2</span>
              </div> */}
              <div className="absolute bottom-2 left-4 right-4 flex justify-center text-xs uppercase tracking-widest opacity-40">
                <span>Drop architectural scan or site photo for depth extraction</span>
              </div>
            </div>
          </div>

          <DimensionLine
            label={
              uploadedImage
                ? (imageResolution ? `${imageResolution.width}px x ${imageResolution.height}px (Source Scan)` : "Resolving metrics...")
                : "Flexible Workspace (Any Photo / Layout Plan / Scan)"
            }
            className="my-1"
          />

          <div className="flex-1 min-h-[300px] flex flex-col">
            <BlueprintBox title="Optical Analysis Output" className="flex-1 flex flex-col relative bg-white/5 p-4">
              
              {/* Tab Selector */}
              {analysisResult && (
                <div className="flex border-b border-white/20 mb-4 text-xs uppercase tracking-wider font-mono select-none">
                  <button
                    onClick={() => setActiveTab('report')}
                    className={`px-3 py-1.5 border-r border-white/20 transition-all ${
                      activeTab === 'report' ? 'bg-white/10 text-white font-bold' : 'opacity-50 hover:opacity-100'
                    }`}
                  >
                    Diagnostic Report
                  </button>
                  <button
                    onClick={() => { if (catalogResult) setActiveTab('catalog'); }}
                    disabled={!catalogResult && !isQueryingCatalog}
                    className={`px-3 py-1.5 border-r border-white/20 transition-all ${
                      activeTab === 'catalog' ? 'bg-white/10 text-white font-bold' : 'opacity-50 disabled:opacity-20 hover:enabled:opacity-100'
                    }`}
                  >
                    Database Catalog {catalogResult ? '✓' : ''}
                  </button>
                  <button
                    onClick={() => { if (roiResult) setActiveTab('roi'); }}
                    disabled={!roiResult && !isCalculatingRoi}
                    className={`px-3 py-1.5 transition-all ${
                      activeTab === 'roi' ? 'bg-white/10 text-white font-bold' : 'opacity-50 disabled:opacity-20 hover:enabled:opacity-100'
                    }`}
                  >
                    ROI Calculations {roiResult ? '✓' : ''}
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto max-h-[320px] pr-2 custom-scrollbar">
                {/* Active Tab Loaders */}
                {activeTab === 'catalog' && isQueryingCatalog ? (
                  <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex gap-1.5 mb-4">
                      {[0, 1, 2, 3, 4].map(i => (
                        <motion.div
                          key={i}
                          className="w-1.5 bg-white"
                          animate={{ height: ['10px', '32px', '10px'] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
                        />
                      ))}
                    </div>
                    <p className="text-xs uppercase tracking-widest font-mono opacity-80 animate-pulse">
                      QUERYING DATABASE CATALOG VIA MCP...
                    </p>
                    <p className="text-xs uppercase tracking-widest font-mono opacity-50 mt-1">
                      Searching equipment_catalog collection for matching models
                    </p>
                    <button
                      onClick={handleCancelRequest}
                      className="mt-4 px-3 py-1 bg-red-950/80 border border-red-500/60 hover:bg-red-700 hover:text-white hover:border-red-500 text-red-200 transition-colors uppercase text-xs tracking-widest font-mono font-bold z-10"
                    >
                      ✕ Stop Analysis
                    </button>
                  </div>
                ) : activeTab === 'roi' && isCalculatingRoi ? (
                  <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex gap-1.5 mb-4">
                      {[0, 1, 2, 3, 4].map(i => (
                        <motion.div
                          key={i}
                          className="w-1.5 bg-white"
                          animate={{ height: ['10px', '32px', '10px'] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
                        />
                      ))}
                    </div>
                    <p className="text-xs uppercase tracking-widest font-mono opacity-80 animate-pulse">
                      RETRIEVING TARIFFS & CALCULATING ROI...
                    </p>
                    <p className="text-xs uppercase tracking-widest font-mono opacity-50 mt-1">
                      Running energy savings calculations with NY-HUD database parameters
                    </p>
                    <button
                      onClick={handleCancelRequest}
                      className="mt-4 px-3 py-1 bg-red-950/80 border border-red-500/60 hover:bg-red-700 hover:text-white hover:border-red-500 text-red-200 transition-colors uppercase text-xs tracking-widest font-mono font-bold z-10"
                    >
                      ✕ Stop Analysis
                    </button>
                  </div>
                ) : isAnalyzingImage ? (
                  <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex gap-1.5 mb-4">
                      {[0, 1, 2, 3, 4].map(i => (
                        <motion.div
                          key={i}
                          className="w-1.5 bg-white"
                          animate={{ height: ['10px', '32px', '10px'] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
                        />
                      ))}
                    </div>
                    <p className="text-xs uppercase tracking-widest font-mono opacity-80 animate-pulse">
                      PROCESSING OPTICAL FRAME...
                    </p>
                    <p className="text-xs uppercase tracking-widest font-mono opacity-50 mt-1">
                      Extracting spatial geometry & illuminance profiles
                    </p>
                    <button
                      onClick={handleCancelRequest}
                      className="mt-4 px-3 py-1 bg-red-950/80 border border-red-500/60 hover:bg-red-700 hover:text-white hover:border-red-500 text-red-200 transition-colors uppercase text-xs tracking-widest font-mono font-bold z-10"
                    >
                      ✕ Stop Analysis
                    </button>
                  </div>
                ) : analysisError ? (
                  <div className="text-red-400 font-mono text-xs p-3 border border-red-500/30 bg-red-950/20 uppercase tracking-wide">
                    {analysisError}
                  </div>
                ) : (
                  /* Render corresponding tab data */
                  <div className="text-left font-mono py-1">
                    {/* <div className="flex justify-between items-center text-xs opacity-40 border-b border-white/20 pb-2 mb-4 uppercase tracking-widest">
                      <span>REPORT_STATUS: VERIFIED</span>
                      <span>
                        TAB: {activeTab === 'report' ? 'DIAGNOSTIC' : activeTab === 'catalog' ? 'EQUIPMENT_CATALOG' : 'ROI_METRICS'}
                      </span>
                    </div> */}
                    <div className="space-y-3">
                      {activeTab === 'report' && formatReportText(analysisResult)}
                      {activeTab === 'catalog' && formatReportText(catalogResult)}
                      {activeTab === 'roi' && formatReportText(roiResult)}
                      
                      {activeTab === 'report' && !analysisResult && (
                        <div className="h-full flex flex-col items-center justify-center py-12 text-center opacity-40">
                          <Bot className="w-10 h-10 mb-3 opacity-60" strokeWidth={1} />
                          <p className="text-xs uppercase tracking-widest leading-relaxed max-w-[280px]">
                            AWAITING scan upload for spatial lighting diagnostics.
                          </p>
                          <p className="text-xs uppercase tracking-[0.2em] mt-2 opacity-50">
                            DR. ARIS VISION AGENT OFFLINE
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </BlueprintBox>
          </div>

          {/* AI MCP Action Panel */}
          {analysisResult && (
            <div className="space-y-2">
              {auditSaveStatus && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 border relative group ${
                    auditSaveStatus.success 
                      ? 'border-emerald-500/50 bg-[#0a2e5c]/95 text-emerald-300' 
                      : 'border-red-500/50 bg-[#0a2e5c]/95 text-red-300'
                  }`}
                >
                  {/* Corner marks for blueprint style */}
                  <div className={`absolute -top-1 -left-1 w-2.5 h-2.5 border-t border-l ${auditSaveStatus.success ? 'border-emerald-400/80' : 'border-red-400/80'}`}></div>
                  <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 border-t border-r ${auditSaveStatus.success ? 'border-emerald-400/80' : 'border-red-400/80'}`}></div>
                  <div className={`absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b border-l ${auditSaveStatus.success ? 'border-emerald-400/80' : 'border-red-400/80'}`}></div>
                  <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b border-r ${auditSaveStatus.success ? 'border-emerald-400/80' : 'border-red-400/80'}`}></div>

                  <div className="flex justify-between items-start gap-4 text-left">
                    <div className="flex-1">
                      <div className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold flex items-center gap-1.5 mb-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${auditSaveStatus.success ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`}></span>
                        {auditSaveStatus.success ? 'Database Registry Status' : 'Database Error'}
                      </div>
                      <p className="text-xs tracking-wide text-white/90 leading-relaxed font-sans">
                        {auditSaveStatus.text}
                      </p>
                      {auditSaveStatus.success && auditSaveStatus.fullMessage && (
                        <button
                          type="button"
                          onClick={() => setShowAuditDetails(prev => !prev)}
                          className="mt-2 text-[10px] uppercase tracking-wider text-emerald-400 hover:text-emerald-300 hover:underline transition-colors block cursor-pointer font-mono font-bold"
                        >
                          {showAuditDetails ? '[-] Hide System Report' : '[+] View System Report'}
                        </button>
                      )}
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setAuditSaveStatus(null);
                        setShowAuditDetails(false);
                      }} 
                      className="text-xs opacity-60 hover:opacity-100 hover:text-white transition-opacity font-bold cursor-pointer shrink-0 mt-0.5"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Expandable details report */}
                  {showAuditDetails && auditSaveStatus.fullMessage && (
                    <div className="mt-4 pt-3 border-t border-white/20 max-h-[200px] overflow-y-auto custom-scrollbar text-left font-sans">
                      {formatReportText(auditSaveStatus.fullMessage)}
                    </div>
                  )}
                </motion.div>
              )}
              
              <div className="grid grid-cols-3 gap-2 text-xs font-mono tracking-wider">
                <button
                  onClick={handleQueryCatalog}
                  disabled={isQueryingCatalog || isAnalyzingImage || isCalculatingRoi || isSavingAudit}
                  className={`p-3 border border-white/40 uppercase hover:bg-white hover:text-blue-900 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none ${
                    isQueryingCatalog ? 'bg-white text-blue-900 font-bold' : ''
                  }`}
                >
                  🔍 Find Fixtures
                </button>
                <button
                  onClick={handleCalculateRoi}
                  disabled={isCalculatingRoi || isAnalyzingImage || isQueryingCatalog || isSavingAudit}
                  className={`p-3 border border-white/40 uppercase hover:bg-white hover:text-blue-900 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none ${
                    isCalculatingRoi ? 'bg-white text-blue-900 font-bold' : ''
                  }`}
                >
                  ⚡ Calculate ROI
                </button>
                <button
                  onClick={handleSaveAudit}
                  disabled={isSavingAudit || isAnalyzingImage || isQueryingCatalog || isCalculatingRoi}
                  className={`p-3 border border-white/40 uppercase hover:bg-white hover:text-blue-900 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none ${
                    isSavingAudit ? 'bg-white text-blue-900 font-bold' : ''
                  }`}
                >
                  💾 Save Audit
                </button>
              </div>
            </div>
          )}
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
                  <div className="text-xs uppercase opacity-50 mb-1">Current Lux Deficit</div>
                  <div className="text-6xl font-light tracking-tighter">
                    {spatialData ? (
                      spatialData.lux_deficit.toFixed(2)
                    ) : (
                      <Skeleton className="w-32 h-14 mx-auto my-1 bg-white/5" />
                    )}
                  </div>
                  <div className="text-xs uppercase opacity-50">Lumens / M²</div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {spatialData ? (
                      <div className="w-full bg-white/10 h-6 border border-white/20 relative overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.max(10, (spatialData.lux_deficit + 2.0) * 50))}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full bg-white/40 border-r border-white"
                        ></motion.div>
                        <div className="absolute inset-0 flex items-center px-2 text-xs uppercase mix-blend-difference">Intake Threshold</div>
                      </div>
                    ) : (
                      <Skeleton className="w-full h-6 border border-white/20" />
                    )}
                  </div>
                  
                  {spatialData ? (
                    spatialData.lux_deficit < -1.0 ? (
                      <div className="bg-red-950/20 border-l-2 border-red-500 p-3 text-xs leading-tight uppercase flex gap-3 text-red-300">
                        <Info size={16} className="shrink-0 text-red-400" />
                        <span>Warning: High lux deficit detected in {spatialData.site_reference}. Retrofitting recommended.</span>
                      </div>
                    ) : (
                      <div className="bg-emerald-950/20 border-l-2 border-emerald-500 p-3 text-xs leading-tight uppercase flex gap-3 text-emerald-300">
                        <Info size={16} className="shrink-0 text-emerald-400" />
                        <span>Status: Light levels within acceptable tolerance for {spatialData.site_reference}.</span>
                      </div>
                    )
                  ) : (
                    <Skeleton className="w-full h-12" />
                  )}
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
              <div className="py-2 text-center font-mono">
                {spatialData ? (
                  <div className="text-5xl tracking-tighter mb-1 mt-2">
                    <span className="text-2xl mr-1 opacity-50">+</span>
                    {spatialData.spatial_efficiency.toFixed(1)}
                    <span className="text-lg ml-1 opacity-60">%</span>
                  </div>
                ) : (
                  <Skeleton className="w-28 h-10 mx-auto my-2 bg-white/5" />
                )}
                <div className="text-xs uppercase opacity-50 mb-6">Projected Spatial Efficiency</div>
                
                <div className="flex gap-1 justify-center h-12 items-end">
                  {spatialData ? (
                    [40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 0.6 + (i * 0.05), duration: 0.5 }}
                        className="w-full max-w-[8px] bg-white/40 border border-white/20"
                      />
                    ))
                  ) : (
                    [1, 2, 3, 4, 5, 6, 7].map((_, i) => (
                      <Skeleton key={i} className="w-full max-w-[8px] h-8" />
                    ))
                  )}
                </div>
              </div>
            </BlueprintBox>
          </motion.div>

          <div className="hidden lg:block pt-4">
             <div className="border-t-2 border-white/80 pt-4 opacity-40">
               <div className="flex justify-between items-center text-xs uppercase tracking-widest mb-1">
                 <span>Sheet No: A-101</span>
                 <span className="flex items-center gap-1"><Layers size={10} /> LAYER: 03_ANALYSIS</span>
               </div>
               <div className="flex justify-between items-center text-xs uppercase tracking-widest">
                 <span>Scale: AS NOTED</span>
                 <span className="flex items-center gap-1"><Ruler size={10} /> UNITS: METRIC</span>
               </div>
             </div>
          </div>
        </div>

      </main>

      {/* Footer Branding */}
      <footer className="mt-16 pt-8 border-t border-white/20 flex flex-col md:flex-row justify-between items-center gap-4 text-xs uppercase tracking-[0.4em] opacity-40">
        <div className="flex gap-8">
           {/* <span>Spatial Dynamics Division</span> */}
           <span>© 2026 Developed by <a className="text-white hover:text-gray-400 transition-colors underline" href="https://github.com/vero-code" target="_blank" rel="noopener noreferrer">Veronika Kashtanova</a></span>
        </div>
        <div className="flex items-center gap-2">
          <Eye size={12} /> AI responses may contain inaccuracies, please double-check the information
        </div>
      </footer>

      {/* Full Size Zoom Overlay Modal */}
      {isZoomed && uploadedImage && (
        <div 
          className="fixed inset-0 z-50 bg-[#020d1c]/95 flex flex-col items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          {/* Subtle blueprint background grid on full-screen preview */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
          
          <div className="absolute top-6 right-6 flex gap-3 z-50">
            <button
              onClick={() => setIsZoomed(false)}
              className="px-4 py-2 bg-[#0a2e5c] border border-white/40 hover:bg-white/10 hover:border-white text-white transition-colors uppercase text-xs tracking-widest font-mono font-bold cursor-pointer"
            >
              ✕ Close Preview
            </button>
          </div>
          
          <div 
            className="relative max-w-full max-h-full border-2 border-white/60 p-1 bg-[#0a2e5c]/40 shadow-2xl flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Blueprint corner marks */}
            <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-white"></div>
            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-white"></div>
            <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-white"></div>
            <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-white"></div>

            <img 
              src={uploadedImage} 
              alt="Full resolution site scan" 
              className="max-h-[85vh] max-w-[90vw] object-contain block"
            />
            
            <div className="absolute -top-3.5 left-6 bg-[#0a2e5c] px-3 py-0.5 text-xs uppercase tracking-widest border border-white/40 font-mono text-white">
              Full Resolution Scan
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
