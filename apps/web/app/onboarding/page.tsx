"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { LiquidMetalButton } from "@/features/feed/components/LiquidMetalButton";
import { HandwrittenWelcome } from "@/features/feed/components/HandwrittenWelcome";

const STORAGE_KEY = "feed_onboarding_completed_v1";
const MIN_TOPICS = 5;
const MIN_PEOPLE = 3;

const TOPICS = [
  "Hollywood",
  "Bollywood",
  "Tollywood",
  "Kollywood",
  "Mollywood",
  "Auteur Cinema",
  "Short Films",
  "Cinematography",
  "Screenwriting",
  "Directing",
  "Film Editing",
  "Color Grading",
  "Documentary",
  "Sound Design",
  "Production Design",
  "Film Festivals",
  "Animation",
  "Indie Films",
  "World Cinema",
  "Acting Craft",
  "Film Theory",
  "Experimental Film",
  "Classic Cinema",
  "Neo-Noir",
  "Horror",
  "Sci-Fi",
  "Romance",
  "Comedy",
  "Thriller",
  "Drama",
  "Musicals",
  "Asian Cinema",
  "European Cinema",
  "Latin American Cinema",
  "Middle Eastern Cinema",
  "African Cinema",
  "Women in Film",
  "LGBTQ+ Cinema",
  "Behind the Scenes",
  "Film Scores",
  "VFX",
  "Storyboarding",
  "Camera Gear",
  "Festival Strategy",
  "Distribution",
  "Streaming Releases",
  "Debut Features",
  "Student Films",
  "Set Design",
  "Film Marketing",
] as const;

