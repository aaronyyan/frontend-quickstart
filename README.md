[English](README.md) | [简体中文](README.zh-CN.md)

# Frontend Quickstart

Use this skill when you need a fast first-pass understanding of a project and want a report, skill recommendations, and diagrams.

## What It Does

- identifies the main technologies and entry points
- generates `project-analysis.md`
- generates `recommended-skills.md`
- generates an architecture diagram
- adds a Mermaid relationship diagram for the modules to inspect first
- runs one performance deep dive on the top-ranked module among the top 3 modules to inspect first
- normalizes final deliverables into Chinese when the output language is Chinese

## Built-in Skills

| Skill | When to Use | What It Does |
| --- | --- | --- |
| `frontend-quickstart` | first-pass project analysis | runs the full workflow and produces the main outputs |
| `find-skills` | skill recommendations | finds and verifies installable skill ids |
| `receiving-code-review` | risk follow-up | sharpens which modules deserve attention |
| `performance-optimizer` | deeper performance analysis | runs one performance deep dive on the chosen module |
| `risk-hotspot-mermaid` | module relationships are already clear | generates a Mermaid relationship diagram |
| `project-translate` | final files should be Chinese | turns analysis and recommendation drafts into natural Chinese |
| `frontend-diagram` | architecture visualization | generates the architecture diagram |

To test `performance-optimizer` by itself, say things like:

- `use performance-optimizer on this project`
- `only run performance-optimizer`
- `find the main optimization areas in this project`
- `generate performance-analysis.md`

## Platform Support

This repository supports these install or packaging targets:

- Codex: install with [`.codex/INSTALL.md`](.codex/INSTALL.md)
- OpenCode: install with [`.opencode/INSTALL.md`](.opencode/INSTALL.md)
- Claude: see [`.claude-plugin/`](.claude-plugin)
- Cursor: see [`.cursor-plugin/`](.cursor-plugin)

For direct skill-directory installs, the repository root is the skill entry point.

## Workflow

1. Read the code and any existing guidance files.
2. Run the analysis script to produce `.frontend-quickstart/analysis.json`.
3. Turn the scan results into stack, key modules, and first-read paths.
4. Recommend relevant skills and verify their install ids.
5. Run one performance deep dive on the top-ranked module among the top 3 modules to inspect first.
6. Generate `project-analysis.md`, `recommended-skills.md`, and the architecture diagram, and add the Mermaid relationship diagram.
7. When the final language is Chinese, rewrite any English draft sections into Chinese.
8. Run validation at the end.

## Installation

Note: installation depends on the agent you are using.

Install this repository as `frontend-quickstart`.

### Codex

1. Clone the repository:

```bash
git clone https://github.com/aaronyyan/frontend-quickstart.git ~/frontend-quickstart
```

2. Symlink it into the Codex skills directory:

```bash
mkdir -p ~/.agents/skills
ln -s ~/frontend-quickstart ~/.agents/skills/frontend-quickstart
```

3. Restart Codex.

Details: [`.codex/INSTALL.md`](.codex/INSTALL.md) and [docs/README.codex.md](docs/README.codex.md)

### OpenCode

1. Clone the repository:

```bash
git clone https://github.com/aaronyyan/frontend-quickstart.git ~/frontend-quickstart
```

2. Symlink it into the OpenCode skills directory:

```bash
mkdir -p ~/.config/opencode/skills
ln -s ~/frontend-quickstart ~/.config/opencode/skills/frontend-quickstart
```

3. Restart OpenCode.

Details: [`.opencode/INSTALL.md`](.opencode/INSTALL.md) and [docs/README.opencode.md](docs/README.opencode.md)

### Claude Code

This repository includes a plugin packaging directory at [`.claude-plugin/`](.claude-plugin).

For direct local usage, install the whole repository as a skill directory in your Claude skills location.

For plugin or distribution workflows, use the metadata under [`.claude-plugin/`](.claude-plugin).

### Cursor

This repository includes a plugin packaging directory at [`.cursor-plugin/`](.cursor-plugin).

For plugin packaging or publishing workflows, use the metadata under [`.cursor-plugin/`](.cursor-plugin).
