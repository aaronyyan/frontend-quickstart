---
name: performance-optimizer
description: Review a concrete hot path after frontend-quickstart has already identified a performance-sensitive module, or run standalone to find and rank the main optimization areas in the current project.
license: MIT
---

# Performance Optimizer

Use this bundled skill in two modes:

1. Follow-up mode
   After `frontend-quickstart` has already narrowed the scope to a concrete page, component, hook, store, request path, service, controller, or other code path that deserves performance review.
   In this mode, keep the original narrow output: stay on the current module, expand all meaningful optimization points when there are fewer than 5, or expand only the top 5 when there are more than 5, and keep the rest as file paths with line ranges and short reasons.

2. Standalone mode
   When the user wants to test `performance-optimizer` directly on the current project and find the main optimization areas without running the full `frontend-quickstart` workflow.
   Only in this mode should you do a project-wide sweep and generate a separate `performance-analysis.md`.

## Standalone triggers

Use standalone mode when the user says things like:

- use `performance-optimizer` on this project
- run `performance-optimizer` on the current repo
- only run `performance-optimizer`
- find the main optimization areas in this project
- generate `performance-analysis.md`

Chinese examples:

- 用 `performance-optimizer` 分析当前项目
- 只跑 `performance-optimizer`
- 找出这个项目最值得先优化的地方
- 生成 `performance-analysis.md`

## What this skill does

- Explain how the current code works
- Identify where runtime cost is concentrated
- Rank optimization opportunities by impact and change risk
- Recommend the smallest safe optimization direction
- Give short code examples only when they help explain the direction
- In standalone mode, scan the current project first, rank the main optimization areas, generate a Markdown report, and include a Mermaid relationship view sized to the number of areas found

## What this skill is not for

- Do not rewrite the whole module
- Do not replace the main entry path with a new flow
- Do not turn a review into a speculative refactor
- Do not present sketch code as if it were ready to paste in
- Do not turn standalone mode into a full project-analysis report with skills, architecture overview, and onboarding guidance

## Standalone mode workflow

When this skill is run directly, do this:

1. Do a project-wide sweep before choosing any single path to deep-dive.
2. Read enough of the current project structure to identify the main candidate areas first.
3. Inspect candidate entry files, pages, stores, services, hooks, synchronization paths, editor paths, audio paths, or other obviously heavy code paths across the project.
4. Rank the candidate areas across the project before deciding which ones deserve detailed write-ups.
5. Write a standalone Markdown report, defaulting to `performance-analysis.md` when no output file is specified.
6. Add a Mermaid relationship view that includes all ranked areas in the report, with the graph size matching the number of areas you found.

In standalone mode, list all meaningful areas. Do not stop after the top-ranked one.
Do not assume one path is the main area until the candidate sweep is complete.
Make the Mermaid graph easy to read in Markdown by default: add an `init` block, use larger spacing, keep labels short, and split the graph when one diagram gets too crowded.

## Core review stance

You are reviewing the current implementation, not authoring a replacement architecture.

Stay close to what the code already does. The goal is to show:

1. what the current path is responsible for
2. why this path is expensive
3. what should be changed first
4. what must stay intact while changing it

## Non-negotiable boundaries

- Do not bypass the main entry path, coordination path, or sync path that already exists in the code.
- Do not merge state that is currently kept separate for different pages, sessions, documents, or objects into one shared holder.
- Do not remove existing retry, conflict handling, permission checks, dirty marking, cleanup, disposal, or recovery behavior just to reduce calls.
- Do not change creation, ownership, or teardown semantics unless the code clearly supports that direction already.
- If you have not verified the surrounding behavior, write the suggestion as a local optimization direction, not a replacement implementation.

## How to write recommendations

For each optimization point:

1. Say what the current code is doing.
2. Say why that part is costly.
3. Say what boundary must be preserved.
4. Say what smaller, safer change should happen first.

Write these explanations as normal engineering prose, not abstract review language:

- Start with what the code does now.
- Then explain what becomes slow, heavy, repeated, or easy to break.
- Then explain what should stay unchanged while optimizing it.
- Prefer concrete wording tied to the code over compressed summary language.
- If a sentence would sound unnatural in a hand-written project note, rewrite it.
- Every explanation should be traceable to a visible action, data path, or update path in the current code.
- When describing relationships between files, stores, services, or UI, say directly who reads what, who updates what, and what part of the screen changes with it.
- When temporary data is involved, say where the data is kept now and when it is used again, instead of relying on shorthand labels.
- When referring to the important parts of a code path, prefer the real file names, module names, state names, and functions already visible in the code instead of inventing a new label for them.

If you include code:

