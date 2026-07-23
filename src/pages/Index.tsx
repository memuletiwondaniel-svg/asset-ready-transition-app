import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/enhanced-auth/AuthProvider";
import { useTenantContext } from "@/contexts/TenantContext";
import EnhancedAuthModal from "@/components/enhanced-auth/EnhancedAuthModal";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import OrshLogo from "@/components/ui/OrshLogo";
import { useLanguage } from "@/contexts/LanguageContext";
import LandingLanguageSelector from "@/components/LandingLanguageSelector";

interface ModuleItem {
  key: string;
  label: string;
  tag: string;
  narrative: string;
  href: string;
}

const MODULES: ModuleItem[] = [
  {
    key: "pssr",
    label: "PSSR",
    tag: "Pre-start-up safety",
    narrative:
      "Clear the safe introduction of hydrocarbons with structured, auditable pre-start-up checklists.",
    href: "/pssr",
  },
  {
    key: "p2a",
    label: "P2A",
    tag: "Construction to asset",
    narrative:
      "Drive every deliverable from construction and commissioning through to a live, operating asset.",
    href: "/p2a",
  },
  {
    key: "vcr",
    label: "VCR",
    tag: "Completion verification",
    narrative:
      "Verify completion records item-by-item with role-based, evidence-backed approvals.",
    href: "/vcr",
  },
  {
    key: "sof",
    label: "SoF / PAC",
    tag: "Final acceptance",
    narrative:
      "Sign off statements of fitness and provisional acceptance with a clean audit trail.",
    href: "/sof",
  },
];

