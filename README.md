<div align="center">

[🇧🇷 Português](README.pt-BR.md) · **🇬🇧 English**

# Leadership MCP

### Humanist leadership delivered to your AI assistant — at the exact moment you lead.

Not in the training room. When you're about to send the hard email, give the feedback, announce the tough call.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/leadership-mcp.svg)](https://www.npmjs.com/package/leadership-mcp)
[![CI](https://github.com/mcampello/leadership-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/mcampello/leadership-mcp/actions/workflows/ci.yml)
[![MCP compatible](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io)
[![Node >=18](https://img.shields.io/badge/Node-%3E%3D18-brightgreen)](https://nodejs.org)

</div>

---

**Leadership MCP** is a free, open-source tool that connects a living knowledge base of
**humanist leadership** to Claude (or any [MCP](https://modelcontextprotocol.io)-compatible
client). When you ask for help writing a tense email, giving feedback, announcing a decision or
handling a conflict, the assistant **pauses, asks if you want it**, and — if you do — shapes the
answer from leadership principles with proven human and economic impact.

The guidance is always **a hypothesis, never a prescription**. You decide whether to listen.

---

## 🎯 The problem

Leadership doesn't happen in the training room. It happens in the interactions: the email you're
about to send, the feedback you'll give in five minutes, the announcement of a hard decision.

And it's exactly in that moment — under pressure, in a hurry — that the best leadership principle
becomes unreachable. We fall back on instinct or on corporate-speak. The good intention is there,
but the delivery escalates the conflict instead of resolving it.

Leadership training evaporates in two weeks. Leadership MCP puts the right principle **at the right
instant**, inside the tool you already use to write.

---

## ⚙️ How it works in practice

The intelligence lives in one behavioral detail: the assistant **doesn't dump theory**. It detects
that the task is relational, pauses, and offers a choice — and only then shapes the answer.

> **You:** I need to reply to an email from a colleague who's accusing me of delaying his project.
>
> **Claude:** I noticed this involves a difficult conversation with a colleague. I can consult
> Leadership MCP — a base on humanist leadership with proven guidance on how to handle this kind of
> situation — and write with that in mind. Or would you rather I just answer directly?
>
> **You:** go ahead and consult it.
>
> **Claude:** *(consults `buscar_orientacao`)* I'll start with the fact instead of the defense,
> assume good intent, and close with a concrete next step — that's what de-escalates a tense email.
> Here's the draft: …

The consultation **shapes the answer from the start** — it's not an afterthought. And the question
is asked only once: if you decline, it answers directly, without insisting.

---

## 🔄 What changes

| "Raw" reply (instinct under pressure) | Reply shaped by the base |
| --- | --- |
| "You didn't deliver again." | "The delivery we agreed on for Friday didn't arrive — I imagine something came up." |
| Attacks character | Describes the fact and the behavior |
| Ends on the problem | Ends on a next step: "can you give me an update by noon tomorrow?" |
| Closes the door | Opens the door for the other person to explain |

The base is organized in four chained layers — **trigger → filters → action → outcome** — that the
server assembles into a single, consolidated piece of guidance from the situation you describe:

1. **Trigger** — the relational nature of the situation (conflict, feedback, high-impact decision,
   internal relationship, external interaction, personal relationship).
2. **Filters** — the pillars of humanist leadership (active listening, recognition, culture of
   service, nonviolent communication, psychological safety, interests over positions).
3. **Action** — a concrete behavioral hypothesis for that situation.
4. **Outcome** — the expected effect (engagement, trust, inclusive culture).

---

## 👥 Who it's for

- **Leaders and managers** who run teams and make decisions that affect people.
- **Founders and entrepreneurs** building culture from day one.
- **Tech leads, PMs and coordinators** who lead without necessarily having "manager" in their title.
- **HR and people/culture** teams who want a common leadership language.
- **Anyone** who writes difficult messages at work.
- **Anyone navigating a hard personal conversation** — family, spouse, close friends, business
  partners. The base covers the personal realm too, where there's no hierarchy to lean on.

No management title required. It takes leading relationships — and wanting to lead them better.

---

## ✅ What you'll accomplish

- **Handle a conflict without escalating it** — separate fact from accusation, lower the temperature.
- **Give feedback that builds** instead of hurts — and receive feedback without shutting down.
- **Announce a hard decision** (a cut, a change, extra effort) while preserving the team's trust.
- **Write the critical email** that records what's needed without setting the relationship on fire.
- **Recognize for real** — behavior, impact and feeling, not generic praise.
- **Handle the personal conflict** — the sibling you stopped talking to, the business partner
  disagreement, the conversation your marriage has been postponing.

The end goal isn't "reply to an email better." It's building, interaction by interaction,
**engagement, trust and an inclusive culture** — the outcomes the base is after.

---

## 🏢 The advantage at company scale

One person using this creates real gains. An **entire team** using the **same living base** is a
different order of magnitude:

- **A common leadership language.** Everyone handles conflict, feedback and decisions from the same
  principles. Leadership quality stops depending on who happens to be whose manager.
- **A central, living base.** Updated how the company handles change? One `git push` and **everyone
  gets the new version in their next conversation** — no reinstall, no retraining, no memo.
- **Customizable to your culture.** Point the MCP to a fork with your company's values and language
  (via `LEADERSHIP_MCP_REPO` / `LEADERSHIP_MCP_REF`). The guidance now speaks the house voice.
- **Private by design.** Nothing from the conversations leaves each person's machine — the server
  only reads the public `.md` files from the repository. Distributed culture without exposing data.

Instead of training that evaporates in two weeks, humanist leadership becomes **infrastructure**:
present in every interaction, the same for everyone, and improving with a commit.

> **Run a leadership training company or consultancy?** Leadership MCP can become the continuous
> reinforcement product you offer clients — your methodology and brand, delivered at the moment the
> leader applies it. See [how to fork the base](#-technical-details) or get in touch.

---

## 📈 The evidence

The premise is simple and radical: **people are not resources in service of the business; the
business exists in service of people.** And it's not theory without grounding:

- At **Barry-Wehmiller**, taken to the extreme by Bob Chapman, the company grew from **$20M to
  $3.6B** over roughly 50 years — a case documented by **Harvard Business School (2016)** and
  taught at over **70 schools**.
- *"We measure success by the way we touch the lives of people."* — Bob Chapman,
  *Everybody Matters* (2015, rev. 2025).
- **Simon Sinek**, in *Leaders Eat Last*, shows why teams where people feel safe and cared for
  perform better — the leader who "eats last" builds trust.

Leadership MCP distills these principles and makes them accessible at the exact moment of the
interaction — because that's where leadership happens. Full sources are [at the end](#inspirations).

---

## 🚀 Installation

### Option A — Claude web, desktop and mobile (remote connector)

If the hosted endpoint is available (or you [deploy your own](server/deploy/README.md)), this is
the simplest path — one setup, works everywhere including the **mobile app**:

1. Go to [claude.ai/settings/connectors](https://claude.ai/settings/connectors) and click
   **Add custom connector**.
2. URL: `https://leadership-mcp.campello.me/mcp` — no OAuth fields needed.
3. In a conversation, open **+ → Connectors** and enable *leadership-mcp*.
4. Paste the system prompt (step 1 below) into your profile's custom instructions.

Requires a Pro/Max/Team/Enterprise plan (free accounts can add one custom connector).

### Option B — Claude Desktop (local, via npm)

One step: **register the MCP server**. The relational trigger now ships **inside** the server —
it's delivered to Claude automatically the moment it connects — so installing the MCP is enough for
Claude to start detecting relational situations and offering the consultation. Pasting the system
prompt (see [_Optional_](#optional-paste-the-system-prompt-reinforcement) below) is no longer
required.

### Register the MCP server

> ⚠️ **Note:** in this option the MCP server is **local** (it runs on your machine via `npx`), so
> it works on Claude **Desktop** only. For web/mobile, use Option A above. Do **not** paste `npx`
> commands into the _"Add custom connector"_ window — that window is only for remote `https://` URLs.

Edit the Claude Desktop config file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

> 💡 Shortcut: **Settings → Developer → Edit Config** opens this file directly.

Add the block below (if you already have other `mcpServers`, just add the `"leadership"` entry):

```json
{
  "mcpServers": {
    "leadership": {
      "command": "npx",
      "args": ["-y", "leadership-mcp"]
    }
  }
}
```

Then **restart Claude Desktop**. Done — ask something like *"how do I reply to an aggressive email
from a colleague?"* and watch the guidance shape the response.

### Optional: paste the system prompt (reinforcement)

The MCP already carries the trigger, so this step isn't required on Claude. Paste it if you want the
strongest, most consistent *pause-and-offer* behavior — or if you use an assistant **without MCP**
(ChatGPT, Gemini, Grok, Copilot), where the prompt is the only way to get the trigger. Open
[`prompt-sistema.md`](prompt-sistema.md), copy the content of the **Prompt** section, and paste it
into your assistant's custom instructions (**Settings → Profile / Custom Instructions**). It teaches
the assistant to detect relational situations and to offer — without imposing — the consultation.

---

## 🛠️ Technical details

<details>
<summary><strong>The MCP tools exposed to Claude</strong></summary>

<br>

| Tool | What it does |
| --- | --- |
| `buscar_orientacao(situacao)` | Classifies the trigger of a situation described in one sentence and returns the consolidated guidance (filters + action + outcome). |
| `listar_gatilhos()` | Returns the taxonomy of covered triggers, for navigation and transparency. |

</details>

<details>
<summary><strong>How the knowledge stays alive</strong></summary>

<br>

The server reads the base's `.md` files **directly from GitHub** each session, with a **fallback to
a bundled copy** when there's no internet:

- **Update content** → just `git push`. Users get the new version in their next conversation, no
  reinstall or restart.
- **Works offline** → without a connection, it uses the copy shipped with the package. Never breaks.
- **Private** → nothing from the conversations leaves your machine; it only fetches the public `.md`
  files from the repository.

Configurable via environment variables (optional) — this is also how a **partner or company
white-labels the base**:

| Variable | Default | Purpose |
| --- | --- | --- |
| `LEADERSHIP_MCP_REPO` | `mcampello/leadership-mcp` | the `owner/repo` to read the base from |
| `LEADERSHIP_MCP_REF` | `main` | the branch/ref to use |

</details>

<details>
<summary><strong>Development</strong></summary>

<br>

```bash
cd server
npm install
npm run smoke        # validates classification and guidance assembly (offline)
npm run inspect      # opens the MCP Inspector to test interactively
```

Before publishing a new version:

```bash
npm run sync-knowledge   # updates the bundled copy from ../knowledge
npm publish --access public
```

</details>

---

## 🤝 Contributing

This base grows with people. If you have a **reference**, an **author** you admire, a **content
idea**, or you spotted something to improve — **join in**. No coding required: there are two paths,
and the first is just filling out a form.

- **Path 1 — Open an issue (recommended, no code):** go to
  **[Issues → New issue](https://github.com/mcampello/leadership-mcp/issues/new/choose)** and pick
  *Suggest an author/reference*, *Suggest content*, or *Report a problem*.
- **Path 2 — Edit it yourself:** open any file in [`knowledge/`](knowledge/), click the pencil
  **✏️ (_Edit this file_)**, make your change and click **Propose changes** — GitHub opens a PR
  automatically and it gets reviewed.

The full walkthrough, file format and voice convention are in the
**[contribution guide (`CONTRIBUTING.md`)](CONTRIBUTING.md)**. All content is a **behavioral
hypothesis**, grounded in humanist leadership — not a rigid rule. Contribute in that spirit.

---

## Inspirations

Created by **Mario Campello** as an open tool on **leadership + AI**. This project's vision forms at
the intersection of several sources — none of them is "the methodology"; together they inform a
practice of humanist leadership:

- **Barry-Wehmiller / Bob Chapman** — _Everybody Matters_ (2015, rev. 2025, with Raj Sisodia);
  Barry-Wehmiller University (_Listen Like a Leader_); Harvard Business School case (2016).
- **Simon Sinek** — _Leaders Eat Last_, _Start With Why_ and talks on trust, safety and purpose.
- **Marshall Rosenberg** — _Nonviolent Communication_, the backbone of the personal-realm guidance.
- **Roger Fisher & William Ury** — _Getting to Yes_ (principled negotiation).
- **Amy Edmondson** — the research on psychological safety (_The Fearless Organization_).
- **Kim Scott** (_Radical Candor_) and **Brené Brown** (_Dare to Lead_) — candor with care.
- **Robert Greenleaf** — _Servant Leadership_, the root of the culture-of-service tradition.
- **Mario Campello's own leadership experience and practice** — what works in the day-to-day
  reality of leading people and relationships.

Quotes and concrete data throughout the base credit their sources; the principles are expressed in
the project's own voice. This project is independent and is not affiliated with or endorsed by
Barry-Wehmiller, Bob Chapman, Simon Sinek or any of the authors above — references are made for
educational and intellectual acknowledgment.

## Connect

For talks, mentoring, training and development, get in touch:

- [https://campello.me](https://campello.me)
- [https://linkedin.com/in/mcampello](https://linkedin.com/in/mcampello)

## License

[MIT](LICENSE) — use, adapt and distribute freely.
