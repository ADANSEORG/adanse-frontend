import { Link } from "react-router-dom";

/*
 * ---------------------------------------------------------
 * LegalPage
 * ---------------------------------------------------------
 *
 * Shared shell + a tiny markdown renderer for the legal pages
 * (/privacy, /terms). The source files under ../legal/*.md only
 * ever use a handful of markdown constructs -- headings (#/##/###),
 * bold (**text**), unordered lists (including list items wrapped
 * across multiple lines), and plain paragraphs -- so a small
 * hand-rolled parser covers them without pulling in a markdown
 * dependency for two static pages.
 */

function renderInline(text) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        part
      )
    );
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let current = [];

  function flushBlock() {
    if (current.length) {
      blocks.push(current);
      current = [];
    }
  }

  for (const line of lines) {
    if (line.trim() === "") {
      flushBlock();
    } else {
      current.push(line);
    }
  }

  flushBlock();

  return blocks.map((block, blockIndex) => {
    const first = block[0].trim();

    if (first.startsWith("### ")) {
      return <h3 key={blockIndex}>{renderInline(first.slice(4))}</h3>;
    }

    if (first.startsWith("## ")) {
      return <h2 key={blockIndex}>{renderInline(first.slice(3))}</h2>;
    }

    if (first.startsWith("# ")) {
      return <h1 key={blockIndex}>{renderInline(first.slice(2))}</h1>;
    }

    if (/^-\s+/.test(first)) {
      // A wrapped list item's continuation line isn't prefixed with
      // "-" -- fold it back onto the item it belongs to.
      const items = [];

      for (const rawLine of block) {
        const line = rawLine.trim();

        if (/^-\s+/.test(line)) {
          items.push(line.replace(/^-\s+/, ""));
        } else if (items.length) {
          items[items.length - 1] += ` ${line}`;
        }
      }

      return (
        <ul key={blockIndex}>
          {items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    }

    return (
      <p key={blockIndex}>
        {renderInline(block.map((l) => l.trim()).join(" "))}
      </p>
    );
  });
}

export default function LegalPage({ content }) {
  return (
    <main className="legal-page">
      <div className="legal-container">
        <header className="legal-topbar">
          <Link to="/" className="legal-brand">
            Adanse
          </Link>
        </header>

        <article className="legal-content">
          {renderMarkdown(content)}
        </article>

        <div className="legal-bottom">
          <Link to="/" className="btn btn-secondary">
            Back to Adanse
          </Link>
        </div>
      </div>
    </main>
  );
}
