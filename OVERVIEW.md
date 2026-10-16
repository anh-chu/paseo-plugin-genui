Generative UI lets agents answer with interactive charts, diagrams, maps, plans, tables, and forms rendered inline in the Paseo chat timeline.

Instead of replying only with plain Markdown tables or pasted command output, agents write `ui` and `app` code blocks in their replies. The plugin compiles and renders those blocks live while the reply streams. Sliders, toggles, editable tables, and decision weights recompute locally in the app without extra model calls. Buttons and forms send your choice back to the agent as your next message.

## Setup

Requires Paseo 0.11.2 or later on both the daemon and the app.

New agents receive the Generative UI component instructions automatically when created. For an existing agent, run `/genui` in the composer to teach it the component language, or `/genui-demo` to insert an interactive sample block into the timeline. Open the **Gen-UI Gallery** from the sidebar or workspace panel to browse all 86 components across 10 groups with 170+ live examples.

## Capabilities and settings

- **86 components in 10 groups**: Layout, Content, Data, Media, Inputs, Widgets, Project, Dev, Manage, and Evidence.
- **File and report loading**: `Load(path)` and `Snippet(path, from, to)` read JSON, CSV, TSV, logs, test reports (Vitest, Jest, JUnit), coverage (`lcov`, Istanbul, `coverage.py`, Go), lint and typecheck findings (ESLint, SARIF, `tsc`, Ruff), HAR traces, and benchmarks directly from the agent's workspace, thread storage, or `/tmp`.
- **Live workspace and git state**: `Changes()`, `Commits()`, `PullRequest()`, `Threads()`, and `Environments()` inspect the workspace's git status, pull request, subagents, and worktrees through the Paseo daemon.
- **Sandboxed mini-apps**: `app` blocks run self-contained HTML and JavaScript inside a network-isolated sandboxed iframe on desktop and web clients.
- **Settings**: Under **Settings -> Plugins -> Generative UI**, you can toggle automatic agent instructions for new sessions and toggle server-side web lookups (Wikimedia Commons photo search, Photon geocoding, OpenStreetMap tiles, and HTTPS images).

## Limits

File reads are confined to the agent's workspace directory, its thread storage directory, and `/tmp`. Sandboxed `app` blocks require a desktop or browser client; mobile clients display the block's source code.
