"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export function FeedOnboardingModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [stage, setStage] = useState<"topics" | "people" | "welcome">("topics");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [showWelcomeCta, setShowWelcomeCta] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const completionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const forceOpen = new URLSearchParams(window.location.search).get("onboarding") === "1";
    if (forceOpen) {
      setIsVisible(true);
      return;
    }
    const completed = window.localStorage.getItem(STORAGE_KEY) === "true";
    setIsVisible(!completed);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isVisible]);

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
      setIsVisible(false);
      setIsCompleting(false);
      completionTimerRef.current = null;
    }, 620);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] font-sans">
      <div
        className={cn(
          "absolute inset-0 bg-black/45 backdrop-blur-[10px] transition-all duration-500",
          isCompleting && "bg-black/20 backdrop-blur-[3px]"
        )}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-start justify-center px-4 py-7 md:py-12">
        <section
          className={cn(
            "w-full max-w-[600px] rounded-[18px] bg-elevated border border-border shadow-[0_28px_80px_rgba(0,0,0,0.22)] transition-all duration-500 ease-out",
            isCompleting && "opacity-0 scale-[0.97] translate-y-2"
          )}
        >
          <div className="h-[3px] w-full bg-gradient-to-r from-accent via-fg to-accent/30" />
          <div
            className={cn(
              "px-6 py-5 border-b border-border md:px-8 md:py-6",
              stage === "welcome" && "hidden"
            )}
          >
            <p className="text-[10px] uppercase tracking-[0.14em] text-fg-muted ">
              Onboarding
            </p>
            <h2 className="mt-3 italic text-[26px] leading-[1.1] text-fg">
              {stage === "topics" && "Choose your film interests"}
              {stage === "people" && "Follow filmmakers"}
            </h2>
            <p className="mt-2.5 text-[13px] leading-relaxed text-fg-muted">
              {stage === "topics" && "Select at least 5 topics to shape your first timeline."}
              {stage === "people" && "Follow at least 3 people to personalize your feed."}
            </p>
          </div>

          {stage === "topics" && (
            <div className="px-6 py-6 md:px-8 md:py-8">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[12px] text-fg font-medium">
                  Selected <span className="text-fg">{selectedTopics.length}</span> / {MIN_TOPICS} minimum
                </p>
                <span className="text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                  Pick thoughtfully
                </span>
              </div>
              <div className="max-h-[240px] overflow-y-auto pr-1">
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map((topic) => {
                    const selected = selectedTopics.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleTopic(topic)}
                        style={
                          selected
                            ? {
                              background:
                                "linear-gradient(135deg, #525252 0%, #1a1a1a 48%, #7a4032 100%)",
                            }
                            : undefined
                        }
                        className={cn(
                          "group rounded-full px-3.5 py-2 text-[12.5px] border transition-all",
                          selected
                            ? "text-white border-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_14px_rgba(0,0,0,0.16)]"
                            : "bg-elevated text-fg border-neutral-300 hover:border-fg/35 hover:bg-sunken/70"
                        )}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={cn(
                              "w-2.5 h-2.5 rounded-full border transition-colors",
                              selected
                                ? "border-white bg-white/20"
                                : "border-fg-faint group-hover:border-fg-muted"
                            )}
                          />
                          {topic}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {stage === "people" && (
            <div className="px-6 py-6 md:px-8 md:py-8">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[12px] text-fg font-medium">
                  Following <span className="text-fg">{selectedPeople.length}</span> / {MIN_PEOPLE} minimum
                </p>
                <span className="text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                  Build your graph
                </span>
              </div>
              <div className="grid gap-3.5 max-h-[360px] overflow-y-auto pr-1">
                {PEOPLE.map((person) => {
                  const selected = selectedPeopleSet.has(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => togglePerson(person.id)}
                      className={cn(
                        "group w-full rounded-[12px] border px-4 py-3 text-left transition-all flex items-center gap-3",
                        selected
                          ? "border-fg bg-sunken shadow-[0_3px_12px_rgba(15,15,15,0.06)]"
                          : "border-border hover:border-fg/35 hover:bg-sunken/70"
                      )}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                        style={{
                          background: person.avatarBg,
                          color: person.avatarColor,
                        }}
                      >
                        {person.initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-medium text-fg truncate">{person.name}</p>
                        <p className="text-[11.5px] text-fg-muted truncate">
                          {person.handle} - {person.role}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-3.5 py-1.5 text-[11px] font-semibold border transition-all",
                          selected
                            ? "bg-fg text-white border-fg shadow-[0_2px_10px_rgba(15,15,15,0.18)]"
                            : "bg-accent text-white border-accent group-hover:opacity-90 shadow-[0_3px_12px_rgba(201,53,53,0.28)]"
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
            <div className="px-6 py-16 md:px-8 md:py-20">
              <div className="relative overflow-hidden rounded-[14px] text-center animate-[welcome-fade-in_420ms_ease-out] py-4">
                <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.86),rgba(255,255,255,0.92)_42%,rgba(255,255,255,0.98)_78%)]" />
                  <div className="welcome-grid-3d absolute left-1/2 top-[54%] w-[880px] h-[520px] -translate-x-1/2 -translate-y-1/2" />
                </div>

                <div className="relative z-10">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-fg-muted ">
                    You are all set
                  </p>
                  <HandwrittenWelcome
                    className="mt-2 flex justify-center"
                    onComplete={() => setShowWelcomeCta(true)}
                  />
                  <div className="mt-8 h-[112px] flex items-center justify-center">
                    <LiquidMetalButton
                      onClick={completeOnboarding}
                      className={cn(
                        "mx-auto transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        showWelcomeCta
                          ? "opacity-100 translate-y-0 scale-100 blur-0"
                          : "opacity-0 translate-y-3 scale-90 blur-[2px] pointer-events-none"
                      )}
                      label="Let's go"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div
            className={cn(
              "px-6 pt-5 pb-6 md:px-8 md:pb-7 flex items-center justify-between gap-3 border-t border-border",
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
                    "rounded-[8px] px-5 py-2 text-[13px] font-semibold transition-colors",
                    canContinueTopics
                      ? "bg-fg text-white hover:bg-fg-2"
                      : "bg-sunken-2 text-fg-faint cursor-not-allowed"
                  )}
                >
                  Continue
                </button>
              </>
            )}

            {stage === "people" && (
              <>
                <button
                  type="button"
                  onClick={() => setStage("topics")}
                  className="rounded-[8px] px-4 py-2 text-[13px] font-medium border border-border text-fg hover:bg-sunken transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStage("welcome")}
                  disabled={!canContinuePeople}
                  className={cn(
                    "rounded-[8px] px-5 py-2 text-[13px] font-semibold transition-colors",
                    canContinuePeople
                      ? "bg-fg text-white hover:bg-fg-2"
                      : "bg-sunken-2 text-fg-faint cursor-not-allowed"
                  )}
                >
                  Continue
                </button>
              </>
            )}

          </div>

          <style jsx>{`
            @keyframes welcome-fade-in {
              from {
                opacity: 0;
                transform: translateY(6px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            .welcome-grid-3d {
              background-image:
                repeating-linear-gradient(
                  to right,
                  rgba(22, 22, 22, 0.09) 0px,
                  rgba(22, 22, 22, 0.09) 1px,
                  transparent 1px,
                  transparent 34px
                ),
                repeating-linear-gradient(
                  to bottom,
                  rgba(22, 22, 22, 0.09) 0px,
                  rgba(22, 22, 22, 0.09) 1px,
                  transparent 1px,
                  transparent 34px
                );
              border-radius: 24px;
              transform:
                translate(-50%, -50%)
                perspective(900px)
                rotateX(63deg)
                skewX(-22deg);
              transform-origin: center;
              filter: blur(0.2px);
              opacity: 0.55;
              animation: grid-drift 7s ease-in-out infinite alternate;
            }

            @keyframes grid-drift {
              from {
                transform:
                  translate(-50%, -50%)
                  perspective(900px)
                  rotateX(63deg)
                  skewX(-22deg)
                  translateY(0px);
                opacity: 0.5;
              }
              to {
                transform:
                  translate(-50%, -50%)
                  perspective(900px)
                  rotateX(63deg)
                  skewX(-22deg)
                  translateY(-8px);
                opacity: 0.62;
              }
            }
          `}</style>
        </section>
      </div>
    </div>
  );
}
