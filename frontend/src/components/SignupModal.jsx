import { useState } from "react";

// NOTE: this is a UI placeholder only — it does not yet call a real
// signup/auth endpoint (that's Phase 4, Supabase Auth). It exists so
// the export-gated flow can be demoed and built against once auth lands.
export default function SignupModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {!submitted ? (
          <>
            <div className="modal-title">Sign up to export</div>
            <div className="modal-sub">
              Your analysis stays right here — sign up to download it as a formatted document.
            </div>
            <input
              className="text-input"
              type="email"
              placeholder="you@school.edu.gh"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="modal-actions">
              <button
                className="btn btn-primary btn-block"
                disabled={!email.includes("@")}
                onClick={() => setSubmitted(true)}
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-title">You're in</div>
            <div className="modal-sub">
              Export isn't wired up yet — this is where your Word document download will appear.
            </div>
            <button className="btn btn-secondary btn-block" onClick={onClose}>
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