const Index = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const { session, loading } = useAuth();
  const { subdomainTenant } = useTenantContext();
  const isAuthenticated = !!session;
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage } = useLanguage();

  const handleAuthenticated = () => setShowAuth(false);

  useEffect(() => {
    if (session && showAuth) setShowAuth(false);
  }, [session, showAuth]);

  useEffect(() => {
    if (isAuthenticated && location.pathname === "/") {
      navigate("/home", { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  if (loading && location.pathname !== "/") return null;
  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <BackgroundSlideshow showFunFacts={false} />

      {/* Left-to-right legibility scrim + warm top-right glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-[5]"
        style={{
          background:
            "linear-gradient(90deg, rgba(7,12,18,0.93) 0%, rgba(7,12,18,0.78) 32%, rgba(7,12,18,0.30) 54%, rgba(7,12,18,0) 66%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-[5]"
        style={{
          background:
            "radial-gradient(60% 55% at 85% 12%, rgba(244,186,124,0.26) 0%, rgba(244,186,124,0) 70%)",
        }}
      />

      {/* Top bar */}
      {!showAuth && (
        <header className="fixed top-0 left-0 right-0 z-30 px-6 md:px-10 py-5">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <OrshLogo size="large" className="text-white" surface="dark" />
            </div>
            <div className="flex items-center gap-4">
              {subdomainTenant?.logo_url && (
                <img
                  src={subdomainTenant.logo_url}
                  alt={subdomainTenant.name}
                  className="h-8 w-auto drop-shadow-lg"
                />
              )}
              <LandingLanguageSelector
                selectedLanguage={language}
                onLanguageChange={setLanguage}
              />
            </div>
          </div>
        </header>
      )}

      {/* Hero — left-aligned editorial */}
      {!showAuth && (
        <main className="relative z-10 min-h-screen flex items-center px-6 md:px-10 pt-28 pb-52">
          <div className="max-w-[1400px] mx-auto w-full">
            <div className="w-full md:max-w-[58%]">
              <div
                className="text-white/70 text-[11px] font-medium mb-6 animate-fade-in"
                style={{ letterSpacing: "0.22em", textTransform: "uppercase", animationDelay: "0ms", animationFillMode: "both", animationDuration: "500ms" }}
              >
                Operations Readiness Platform
              </div>

              <h1
                className="text-white animate-fade-in"
                style={{
                  fontSize: "clamp(32px, 4.6vw, 54px)",
                  fontWeight: 600,
                  lineHeight: 1.04,
                  letterSpacing: "-0.02em",
                  animationDelay: "80ms",
                  animationFillMode: "both",
                  animationDuration: "500ms",
                }}
              >
                Operations Readiness
              </h1>
              <div
                className="mt-2 animate-fade-in"
                style={{
                  color: "rgba(255,255,255,0.72)",
                  fontSize: "clamp(22px, 2.9vw, 30px)",
                  fontWeight: 300,
                  letterSpacing: "-0.01em",
                  animationDelay: "160ms",
                  animationFillMode: "both",
                  animationDuration: "500ms",
                }}
              >
                Start-Up &amp; Handover
              </div>

              <p
                className="mt-8 max-w-xl animate-fade-in"
                style={{
                  color: "rgba(255,255,255,0.80)",
                  fontSize: "15px",
                  lineHeight: 1.6,
                  fontWeight: 300,
                  animationDelay: "240ms",
                  animationFillMode: "both",
                  animationDuration: "500ms",
                }}
              >
                Integrating people and systems to deliver business outcomes.
              </p>

              <div
                className="mt-10 animate-fade-in"
                style={{
                  animationDelay: "320ms",
                  animationFillMode: "both",
                  animationDuration: "500ms",
                }}
              >
                <button
                  onClick={() => setShowAuth(true)}
                  className="group inline-flex items-center gap-2 font-semibold px-7 py-4 text-[15px] shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#0c0f16",
                    borderRadius: 10,
                  }}
                >
                  Access ORSH
                  <ArrowRight className="h-4 w-4 transition-transform duration-150 ease-out group-hover:translate-x-[3px]" />
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Module rail */}
      {!showAuth && (
        <div
          className="fixed bottom-0 left-0 right-0 z-20"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.10)",
            background:
              "linear-gradient(180deg, rgba(7,12,18,0) 0%, rgba(7,12,18,0.55) 100%)",
          }}
        >
          <div className="max-w-[1400px] mx-auto px-6 md:px-10">
            <ul className="flex flex-nowrap overflow-x-auto md:overflow-visible items-stretch">
              {MODULES.map((m, i) => {
                const isActive = activeModule === m.key;
                return (
                  <li
                    key={m.key}
                    className="relative flex-shrink-0"
                    style={{
                      borderLeft:
                        i === 0 ? "none" : "1px solid rgba(255,255,255,0.10)",
                    }}
                    onMouseEnter={() => setActiveModule(m.key)}
                    onMouseLeave={() =>
                      setActiveModule((cur) => (cur === m.key ? null : cur))
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setActiveModule((cur) => (cur === m.key ? null : m.key))
                      }
                      className="group text-left px-6 md:px-8 py-5 flex flex-col gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                      style={{
                        transform: isActive
                          ? "translateY(-2px)"
                          : "translateY(0)",
                        transition: "transform 160ms ease",
                      }}
                    >
                      <span
                        aria-hidden
                        className="absolute left-3 right-3 top-0 h-[2px] rounded-full"
                        style={{
                          background: "#34d399",
                          opacity: isActive ? 1 : 0,
                          transition: "opacity 160ms ease",
                        }}
                      />
                      <span
                        className="text-white font-bold"
                        style={{ fontSize: "12.5px", letterSpacing: "0.02em" }}
                      >
                        {m.label}
                      </span>
                      <span
                        style={{
                          color: "rgba(255,255,255,0.55)",
                          fontSize: "10.5px",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {m.tag}
                      </span>
                    </button>

                    {/* Popover */}
                    {isActive && (
                      <div
                        role="tooltip"
                        className="absolute left-1/2 -translate-x-1/2 z-30"
                        style={{
                          bottom: "calc(100% + 12px)",
                          width: 236,
                        }}
                      >
                        <div
                          style={{
                            background: "rgba(14,20,28,0.96)",
                            border: "0.5px solid rgba(255,255,255,0.18)",
                            borderRadius: 10,
                            boxShadow:
                              "0 20px 40px -12px rgba(0,0,0,0.6), 0 8px 16px -8px rgba(0,0,0,0.4)",
                            padding: "14px 14px 12px",
                            backdropFilter: "blur(12px)",
                          }}
                        >
                          <div
                            className="text-white font-semibold mb-2"
                            style={{ fontSize: 12.5, letterSpacing: "0.02em" }}
                          >
                            {m.label}
                          </div>
                          <p
                            style={{
                              color: "rgba(255,255,255,0.82)",
                              fontSize: 12,
                              lineHeight: 1.5,
                            }}
                          >
                            {m.narrative}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(m.href);
                            }}
                            className="mt-3 inline-flex items-center gap-1 font-semibold hover:underline"
                            style={{ color: "#34d399", fontSize: 12 }}
                          >
                            Open <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                        {/* downward arrow */}
                        <div
                          aria-hidden
                          className="mx-auto"
                          style={{
                            width: 0,
                            height: 0,
                            borderLeft: "6px solid transparent",
                            borderRight: "6px solid transparent",
                            borderTop: "6px solid rgba(14,20,28,0.96)",
                            marginTop: -1,
                          }}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <EnhancedAuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
};

export default Index;
