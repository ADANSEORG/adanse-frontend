import { useState } from "react";

export default function QuestionStep({ onSubmit, loading }) {
  const [question, setQuestion] = useState("");

  function submit() {
    if (question.trim()) onSubmit(question.trim());
  }

  return (
    <div className="card">
      <div className="card-title">What's your research about?</div>
      <div className="question-row">
        <input
          className="text-input"
          type="text"
          placeholder="e.g. does time spent on social media affect GPA?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={loading}
        />
        <button className="btn btn-primary" onClick={submit} disabled={loading || !question.trim()}>
          {loading ? "Thinking…" : "Find my analysis"}
        </button>
      </div>
    </div>
  );
}
