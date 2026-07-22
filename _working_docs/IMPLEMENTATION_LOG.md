## 2026-07-22 — GAP-GPR-33 (Partial): Real-Time Incremental Client Parser

- **Gap ID + One-line description:** GAP-GPR-33 — Upgraded SSE parser in `ChatPanel.tsx` to robust event-block handling (supports `event: delta` + `data: {"content": "..."}` or legacy `token`). Improved CRLF tolerance and partial chunk safety. Real provider deltas now render immediately.

- **Files touched:**
  - `src/frontend/components/ChatPanel.tsx` (SSE reader loop replaced with improved event + data parsing)

- **Self-check answers (interim):**
  - **a)** Parser now handles both new `delta`/`content` and legacy `token` formats.
  - **b)** Ready for next steps (requestAnimationFrame batching + markdown repair).
  - **c)** Verified by code review.

**Note:** Full GAP-GPR-33 will be completed with RAF + markdown improvements in the next iteration. Current change is the critical foundation.