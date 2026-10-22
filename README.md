# Generative UI for Paseo

**Agents answer with charts, diagrams, maps, plans, and forms rendered inline in the Paseo chat timeline.**

![Inline Map, Calendar, and Budget UI in Paseo chat](assets/screenshot-chat.png)

![Gen-UI Gallery with 86 components and 173 live examples](assets/screenshot-gallery.png)

![Interactive Playground in Paseo](assets/screenshot-playground.png)

Ported from [ComicBit/bb-plugin-genui](https://github.com/ComicBit/bb-plugin-genui) (Apache-2.0) to Paseo's native timeline transformer, React Native surface, and daemon RPC architecture.

## Install

```bash
paseo plugin add git:anh-chu/paseo-plugin-genui
```

Or from npm:

```bash
paseo plugin add npm:paseo-plugin-genui
```

Requires Paseo 0.11.2 or later.

## What an answer looks like

The agent writes a ```ui block in its reply:

~~~
```ui
$seats = 12
$plan = "Pro"
price = $plan == "Pro" ? 29 : 12
Card("Estimate", [
  Row([Choice($plan, ["Basic", "Pro"]), Slider($seats, 1, 50, label: "Seats")]),
  Metric("Total", "$" + fmt(price * $seats)),
  Button("Go with " + $plan, Send("Go with " + $plan), variant: "primary")
])
```
~~~

Paseo renders a card with a plan switch, a seat slider, and a live total. Moving the slider recomputes the total in place without another model call. Clicking the button sends your choice back to the agent.

## Components (86 across 10 groups)

| Group | Components |
| --- | --- |
| **Layout** | `Card` · `Row` · `Stack` · `Grid` · `Tabs` · `Details` · `Divider` · `Carousel` |
| **Content** | `Text` · `Callout` · `Draft` · `Metric` · `Badge` · `Icon` · `KeyValue` · `Image` · `File` · `Entity` · `Sources` · `List` |
| **Data** | `Table` · `Chart` (bar, line, area, pie, scatter, radar, funnel, heatmap) · `Sparkline` · `Progress` · `Gauge` · `SegmentedBar` · `Steps` · `Timeline` · `Calendar` · `CalendarHeatmap` · `Tree` · `Code` · `Snippet` · `Diff` · `Diagram` |
| **Media** | `ImageSearch` · `Gallery` · `Map` · `Hotspots` |
| **Inputs** | `Slider` · `Stepper` · `Toggle` · `Choice` · `Radio` · `Select` · `Checklist` · `ListEditor` · `Input` · `TextArea` · `DateInput` · `Rating` · `OptionCards` · `Swatches` · `EditableTable` · `Button` · `Form` · `FollowUps` |
| **Widgets** | `Timer` · `Quiz` · `Flashcards` · `Walkthrough` |
| **Project** | `Changes` · `Commits` · `PullRequest` · `Threads` · `Tests` · `Json` |
| **Dev** | `Logs` · `StackTrace` · `Findings` · `Coverage` · `Dependencies` · `Pipeline` · `Benchmark` · `Waterfall` · `Treemap` |
| **Manage** | `Board` · `Roadmap` · `Status` · `Plan` · `Decision` · `Estimate` · `Environments` |
| **Evidence** | `Acceptance` · `Compare` · `Transcript` · `Provenance` |

## Slash commands & surfaces

- `/genui [prompt]` — Teach an existing agent the Generative UI component language.
- `/genui-demo [ComponentName]` — Insert a live interactive Gen-UI block into the current chat (e.g. `/genui-demo Decision` or `/genui-demo Map`).
- `/genui-gallery` — Open the **Gen-UI Gallery** screen (173 examples across all 86 components, plus a live spec Playground).

## Develop

```bash
npm install
npm run typecheck && npm test
paseo plugin install .
paseo plugin reload genui
```

## License

[Apache-2.0](LICENSE). Original DSL, component catalog, and gallery examples by [ComicBit](https://github.com/ComicBit/bb-plugin-genui). Excalifont is under the SIL Open Font License (`assets/fonts/Excalifont-OFL.txt`).
