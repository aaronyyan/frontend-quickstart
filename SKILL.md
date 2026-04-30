---
name: frontend-quickstart
description: Use when the user wants a whole-project analysis. This skill should handle requests like "analyze this project", "help me understand this project", "quickly understand this project", or requests for a project analysis report, skill recommendations, and architecture diagrams.
when_to_use: analyze this project, help me analyze this project, help me understand this project, quickly understand this project, project analysis report, architecture overview
license: MIT
---

# Frontend Quickstart

Use this skill to analyze a whole project and generate a project analysis report, skill recommendations, and an architecture diagram.

Use it when someone is new to the project and needs the first solid pass.

## Run The Analysis Script First

Before writing the final artifacts, run:

```bash
node scripts/analyze-frontend-project.mjs <project-dir>
```

This generates:

- `.frontend-quickstart/analysis.json`
- `.frontend-quickstart/analysis.md`

Use these files as the main basis for the final write-up.

## Existing project guidance

Before producing the final summary, check whether the target repository already contains guidance files such as:

- `AGENT.md`
- `AGENTS.md`
- `CLAUDE.md`
- `SKILL.md`
- hidden agent directories such as `.claude/`, `.codex/`, `.cursor/`
- other obviously important project documentation files

If such files exist, read them before writing the final summary and carry their project conventions, workflow notes, and directory guidance into the rest of the analysis.

## Core workflow

1. Read the current repository structure first.
2. If `project-analysis.md`, `recommended-skills.md`, or previously generated diagrams already exist, delete the old files before regenerating them.
3. Read any existing project guidance and the relevant files inside hidden agent-context directories.
4. Run `node scripts/analyze-frontend-project.mjs <project-dir>` and inspect `.frontend-quickstart/analysis.json`.
5. Combine the dependency manifests, key config files, existing guidance, and scan results to identify the stack, entry points, and how the important modules connect.
6. Use the bundled `find-skills` skill to recommend relevant skills, and verify that each recommendation uses a real install id and the correct GitHub source.
7. Use the bundled `receiving-code-review` skill to sharpen the risk judgment and identify the best modules to read first.
8. By default, take the top-ranked module from the internal top 3 modules that deserve attention first and run one `performance-optimizer` deep dive on it. If the chosen module has fewer than 5 meaningful optimization points, expand all of them in detail; if it has more than 5, expand only the top 5 in detail. Put any remaining lower-ranked points into plain bullet items with file paths, line ranges, and short reasons.
9. Use the bundled `risk-hotspot-mermaid` skill to add a Mermaid relationship diagram for the modules that deserve attention first, then pair it with short plain-language reasons below it.
10. If the final deliverables are meant to be Chinese, use the bundled `project-translate` skill to turn any English or mixed-language draft sections in `project-analysis.md` and `recommended-skills.md` into natural Chinese before the final write-out.
11. Generate `project-analysis.md`, `recommended-skills.md`, and the architecture diagram.
12. Run `node scripts/validate-frontend-output.mjs <project-dir>` before claiming completion.

Do not write any `gsd` context files into the project directory or `.frontend-quickstart/`; `gsd` is only for thread-level context handling and should not become part of the analysis artifacts.

## Bundled skills

This skill bundles:

- `skills/find-skills/` for skill recommendations
- `skills/receiving-code-review/` for risk review
- `skills/performance-optimizer/` for deeper performance follow-up on a concrete module
- `skills/risk-hotspot-mermaid/` for Mermaid relationship diagrams that show which modules to inspect first
- `skills/project-translate/` for final Chinese cleanup of analysis and recommendation drafts
- `skills/frontend-diagram/` for architecture diagrams

## Recommend Skills

Recommend public, installable skills that best fit the current stack. Prefer direct matches when they exist; if they do not, recommend the closest skill in the same layer or workflow instead. Cover the foundation stack first, then add subsystem-specific skills.

For each recommendation:

- include the exact installable skill id in the form `owner/repo@skill`
- include a one-sentence description
- include the GitHub repository URL using a short link label
- include one short reason tied to the technologies the project actually uses

In `recommended-skills.md`, go straight to the recommendation results. Start with the table right after the title, or keep only one very short transition sentence before it when needed.

Each recommendation must still map cleanly to one public skill: the install id, source repository, and GitHub link should all point to the same thing. But the recommendation itself does not need to be an exact dependency-name match if a nearby skill is clearly the better fit.

## Project Analysis Report

The report should include:

- the main technologies used in the project
- any important existing project guidance found in `AGENT.md`, `AGENTS.md`, `CLAUDE.md`, `SKILL.md`, hidden agent-context directories, or similar files
- the first reading order
- the modules that should be read first
- one performance deep dive for the top-ranked module among the internal top 3 modules that deserve attention first
- what to read afterward

If the final files are meant to be Chinese, make sure `project-analysis.md` and `recommended-skills.md` are written out as Chinese documents rather than mixed-language drafts.

Keep the report concise, structured, and directly grounded in the repository.

Use a fixed section structure in `project-analysis.md`. By default, organize it as:

- Start here
- Which modules to read first
- Performance analysis
- What to read afterward

