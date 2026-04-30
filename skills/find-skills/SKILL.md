---
name: find-skills
description: Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. This skill should be used when the user is looking for functionality that might exist as an installable skill.
---

# Find Skills

This skill helps you discover and install skills from the open agent skills ecosystem.

## When to Use This Skill

Use this skill when the user:

- Asks "how do I do X" where X might be a common task with an existing skill
- Says "find a skill for X" or "is there a skill for X"
- Asks "can you do X" where X is a specialized capability
- Expresses interest in extending agent capabilities
- Wants to search for tools, templates, or workflows
- Mentions they wish they had help with a specific domain (design, testing, deployment, etc.)

## What is the Skills CLI?

The Skills CLI (`npx skills`) is the package manager for the open agent skills ecosystem. Skills are modular packages that extend agent capabilities with specialized knowledge, workflows, and tools.

**Key commands:**

- `npx skills find [query]` - Search for skills interactively or by keyword
- `npx skills add <package>` - Install a skill from GitHub or other sources
- `npx skills check` - Check for skill updates
- `npx skills update` - Update all installed skills

**Browse skills at:** https://skills.sh/

## How to Help Users Find Skills

### Step 1: Understand What They Need

When a user asks for help with something, identify:

1. The domain (e.g., React, testing, design, deployment)
2. The specific task (e.g., writing tests, creating animations, reviewing PRs)
3. Whether this is a common enough task that a skill likely exists

### Step 2: Check the Leaderboard First