- Keep it short and local.
- Use it to illustrate the direction only.
- Treat it as a sketch, not a drop-in replacement.
- Add short Chinese comments on the key change when that makes the point clearer.
- Do not write examples that silently remove surrounding behavior.
- Code comments must describe the concrete action in the nearby lines and the direct reason for it.
- Reuse the objects and operations already visible in the code when writing comments.
- Do not write comments as abstract summaries that cannot be understood from the current lines alone.

In follow-up mode, for lower-ranked items:

- Include the file path
- Include the current line range when available
- Include one short reason for why it is worth reading next

In standalone mode:

- Do not stop at the top 3 areas
- Give every meaningful area its own write-up in the report
- Do not collapse the later areas into a catch-all section
- Keep the same section structure for every area
- In the Mermaid relationship view, default to `TB` with an `init` block such as `theme: 'base'`, `curve: 'basis'`, `nodeSpacing: 36-48`, `rankSpacing: 44-60`, and `fontSize: '16px'`
- If there are too many nodes to read comfortably in one graph, split the result into two or more Mermaid blocks instead of squeezing everything into one

## Output rules

- Keep the review tied to the actual code
- Do not invent benchmark numbers
- If exact runtime cannot be measured, describe relative cost and likely heavy areas instead
- Prefer minimal-diff directions over new abstractions
- If a proposed change has a wide blast radius, say so explicitly
- If an example only demonstrates a principle, label it as a sketch or local example
- In `project-analysis.md`, this section should still appear under a direct heading such as `性能分析`
- In follow-up mode, do not switch to the standalone report template
- In follow-up mode, expand every meaningful point if there are fewer than 5. If there are more than 5, expand only the top 5 first, then list the remaining lower-ranked items as plain bullets with file paths and line ranges.
- In standalone mode, write the report as a separate Markdown artifact instead of folding it into `project-analysis.md`
- In standalone mode, include a Mermaid relationship view that covers all ranked areas rather than just the first one

## Required response format

Use the first format in follow-up mode. Use the second format in standalone mode.

### Follow-up mode

```md
## 解释：

$explanation

## 运行时间分析：

$runtime_analysis

## 可以先改的地方：

$candidates

## 影响力与复杂度表：

|修改项|影响力|复杂度|
|---|---|---|
|$candidate_table|||

## 按影响力排序的修改建议：

$ordered_candidates

When there are fewer than 5 meaningful optimization points, write only the sections you actually need. Always keep `先改的第一处`, then continue with `先改的第二处` to `先改的第五处` only when those points exist.

## 先改的第一处：

# 解释

$top_candidate_explanation

# 改之前先注意

$top_candidate_boundary

# 可以先这样改

$top_candidate_code

## 先改的第二处：

# 解释

$second_candidate_explanation

# 改之前先注意

$second_candidate_boundary

# 可以先这样改

$second_candidate_code

## 先改的第三处：

# 解释

$third_candidate_explanation

# 改之前先注意

$third_candidate_boundary

# 可以先这样改

$third_candidate_code

## 先改的第四处：

# 解释

$fourth_candidate_explanation

# 改之前先注意

$fourth_candidate_boundary

# 可以先这样改

$fourth_candidate_code

## 先改的第五处：

# 解释

$fifth_candidate_explanation

# 改之前先注意

$fifth_candidate_boundary

# 可以先这样改

$fifth_candidate_code

- $remaining_candidate_with_file_path_line_range_and_reason
```

Use this format when `performance-optimizer` is being called from `frontend-quickstart` for one already-chosen module.

### Standalone mode

```md
# 性能分析

$summary

## 主要优化区域总览

```mermaid
%%{init: {'theme':'base','flowchart':{'curve':'basis','nodeSpacing':42,'rankSpacing':52},'themeVariables':{'fontSize':'16px'}} }%%
$hotspot_mermaid
```

$hotspot_legend

## 按优先级排序的主要优化区域

$ordered_hotspots

## 主要优化区域 1：$hotspot_title

### 解释

$hotspot_explanation

### 运行时间分析

$hotspot_runtime_analysis

### 改之前先注意

$hotspot_boundary

### 可以先这样改

$hotspot_code

## 主要优化区域 2：$hotspot_title

### 解释

$hotspot_explanation

### 运行时间分析

$hotspot_runtime_analysis

### 改之前先注意

$hotspot_boundary

### 可以先这样改

$hotspot_code

## 主要优化区域 N：$hotspot_title

### 解释

$hotspot_explanation

### 运行时间分析

$hotspot_runtime_analysis

### 改之前先注意

$hotspot_boundary

### 可以先这样改

$hotspot_code_or_next_step
```

Use this format only when `performance-optimizer` is run by itself on the current project.
