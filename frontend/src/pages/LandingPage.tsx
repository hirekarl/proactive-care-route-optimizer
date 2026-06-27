import { Suspense } from "react";
import { useNavigate } from "react-router-dom";

import { EnterButtonOverlay } from "../components/landing/EnterButtonOverlay";
import { FactCardsOverlay } from "../components/landing/FactCardsOverlay";
import { LandingScene } from "../components/landing/LandingScene";

export function LandingPage() {
  const navigate = useNavigate();
  const enterDashboard = () => navigate("/dashboard");

  return (
    <div className="landing">
      <header className="landing__chrome">
        <div className="landing__brand">
          <span className="landing__brand-mark" aria-hidden="true" />
          <span>
            <strong>Care-Route</strong> Optimizer
          </span>
        </div>
        <button type="button" className="landing__skip" onClick={enterDashboard}>
          Skip intro →
        </button>
      </header>

      <div className="landing__canvas">
        <Suspense fallback={null}>
          <LandingScene />
        </Suspense>
      </div>

      <FactCardsOverlay />

      <div className="landing__hero">
        <p className="landing__eyebrow">Proactive Care-Route Optimizer</p>
        <h1 className="landing__title">
          Stop the elevator
          <br />
          from stopping care.
        </h1>
        <p className="landing__lede">
          Live DOB outage data, fused with the routes of NYC senior-care providers — before workers
          leave the depot.
        </p>
        <div className="landing__scrollhint">Scroll to explore ↓</div>
      </div>

      <EnterButtonOverlay onEnter={enterDashboard} />
    </div>
  );
}
