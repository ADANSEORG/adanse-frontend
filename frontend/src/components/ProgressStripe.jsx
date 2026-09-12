// A woven-stripe progress indicator: each segment fills in as the
// pipeline advances (upload -> question -> confirm -> results).
// Functions as the flow's status bar, not just decoration.
export default function ProgressStripe({ step }) {
  const steps = ["upload", "question", "confirm", "results"];
  const currentIndex = steps.indexOf(step);

  return (
    <div className="stripe">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`stripe-segment ${i <= currentIndex ? "filled" : ""}`}
        />
      ))}
    </div>
  );
}
