# CLAUDE.md

Vestis — virtual try-on: a Chrome extension saves shop photos, a local app puts them on the user's photos via headless `claude -p` + the Higgsfield MCP. Read `PLAN.md` first — it is the plan and status. `README.md` is the user's setup guide.

## Rules

1. **No prompt review in this app.** Try on is one click; Claude writes and sends the prompt itself.
2. **Spend Higgsfield subscription credits** — always through the Higgsfield MCP, never the Higgsfield or BFL API.
3. **Never commit.** The user commits. Commits carry no co-author or attribution lines.
4. **Update `PLAN.md`** status after every session.
5. **Research before writing** on anything model- or tool-related. These change monthly.

## Code

- Functional style, front and back: data types, pure functions and actions (side effects) in separate folders, one entity per file.
- Every function takes exactly one typed argument and has a typed output.
- Web: controller → view → components. Base UI components only, never raw `button`, `input`, etc.
- npm, no tests.
