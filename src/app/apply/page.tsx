"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Home,
  User,
  FileText,
  ShoppingCart,
  CheckCircle,
  Plus,
  Lock,
  Upload,
  Camera,
  Smartphone,
  Maximize,
  X,
  MoreVertical,
  Share2,
  Trash2
} from "lucide-react";

type StepType = "travelers" | "docs" | "checkout";
type CameraState = "idle" | "initiating" | "analyzing" | 3 | 2 | 1 | "scanning" | "confirm";
type DocUploadView = "list" | "camera" | "upload" | "qr";

interface Traveler {
  id: string;
  firstName: string;
  lastName: string;
}

const getInitials = (name: string, index: number) => {
  const cleanName = name.trim();
  const parts = cleanName.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (cleanName.length > 0) {
    const numMatch = cleanName.match(/\d+/);
    if (numMatch) {
      return (cleanName[0] + numMatch[0]).toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase();
  }
  return `T${index + 1}`;
};

function ApplyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateStr = searchParams.get("date");

  // Flow State
  const [currentStep, setCurrentStep] = useState<StepType>("travelers");
  
  // Step 1: Travelers State
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [currentName, setCurrentName] = useState("");
  
  // Step 2: Docs State
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean | string>>({});
  const [activeTravelerId, setActiveTravelerId] = useState<string | null>(null);
  const [activeDocType, setActiveDocType] = useState<"Photo" | "Passport" | null>(null);
  const [docView, setDocView] = useState<DocUploadView>("list");
  
  // Camera State
  const [cameraState, setCameraState] = useState<CameraState>("idle");

  // Traveler Dropdown and Toast State
  const [openMenuTravelerId, setOpenMenuTravelerId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Phone Upload Modal State
  const [phoneUploadModalOpen, setPhoneUploadModalOpen] = useState(false);
  const [phoneUploadStep, setPhoneUploadStep] = useState<"info" | "qr">("info");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Interactive Frame Analysis & Beep utilities
  const [analysisText, setAnalysisText] = useState<string>("Align your face in the circle");
  const animationFrameId = useRef<number | null>(null);

  const playBeep = (freq = 800, duration = 0.15) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("AudioContext beep failed:", e);
    }
  };

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
      videoStreamRef.current = null;
    }
  };

  const clearCameraTimeouts = () => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 640;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Mirror the captured photo to match mirrored preview
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        setCapturedImage(dataUrl);
      }
    }
  };

  const startAnalysisLoop = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Create a scaled canvas to analyze frames efficiently
    const canvas = document.createElement("canvas");
    canvas.width = 80;
    canvas.height = 80;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    
    let perfectCount = 0;

    const analyze = () => {
      if (!videoStreamRef.current) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        ctx.drawImage(video, 0, 0, 80, 80);
        const frameData = ctx.getImageData(0, 0, 80, 80);
        const data = frameData.data;

        let totalBrightness = 0;
        let skinPixels = 0;
        let centralPixels = 0;

        for (let y = 0; y < 80; y++) {
          for (let x = 0; x < 80; x++) {
            const idx = (y * 80 + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Luminance
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            totalBrightness += brightness;

            // Central crop box
            if (x >= 20 && x < 60 && y >= 20 && y < 60) {
              centralPixels++;
              // Skin color heuristic
              const isSkin = r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15;
              if (isSkin) {
                skinPixels++;
              }
            }
          }
        }

        const avgBrightness = totalBrightness / 6400;
        const skinRatio = skinPixels / centralPixels;

        let currentStatus = "Align your face in the circle";
        if (avgBrightness < 45) {
          currentStatus = "Too Dark. Please turn on lights.";
        } else if (skinRatio < 0.12) {
          currentStatus = "No Face Detected";
        } else if (skinRatio >= 0.12 && skinRatio < 0.22) {
          currentStatus = "Come Closer";
        } else if (skinRatio > 0.48) {
          currentStatus = "Step Back";
        } else if (skinRatio >= 0.22 && skinRatio <= 0.48) {
          currentStatus = "Perfect! Hold Still";
        }

        setAnalysisText(currentStatus);

        if (currentStatus === "Perfect! Hold Still") {
          perfectCount++;
          if (perfectCount >= 6) { // ~900ms of stable hold
            startCountdown();
            return;
          }
        } else {
          perfectCount = 0;
        }
      }

      // Throttle the next frame check to roughly 150ms intervals (low CPU load)
      setTimeout(() => {
        if (videoStreamRef.current) {
          animationFrameId.current = requestAnimationFrame(analyze);
        }
      }, 150);
    };

    animationFrameId.current = requestAnimationFrame(analyze);
  };

  const startCountdown = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    setCameraState(3);
    playBeep(800, 0.12);

    const t2 = setTimeout(() => {
      setCameraState(2);
      playBeep(800, 0.12);
    }, 1000);

    const t1 = setTimeout(() => {
      setCameraState(1);
      playBeep(800, 0.12);
    }, 2000);

    const tScan = setTimeout(() => {
      setCameraState("scanning");
      playBeep(1200, 0.25);
      capturePhoto();
      
      const tConfirm = setTimeout(() => {
        setCameraState("confirm");
        stopCamera();
      }, 1800);
      timeoutsRef.current.push(tConfirm);
    }, 3000);

    timeoutsRef.current.push(t2, t1, tScan);
  };

  const videoRefCallback = (node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && videoStreamRef.current) {
      node.srcObject = videoStreamRef.current;
    }
  };

  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenMenuTravelerId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => {
      stopCamera();
      clearCameraTimeouts();
      window.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  // Progress
  const getProgressPercentage = () => {
    if (currentStep === "travelers") return travelers.length > 0 ? 33 : 0;
    if (currentStep === "docs") return 66;
    return 100;
  };

  // Handlers
  const handleBack = () => {
    if (docView !== "list") {
      setDocView("list");
      setCameraState("idle");
      stopCamera();
      clearCameraTimeouts();
      return;
    }
    if (currentStep === "docs") setCurrentStep("travelers");
    else if (currentStep === "checkout") setCurrentStep("docs");
    else router.push("/");
  };

  const handleAddTraveler = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (currentName.trim()) {
      const newTraveler: Traveler = {
        id: Math.random().toString(36).substring(2, 9),
        firstName: currentName.trim().toUpperCase(),
        lastName: "",
      };
      setTravelers([...travelers, newTraveler]);
      setCurrentName("");
      setCurrentStep("docs");
    }
  };

  const addTravelerDirect = () => {
    const newTraveler: Traveler = {
      id: Math.random().toString(36).substring(2, 9),
      firstName: "", // empty signals inline name input
      lastName: "",
    };
    setTravelers([...travelers, newTraveler]);
  };

  const startCameraSequence = async () => {
    setDocView("camera");
    setCameraState("initiating");
    setCameraError(null);
    setCapturedImage(null);
    setAnalysisText("Accessing camera...");
    clearCameraTimeouts();
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });
      videoStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraState("analyzing");
      setTimeout(() => {
        if (videoStreamRef.current) {
          startAnalysisLoop();
        }
      }, 500);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Camera access denied or unavailable. Please check permission settings.");
      setCameraState("idle");
    }
  };

  const confirmUpload = () => {
    if (activeTravelerId && activeDocType) {
      setUploadedDocs(prev => ({
        ...prev,
        [`${activeTravelerId}-${activeDocType}`]: capturedImage || true
      }));
    }
    setDocView("list");
    setCameraState("idle");
    stopCamera();
    clearCameraTimeouts();
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans text-slate-900">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#f8f9fa] border-b border-slate-100/80">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between w-full">
          <button onClick={handleBack} className="flex items-center gap-1.5 text-slate-700 font-semibold text-sm hover:opacity-70 transition">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex-1 text-center">
            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
              {getProgressPercentage()}% Completed
            </span>
          </div>
          <button onClick={() => router.push("/")} className="p-2 text-slate-700 hover:bg-slate-200 rounded-full transition">
            <Home className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1400px] mx-auto px-4 md:px-8 py-8">
        
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col gap-6 w-36 shrink-0 items-start pt-12 pr-4 relative">
          
          {/* Travelers Step */}
          <div 
            onClick={() => {
              if (currentStep !== "travelers") setCurrentStep("travelers");
            }}
            className={`group relative w-full px-4 py-3 rounded-2xl flex flex-col items-start gap-1 cursor-pointer transition-colors select-none ${
              currentStep === "travelers" ? "text-indigo-600 font-semibold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {currentStep === "travelers" && (
              <motion.div
                layoutId="activeStepFrame"
                className="absolute inset-0 border border-indigo-100/55 bg-indigo-50/40 rounded-2xl"
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
            <User className="h-5 w-5 relative z-10" />
            <span className="text-[10px] font-bold tracking-widest uppercase relative z-10">Travelers</span>
          </div>

          {/* Docs Step */}
          <div 
            onClick={() => {
              if (travelers.length > 0) {
                setCurrentStep("docs");
              }
            }}
            className={`group relative w-full px-4 py-3 rounded-2xl flex flex-col items-start gap-1 cursor-pointer transition-colors select-none ${
              currentStep === "docs" ? "text-indigo-600 font-semibold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {currentStep === "docs" && (
              <motion.div
                layoutId="activeStepFrame"
                className="absolute inset-0 border border-indigo-100/55 bg-indigo-50/40 rounded-2xl"
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
            <FileText className="h-5 w-5 relative z-10" />
            <span className="text-[10px] font-bold tracking-widest uppercase relative z-10">Docs</span>
          </div>

          {/* Checkout Step */}
          <div 
            onClick={() => {
              if (travelers.length > 0) {
                setCurrentStep("checkout");
              }
            }}
            className={`group relative w-full px-4 py-3 rounded-2xl flex flex-col items-start gap-1 cursor-pointer transition-colors select-none ${
              currentStep === "checkout" ? "text-indigo-600 font-semibold" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {currentStep === "checkout" && (
              <motion.div
                layoutId="activeStepFrame"
                className="absolute inset-0 border border-indigo-100/55 bg-indigo-50/40 rounded-2xl"
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
            <ShoppingCart className="h-5 w-5 relative z-10" />
            <span className="text-[10px] font-bold tracking-widest uppercase relative z-10">Checkout</span>
          </div>

        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col items-center w-full relative">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: TRAVELERS */}
            {currentStep === "travelers" && (
              <motion.div key="step-travelers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-2xl flex flex-col items-center mt-12 md:mt-24">
                <h1 className="text-2xl md:text-[28px] font-bold text-center">Who's going on this trip to United Arab Emirates?</h1>
                <p className="text-slate-500 text-sm mt-3 text-center">You can add all travellers or continue solo</p>

                <form onSubmit={handleAddTraveler} className="w-full mt-20 flex flex-col items-center">
                  <input
                    type="text"
                    value={currentName}
                    onChange={(e) => setCurrentName(e.target.value.toUpperCase())}
                    placeholder="Enter traveler's first name"
                    className="w-3/4 md:w-1/2 text-center text-xl md:text-2xl tracking-widest bg-transparent border-b-2 border-dashed border-slate-300 focus:border-slate-800 pb-3 transition-colors outline-none placeholder:text-slate-300 placeholder:tracking-normal placeholder:normal-case placeholder:text-lg focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                    autoFocus
                  />
                  
                  <button
                    type="submit"
                    disabled={!currentName.trim()}
                    className={`mt-12 rounded-full py-3.5 px-8 text-sm font-semibold flex items-center justify-center gap-2 transition duration-300 w-48 ${
                      currentName.trim() ? "bg-[#384152] hover:bg-[#2a313e] text-white shadow-lg" : "bg-slate-300 text-white cursor-not-allowed"
                    }`}
                  >
                    <span>Continue</span>
                    <ArrowLeft className="h-4 w-4 rotate-180" />
                  </button>
                </form>
              </motion.div>
            )}

            {/* STEP 2: DOCS */}
            {currentStep === "docs" && (
              <motion.div key="step-docs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center mt-6">
                
                {docView === "list" && (
                  <>
                    <div className="text-center mb-10">
                      <h1 className="text-2xl md:text-[28px] font-bold">The Essential Documents</h1>
                      <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">These are as per the official United Arab Emirates embassy requirements for visa processing</p>
                    </div>

                    {/* Cards Container */}
                    <div className="flex flex-wrap justify-center gap-6 w-full max-w-4xl">
                      {travelers.map((t, index) => {
                        const photoUploaded = uploadedDocs[`${t.id}-Photo`];
                        const passportUploaded = uploadedDocs[`${t.id}-Passport`];
                        const uploadedCount = (photoUploaded ? 1 : 0) + (passportUploaded ? 1 : 0);

                        const isNewTravelerNoName = t.firstName === "";

                        return (
                          <motion.div layout initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} key={t.id} className="relative bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 w-full max-w-[340px] min-h-[250px] flex flex-col justify-between">
                            {isNewTravelerNoName ? (
                              <div className="flex flex-col justify-between items-center text-center flex-1 py-4">
                                <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">NEW TRAVELER</span>
                                
                                <div className="w-full flex flex-col items-center gap-4 my-auto">
                                  <input
                                    type="text"
                                    id={`input-name-${t.id}`}
                                    placeholder="Enter first name"
                                    className="w-4/5 text-center text-xl tracking-widest bg-transparent border-b-2 border-dashed border-slate-300 focus:border-slate-800 pb-2 transition-colors outline-none placeholder:text-slate-300 placeholder:tracking-normal placeholder:normal-case placeholder:text-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        const val = (e.target as HTMLInputElement).value.trim().toUpperCase();
                                        if (val) {
                                          setTravelers(prev => prev.map(trav => trav.id === t.id ? { ...trav, firstName: val } : trav));
                                        }
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      const inputEl = document.getElementById(`input-name-${t.id}`) as HTMLInputElement;
                                      const val = inputEl?.value.trim().toUpperCase();
                                      if (val) {
                                        setTravelers(prev => prev.map(trav => trav.id === t.id ? { ...trav, firstName: val } : trav));
                                      } else {
                                        setTravelers(prev => prev.filter(trav => trav.id !== t.id));
                                      }
                                    }}
                                    className="px-4 py-2 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full hover:bg-indigo-100 transition flex items-center gap-1.5 shadow-sm shrink-0"
                                  >
                                    <CheckCircle className="h-3.5 w-3.5" /> Save Name
                                  </button>
                                </div>
                                
                                <p className="text-[10px] text-slate-400 font-semibold max-w-[200px]">
                                  Press Enter or click Save to start uploading documents.
                                </p>
                              </div>
                            ) : (
                              <>
                                {/* Card Header */}
                                <div className="flex items-center justify-between mb-6">
                                  <div className="flex items-center gap-4">
                                    {photoUploaded && typeof photoUploaded === "string" && photoUploaded.startsWith("data:") ? (
                                      <div className="h-12 w-12 rounded-full border border-dashed border-[#96a98f] p-[2px] flex items-center justify-center shrink-0">
                                        <img
                                          src={photoUploaded}
                                          alt={`${t.firstName}'s photo`}
                                          className="h-full w-full rounded-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="h-12 w-12 rounded-full border border-dashed border-[#96a98f] p-[2px] flex items-center justify-center shrink-0">
                                        <div className="h-full w-full rounded-full bg-[#96a98f] flex items-center justify-center text-white font-bold text-sm">
                                          {getInitials(t.firstName, index)}
                                        </div>
                                      </div>
                                    )}
                                    <div>
                                      <h3 className="font-bold text-lg border-b border-dotted border-slate-400 pb-0.5 inline-block leading-tight">
                                        {t.firstName}
                                      </h3>
                                      <p className="text-xs text-slate-400 font-semibold mt-1">{uploadedCount}/2 docs uploaded</p>
                                    </div>
                                  </div>

                                  {/* 3-dot dropdown menu option for subsequent travelers */}
                                  {index > 0 && (
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuTravelerId(openMenuTravelerId === t.id ? null : t.id);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition"
                                      >
                                        <MoreVertical className="h-5 w-5" />
                                      </button>
                                      {openMenuTravelerId === t.id && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-30">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const link = `${window.location.origin}/apply?traveler=${t.id}`;
                                              navigator.clipboard.writeText(link);
                                              showToast("Share link copied to clipboard!");
                                              setOpenMenuTravelerId(null);
                                            }}
                                            className="w-full text-left px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 flex items-center gap-2 transition"
                                          >
                                            <Share2 className="h-4 w-4 text-indigo-500" />
                                            Share upload link
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setTravelers(prev => prev.filter(item => item.id !== t.id));
                                              setUploadedDocs(prev => {
                                                const next = { ...prev };
                                                delete next[`${t.id}-Photo`];
                                                delete next[`${t.id}-Passport`];
                                                return next;
                                              });
                                              showToast(`Traveler ${t.firstName} deleted`);
                                              setOpenMenuTravelerId(null);
                                            }}
                                            className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition border-t border-slate-100"
                                          >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                            Delete traveler
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Buttons */}
                                <div className="space-y-3">
                                  <button 
                                    onClick={() => { setActiveTravelerId(t.id); setActiveDocType("Photo"); startCameraSequence(); }}
                                    className="w-full bg-[#f4f6fb] hover:bg-[#ebf0f7] p-4 rounded-2xl flex items-center gap-3 transition"
                                  >
                                    {photoUploaded ? (
                                      typeof photoUploaded === "string" && photoUploaded.startsWith("data:") ? (
                                        <img src={photoUploaded} alt="Captured thumbnail" className="h-5 w-5 rounded-full object-cover border border-slate-200" />
                                      ) : (
                                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                                      )
                                    ) : (
                                      <Camera className="h-5 w-5 text-indigo-500" />
                                    )}
                                    <span className="font-semibold text-sm">Photo</span>
                                  </button>
                                  
                                  <button 
                                    onClick={() => { setActiveTravelerId(t.id); setActiveDocType("Passport"); setDocView("upload"); }}
                                    className="w-full bg-[#f4f6fb] hover:bg-[#ebf0f7] p-4 rounded-2xl flex items-center gap-3 transition"
                                  >
                                    {passportUploaded ? <CheckCircle className="h-5 w-5 text-emerald-500" /> : <FileText className="h-5 w-5 text-indigo-500" />}
                                    <span className="font-semibold text-sm">Passport</span>
                                  </button>
                                </div>

                                <div className="mt-6 flex flex-col items-center">
                                  <span className="text-[10px] text-slate-400 font-bold mb-3">OR</span>
                                  <button 
                                    onClick={() => {
                                      setActiveTravelerId(t.id);
                                      setPhoneUploadModalOpen(true);
                                      setPhoneUploadStep("info");
                                    }} 
                                    className="text-xs text-indigo-600 font-bold flex items-center gap-1.5 hover:underline"
                                  >
                                    <Maximize className="h-3.5 w-3.5" /> Upload from phone
                                  </button>
                                </div>
                              </>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
                      <button onClick={addTravelerDirect} className="px-6 py-3.5 rounded-full bg-white border border-slate-200 shadow-sm text-indigo-600 font-semibold text-sm flex items-center gap-2 hover:bg-slate-50 transition">
                        <Plus className="h-4 w-4" /> Add travelers
                      </button>
                      <button onClick={() => setCurrentStep("checkout")} className="px-6 py-3.5 rounded-full bg-[#f3f4f6] text-slate-400 font-semibold text-sm flex items-center gap-2 cursor-not-allowed">
                        <Lock className="h-4 w-4" /> Proceed to checkout
                      </button>
                    </div>
                  </>
                )}

                {/* CAMERA VIEW */}
                {docView === "camera" && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center w-full max-w-2xl mt-4">
                    <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-2">
                      {cameraState === "analyzing" ? "Face Verification" : 
                       typeof cameraState === "number" ? "Capturing in..." :
                       cameraState === "scanning" ? "Scanning Photo" :
                       cameraState === "confirm" ? "Confirm Photo" : "Look ahead,"}
                    </h2>
                    <h2 className="text-2xl md:text-4xl font-extrabold text-indigo-600 mb-8 min-h-[40px] text-center">
                      {cameraState === "analyzing" ? (
                        <span className="text-indigo-600 animate-pulse">{analysisText}</span>
                      ) : typeof cameraState === "number" ? (
                        <span className="text-amber-500">Hold still...</span>
                      ) : cameraState === "scanning" ? (
                        <span className="text-green-500">Analyzing face match...</span>
                      ) : cameraState === "confirm" ? (
                        <span className="text-emerald-600">Verification Complete</span>
                      ) : (
                        "straight at the camera"
                      )}
                    </h2>
                    
                    <motion.div 
                      initial={{ borderRadius: "100%" }}
                      animate={{
                        borderRadius: cameraState === "confirm" ? "1.5rem" : "100%"
                      }}
                      transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                      className="relative w-72 h-72 md:w-96 md:h-96 border-[6px] border-white shadow-2xl bg-black overflow-hidden flex items-center justify-center rounded-full animate-once"
                    >
                      
                      {/* Live Camera Stream */}
                      {docView === "camera" && cameraState !== "idle" && cameraState !== "confirm" && (
                        <video
                          ref={videoRefCallback}
                          autoPlay
                          playsInline
                          muted
                          className="absolute inset-0 w-full h-full object-cover z-0 scale-x-[-1]"
                        />
                      )}

                      {/* Abstract Background for "Camera Feed" */}
                      <div className="absolute inset-0 bg-slate-800 opacity-50 z-0" />
                      
                      {cameraState === "idle" && (
                        <button onClick={startCameraSequence} className="z-10 bg-white text-slate-900 px-6 py-2 rounded-full font-bold text-sm shadow-lg hover:scale-105 transition">
                          Start Camera
                        </button>
                      )}

                      {cameraState === "initiating" && <div className="z-10 h-8 w-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />}
                      
                      {/* Real-time feedback overlay banner */}
                      {cameraState === "analyzing" && (
                        <div className="absolute bottom-6 inset-x-0 flex justify-center z-20">
                          <span className="bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider backdrop-blur-sm shadow border border-white/10">
                            {analysisText}
                          </span>
                        </div>
                      )}

                      {/* Countdown with dynamic Framer Motion timeline animation */}
                      <AnimatePresence mode="wait">
                        {typeof cameraState === "number" && (
                          <div className="z-25 absolute inset-0 flex items-center justify-center pointer-events-none">
                            {/* Glowing animated background circle */}
                            <motion.div
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                              transition={{ duration: 0.9, repeat: Infinity, ease: "easeOut" }}
                              className="absolute w-48 h-48 rounded-full border-4 border-amber-400/80 shadow-[0_0_30px_rgba(251,191,36,0.6)]"
                            />
                            {/* The numbering card */}
                            <motion.div
                              key={cameraState}
                              initial={{ scale: 0.3, rotate: -90, opacity: 0 }}
                              animate={{ scale: [1.3, 1], rotate: 0, opacity: 1 }}
                              exit={{ scale: 2.5, rotate: 45, opacity: 0 }}
                              transition={{ 
                                type: "spring",
                                stiffness: 220,
                                damping: 14,
                                duration: 0.45 
                              }}
                              className={`w-32 h-32 rounded-full flex items-center justify-center text-7xl font-black shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-md border border-white/30
                                ${cameraState === 3 ? "bg-red-500/90 text-white border-red-400" : ""}
                                ${cameraState === 2 ? "bg-amber-500/90 text-white border-amber-400" : ""}
                                ${cameraState === 1 ? "bg-emerald-500/90 text-white border-emerald-400" : ""}
                              `}
                            >
                              {cameraState}
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>

                      {/* Matrix Grid Effect during scan */}
                      {cameraState === "scanning" && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.25 }}
                          className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.15)_1px,transparent_1px)] bg-[size:16px_16px] z-20 pointer-events-none"
                        />
                      )}

                      {/* Scanning Line */}
                      {cameraState === "scanning" && (
                        <motion.div 
                          initial={{ top: "0%", opacity: 0 }} 
                          animate={{ 
                            top: ["0%", "100%", "0%"], 
                            opacity: [1, 1, 1] 
                          }} 
                          transition={{ 
                            duration: 1.8, 
                            ease: "easeInOut"
                          }}
                          className="absolute left-0 right-0 h-1 bg-green-400 shadow-[0_0_20px_rgba(74,222,128,1),0_0_10px_rgba(74,222,128,0.8)] z-30 pointer-events-none"
                        />
                      )}

                      {/* Camera Permission/Device Error */}
                      {cameraError && (
                        <div className="absolute inset-x-0 px-4 text-center z-25">
                          <span className="bg-red-600/90 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow backdrop-blur-sm">
                            {cameraError}
                          </span>
                        </div>
                      )}

                      {/* Final Result Image (Square-cropped) */}
                      {cameraState === "confirm" && (
                         capturedImage ? (
                           <motion.img 
                             initial={{ scale: 1.1, opacity: 0 }}
                             animate={{ scale: 1, opacity: 1 }}
                             transition={{ duration: 0.5, ease: "easeOut" }}
                             src={capturedImage} 
                             alt="Captured face" 
                             className="absolute inset-0 w-full h-full object-cover z-10" 
                           />
                         ) : (
                           <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" alt="Scanned face" className="absolute inset-0 w-full h-full object-cover z-10" />
                         )
                      )}
                    </motion.div>

                    {/* Camera Actions */}
                    {cameraState === "confirm" && (
                      <div className="mt-8 flex gap-4">
                        <button onClick={startCameraSequence} className="px-8 py-3 rounded-full bg-white border border-slate-200 font-bold text-sm hover:bg-slate-50 transition">Retake</button>
                        <button onClick={confirmUpload} className="px-8 py-3 rounded-full bg-[#384152] text-white font-bold text-sm hover:bg-[#2a313e] transition">Confirm</button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* PASSPORT UPLOAD VIEW */}
                {docView === "upload" && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center w-full max-w-3xl mt-4">
                    <h2 className="text-3xl font-extrabold text-slate-900 mb-1">Passport,</h2>
                    <h2 className="text-3xl font-extrabold text-indigo-600 mb-8">photo page up</h2>

                    <div className="bg-[#f0f9ff] w-full max-w-lg aspect-video rounded-3xl border border-blue-100 flex flex-col items-center justify-center p-6 mb-6">
                      <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm text-indigo-500">
                        <Upload className="h-5 w-5" />
                      </div>
                      <p className="font-bold text-sm mb-4">Upload your passport here</p>
                      <button onClick={confirmUpload} className="bg-white border border-slate-200 px-6 py-2.5 rounded-full text-sm font-semibold shadow-sm hover:bg-slate-50 transition">
                        Browse files
                      </button>
                    </div>

                    {/* Bottom Tabs Mock */}
                    <div className="flex bg-white rounded-full p-1 border border-slate-200 shadow-sm">
                      <button onClick={() => startCameraSequence()} className="px-4 py-2 rounded-full text-xs font-bold text-slate-500 flex items-center gap-1.5 hover:text-slate-900"><Camera className="h-3.5 w-3.5"/> Live Capture</button>
                      <button className="px-4 py-2 rounded-full text-xs font-bold text-slate-900 bg-slate-100 flex items-center gap-1.5"><Upload className="h-3.5 w-3.5"/> Upload from device</button>
                      <button 
                        onClick={() => {
                          setPhoneUploadModalOpen(true);
                          setPhoneUploadStep("info");
                        }} 
                        className="px-4 py-2 rounded-full text-xs font-bold text-slate-500 flex items-center gap-1.5 hover:text-slate-900"
                      >
                        <Maximize className="h-3.5 w-3.5"/> Scan from phone
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Old QR Code page-view has been replaced by the Phone Upload modal overlay */}

              </motion.div>
            )}

            {/* STEP 3: CHECKOUT */}
            {currentStep === "checkout" && (
              <motion.div key="step-checkout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full mt-24 text-center">
                <h1 className="text-3xl font-bold">Checkout</h1>
                <p className="text-slate-500 mt-2">Payment flow would go here.</p>
              </motion.div>
            )}
            
          </AnimatePresence>
        </main>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50 text-sm font-semibold border border-slate-800"
          >
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phone Upload Modal Overlay */}
      <AnimatePresence>
        {phoneUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPhoneUploadModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] p-6 md:p-10 shadow-2xl w-full max-w-3xl relative z-10 flex flex-col items-center"
            >
              {/* Close Button */}
              <button
                onClick={() => setPhoneUploadModalOpen(false)}
                className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
              >
                <X className="h-5 w-5" />
              </button>

              {phoneUploadStep === "info" ? (
                <div className="flex flex-col items-center w-full">
                  {/* Top Phone Icon */}
                  <div className="flex items-center justify-center text-indigo-600 mb-6">
                    <svg className="w-12 h-12 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <path d="M12 18h.01" />
                      <path d="M2 9a9 9 0 0 1 0 6" />
                      <path d="M22 9a9 9 0 0 0 0 6" />
                    </svg>
                  </div>

                  {/* Title & Subtitle */}
                  <h2 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] text-center mb-2">
                    Upload documents using your phone
                  </h2>
                  <p className="text-slate-500 text-sm md:text-base text-center max-w-md mb-8">
                    Scan, connect, and securely upload your documents in real time
                  </p>

                  {/* Step Indicators */}
                  <div className="flex items-center justify-between w-full max-w-md mb-10">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100 shadow-sm shrink-0">1</div>
                    <div className="flex-1 border-t border-dashed border-indigo-100 mx-2"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-200 shrink-0"></div>
                    <div className="flex-1 border-t border-dashed border-indigo-100 mx-2"></div>
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100 shadow-sm shrink-0">2</div>
                    <div className="flex-1 border-t border-dashed border-indigo-100 mx-2"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-200 shrink-0"></div>
                    <div className="flex-1 border-t border-dashed border-indigo-100 mx-2"></div>
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100 shadow-sm shrink-0">3</div>
                  </div>

                  {/* 3 Columns Walkthrough */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                    {/* Step 1 */}
                    <div className="flex flex-col items-center text-center">
                      <div className="h-24 flex items-center justify-center">
                        <svg className="w-24 h-24 text-indigo-600" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="35" y="15" width="30" height="60" rx="6" stroke="currentColor" fill="white" />
                          <line x1="45" y1="20" x2="55" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                          <rect x="42" y="27" width="16" height="16" stroke="currentColor" strokeWidth="1.5" />
                          <rect x="45" y="30" width="4" height="4" fill="currentColor" />
                          <rect x="51" y="30" width="4" height="4" fill="currentColor" />
                          <rect x="45" y="36" width="4" height="4" fill="currentColor" />
                          <rect x="51" y="36" width="4" height="4" fill="currentColor" />
                          <path d="M28,25 L28,18 L35,18" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M72,25 L72,18 L65,18" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M28,65 L28,72 L35,72" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M72,65 L72,72 L65,72" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M25,45 A15,15 0 0,1 25,35" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                          <path d="M75,45 A15,15 0 0,0 75,35" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </div>
                      <p className="text-xs text-slate-500 font-medium max-w-[200px] leading-relaxed mt-4">
                        Scan the QR code to securely connect your phone
                      </p>
                    </div>

                    {/* Step 2 */}
                    <div className="flex flex-col items-center text-center">
                      <div className="h-24 flex items-center justify-center">
                        <svg className="w-28 h-24 text-indigo-600" viewBox="0 0 120 100" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="15" y="25" width="45" height="30" rx="3" fill="white" />
                          <line x1="10" y1="55" x2="65" y2="55" stroke="currentColor" strokeWidth="3" />
                          <circle cx="37" cy="40" r="4" fill="currentColor" />
                          <rect x="25" y="47" width="25" height="2" fill="currentColor" />
                          <rect x="75" y="30" width="20" height="40" rx="4" fill="white" />
                          <line x1="82" y1="34" x2="88" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <circle cx="85" cy="50" r="3" fill="currentColor" />
                          <path d="M45,20 C60,5 75,10 82,25" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4,4" strokeLinecap="round" />
                          <rect x="53" y="45" width="14" height="14" rx="2" fill="#4f46e5" stroke="none" />
                          <path d="M56,45 L56,41 A4,4 0 0,1 64,41 L64,45" stroke="#4f46e5" strokeWidth="1.5" fill="none" />
                          <circle cx="60" cy="52" r="1.5" fill="white" stroke="none" />
                        </svg>
                      </div>
                      <p className="text-xs text-slate-500 font-medium max-w-[200px] leading-relaxed mt-4">
                        Your phone can now be used as an additional upload device
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="flex flex-col items-center text-center">
                      <div className="h-24 flex items-center justify-center">
                        <svg className="w-28 h-24 text-indigo-600" viewBox="0 0 120 100" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="15" y="25" width="24" height="48" rx="5" fill="white" />
                          <line x1="23" y1="29" x2="31" y2="29" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <rect x="20" y="37" width="14" height="18" rx="1" fill="none" />
                          <path d="M27,50 L27,42 M24,45 L27,42 L30,45" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <rect x="65" y="25" width="40" height="48" rx="4" fill="white" />
                          <line x1="70" y1="35" x2="85" y2="35" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="95" cy="35" r="3.5" fill="#10b981" stroke="none" />
                          <path d="M93,35 L94.5,36.5 L97,33.5" stroke="white" strokeWidth="1" strokeLinecap="round" />
                          
                          <line x1="70" y1="47" x2="85" y2="47" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="95" cy="47" r="3.5" fill="#10b981" stroke="none" />
                          <path d="M93,47 L94.5,48.5 L97,45.5" stroke="white" strokeWidth="1" strokeLinecap="round" />

                          <line x1="70" y1="59" x2="85" y2="59" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="95" cy="59" r="3.5" fill="#10b981" stroke="none" />
                          <path d="M93,59 L94.5,60.5 L97,57.5" stroke="white" strokeWidth="1" strokeLinecap="round" />
                          <path d="M43,45 C50,42 58,42 62,45" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,3" />
                        </svg>
                      </div>
                      <p className="text-xs text-slate-500 font-medium max-w-[200px] leading-relaxed mt-4">
                        Your uploaded documents get synced in real-time
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => setPhoneUploadStep("qr")}
                    className="w-full max-w-md py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition shadow-lg shadow-indigo-600/20 text-center cursor-pointer mt-12 mb-4"
                  >
                    Continue on phone
                  </button>

                  {/* Encryption Note */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Protected with industry-standard AES-256 encryption</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center w-full max-w-md py-4">
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Scan QR Code</h2>
                  <p className="text-slate-500 text-sm mb-8">Scan this code with your phone camera to securely sync and upload your files.</p>
                  
                  {/* QR Code Container */}
                  <div className="relative w-56 h-56 bg-slate-50 rounded-3xl border border-slate-100 p-4 shadow-inner flex items-center justify-center mb-6">
                    <div className="absolute top-3 left-3 w-6 h-6 border-t-4 border-l-4 border-indigo-600 rounded-tl-lg"></div>
                    <div className="absolute top-3 right-3 w-6 h-6 border-t-4 border-r-4 border-indigo-600 rounded-tr-lg"></div>
                    <div className="absolute bottom-3 left-3 w-6 h-6 border-b-4 border-l-4 border-indigo-600 rounded-bl-lg"></div>
                    <div className="absolute bottom-3 right-3 w-6 h-6 border-b-4 border-r-4 border-indigo-600 rounded-br-lg"></div>
                    
                    <svg className="w-40 h-40 text-slate-850" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 0h2v2h-2v-2z"/>
                    </svg>
                  </div>

                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mb-8">
                    <CheckCircle className="h-3.5 w-3.5" /> 100% Encrypted & Safe
                  </span>

                  <button
                    onClick={() => setPhoneUploadStep("info")}
                    className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to instructions
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ApplyPageContent />
    </Suspense>
  );
}
