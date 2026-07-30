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
  X
} from "lucide-react";

type StepType = "travelers" | "docs" | "checkout";
type CameraState = "idle" | "initiating" | "noface" | "closer" | "hold" | 3 | 2 | 1 | "scanning" | "confirm";
type DocUploadView = "list" | "camera" | "upload" | "qr";

interface Traveler {
  id: string;
  firstName: string;
  lastName: string;
}

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = () => {
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

  const videoRefCallback = (node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && videoStreamRef.current) {
      node.srcObject = videoStreamRef.current;
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
      clearCameraTimeouts();
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

  const startCameraSequence = async () => {
    setDocView("camera");
    setCameraState("initiating");
    setCameraError(null);
    setCapturedImage(null);
    clearCameraTimeouts();

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

      timeoutsRef.current.push(setTimeout(() => setCameraState("noface"), 1500));
      timeoutsRef.current.push(setTimeout(() => setCameraState("closer"), 2500));
      timeoutsRef.current.push(setTimeout(() => setCameraState("hold"), 3500));
      timeoutsRef.current.push(setTimeout(() => setCameraState(3), 4500));
      timeoutsRef.current.push(setTimeout(() => setCameraState(2), 5500));
      timeoutsRef.current.push(setTimeout(() => setCameraState(1), 6500));
      timeoutsRef.current.push(
        setTimeout(() => {
          setCameraState("scanning");
          capturePhoto();
        }, 7500)
      );
      timeoutsRef.current.push(
        setTimeout(() => {
          setCameraState("confirm");
          stopCamera();
        }, 9500)
      );
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
      <header className="sticky top-0 z-40 bg-[#f8f9fa] px-4 md:px-8 py-4 flex items-center justify-between">
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
      </header>

      <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1400px] mx-auto px-4 py-8">
        
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col gap-8 w-24 shrink-0 items-center pt-12">
          <div className={`flex flex-col items-center gap-2 ${currentStep === "travelers" ? "text-indigo-600" : "text-slate-400"}`}>
            <User className="h-6 w-6" />
            <span className="text-[10px] font-bold">Travelers</span>
          </div>
          <div className={`flex flex-col items-center gap-2 ${currentStep === "docs" ? "text-indigo-600" : "text-slate-400"}`}>
            <FileText className="h-6 w-6" />
            <span className="text-[10px] font-bold">Docs</span>
          </div>
          <div className={`flex flex-col items-center gap-2 ${currentStep === "checkout" ? "text-indigo-600" : "text-slate-400"}`}>
            <ShoppingCart className="h-6 w-6" />
            <span className="text-[10px] font-bold">Checkout</span>
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
                      {travelers.map((t) => {
                        const photoUploaded = uploadedDocs[`${t.id}-Photo`];
                        const passportUploaded = uploadedDocs[`${t.id}-Passport`];
                        const uploadedCount = (photoUploaded ? 1 : 0) + (passportUploaded ? 1 : 0);

                        return (
                          <motion.div layout initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} key={t.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 w-full max-w-[340px] flex flex-col">
                            {/* Card Header */}
                            <div className="flex items-center gap-4 mb-6">
                              {photoUploaded && typeof photoUploaded === "string" && photoUploaded.startsWith("data:") ? (
                                <img
                                  src={photoUploaded}
                                  alt={`${t.firstName}'s photo`}
                                  className="h-12 w-12 rounded-full object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-[#E5D5D5] flex items-center justify-center text-slate-700 font-bold text-lg shrink-0">
                                  {t.firstName.substring(0, 2)}
                                </div>
                              )}
                              <div>
                                <h3 className="font-bold text-lg">{t.firstName}</h3>
                                <p className="text-xs text-slate-400 font-semibold">{uploadedCount}/2 docs uploaded</p>
                              </div>
                            </div>

                            {/* Buttons */}
                            <div className="space-y-3">
                              <button 
                                onClick={() => { setActiveTravelerId(t.id); setActiveDocType("Photo"); setDocView(photoUploaded ? "upload" : "camera"); }}
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
                              <button onClick={() => setDocView("qr")} className="text-xs text-indigo-600 font-bold flex items-center gap-1.5 hover:underline">
                                <Maximize className="h-3.5 w-3.5" /> Upload from phone
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
                      <button onClick={() => setCurrentStep("travelers")} className="px-6 py-3.5 rounded-full bg-white border border-slate-200 shadow-sm text-indigo-600 font-semibold text-sm flex items-center gap-2 hover:bg-slate-50 transition">
                        <Plus className="h-4 w-4" /> Add travelers
                      </button>
                      <button onClick={() => setCurrentStep("checkout")} className="px-6 py-3.5 rounded-full bg-[#f3f4f6] text-slate-400 font-semibold text-sm flex items-center gap-2 cursor-not-allowed">
                        <Lock className="h-4 w-4" /> Proceed to checkout
                      </button>
                    </div>
                  </>
                )}

                {/* CAMERA VIEW MOCK */}
                {docView === "camera" && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center w-full max-w-2xl mt-4">
                    <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-2">Look ahead,</h2>
                    <h2 className="text-2xl md:text-4xl font-extrabold text-indigo-600 mb-8">straight at the camera</h2>
                    
                    <div className="relative w-72 h-72 md:w-96 md:h-96 rounded-full border-[6px] border-white shadow-2xl bg-black overflow-hidden flex items-center justify-center">
                      
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
                      
                      {/* Overlays during capture */}
                      {(cameraState === "noface" || cameraState === "closer" || cameraState === "hold" || cameraState === "scanning") && (
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center z-20">
                          <span className="bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider backdrop-blur-sm">
                            {cameraState === "noface" && "No Face Detected"}
                            {cameraState === "closer" && "Come Closer"}
                            {cameraState === "hold" && "Hold Still"}
                            {cameraState === "scanning" && "Scanning"}
                          </span>
                        </div>
                      )}

                      {/* Countdown */}
                      {typeof cameraState === "number" && (
                        <span className="z-20 text-white text-8xl font-black drop-shadow-lg">{cameraState}</span>
                      )}

                      {/* Scanning Line */}
                      {cameraState === "scanning" && (
                        <motion.div 
                          initial={{ top: "0%" }} 
                          animate={{ top: "100%" }} 
                          transition={{ duration: 1.5, ease: "linear" }}
                          className="absolute left-0 right-0 h-1 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)] z-30"
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

                      {/* Final Result Image */}
                      {cameraState === "confirm" && (
                         capturedImage ? (
                           <img src={capturedImage} alt="Captured face" className="absolute inset-0 w-full h-full object-cover z-10" />
                         ) : (
                           <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" alt="Scanned face" className="absolute inset-0 w-full h-full object-cover z-10" />
                         )
                      )}
                    </div>

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
                      <button onClick={() => setDocView("camera")} className="px-4 py-2 rounded-full text-xs font-bold text-slate-500 flex items-center gap-1.5 hover:text-slate-900"><Camera className="h-3.5 w-3.5"/> Live Capture</button>
                      <button className="px-4 py-2 rounded-full text-xs font-bold text-slate-900 bg-slate-100 flex items-center gap-1.5"><Upload className="h-3.5 w-3.5"/> Upload from device</button>
                      <button onClick={() => setDocView("qr")} className="px-4 py-2 rounded-full text-xs font-bold text-slate-500 flex items-center gap-1.5 hover:text-slate-900"><Maximize className="h-3.5 w-3.5"/> Scan from phone</button>
                    </div>
                  </motion.div>
                )}

                {/* QR CODE VIEW */}
                {docView === "qr" && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center w-full max-w-3xl mt-4">
                     <h2 className="text-3xl font-extrabold text-slate-900 mb-8">Upload via Phone</h2>
                     <div className="bg-white w-full max-w-md rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center p-8 text-center">
                        <p className="text-sm font-semibold text-slate-600 mb-6">Scan with your phone camera. We'll automatically reflect it here the moment it's captured.</p>
                        <div className="w-48 h-48 bg-slate-100 rounded-xl mb-4 flex items-center justify-center">
                          {/* Mock QR SVG */}
                          <svg className="w-40 h-40 opacity-50" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 0h2v2h-2v-2z"/></svg>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3 w-3"/> 100% Encrypted</span>
                     </div>
                  </motion.div>
                )}

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
