
# Prompt Vault

A lightweight, browser-based prompt management tool for AI engineers. Save, organize, rate, and annotate your AI prompts — no backend required.


<img width="1600" height="1280" alt="screen" src="https://github.com/user-attachments/assets/183abc14-58e4-40f8-b5d5-47cf0ba1291c" />

## Features

- **Create & Save Prompts** — Store prompts with a title, content, and target model name
- **Star Ratings** — Rate each prompt (1–5 stars) to track effectiveness over time
- **Notes** — Add, edit, and delete notes on any prompt for feedback and iteration logs
- **Token Estimation** — Automatic min/max token count estimate with confidence levels (high/medium/low)
- **Model Tracking** — Associate each prompt with a specific model (e.g., `gpt-4o`, `claude-sonnet-4-6`)
- **Timestamps** — Tracks when each prompt was created and last updated
- **Import / Export** — Back up and restore your prompt library as JSON, with conflict resolution (merge, overwrite, or create new IDs)
- **Responsive** — Works on desktop and mobile

## Getting Started

No install or build step needed. Just open `index.html` in your browser.

```bash
git clone https://github.com/your-username/prompt-vault.git
cd prompt-vault
open index.html   # macOS
# or double-click index.html on Windows/Linux
```

For local development with live reload, you can use any static file server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Usage

### Saving a Prompt
1. Fill in the **Title**, **Content**, and **Model Name** fields
2. Click **Save Prompt**
3. The prompt appears in the grid on the right

### Rating
Click any star on a prompt card to set its rating. Click the same star again to clear it.

### Notes
Click **Add Note** on any card to open the note editor. Notes support up to 500 characters and are shown in chronological order.

### Import / Export
- **Export** — Downloads a timestamped `prompts-export-*.json` file
- **Import** — Loads a previously exported JSON file. If duplicate IDs are detected, you can choose to:
  - **Merge** — Update existing prompts with incoming data
  - **Overwrite** — Replace existing prompts entirely
  - **Create New IDs** — Import as new prompts (no deduplication)

> A backup is automatically saved to `localStorage` before any import.

## Data Storage

All data is stored in your browser's `localStorage` under the key `prompts`. Nothing is sent to any server.

**Schema (v1):**
```json
{
  "id": 1700000000000,
  "title": "Summarize article",
  "content": "Summarize the following article in 3 bullet points...",
  "rating": 4,
  "notes": [
    { "id": 1700000001000, "text": "Works well for news articles", "createdAt": "2025-11-14T..." }
  ],
  "metadata": {
    "model": "gpt-4o-mini",
    "createdAt": "2025-11-14T12:00:00.000Z",
    "updatedAt": "2025-11-14T12:05:00.000Z",
    "tokenEstimate": { "min": 12, "max": 18, "confidence": "high" }
  }
}
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Markup | HTML5 |
| Styling | CSS3 (custom properties, CSS Grid) |
| Logic | Vanilla JavaScript (ES6+, no dependencies) |
| Storage | Browser `localStorage` |

## Project Structure

```
prompt-vault/
├── index.html   # App shell and markup
├── styles.css   # Dark theme, layout, component styles
├── script.js    # All application logic
└── README.md
```

## License

MIT

---

## Maintenance

Last maintenance update: <!--LAST_UPDATED-->2026-05-23<!--/LAST_UPDATED-->
