# avoid-ai-writing

[![GitHub stars](https://img.shields.io/github/stars/conorbronsdon/avoid-ai-writing?style=social)](https://github.com/conorbronsdon/avoid-ai-writing/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skill that audits and rewrites content to remove AI writing patterns ("AI-isms").

Paste any text, get back a clean version with every AI tell identified, fixed, and explained. A built-in second pass re-reads the rewrite to catch patterns that survived the first edit.

## Quick demo

**Input:**
> Certainly! Acme Analytics, a vibrant startup nestled in the heart of Boulder's thriving tech ecosystem, has secured $40M in Series B funding — marking a watershed moment for the observability landscape. The platform serves as a unified hub, featuring real-time dashboards, boasting sub-second queries, and presenting a seamless integration layer. Moreover, experts believe Acme is poised to disrupt the market. In conclusion, the future looks bright!

**Output:**
> Acme Analytics raised a $40M Series B led by Sequoia. The Boulder-based startup makes an observability platform that runs queries in under a second and plugs into existing monitoring stacks without custom integration work.

**What it caught:** chatbot opener ("Certainly!"), promotional language ("vibrant," "nestled," "thriving"), significance inflation ("watershed moment"), copula avoidance ("serves as," "featuring," "boasting"), 4 word replacements, vague attribution ("experts believe"), filler ("Moreover"), generic conclusion ("the future looks bright"). 15+ AI tells in one paragraph.

## Why a skill, not just a prompt

A one-shot "make this sound human" prompt catches the obvious stuff. This skill is different:

- **Structured audit** — returns identified issues with quoted text, the rewrite, a change summary, and a second-pass audit in four discrete sections. You see exactly what changed and why.
- **Two-pass detection** — the second pass re-reads the rewrite and catches patterns that survive the first edit: recycled transitions, lingering inflation, copula swaps that snuck through.
- **43-entry replacement table** — not vibes-based. Every flagged word has a specific, plainer alternative. "Leverage" → "use." "Commence" → "start." No judgment calls.
- **22 pattern categories** — see the full list below, each with before/after examples.
- **Claude Code native** — installs as a skill with YAML frontmatter, works with slash commands, integrates into your existing workflow.

## Installation & Usage

### Option 1: Clone into skills directory

```bash
git clone https://github.com/conorbronsdon/avoid-ai-writing ~/.claude/skills/avoid-ai-writing
```

### Option 2: Copy the file directly

Download `SKILL.md` and place it in any directory that Claude Code can read. Reference it in your `CLAUDE.md`:

```markdown
- Editing for AI patterns → read `path/to/avoid-ai-writing/SKILL.md`
```

### Option 3: Use as a slash command

Create a command file (e.g., `~/.claude/commands/clean-ai-writing.md`):

```markdown
---
description: Audit and rewrite content to remove AI writing patterns
---

$ARGUMENTS

Read and follow the instructions in ~/.claude/skills/avoid-ai-writing/SKILL.md
```

Then use `/clean-ai-writing <your text>` in Claude Code.

### Triggering the skill

Once installed, ask Claude Code to clean up AI writing:

- "Remove AI-isms from this post"
- "Audit this draft for AI tells"
- "Make this sound less like AI"
- "Clean up AI writing in this paragraph"

The skill returns four sections:

1. **Issues found** — every AI-ism identified, with the text quoted
2. **Rewritten version** — clean version with all AI-isms removed
3. **What changed** — summary of the major edits
4. **Second-pass audit** — re-reads the rewrite and catches any surviving tells

## 22 Patterns Detected

### Content Patterns

| # | Pattern | Before | After |
|---|---------|--------|-------|
| 1 | **Significance inflation** | "marking a pivotal moment in the evolution of..." | "was founded in 2019 to solve X" |
| 2 | **Notability name-dropping** | "cited in NYT, BBC, and Wired" | "In a 2024 NYT interview, she argued..." |
| 3 | **Superficial -ing analyses** | "symbolizing... reflecting... showcasing..." | Replace with specific facts or cut |
| 4 | **Promotional language** | "nestled within the breathtaking region" | "is a town in the Gonder region" |
| 5 | **Vague attributions** | "Experts believe it plays a crucial role" | "according to a 2019 survey by Gartner" |
| 6 | **Formulaic challenges** | "Despite challenges... continues to thrive" | Name the challenge and the response |

### Language Patterns

| # | Pattern | Before | After |
|---|---------|--------|-------|
| 7 | **Word/phrase replacements** | "leverage... robust... seamless... utilize" | "use... reliable... smooth... use" |
| 8 | **Copula avoidance** | "serves as... features... boasts" | "is... has" |
| 9 | **Synonym cycling** | "developers... engineers... practitioners... builders" | "developers" (repeat the clear word) |
| 10 | **Template phrases** | "a [adj] step towards [adj] infrastructure" | Describe the specific outcome |
| 11 | **Filler phrases** | "In order to," "Due to the fact that" | "To," "Because" |
| 12 | **False ranges** | "from the Big Bang to dark matter" | List the actual topics |

### Structure Patterns

| # | Pattern | Before | After |
|---|---------|--------|-------|
| 13 | **Formatting** | Em dashes, bold overuse, emoji headers, bullet-heavy | Commas/periods, prose paragraphs |
| 14 | **Sentence structure** | "It's not X, it's Y" + hollow intensifiers + hedging | Direct positive statements |
| 15 | **Structural issues** | Uniform paragraphs, formulaic openings, too-clean grammar | Varied length, lead with the point |
| 16 | **Transition phrases** | "Moreover," "Furthermore," "In today's [X]" | "and," "also," or restructure |
| 17 | **Inline-header lists** | "**Speed:** Speed improved by..." | Write the point directly |
| 18 | **Title case headings** | "Strategic Negotiations And Partnerships" | "Strategic negotiations and partnerships" |

### Communication Patterns

| # | Pattern | Before | After |
|---|---------|--------|-------|
| 19 | **Chatbot artifacts** | "I hope this helps! Let me know if..." | Remove entirely |
| 20 | **Cutoff disclaimers** | "While details are limited in available sources..." | Find sources or remove |
| 21 | **Generic conclusions** | "The future looks bright," "Only time will tell" | Specific closing thought or cut |
| 22 | **Emotional flatline** | "What surprised me most," "I was fascinated to discover" | Earn the emotion or cut the claim |

## Full Example

**Before (AI-generated):**

> Certainly! Here's a comprehensive overview of Acme's Series B.
>
> Acme Analytics, a vibrant startup nestled in the heart of Boulder's thriving tech ecosystem, has secured $40M in Series B funding — marking a watershed moment for the company and the observability landscape at large. The round was led by Sequoia, with participation from Andreessen Horowitz, Y Combinator, and Index Ventures, underscoring the robust investor confidence in Acme's vision.
>
> The platform serves as a unified hub for engineering teams, featuring real-time dashboards, boasting sub-second query performance, and presenting a seamless integration layer. It's not just another monitoring tool — it's a paradigm shift in how organizations navigate complex distributed systems. Experts believe Acme is poised to disrupt the $15B observability market. Studies show that companies utilizing comprehensive monitoring solutions can ascertain issues 40% faster.
>
> - 🚀 **Performance:** The platform streamlines incident response, empowering engineers to resolve issues faster.
> - 💡 **Scale:** Acme fosters collaboration across teams, from frontend developers to SRE practitioners to platform builders to infrastructure engineers.
> - ✅ **Adoption:** Customer adoption continues to accelerate, reflecting broader industry trends.
>
> Moreover, Acme's approach showcases the potential of modern observability — symbolizing a shift toward proactive monitoring, reflecting years of R&D investment, and highlighting the intricate interplay between data collection and actionable intelligence. Despite challenges common in the crowded monitoring space, Acme continues to thrive. In order to fully capitalize on this momentum, the company plans to expand its go-to-market endeavors.
>
> In conclusion, the future looks bright for Acme Analytics. Only time will tell how this game-changer will reshape the observability paradigm. Feel free to reach out if you'd like more details!

**After (cleaned up):**

> Acme Analytics raised a $40M Series B led by Sequoia. The Boulder-based startup makes an observability platform that runs queries in under a second and plugs into existing monitoring stacks without custom integration work.
>
> The pitch is speed. Their median time-to-resolution is 12 minutes, compared to the 45-minute industry average that Datadog reported in 2024. That gap is why 380 companies are paying for it.
>
> They'll use the money to hire sales reps in EMEA and add log management. The monitoring market is crowded, but Acme's bet is that most teams still stitch together three or four tools and lose time switching between them.

**What the skill caught:** chatbot artifacts (Certainly!, Feel free to reach out), 3 em dashes, promotional language (vibrant, nestled, thriving), significance inflation (watershed moment), copula avoidance (serves as, featuring, boasting, presenting), 9 word replacements (landscape, robust, seamless, paradigm, streamline, empower, foster, utilize, ascertain, endeavor), synonym cycling (developers/practitioners/builders/engineers), negative parallelism (It's not just X, it's Y), notability name-dropping (Sequoia, a16z, YC, Index stacked for credibility), vague attributions (Experts believe, Studies show), filler phrases (In order to, Moreover), inline-header list with emoji, superficial -ing analysis (symbolizing... reflecting... highlighting...), formulaic challenges (Despite challenges... continues to thrive), generic conclusion (the future looks bright, only time will tell), false range implied in the adoption bullet.

That's 35+ AI tells.

## Credits

Pattern research informed by:
- Wikipedia's [Signs of AI-generated text](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) documentation
- [blader/humanizer](https://github.com/blader/humanizer) Claude Code skill

## License

MIT