Before running a CLI search, check the [skills.sh leaderboard](https://skills.sh/) to see if a well-known skill already exists for the domain. The leaderboard ranks skills by total installs, surfacing the most popular and battle-tested options.

For example, top skills for web development include:
- `vercel-labs/agent-skills` — React, Next.js, web design (100K+ installs each)
- `anthropics/skills` — Frontend design, document processing (100K+ installs)

### Step 3: Search for Skills

If the leaderboard doesn't cover the user's need, run the find command:

```bash
npx skills find [query]
```

For example:

- User asks "how do I make my React app faster?" → `npx skills find react performance`
- User asks "can you help me with PR reviews?" → `npx skills find pr review`
- User asks "I need to create a changelog" → `npx skills find changelog`

Treat the `skills` CLI and `skills.sh` as the canonical source of truth for published skills. Do not invent skill slugs from topic names, and do not treat a generic GitHub repository search as equivalent to a verified skill result.

When this skill is used inside `frontend-quickstart`, search directly by the detected technology names first. If the project uses technologies like `tiptap`, `yjs`, `supabase`, or `zustand`, run searches for those names before falling back to broader category queries.

When this skill is used inside `frontend-quickstart`, keep the recommendation list aligned with the detected stack layers. If the project clearly uses an editor or collaboration stack such as `tiptap` or `yjs`, do not let the final list collapse back to only generic React / Next.js recommendations.

Inside `frontend-quickstart`, do not over-constrain recommendations to exact dependency-name matches. Prefer an exact stack match when it exists, but if it does not, recommend the nearest skill in the same layer, workflow, or subsystem.

### Step 4: Verify Quality Before Recommending

**Do not recommend a skill based solely on search results.** Always verify:

1. **Install count** — Prefer skills with 1K+ installs. Be cautious with anything under 100.
2. **Source reputation** — Official sources (`vercel-labs`, `anthropics`, `microsoft`) are more trustworthy than unknown authors.
3. **GitHub stars** — Check the source repository. A skill from a repo with <100 stars should be treated with skepticism.

### Step 4.5: Do A Second-Pass Identity Check

Before writing down a recommendation, do one more pass to confirm the skill identity itself is correct.

Check these items together:

1. **Skill name** — the exact skill slug you plan to recommend
2. **Source repo** — the owner/repo that actually publishes that skill
3. **GitHub URL** — the repository URL matches the source repo, not a different repo with a similar topic

Do not assume the first search result got the mapping right. If the skill name is correct but the repository link is uncertain, keep checking until the name, source repo, and GitHub URL all line up.

If you cannot confirm that mapping, do not recommend that skill yet.

### Step 4.6: Verify The Exact Installable ID

Before you recommend a skill, confirm the exact installable identifier in the form:

```text
owner/repo@skill
```

Use this workflow:

1. Search with `npx skills find [query]`
2. Pick a candidate result only if the result already gives you a concrete `owner/repo@skill`
3. Run `npx skills add <owner/repo> -l` and confirm the `skill` part appears in that repository's published skill list
4. Derive the GitHub URL from the verified `owner/repo`

If you do not have a verified installable identifier, do not recommend the skill.

This verification rule is about identity, not exactness. A recommendation can still be valid if it is the closest relevant skill for that layer, even when the skill name is broader or adjacent to the detected dependency.

Do not turn "not selected" into "not found". If a search returns real candidate skill ids for a detected technology, treat that technology as found even if you later decide not to include those candidates in the final recommendation list.

Treat all search and verification work as internal. Do not write lines such as "I verified the install ID", "I checked this with `npx skills add ... -l`", or source-checking notes into `recommended-skills.md`.

Treat local environment workarounds as internal too. Do not mention cache paths, npm permissions, temporary env vars, or similar execution details unless the user is explicitly asking about the environment itself.

In `recommended-skills.md`, do not add a "gaps", "missing skills", or "not recommended" note for technologies that were considered but not selected. Just list the skills that are actually being recommended.

Do not add meta commentary about the recommendation process itself, such as saying the recommendation logic still needs work or will be tightened later.

In `recommended-skills.md`, move straight into the recommendation results. Prefer starting with the table immediately after the title.

When the user is asking whether a specific technology has published skills, answer directly with the candidate skill ids you found. Do not add process notes, gap notes, or commentary about the search logic.

### Step 5: Present Options to the User

When you find relevant skills, present them to the user with:

1. The skill name and what it does
2. The install count and source
3. The install command they can run
4. A link to learn more at skills.sh

Example response:

```
I found a skill that might help! The "react-best-practices" skill provides
React and Next.js performance optimization guidelines from Vercel Engineering.
(185K installs)

To install it:
npx skills add vercel-labs/agent-skills@react-best-practices

Learn more: https://skills.sh/vercel-labs/agent-skills/react-best-practices
```

### Step 6: Offer to Install

If the user wants to proceed, you can install the skill for them:

```bash
npx skills add <owner/repo@skill> -g -y
```

The `-g` flag installs globally (user-level) and `-y` skips confirmation prompts.

## Common Skill Categories

When searching, consider these common categories:

| Category        | Example Queries                          |
| --------------- | ---------------------------------------- |
| Web Development | react, nextjs, typescript, css, tailwind |
| Testing         | testing, jest, playwright, e2e           |
| DevOps          | deploy, docker, kubernetes, ci-cd        |
| Documentation   | docs, readme, changelog, api-docs        |
| Code Quality    | review, lint, refactor, best-practices   |
| Design          | ui, ux, design-system, accessibility     |
| Productivity    | workflow, automation, git                |

## Tips for Effective Searches

1. **Use specific keywords**: "react testing" is better than just "testing"
2. **Try alternative terms**: If "deploy" doesn't work, try "deployment" or "ci-cd"
3. **Check popular sources**: Many skills come from `vercel-labs/agent-skills` or `ComposioHQ/awesome-claude-skills`

## When No Skills Are Found

If no relevant skills exist:

1. Acknowledge that no existing skill was found
2. Offer to help with the task directly using your general capabilities
3. Suggest the user could create their own skill with `npx skills init`

Example:

```
I searched for skills related to "xyz" but didn't find any matches.
I can still help you with this task directly! Would you like me to proceed?

If this is something you do often, you could create your own skill:
npx skills init my-xyz-skill
```
