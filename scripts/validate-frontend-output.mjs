#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

async function main() {
  const projectDir = path.resolve(process.argv[2] ?? process.cwd());
  const analysisPath = path.join(projectDir, "project-analysis.md");
  const skillsPath = path.join(projectDir, "recommended-skills.md");
  const analysisDataPath = path.join(projectDir, ".frontend-quickstart", "analysis.json");
  const claudeDirPath = path.join(projectDir, ".claude");
  const codexDirPath = path.join(projectDir, ".codex");
  const cursorDirPath = path.join(projectDir, ".cursor");

  const failures = [];

  const analysis = await readIfExists(analysisPath);
  const skills = await readIfExists(skillsPath);
  const analysisData = await readIfExists(analysisDataPath);
  const hasClaudeDir = await exists(claudeDirPath);
  const hasCodexDir = await exists(codexDirPath);
  const hasCursorDir = await exists(cursorDirPath);

  if (!analysis) failures.push("missing project-analysis.md");
  if (!skills) failures.push("missing recommended-skills.md");
  if (!analysisData) failures.push("missing .frontend-quickstart/analysis.json");

  if (analysis) {
    requireIncludes(analysis, "项目分析", failures, "project-analysis.md missing main title");
    requireIncludes(analysis, "## 先按这个顺序读", failures, "project-analysis.md missing fixed section: 先按这个顺序读");
    requireIncludes(analysis, "建议先看的几个模块", failures, "project-analysis.md missing risk section");
    requireIncludes(analysis, "## 性能分析", failures, "project-analysis.md missing fixed section: 性能分析");
    requireIncludes(analysis, "## 后面再看哪里", failures, "project-analysis.md missing fixed section: 后面再看哪里");
    const leakedInternalFields = [
      "importCount",
      "stateSignalCount",
      "effectSignalCount",
      "asyncSignalCount",
      "uiContainerCount",
      "complexityDrivers",
    ];
    for (const field of leakedInternalFields) {
      if (analysis.includes(field)) {
        failures.push(`project-analysis.md should not expose internal analysis fields directly: ${field}`);
      }
    }
    const leakedInternalProcessPhrases = [
      /分析脚本[\s\S]{0,30}(排进|排在|标成|列成)/,
      /内部分析结果[\s\S]{0,30}(排在|显示|标成|列成)/,
      /top\s*3\s*风险模块/i,
      /第\s*1\s*名[\s\S]{0,20}(风险模块|高风险模块)/,
      /analysis\.json[\s\S]{0,40}(排在|显示|标成|列成)/i,
    ];
    for (const pattern of leakedInternalProcessPhrases) {
      if (pattern.test(analysis)) {
        failures.push("project-analysis.md should not narrate the internal ranking or analysis process");
        break;
      }
    }
    if (!/顺序|入口|映射关系/.test(analysis)) {
      failures.push("project-analysis.md should identify at least one concrete reading order or control-point path");
    }
    if (!/项目分析[\s\S]{0,600}(这个项目|主要是|主要用到)/.test(analysis)) {
      failures.push("project-analysis.md should start with a plain-language project summary");
    }
    if (/补一句|实际感受|这不是.+而是/.test(analysis)) {
      failures.push("project-analysis.md sounds too impressionistic");
    }
    const introText = analysis
      .replace(/^#\s+项目分析\s*/m, "")
      .split(/\n##\s+/)[0];
    const introSentenceCount = (introText.match(/[。！？]/g) ?? []).length;
    if (introSentenceCount < 2 || introSentenceCount > 3) {
      failures.push("project-analysis.md summary under the title should stay within 2 to 3 sentences");
    }
    const introLines = introText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const firstTwoIntroLines = introLines.slice(0, 2).join(" ");
    if (!/`[^`]+`/.test(firstTwoIntroLines)) {
      failures.push("project-analysis.md summary should quickly land on concrete code objects such as paths, modules, or files");
    }
    const readingChainSection = analysis.match(/## 先按这个顺序读\s+([\s\S]*?)(?=\n##\s|$)/);
    if (readingChainSection) {
      const arrowChains = readingChainSection[1].match(/->/g) ?? [];
      if (arrowChains.length < 1) {
        failures.push("project-analysis.md section '先按这个顺序读' should include one main reading order");
      }
      const numberedLines = readingChainSection[1].match(/^\d+\.\s/gm) ?? [];
      if (numberedLines.length > 1) {
        failures.push("project-analysis.md section '先按这个顺序读' should not expand into multiple ranked reading paths");
      }
    }
    const speedupSection = analysis.match(/## 性能分析\s+([\s\S]*?)(?=\n##\s|$)/);
    if (speedupSection) {
      const requiredParts = [
        "### 解释",
        "### 运行时间分析",
        "### 可以先改的地方",
        "### 影响力与复杂度表",
        "### 先改的第一处",
      ];
      for (const part of requiredParts) {
        if (!speedupSection[1].includes(part)) {
          failures.push(`project-analysis.md section '性能分析' missing required part: ${part}`);
        }
      }
      const detailedSections = speedupSection[1].match(/### 先改的第[一二三四五]处/g) ?? [];
      if (detailedSections.length < 1 || detailedSections.length > 5) {
        failures.push("project-analysis.md section '性能分析' should fully expand all meaningful optimization items when fewer than 5 exist, or expand only the top 5");
      }
      if (!/可以先这样改[\s\S]*?\/\/|可以先这样改[\s\S]*?\/\*/.test(speedupSection[1])) {
        failures.push("project-analysis.md rewritten code should include Chinese comments on key changes");
      }
      if (!/第\s*\d+-\d+\s*行|第\s*\d+\s*行/.test(speedupSection[1])) {
        failures.push("project-analysis.md performance section should include line ranges for any lower-ranked follow-up items");
      }
      if (/完整替换|直接替换|drop-in replacement|ready to paste/.test(speedupSection[1])) {
        failures.push("project-analysis.md performance section should stay at local optimization direction, not a full replacement implementation");
      }
    }
    const sectionCount = (analysis.match(/^##\s+/gm) ?? []).length;
    if (sectionCount > 6) {
      failures.push("project-analysis.md is too fragmented");
    }
    if (/analysis\.json.+(hybrid-rendering|client-boundary|mixed-data-flow|provider-heavy)/.test(analysis)) {
      failures.push("project-analysis.md cites inferred runtime labels as if they were emitted directly by analysis.json");
    }
    if (/复杂度主要集中|真正复杂/.test(analysis) && !/(状态|数据|同步|Provider|初始化|workspace|realtime|Dexie)/.test(analysis)) {
      failures.push("project-analysis.md names complex areas but does not expand the moving parts behind that complexity");
    }
    if (/高风险|复杂度|维护成本/.test(analysis) && !/(imports?|依赖|API|状态|副作用|生命周期|重建|rebuild|容器|表格|桥接)/.test(analysis)) {
      failures.push("project-analysis.md names costly modules but does not explain the concrete complexity drivers behind them");
    }
    if (/后面再看哪里[\s\S]{0,400}性能/.test(analysis) && !/##\s+.*性能|##\s+.*运行时|##\s+.*渲染/.test(analysis)) {
      failures.push("project-analysis.md mentions performance as a reading priority but does not give it a dedicated analysis section");
    }
    if ((hasClaudeDir || hasCodexDir || hasCursorDir) && !/\.claude|\.codex|\.cursor|CLAUDE\.md/.test(analysis)) {
      failures.push("project-analysis.md ignores hidden agent-context directories that exist in the repository");
    }
  }

  if (skills) {
    requireIncludes(skills, "| Skill |", failures, "recommended-skills.md missing markdown table header");
    requireIncludes(skills, "| Description |", failures, "recommended-skills.md missing description column");
    requireIncludes(skills, "| GitHub |", failures, "recommended-skills.md missing GitHub column");
    requireIncludes(skills, "建议优先安装", failures, "recommended-skills.md missing install-priority section");
    if (!/建议优先安装[\s\S]{0,400}(因为|理由|覆盖|优先)/.test(skills)) {
      failures.push("recommended-skills.md install-priority section lacks explanation");
    }
    const githubLinks = skills.match(/https:\/\/github\.com\/[^\s|)]+/g) ?? [];
    if (githubLinks.length < 3) {
      failures.push("recommended-skills.md should mostly contain publicly verifiable GitHub-backed skills");
    }
    const parsedRows = parseRecommendedSkillRows(skills);
    for (const row of parsedRows) {
      if (!/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$/.test(row.skill)) {
        failures.push(`recommended-skills.md skill must use an exact installable id like owner/repo@skill: ${row.skill}`);
        continue;
      }
      const [ownerRepo] = row.skill.split("@");
      const expectedGitHub = `https://github.com/${ownerRepo}`;
      if (row.github !== expectedGitHub) {
        failures.push(`recommended-skills.md GitHub URL does not match installable skill id for ${row.skill}`);
      }
    }
  }

  if (analysisData) {
    let parsed;
    try {
      parsed = JSON.parse(analysisData);
    } catch {
      failures.push("analysis.json is not valid JSON");
    }
    if (parsed && (!Array.isArray(parsed.riskModules) || parsed.riskModules.length === 0)) {
      failures.push("analysis.json missing riskModules");
    }
    if (parsed && (!Array.isArray(parsed.controlPoints) || parsed.controlPoints.length === 0)) {
      failures.push("analysis.json missing controlPoints");
    }
    if (parsed && (!Array.isArray(parsed.readingChains) || parsed.readingChains.length === 0)) {
      failures.push("analysis.json missing readingChains");
    }
    if (parsed && !Array.isArray(parsed.crossCuttingModules)) {
      failures.push("analysis.json missing crossCuttingModules");
    }
    if (parsed && !Array.isArray(parsed.guidanceDiffs)) {
      failures.push("analysis.json missing guidanceDiffs");
    }
    if (
      parsed &&
      parsed.workspace?.isMonorepo &&
      (!Array.isArray(parsed.workspace?.appRoots) || parsed.workspace.appRoots.length === 0) &&
      (!Array.isArray(parsed.workspace?.packageRoots) || parsed.workspace.packageRoots.length === 0)
    ) {
      failures.push("analysis.json marks the repo as a monorepo but does not record appRoots or packageRoots");
    }
    if (parsed && (hasClaudeDir || hasCodexDir || hasCursorDir)) {
      const detectedHiddenDirs = parsed.guidanceContext?.hiddenAgentDirs ?? [];
      if (!Array.isArray(detectedHiddenDirs) || detectedHiddenDirs.length === 0) {
        failures.push("analysis.json should record hidden agent-context directories when they exist");
      }
    }
    if (parsed && analysis && parsed.workspace?.isMonorepo) {
      const mentionsWorkspaceSplit =
        /Monorepo|monorepo|workspace|apps\/|packages\//.test(analysis);
      const explainsWorkspaceSplit =
        /(边界|共享包|应用层|平台包|任务编排|workspace|包边界|应用边界)/.test(analysis);

      if (mentionsWorkspaceSplit && !explainsWorkspaceSplit) {
        failures.push("project-analysis.md mentions the workspace split but does not explain the package or application boundaries behind it");
      }

      const manifestsSuggestStructuredWorkspace =
        Array.isArray(parsed.dependencySources) &&
        parsed.dependencySources.some((item) => String(item.path || "").includes("package.json")) &&
        Array.isArray(parsed.workspace?.appRoots) && parsed.workspace.appRoots.length > 0 &&
        Array.isArray(parsed.workspace?.packageRoots) && parsed.workspace.packageRoots.length > 0;

      if (manifestsSuggestStructuredWorkspace && mentionsWorkspaceSplit && !explainsWorkspaceSplit) {
        failures.push("project-analysis.md should explain the package or application boundaries when the workspace structure is discussed");
      }
    }
    if (parsed && skills) {
      const normalizedSkills = normalizeText(skills);
      const coverageGroups = [
        {
          label: "framework",
          detected: parsed.stack?.frameworks ?? [],
        },
        {
          label: "tooling",
          detected: parsed.stack?.tooling ?? [],
        },
        {
          label: "data",
          detected: parsed.stack?.data ?? [],
        },
        {
          label: "state",
          detected: parsed.stack?.state ?? [],
        },
        {
          label: "editing",
          detected: parsed.stack?.editing ?? [],
        },
        {
          label: "testing",
          detected: parsed.stack?.testing ?? [],
        },
      ].filter((group) => group.detected.length > 0);

      for (const group of coverageGroups) {
        const hasMention = group.detected.some((label) =>
          normalizedSkills.includes(normalizeText(label)),
        );

        if (!hasMention) {
          failures.push(
            `recommended-skills.md should cover the detected ${group.label} layer with a direct or nearby recommendation`,
          );
        }
      }
    }
    if (parsed && Array.isArray(parsed.riskModules)) {
      for (const module of parsed.riskModules.slice(0, 3)) {
        if (!Array.isArray(module.moduleSummary?.complexityDrivers)) {
          failures.push(`risk module missing complexityDrivers: ${module.module}`);
          break;
        }
        if (!Array.isArray(module.moduleSummary?.reasonHints) || module.moduleSummary.reasonHints.length === 0) {
          failures.push(`risk module missing reasonHints: ${module.module}`);
          break;
        }
        if (!Array.isArray(module.moduleSummary?.derivedFrom) || module.moduleSummary.derivedFrom.length === 0) {
          failures.push(`risk module missing derivedFrom: ${module.module}`);
          break;
        }
        if (typeof module.confidence !== "number") {
          failures.push(`risk module missing confidence: ${module.module}`);
          break;
        }
      }
    }
    if (parsed && Array.isArray(parsed.readingChains)) {
      for (const chain of parsed.readingChains.slice(0, 2)) {
        if (typeof chain.confidence !== "number") {
          failures.push(`reading chain missing confidence: ${chain.kind ?? "unknown"}`);
          break;
        }
        if (!Array.isArray(chain.derivedFrom) || chain.derivedFrom.length === 0) {
          failures.push(`reading chain missing derivedFrom: ${chain.kind ?? "unknown"}`);
          break;
        }
      }
    }
    if (parsed && Array.isArray(parsed.crossCuttingModules) && parsed.crossCuttingModules.length > 0) {
      for (const module of parsed.crossCuttingModules.slice(0, 2)) {
        if (typeof module.confidence !== "number") {
          failures.push(`cross-cutting module missing confidence: ${module.module}`);
          break;
        }
        if (!Array.isArray(module.derivedFrom) || module.derivedFrom.length === 0) {
          failures.push(`cross-cutting module missing derivedFrom: ${module.module}`);
          break;
        }
      }
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`FAIL: ${failure}`);
    }
    process.exit(1);
  }
  console.log("PASS: frontend-quickstart outputs look complete");
}

async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function requireIncludes(content, needle, failures, message) {
  if (!content.includes(needle)) {
    failures.push(message);
  }
}

function normalizeText(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseRecommendedSkillRows(content) {
  const rows = [];
  for (const line of content.split("\n")) {
    if (!line.startsWith("| `")) continue;
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 5) continue;
    rows.push({
      skill: parts[1].replace(/^`|`$/g, ""),
      github: parts[3],
    });
  }
  return rows;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