const PEOPLE = [
  {
    id: "alina-g",
    name: "Alina Gomez",
    handle: "@alina.g",
    role: "Director - Barcelona",
    initial: "A",
    avatarBg: "linear-gradient(135deg,#232323,#0f0f0f)",
    avatarColor: "#f1f1f1",
  },
  {
    id: "miles-cho",
    name: "Miles Cho",
    handle: "@milescho",
    role: "Cinematographer - Seoul",
    initial: "M",
    avatarBg: "linear-gradient(135deg,#1d2c45,#121c2f)",
    avatarColor: "#91b0d8",
  },
  {
    id: "ravi-mehta",
    name: "Ravi Mehta",
    handle: "@ravi.mehta",
    role: "Editor - Mumbai",
    initial: "R",
    avatarBg: "linear-gradient(135deg,#2f2418,#19110a)",
    avatarColor: "#d7b48c",
  },
  {
    id: "zoe-li",
    name: "Zoe Li",
    handle: "@zoeli",
    role: "Producer - Singapore",
    initial: "Z",
    avatarBg: "linear-gradient(135deg,#2a1e30,#1a1320)",
    avatarColor: "#b794c6",
  },
  {
    id: "noah-owens",
    name: "Noah Owens",
    handle: "@noahowens",
    role: "Screenwriter - London",
    initial: "N",
    avatarBg: "linear-gradient(135deg,#1f2f22,#101912)",
    avatarColor: "#96bf96",
  },
  {
    id: "lea-moreau",
    name: "Lea Moreau",
    handle: "@lea.moreau",
    role: "Composer - Paris",
    initial: "L",
    avatarBg: "linear-gradient(135deg,#2e2320,#1c1513)",
    avatarColor: "#d0a99f",
  },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [stage, setStage] = useState<"welcome" | "topics" | "people">("welcome");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [showWelcomeCta, setShowWelcomeCta] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const completionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (completionTimerRef.current) {
        window.clearTimeout(completionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (stage !== "welcome") {
      setShowWelcomeCta(false);
    }
  }, [stage]);

  const canContinueTopics = selectedTopics.length >= MIN_TOPICS;
  const canContinuePeople = selectedPeople.length >= MIN_PEOPLE;

  const selectedPeopleSet = useMemo(() => new Set(selectedPeople), [selectedPeople]);

  const toggleTopic = (topic: string) => {
    setSelectedTopics((current) => {
      if (current.includes(topic)) {
        return current.filter((entry) => entry !== topic);
      }
      return [...current, topic];
    });
  };

  const togglePerson = (personId: string) => {
    setSelectedPeople((current) => {
      if (current.includes(personId)) {
        return current.filter((entry) => entry !== personId);
      }
      return [...current, personId];
    });
  };

  const completeOnboarding = () => {
    if (isCompleting) return;
    setIsCompleting(true);

    completionTimerRef.current = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, "true");
      setIsCompleting(false);
      completionTimerRef.current = null;
      router.push("/");
    }, 620);
  };

  return (
    <div className="min-h-screen bg-[#0e0c0a] text-[#f5f0e8] flex items-center justify-center px-4 py-8">
      <div
        className={cn(
          "fixed inset-0 bg-[#0e0c0a] transition-opacity duration-1000",
          isCompleting ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      <section
        className={cn(
          "w-full max-w-[600px] rounded-[24px] bg-[#1a1a1a]/40 border border-white/5 shadow-[0_32px_96px_rgba(0,0,0,0.4)] backdrop-blur-xl relative transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
          isCompleting && "opacity-0 scale-[0.98] blur-xl translate-y-4"
        )}
      >
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#c0392b] to-transparent opacity-50" />

        <div
          className={cn(
            "px-8 py-8 md:px-12 md:py-10 border-b border-white/5",
            stage === "welcome" && "hidden"
          )}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c0392b] animate-pulse" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#f5f0e8]/40 ">
              Onboarding Stage {stage === "topics" ? "01" : "02"}
            </p>
          </div>
          <h2 className="italic text-[32px] md:text-[40px] leading-[1.1] text-[#f5f0e8]">
            {stage === "topics" && "Choose your film interests"}
            {stage === "people" && "Follow filmmakers"}
          </h2>
          <p className="mt-4 text-[14px] md:text-[15px] leading-relaxed text-[#f5f0e8]/50 max-w-[420px]">
            {stage === "topics" && "Select at least 5 topics to shape your first timeline. This helps us curate the best of cinema for you."}
            {stage === "people" && "Follow at least 3 people to personalize your feed and join the conversation."}
          </p>
        </div>

        {stage === "topics" && (
          <div className="px-8 py-8 md:px-12 md:py-10">
            <div className="flex items-center justify-between mb-8">
              <p className="text-[12px] text-[#f5f0e8]/60 uppercase tracking-widest">
                Selected <span className="text-[#f5f0e8] font-bold">{selectedTopics.length}</span> / {MIN_TOPICS}
              </p>
            </div>
            <div className="max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="flex flex-wrap gap-2.5">
                {TOPICS.map((topic) => {
                  const selected = selectedTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopic(topic)}
                      className={cn(
                        "group rounded-full px-5 py-2.5 text-[13.5px] border transition-all duration-300",
                        selected
                          ? "bg-white text-black border-white shadow-[0_8px_20px_rgba(255,255,255,0.15)]"
                          : "bg-white/[0.03] text-[#f5f0e8]/60 border-white/10 hover:border-white/20 hover:bg-white/[0.06]"
                      )}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {stage === "people" && (
          <div className="px-8 py-8 md:px-12 md:py-10">
            <div className="flex items-center justify-between mb-8">
              <p className="text-[12px] text-[#f5f0e8]/60 uppercase tracking-widest">
                Following <span className="text-[#f5f0e8] font-bold">{selectedPeople.length}</span> / {MIN_PEOPLE}
              </p>
            </div>
            <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {PEOPLE.map((person) => {
                const selected = selectedPeopleSet.has(person.id);
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => togglePerson(person.id)}
                    className={cn(
                      "group w-full rounded-[16px] border px-5 py-4 text-left transition-all duration-300 flex items-center gap-4",
                      selected
                        ? "border-white/20 bg-white/[0.04]"
                        : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                    )}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold border border-white/10"
                      style={{
                        background: person.avatarBg,
                        color: person.avatarColor,
                      }}
                    >
                      {person.initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-medium text-[#f5f0e8] truncate">{person.name}</p>
                      <p className="text-[12px] text-[#f5f0e8]/40 truncate">
                        {person.handle} · {person.role}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-5 py-2 text-[11px] font-bold tracking-widest uppercase transition-all duration-300",
                        selected
                          ? "bg-white text-black"
                          : "bg-[#c0392b] text-white hover:bg-[#e74c3c]"
                      )}
                    >
                      {selected ? "Following" : "Follow"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {stage === "welcome" && (
          <div className="px-8 py-20 md:px-12 md:py-24">
            <div className="relative overflow-hidden rounded-[24px] text-center py-6">
              <div className="pointer-events-none absolute inset-0 z-0">
                <div className="welcome-grid-3d absolute left-1/2 top-[50%] w-[1000px] h-[600px] -translate-x-1/2 -translate-y-1/2" />
              </div>

              <div className="relative z-10">
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#f5f0e8]/40 mb-6">
                  Experience begins now
                </p>
                <div className="flex justify-center mb-10 transform scale-125 md:scale-150">
                  <HandwrittenWelcome
                    onComplete={() => setShowWelcomeCta(true)}
                  />
                </div>
                <div className="h-[120px] flex items-center justify-center">
                  <LiquidMetalButton
                    onClick={() => setStage("topics")}
                    className={cn(
                      "mx-auto transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      showWelcomeCta
                        ? "opacity-100 translate-y-0 scale-100 blur-0"
                        : "opacity-0 translate-y-8 scale-90 blur-md pointer-events-none"
                    )}
                    label="Begin Journey"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          className={cn(
            "px-8 py-8 md:px-12 md:py-10 flex items-center justify-between gap-4 border-t border-white/5",
            stage === "welcome" && "hidden"
          )}
        >
          {stage === "topics" && (
            <>
              <div />
              <button
                type="button"
                onClick={() => setStage("people")}
                disabled={!canContinueTopics}
                className={cn(
                  "rounded-full px-8 py-3.5 text-[14px] font-bold tracking-widest uppercase transition-all duration-300 shadow-lg",
                  canContinueTopics
                    ? "bg-white text-black hover:scale-105 active:scale-95"
                    : "bg-white/5 text-white/20 cursor-not-allowed"
                )}
              >
                Next Step
              </button>
            </>
          )}

          {stage === "topics" && (
            <button
              type="button"
              onClick={() => setStage("welcome")}
              className="text-[12px] tracking-widest uppercase text-[#f5f0e8]/40 hover:text-[#f5f0e8]/80 transition-colors"
            >
              Back
            </button>
          )}

          {stage === "people" && (
            <>
              <button
                type="button"
                onClick={() => setStage("topics")}
                className="text-[12px] tracking-widest uppercase text-[#f5f0e8]/40 hover:text-[#f5f0e8]/80 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={completeOnboarding}
                disabled={!canContinuePeople}
                className={cn(
                  "rounded-full px-8 py-3.5 text-[14px] font-bold tracking-widest uppercase transition-all duration-300 shadow-lg",
                  canContinuePeople
                    ? "bg-[#c0392b] text-white hover:bg-[#e74c3c] hover:scale-105 active:scale-95 shadow-[#c0392b]/20"
                    : "bg-white/5 text-white/20 cursor-not-allowed"
                )}
              >
                Enter Cinema
              </button>
            </>
          )}
        </div>

        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          .welcome-grid-3d {
            background-image:
              repeating-linear-gradient(
                to right,
                rgba(255, 255, 255, 0.03) 0px,
                rgba(255, 255, 255, 0.03) 1px,
                transparent 1px,
                transparent 40px
              ),
              repeating-linear-gradient(
                to bottom,
                rgba(255, 255, 255, 0.03) 0px,
                rgba(255, 255, 255, 0.03) 1px,
                transparent 1px,
                transparent 40px
              );
            transform:
              translate(-50%, -50%)
              perspective(1000px)
              rotateX(60deg)
              skewX(-20deg);
            opacity: 0.4;
            animation: grid-drift 20s linear infinite alternate;
          }

          @keyframes grid-drift {
            from {
              transform: translate(-50%, -50%) perspective(1000px) rotateX(60deg) skewX(-20deg) translateY(0);
            }
            to {
              transform: translate(-50%, -50%) perspective(1000px) rotateX(60deg) skewX(-20deg) translateY(-40px);
            }
          }
        `}</style>
      </section>
    </div>
  );
}
