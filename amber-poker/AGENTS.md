# AMBER POKER cloud handoff

This is a migration of the existing working game, not a request to rebuild it.
Use the current source as the behavior baseline. Read AMBER-POKER-SPEC.md and README.md; later input-rule updates override earlier descriptions.

Run `npm run build` before `npm test`: the standalone test reads generated PLAY.html.
There are no third-party dependencies. Use Node.js 20 or newer.
Generate both dist/ and PLAY.html after source changes. The game must remain usable offline by opening PLAY.html directly.

Current controls:
- 1–5: HOLD during hold phase.
- D/Space: DEAL when ready/lost, DRAW when holding, DOUBLE when won. Inactive during double choice.
- W/S: BET +1/-1 when ready/lost, HIGH/LOW during double.
- A: COLLECT when won.
- Numpad 0/Enter: DEAL/DRAW; 6: DOUBLE; 4: COLLECT; 8: HIGH; 2: LOW. HOLD takes priority for 1–5 during hold phase.
- Mouse/touch buttons support all actions.

Double: reveal a reference card, choose HIGH/LOW, draw the next card from the same 52-card deck without replacement. A=14. Equal rank loses. Win doubles uncollected WIN, loss sets WIN to zero. Each new double starts a new deck.

.openai/hosting.json belongs to the SAME existing Site. Preserve its project_id for a future expressly requested Sites publish; do not register a duplicate Site. Publishing has not succeeded yet. Do not publish merely to verify this migration.

No real-browser visual/audio verification has been completed. Record actual checks and limitations honestly. Commit completed work to the remote repository so it is not stored only in an ephemeral task workspace.

Monorepo scope: work only inside amber-poker/. Do not change the root dist/ or .openai/ used by another app. Run all build/test commands from amber-poker/.
