import { useState } from "react";

/**
 * API-key entry. The key is kept in localStorage (a demo convenience) and sent
 * as the `x-api-key` header on every authenticated request.
 */
export function ApiKeyBar({
  apiKey,
  onChange,
  onSignOut,
}: {
  apiKey: string;
  onChange: (value: string) => void;
  onSignOut: () => void;
}) {
  const [draft, setDraft] = useState("");

  if (apiKey.length > 0) {
    return (
      <div className="pill ok" title="Authenticated requests include this key">
        <span className="dot" />
        API key {apiKey.slice(0, 4)}…{apiKey.slice(-4)}
        <button
          type="button"
          onClick={onSignOut}
          style={{ padding: "1px 6px", fontSize: 11, marginLeft: 4 }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const value = draft.trim();
        if (value.length > 0) onChange(value);
      }}
      style={{ display: "flex", gap: 8, alignItems: "center" }}
    >
      <input
        type="password"
        placeholder="Paste API key (API_KEYS in .env)"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        aria-label="API key"
        style={{ width: 260 }}
      />
      <button type="submit" className="primary" disabled={draft.trim().length === 0}>
        Connect
      </button>
    </form>
  );
}
