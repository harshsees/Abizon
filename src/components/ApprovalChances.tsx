"use client";

/**
 * The approval-likelihood quiz.
 *
 * Split out of `VisaInfoAndPlans` along with all of its state — roughly a third
 * of that component, used nowhere else. Markup and the scoring maths are
 * unchanged.
 *
 * The scoring is an in-app heuristic, not a model or an underwriting rule.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

export function ApprovalChances({ countryName }: { countryName: string }) {
  const quizQuestions = [
    { id: 1, num: "01", question: "Have you travelled internationally before?", options: ["Yes", "No"] },
    { id: 2, num: "02", question: `Have you travelled to ${countryName} before?`, options: ["Yes", "No"] },
    { id: 3, num: "03", question: "Have you ever overstayed your visa duration before?", options: ["Yes", "No"] },
    { id: 4, num: "04", question: "Have you ever been convicted of a crime?", options: ["Yes", "No"] },
    { id: 5, num: "05", question: "What's your approximate bank balance?", options: ["0 - ₹25,000", "₹25,000 - 50000", "₹50,000 - 75000", "₹75,000+"] },
    { id: 6, num: "06", question: "Is your passport valid for at least 6 months after your travel date?", options: ["Yes", "No"] },
  ];

  const [showQuiz, setShowQuiz] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});

  const handleAnswer = (answer: string) => {
    setQuizAnswers((prev) => ({ ...prev, [quizStep]: answer }));
    setQuizStep((prev) => prev + 1);
  };

  const calculateResult = () => {
    let score = 75;

    if (quizAnswers[0] === "Yes") score += 10;
    else score -= 10;

    if (quizAnswers[1] === "Yes") score += 10;

    if (quizAnswers[2] === "Yes") score -= 45;
    else score += 5;

    if (quizAnswers[3] === "Yes") score -= 60;
    else score += 5;

    if (quizAnswers[4] === "0 - ₹25,000") score -= 25;
    else if (quizAnswers[4] === "₹25,000 - 50000") score -= 5;
    else if (quizAnswers[4] === "₹50,000 - 75000") score += 5;
    else if (quizAnswers[4] === "₹75,000+") score += 15;

    if (quizAnswers[5] === "No") score -= 80;

    const finalScore = Math.max(1, Math.min(99, score));

    let reason = "Your profile matches the standard requirements for a high approval rate.";
    if (quizAnswers[3] === "Yes") {
      reason = "Criminal record severely impacts visa approval chances.";
    } else if (quizAnswers[5] === "No") {
      reason = "Passport must be valid for at least 6 months after your travel date.";
    } else if (quizAnswers[2] === "Yes") {
      reason = "Overstaying your visa duration severely impacts future applications.";
    } else if (quizAnswers[4] === "0 - ₹25,000") {
      reason = "Low bank balance may impact approval chances.";
    } else if (quizAnswers[0] === "No" && quizAnswers[1] === "No") {
      reason = "First-time international travelers may require additional verification.";
    }

    return { percentage: finalScore, reason };
  };

  const { percentage, reason } = calculateResult();

  const [animatedHeight, setAnimatedHeight] = useState(0);

  useEffect(() => {
    if (quizStep === 6) {
      setAnimatedHeight(0);
      const timer = setTimeout(() => setAnimatedHeight(percentage), 100);
      return () => clearTimeout(timer);
    }
    setAnimatedHeight(0);
  }, [quizStep, percentage]);

  return (
    <>
      <div className="pt-8 border-t border-border/50 space-y-6 font-sans">
        <div>
          <h2 id="approval-section" className="text-2xl font-bold text-foreground tracking-tight scroll-mt-28">
            Want to know if your will be approved?
          </h2>
        </div>

        <div className="flex items-center justify-center p-4">
          {!showQuiz ? (
            /* Promo Card */
            <div className="w-full max-w-xl bg-surface border border-border/60 rounded-3xl p-5 md:p-6 shadow-sm flex items-center justify-between gap-4">
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-primary-subtle-foreground uppercase tracking-wider">Learn Your</p>
                <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 leading-tight">
                  Chances of Approval
                </h3>
                <p className="text-sm text-muted-foreground">
                  Answer 6 questions to know your chances
                </p>
                <button
                  onClick={() => {
                    setShowQuiz(true);
                    setQuizStep(0);
                    setQuizAnswers({});
                  }}
                  className="inline-flex items-center gap-1 text-sm font-bold text-primary-subtle-foreground hover:text-amber-800 transition mt-2.5 cursor-pointer"
                >
                  Evaluate my chances <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col items-center gap-3 pr-2 shrink-0">
                {/* Dotted gauge wheel */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="5" strokeDasharray="1 2.5" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#d97706" /* Amber-600 */
                      strokeWidth="5"
                      strokeDasharray="1 2.5"
                      strokeDashoffset="15"
                      className="transform -rotate-90 origin-center"
                    />
                    <text x="50" y="55" textAnchor="middle" className="text-[17px] font-black fill-amber-700">
                      100%
                    </text>
                  </svg>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[9.5px] font-bold text-primary-subtle-foreground shadow-sm border border-amber-100/50">
                  Takes 5 seconds
                </span>
              </div>
            </div>
          ) : quizStep < 6 ? (
            /* Active Quiz Interface */
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative flex items-center justify-center w-[340px] h-[340px] sm:w-[400px] sm:h-[400px] rounded-full shadow-md bg-surface-sunken/50">
                {/* SVG Progress Ring for smooth hardware-accelerated circular animation */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="3.5"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="3.5"
                    strokeDasharray={2 * Math.PI * 46}
                    strokeDashoffset={2 * Math.PI * 46 * (1 - quizStep / 6)}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={quizStep}
                    initial={{ opacity: 0, scale: 0.92, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10 w-[270px] sm:w-[320px] bg-surface rounded-2xl shadow-xl border border-border p-6 flex flex-col justify-between h-[270px] sm:h-[300px]"
                  >
                    <div>
                      <p className="text-4xl sm:text-5xl font-extrabold text-slate-200 leading-none">
                        {quizQuestions[quizStep].num}
                      </p>
                      <h4 className="text-sm sm:text-base font-bold text-slate-800 mt-4 leading-snug">
                        {quizQuestions[quizStep].question}
                      </h4>
                    </div>

                    <div className="space-y-2">
                      {quizQuestions[quizStep].options.length === 2 ? (
                        <div className="space-y-2 flex flex-col">
                          <button
                            onClick={() => handleAnswer(quizQuestions[quizStep].options[0])}
                            className="w-full py-2 sm:py-2.5 rounded-xl border border-border bg-surface text-xs sm:text-sm font-bold text-muted-foreground hover:bg-primary hover:text-white hover:border-primary transition-all duration-200"
                          >
                            {quizQuestions[quizStep].options[0]}
                          </button>
                          <button
                            onClick={() => handleAnswer(quizQuestions[quizStep].options[1])}
                            className="w-full py-2 sm:py-2.5 rounded-xl border border-border bg-surface text-xs sm:text-sm font-bold text-muted-foreground hover:bg-primary hover:text-white hover:border-primary transition-all duration-200"
                          >
                            {quizQuestions[quizStep].options[1]}
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {quizQuestions[quizStep].options.map(opt => (
                            <button
                              key={opt}
                              onClick={() => handleAnswer(opt)}
                              className="py-2.5 rounded-xl border border-border bg-surface text-[10px] sm:text-xs font-bold text-muted-foreground hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 leading-tight flex items-center justify-center px-1"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          ) : (
            /* Results Screen with Liquid Wave Effect */
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-[340px] h-[340px] sm:w-[400px] sm:h-[400px] rounded-full overflow-hidden flex flex-col justify-center items-center p-6 text-center shadow-xl border border-amber-100 bg-amber-50/30">
                
                {/* Wave container filling corresponding to percentage */}
                <div
                  className="absolute bottom-0 left-0 right-0 bg-primary transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                  style={{ height: `${animatedHeight}%` }}
                >
                  {/* Front Wave */}
                  <svg className="absolute left-0 w-[200%] h-12 -top-10 text-primary fill-current animate-wave" viewBox="0 0 1200 120" preserveAspectRatio="none">
                    <path d="M0,60 C150,100 350,20 500,60 C650,100 850,20 1000,60 C1150,100 1300,20 1450,60 L1450,120 L0,120 Z" />
                  </svg>
                  {/* Back Wave (slightly offset and transparent) */}
                  <svg className="absolute left-0 w-[200%] h-12 -top-12 text-primary/50 fill-current animate-wave-slow opacity-60" viewBox="0 0 1200 120" preserveAspectRatio="none">
                    <path d="M0,50 C100,20 250,80 400,50 C550,20 700,80 850,50 C1000,20 1150,80 1300,50 L1300,120 L0,120 Z" />
                  </svg>
                </div>

                {/* Info Text Layer overlay on top of wave */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full w-full pt-4">
                  <p
                    className={`text-6xl sm:text-7xl font-black transition-colors duration-500 ${
                      percentage > 50 ? "text-white" : "text-slate-800"
                    }`}
                  >
                    {percentage}%
                  </p>
                  <h4
                    className={`text-lg sm:text-xl font-bold transition-colors duration-500 mt-2 ${
                      percentage > 50 ? "text-amber-50" : "text-slate-700"
                    }`}
                  >
                    Chances of Approval
                  </h4>
                  <p
                    className={`text-xs sm:text-sm max-w-[240px] transition-colors duration-500 mt-2 leading-relaxed font-medium ${
                      percentage > 50 ? "text-amber-100/90" : "text-muted-foreground"
                    }`}
                  >
                    {reason}
                  </p>

                  <div className="mt-6 flex flex-col items-center gap-3 w-full">
                    <button
                      onClick={() => setShowQuiz(false)}
                      className="w-3/4 sm:w-2/3 font-bold px-6 py-3 rounded-full shadow-md transition-transform hover:scale-105 active:scale-95 text-sm cursor-pointer bg-surface text-primary"
                    >
                      Apply anyway
                    </button>
                    
                    <button
                      onClick={() => {
                        setQuizStep(0);
                        setQuizAnswers({});
                      }}
                      className="text-xs font-semibold tracking-wide transition-colors duration-300 text-white hover:text-white/80 underline cursor-pointer"
                    >
                      Retake
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global CSS Style tag for wave keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes wave-move {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-wave {
          animation: wave-move 6s linear infinite;
        }
        .animate-wave-slow {
          animation: wave-move 10s linear infinite;
        }
      `}} />
    </>
  );
}
