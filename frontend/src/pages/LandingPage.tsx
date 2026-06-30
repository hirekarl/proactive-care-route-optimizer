import type { CSSProperties, ComponentType } from "react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { EnterButtonOverlay } from "../components/landing/EnterButtonOverlay";
import { FactCardsOverlay } from "../components/landing/FactCardsOverlay";
import { FloorControlOverlay } from "../components/landing/FloorControlOverlay";
import { LandingScene } from "../components/landing/LandingScene";
import { landingFacts } from "../components/landing/landingFacts";
import type { LandingFact } from "../components/landing/landingFacts";
import { landingScrollState } from "../components/landing/landingScrollState";
import { DashboardPage } from "./DashboardPage";
import { MapPage } from "./MapPage";
import { OutagesPage } from "./OutagesPage";
import { ProvidersPage } from "./ProvidersPage";

interface PreviewTab extends LandingFact {
  path: string;
  icon: ComponentType;
  panel: ComponentType;
}

const LOGO_SRC = "/care-route-logo.png";
const HERO_EXIT_SCROLL = 0.055;

const previewTabs: PreviewTab[] = [
  { ...landingFacts[0], path: "/dashboard", icon: GridIcon, panel: DashboardPage },
  { ...landingFacts[1], path: "/map", icon: MapIcon, panel: MapPage },
  { ...landingFacts[2], path: "/outages", icon: AlertIcon, panel: OutagesPage },
  { ...landingFacts[3], path: "/providers", icon: BuildingIcon, panel: ProvidersPage },
];

export function LandingPage() {
  const navigate = useNavigate();
  const enterDashboard = () => navigate("/dashboard");
  const [selectedTab, setSelectedTab] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [heroExit, setHeroExit] = useState(0);
  const previewTimer = useRef<number | null>(null);
  const heroScale = 1 - heroExit * 0.055;
  const heroY = -heroExit * 36;

  useEffect(() => {
    let frameId = 0;
    let lastHeroExit = 0;

    const syncHero = () => {
      const nextHeroExit = Math.min(1, landingScrollState.offset / HERO_EXIT_SCROLL);
      if (Math.abs(nextHeroExit - lastHeroExit) > 0.01) {
        lastHeroExit = nextHeroExit;
        setHeroExit(nextHeroExit);
      }
      frameId = window.requestAnimationFrame(syncHero);
    };

    frameId = window.requestAnimationFrame(syncHero);
    return () => {
      window.cancelAnimationFrame(frameId);
      if (previewTimer.current !== null) {
        window.clearTimeout(previewTimer.current);
      }
    };
  }, []);

  const openPreview = (tabIndex: number) => {
    if (previewTimer.current !== null) {
      window.clearTimeout(previewTimer.current);
    }

    setSelectedTab(tabIndex);
    setPreviewOpen(false);
    previewTimer.current = window.setTimeout(() => setPreviewOpen(true), 320);
  };

  const closePreview = () => {
    if (previewTimer.current !== null) {
      window.clearTimeout(previewTimer.current);
    }

    setPreviewOpen(false);
    setSelectedTab(null);
  };

  return (
    <div className="landing">
      <header className="landing__chrome">
        <div className="landing__brand">
          <img className="landing__brand-mark" src={LOGO_SRC} alt="" aria-hidden="true" />
          <span>
            <strong>Care-Route</strong> Optimizer
          </span>
        </div>
        <button type="button" className="landing__skip" onClick={enterDashboard}>
          Skip intro -&gt;
        </button>
      </header>

      <div className="landing__canvas">
        <Suspense fallback={null}>
          <LandingScene selectedTab={selectedTab} />
        </Suspense>
      </div>

      <FactCardsOverlay onSelectTab={openPreview} previewing={selectedTab !== null} />
      <FloorControlOverlay previewing={selectedTab !== null} />

      <div
        className="landing__hero"
        data-hidden={heroExit > 0.98}
        style={
          {
            "--hero-opacity": (1 - heroExit).toFixed(3),
            "--hero-scale": heroScale.toFixed(3),
            "--hero-y": `${heroY.toFixed(1)}px`,
            transform: `translate(-50%, -50%) translateY(${heroY.toFixed(1)}px) scale(${heroScale.toFixed(3)})`,
          } as CSSProperties
        }
      >
        <img className="landing__hero-logo" src={LOGO_SRC} alt="" aria-hidden="true" />
        <p className="landing__eyebrow">Proactive Care-Route Optimizer</p>
        <h1 className="landing__title">
          Stop the elevator
          <br />
          from stopping care.
        </h1>
        <p className="landing__lede">
          Live DOB outage data, fused with the routes of NYC senior-care providers - before workers
          leave the depot.
        </p>
        <div className="landing__scrollhint">Scroll to explore</div>
      </div>

      <EnterButtonOverlay onEnter={enterDashboard} />

      {selectedTab !== null && previewOpen && (
        <DashboardModal
          activeTab={selectedTab}
          onClose={closePreview}
          onSelectTab={setSelectedTab}
        />
      )}
    </div>
  );
}

interface DashboardModalProps {
  activeTab: number;
  onClose: () => void;
  onSelectTab: (tabIndex: number) => void;
}

function DashboardModal({ activeTab, onClose, onSelectTab }: DashboardModalProps) {
  const navigate = useNavigate();
  const active = previewTabs.find((tab) => tab.tabIndex === activeTab) ?? previewTabs[0];
  const ActivePanel = active.panel;

  return (
    <div className="landing-modal" role="dialog" aria-modal="true" aria-label={active.eyebrow}>
      <div className="landing-modal__panel">
        <button
          onClick={onClose}
          type="button"
          className="landing-modal__close"
          aria-label="Close modal"
        >
          <svg
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="landing-modal__tabs" role="tablist" aria-label="Dashboard tabs">
          <div className="landing-modal__tabs-heading">
            <span>Dashboard tabs</span>
            <strong>{active.value}</strong>
          </div>
          {previewTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.tabIndex === active.tabIndex;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className="landing-modal__tab"
                data-active={isActive}
                onClick={() => onSelectTab(tab.tabIndex)}
                style={{ "--accent": tab.hue } as CSSProperties}
              >
                <span className="landing-modal__tab-icon">
                  <Icon />
                </span>
                <span>
                  <strong>{tab.eyebrow}</strong>
                  <small>{tab.label}</small>
                </span>
              </button>
            );
          })}
          <button
            type="button"
            className="landing-modal__full-button"
            onClick={() => navigate(active.path)}
          >
            Open full page
          </button>
        </div>

        <div className="landing-modal__body">
          <div
            className="landing-modal__summary"
            style={{ "--accent": active.hue } as CSSProperties}
          >
            <p>{active.eyebrow}</p>
            <h2>{active.label}</h2>
            <span>{active.detail}</span>
          </div>
          <div className="landing-modal__content">
            <ActivePanel />
          </div>
        </div>
      </div>
    </div>
  );
}

function GridIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" strokeLinejoin="round" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
      <path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" strokeLinecap="round" />
    </svg>
  );
}