Each section should use a fixed output slot:

- Summary under the title
  Write only 2 to 3 sentences. Sentence 1 states what the project mainly is. Sentence 2 points to the main system that deserves attention first. Sentence 3 is optional and only used when existing project guidance materially changes that reading.
  The summary must land on concrete objects immediately: in the same sentence or the next one, name the actual path, directory, module, or file. Do not open with an abstract judgment and only name the code later.
- `Start here`
  Write exactly 1 main reading order, then add a short explanation of why that order should come first.
- `Which modules to read first`
  Write only the top-ranked modules, each followed by a short reason sentence.
- `Performance analysis`
  Always use these 5 parts:
  1. Explanation
  2. Runtime analysis
  3. What to change first
  4. Impact/complexity table
  5. Detailed explanation, what not to change first, and sketch-level revisions for the fully expanded changes worth making first
     Expand all meaningful items when there are fewer than 5. If there are more than 5, expand only item 1 through item 5 separately. Do not stop after only the highest-ranked item.
- `What to read afterward`
  Write only the next reading order. Do not open a new analysis branch here.

Do not add extra top-level sections instead of these 5 fixed sections. Add another section only when the project has a genuinely separate area that cannot fit into the default slots.

Write `project-analysis.md` as project analysis, not as a directory walkthrough.

State what the code directly shows first, then the judgment that follows from it. Do not make the judgment sound stronger than the code supports.

Use that same order in the opening summary and the first-reading explanation: point to the visible files, directories, call order, or state sources first, then add one sentence about what that means. Do not lead with lines like “the real complexity is concentrated in...” or “the real control handoff is...” and only attach code references afterward.

Keep the section structure close to the current project. Only break out repository structure, package boundaries, or other complex areas when they clearly need their own section.

Focus on the reading order, modules, and risks that matter most. Do not turn the report into commentary, product critique, or vague summary writing.

When naming the important parts of the project, prefer the real paths, directory names, module names, and file names already present in the repository instead of inventing new umbrella labels.

Do not stop at structure description. The report must also include judgment:

- which modules should be read first
- what type of problem is most likely
- why that judgment follows from the current code layout
- how existing project guidance changes or sharpens the interpretation when such guidance exists

Write runtime analysis in terms that fit the project's actual stack. Focus on the runtime layers, state flow, lifecycle behavior, and performance costs that are actually relevant in that ecosystem, and keep those judgments close to code facts instead of adding concepts the repository does not show.

In performance sections, explain things in the order a maintainer would naturally read them: what the code does now, why that becomes slow/heavy/repeated or easy to break, and what should not be changed while optimizing it. Each sentence should map back to a visible action, data path, or update path in the current code.

When describing the relationship between files, stores, services, and UI, say directly who reads what, who updates what, and what part of the screen changes with it.

When writing about temporarily stored data, say where that data is kept now and when it is used again instead of relying on shorthand labels.

When one of the genuinely complex systems is a main source of complexity, explain its concrete moving parts:

- the entry file or coordination file
- the main state or data sources involved
- which responsibilities are tangled together
- the most likely failure mode or maintenance risk

Do not say a module deserves extra attention without saying where that risk or complexity comes from.

By default, run one `performance-optimizer` deep dive on the top-ranked module among the internal top 3 risk modules, and write that result into `project-analysis.md`. This should stay at the level of local optimization direction, not a full replacement implementation.

Always show the modules worth checking first as a Mermaid relationship diagram, then explain them in plain language below the diagram.

Prefer Mermaid `flowchart` for this view, grouped by page, state, and data/connection layers.

Default to the top-ranked module from the internal analysis results.

When the relationship is clear, add short edge labels to show the data flow or dependency direction, such as `reads`, `writes`, `syncs`, `pushes`, or `subscribes`.

Do not make the Mermaid arrows sound stronger than the surrounding prose. Only label an edge when the body text has already established that exact relationship in code terms; otherwise keep the edge unlabeled.

Use this fixed legend:

- red: read this first
- orange: read this next
- slate-blue: related modules

If one diagram gets too crowded, split it into two or more Mermaid diagrams instead of forcing everything into one.

Include at least one recommended reading path instead of only listing files.

Prioritize modules where routing, state, request flow, or UI responsibilities meet; those are often the best places to inspect first.

You may use `.frontend-quickstart/analysis.json`, but only as internal support for ranking, prioritization, and cross-checking. Do not dump the internal metrics object itself into the final report.

Do not narrate the internal ranking process in the final report. Do not write lines such as “the analysis script ranked this in the top 3” or “the internal analysis marked this as number 1”; write the conclusion and the code-based reason directly instead.

Prioritize these questions:

- what this project mainly is
- where a new maintainer should start reading first
- which modules should be read first and why
- where the real complexity is concentrated
- what the next best reading steps are

## Defaults

- Trust code and config over README when they disagree.
- Prefer public skills with stable GitHub repositories when possible.
- Prefer recommendations grounded in the technologies the project actually uses, not guesses.

## Output

Final deliverables:

- `project-analysis.md`
- `recommended-skills.md`
- the architecture diagram
