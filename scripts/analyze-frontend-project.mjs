#!/usr/bin/env node

import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const MAX_WALK_DEPTH = 6;
const MAX_FILES = 2500;
const TEXT_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
  ".scss",
  ".yml",
  ".yaml",
  ".vue",
  ".dart",
  ".gradle",
  ".kts",
  ".plist",
  ".swift",
  ".kt",
  ".java",
  ".properties",
  ".toml",
]);
const INCLUDED_FILENAMES = new Set([
  "package.json",
  "pubspec.yaml",
  "project.config.json",
  "app.json",
  "pages.json",
  "manifest.json",
  "Package.swift",
  "Podfile",
  "Podfile.lock",
  "settings.gradle",
  "settings.gradle.kts",
  "build.gradle",
  "build.gradle.kts",
  "gradle.properties",
  "AndroidManifest.xml",
  "Info.plist",
  "project.tt.json",
  "capacitor.config.json",
]);
const IGNORE_DIRS = new Set([
  ".git",
  ".next",
  ".turbo",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "out",
  ".vercel",
  ".frontend-quickstart",
]);
const ALLOWED_HIDDEN_CONTEXT_DIRS = new Set([".claude", ".codex", ".cursor", ".agents"]);

async function main() {
  const targetDir = path.resolve(process.argv[2] ?? process.cwd());
  const outputDir = path.join(targetDir, ".frontend-quickstart");
  const projectRoot = await detectProjectRoot(targetDir);
  const files = [];
  await walk(projectRoot, projectRoot, 0, files);

  const ecosystem = detectEcosystem(files);
  const dependencyData = await collectDependencyData(projectRoot, files, ecosystem);
  const packageManager = detectPackageManager(projectRoot, dependencyData.packageJson);
  const stack = detectStack(dependencyData.names, ecosystem);
  const structure = summarizeStructure(files);
  const workspace = detectWorkspaceShape(files, projectRoot);
  const guidanceContext = detectGuidanceContext(files);
  const entries = detectEntries(projectRoot, files, ecosystem);
  const configFiles = detectConfigFiles(files, ecosystem);
  const routeGroups = detectRouteGroups(files, ecosystem);
  const sourceProfiles = await collectSourceProfiles(projectRoot, files, ecosystem);
  const moduleAnalysis = collectModuleAnalysis(sourceProfiles, ecosystem);
  const risks = rankRiskModules(moduleAnalysis);
  const controlPoints = detectControlPoints(projectRoot, files, ecosystem);
  const readingChains = detectReadingChains(projectRoot, sourceProfiles, entries, controlPoints, ecosystem);
  const crossCuttingModules = detectCrossCuttingModules(moduleAnalysis, risks);
  const guidanceDiffs = await detectGuidanceDiffs(projectRoot, guidanceContext, {
    ecosystem,
    stack,
    workspace,
    entries,
    routeGroups,
  });

  const output = {
    generatedAt: new Date().toISOString(),
    projectRoot,
    ecosystem,
    dependencySources: dependencyData.sources,
    packageManager,
    stack,
    structure,
    workspace,
    guidanceContext,
    entries,
    controlPoints,
    readingChains,
    configFiles,
    routeGroups,
    riskModules: risks,
    crossCuttingModules,
    guidanceDiffs,
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, "analysis.json"),
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8",
  );
  await fs.writeFile(
    path.join(outputDir, "analysis.md"),
    `${renderAnalysisMarkdown(output)}\n`,
    "utf8",
  );
  await removeIfExists(path.join(outputDir, "signals.json"));
  await removeIfExists(path.join(outputDir, "signals.md"));

  process.stdout.write(`${outputDir}\n`);
}

async function findUp(startDir, matcher) {
  let current = startDir;
  while (true) {
    const matched = await matcher(current);
    if (matched) return matched;
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

async function detectProjectRoot(startDir) {
  const rootMarker = await findUp(startDir, async (dir) => {
    const gitDir = path.join(dir, ".git");
    try {
      await fs.access(gitDir);
      return dir;
    } catch {}

    for (const filename of [
      "package.json",
      "pubspec.yaml",
      "project.config.json",
      "app.json",
      "Package.swift",
      "Podfile",
      "settings.gradle",
      "settings.gradle.kts",
      "pages.json",
      "manifest.json",
    ]) {
      try {
        await fs.access(path.join(dir, filename));
        return dir;
      } catch {}
    }
    return null;
  });
  return rootMarker ?? startDir;
}

async function removeIfExists(filePath) {
  try {
    await fs.unlink(filePath);
  } catch {}
}

async function walk(rootDir, currentDir, depth, out) {
  if (depth > MAX_WALK_DEPTH || out.length >= MAX_FILES) {
    return;
  }

  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (out.length >= MAX_FILES) {
      return;
    }
    const fullPath = path.join(currentDir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name) || (entry.name.startsWith(".") && !ALLOWED_HIDDEN_CONTEXT_DIRS.has(entry.name))) {
        continue;
      }
      await walk(rootDir, fullPath, depth + 1, out);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const ext = path.extname(entry.name);
    if (!TEXT_EXTENSIONS.has(ext) && !INCLUDED_FILENAMES.has(entry.name)) {
      continue;
    }
    out.push(relativePath);
  }
}

function detectPackageManager(projectRoot, packageJson) {
  const managerField = packageJson?.packageManager;
  if (typeof managerField === "string" && managerField.length > 0) {
    return managerField;
  }

  const lockfiles = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
    ["bun.lockb", "bun"],
    ["bun.lock", "bun"],
  ];
  for (const [filename, label] of lockfiles) {
    if (hasFileSyncHint(projectRoot, filename)) {
      return label;
    }
  }
  return "unknown";
}

function detectEcosystem(files) {
  const has = (matcher) => files.some((file) => matcher.test(file));

  const ecosystems = [
    {
      kind: "flutter",
      confidence: 0.98,
      evidence: files.filter((file) =>
        ["pubspec.yaml", "lib/main.dart", "android/app/build.gradle", "ios/Runner/Info.plist"].includes(file),
      ),
      match: () => files.includes("pubspec.yaml"),
    },
    {
      kind: "react-native",
      confidence: 0.95,
      evidence: files.filter((file) =>
        ["app.json", "metro.config.js", "metro.config.ts", "android/app/build.gradle", "ios/Podfile"].includes(file),
      ),
      match: () =>
        files.includes("package.json") &&
        (has(/(^|\/)metro\.config\./) || (files.some((file) => file.startsWith("android/")) && files.some((file) => file.startsWith("ios/")))),
    },
    {
      kind: "uniapp",
      confidence: 0.95,
      evidence: files.filter((file) => ["pages.json", "manifest.json", "uni.scss"].includes(file)),
      match: () => files.includes("pages.json") && files.includes("manifest.json"),
    },
    {
      kind: "taro",
      confidence: 0.95,
      evidence: files.filter((file) =>
        ["project.config.json", "src/app.config.ts", "src/app.config.tsx", "config/index.ts"].includes(file),
      ),
      match: () => has(/(^|\/)src\/app\.config\.(ts|tsx|js|jsx)$/) && has(/(^|\/)config\/index\./),
    },
    {
      kind: "wechat-miniprogram",
      confidence: 0.94,
      evidence: files.filter((file) =>
        ["project.config.json", "app.json", "project.tt.json", "miniprogram_npm/package.json"].includes(file),
      ),
      match: () => files.includes("project.config.json") || (files.includes("app.json") && has(/(^|\/)pages\//)),
    },
    {
      kind: "ios",
      confidence: 0.92,
      evidence: files.filter((file) => ["Package.swift", "Podfile", "Info.plist"].includes(path.basename(file))),
      match: () =>
        files.includes("Package.swift") ||
        files.includes("Podfile") ||
        has(/\.xcodeproj\//) ||
        has(/(^|\/)Info\.plist$/),
    },
    {
      kind: "android",
      confidence: 0.92,
      evidence: files.filter((file) =>
        ["settings.gradle", "settings.gradle.kts", "build.gradle", "build.gradle.kts", "gradle/libs.versions.toml"].includes(file),
      ),
      match: () =>
        files.includes("settings.gradle") ||
        files.includes("settings.gradle.kts") ||
        has(/(^|\/)AndroidManifest\.xml$/),
    },
    {
      kind: "web",
      confidence: 0.9,
      evidence: files.filter((file) =>
        ["package.json", "vite.config.ts", "vite.config.js", "next.config.js", "webpack.config.js"].includes(file),
      ),
      match: () => files.includes("package.json"),
    },
  ];

  const matched = ecosystems.find((item) => item.match());
  return {
    kind: matched?.kind ?? "unknown",
    confidence: matched?.confidence ?? 0.4,
    evidence: (matched?.evidence ?? files.slice(0, 3)).slice(0, 8),
  };
}

function detectStack(depNames, ecosystem) {
  return {
    ecosystems: [formatEcosystemLabel(ecosystem.kind)],
    frameworks: pickMatches(depNames, {
      next: "Next.js",
      react: "React",
      vue: "Vue",
      svelte: "Svelte",
      astro: "Astro",
      remix: "Remix",
      "@angular/core": "Angular",
      flutter: "Flutter",
      taro: "Taro",
      "@dcloudio/uni-app": "UniApp",
      "react-native": "React Native",
    }),
    tooling: pickMatches(depNames, {
      vite: "Vite",
      webpack: "Webpack",
      turbo: "Turbo",
      nx: "Nx",
      eslint: "ESLint",
      prettier: "Prettier",
      storybook: "Storybook",
      tailwindcss: "Tailwind CSS",
    }),
    data: pickMatches(depNames, {
      "@supabase/supabase-js": "Supabase",
      "@supabase/ssr": "Supabase SSR",
      "@tanstack/react-query": "React Query",
      axios: "Axios",
      graphql: "GraphQL",
    }),
    state: pickMatches(depNames, {
      zustand: "Zustand",
      redux: "Redux",
      "@reduxjs/toolkit": "Redux Toolkit",
      jotai: "Jotai",
      mobx: "MobX",
    }),
    editing: pickMatches(depNames, {
      "@tiptap/react": "Tiptap",
      yjs: "Yjs",
      partykit: "Partykit",
      slate: "Slate",
      quill: "Quill",
    }),
    testing: pickMatches(depNames, {
      vitest: "Vitest",
      jest: "Jest",
      playwright: "Playwright",
      cypress: "Cypress",
      "@testing-library/react": "Testing Library",
    }),
    platforms: detectPlatformLabels(depNames, ecosystem),
  };
}

function formatEcosystemLabel(kind) {
  return {
    web: "Web",
    flutter: "Flutter",
    "wechat-miniprogram": "WeChat Mini Program",
    ios: "iOS",
    android: "Android",
    "react-native": "React Native",
    uniapp: "UniApp",
    taro: "Taro",
    unknown: "Unknown",
  }[kind] ?? kind;
}

function detectPlatformLabels(depNames, ecosystem) {
  const labels = new Set();
  if (ecosystem.kind !== "unknown") {
    labels.add(formatEcosystemLabel(ecosystem.kind));
  }
  for (const [name, label] of Object.entries({
    "@tarojs/taro": "Taro",
    "@dcloudio/uni-app": "UniApp",
    "react-native": "React Native",
  })) {
    if (depNames.includes(name)) labels.add(label);
  }
  return [...labels];
}

function pickMatches(depNames, mapping) {
  return Object.entries(mapping)
    .filter(([name]) => depNames.includes(name))
    .map(([, label]) => label);
}

function summarizeStructure(files) {
  const topLevel = new Map();
  for (const file of files) {
    const [head] = file.split(path.sep);
    topLevel.set(head, (topLevel.get(head) ?? 0) + 1);
  }
  return {
    topLevel: [...topLevel.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, fileCount: count })),
  };
}

function detectWorkspaceShape(files, projectRoot) {
  const workspaceSignals = {
    hasAppsDir: files.some((file) => file.startsWith(`apps${path.sep}`)),
    hasPackagesDir: files.some((file) => file.startsWith(`packages${path.sep}`)),
    hasPnpmWorkspace: files.includes("pnpm-workspace.yaml"),
    hasTurboConfig: files.includes("turbo.json"),
  };

  const appRoots = collectWorkspaceRoots(files, "apps", projectRoot);
  const packageRoots = collectWorkspaceRoots(files, "packages", projectRoot);
  const isMonorepo =
    workspaceSignals.hasPnpmWorkspace ||
    workspaceSignals.hasTurboConfig ||
    (workspaceSignals.hasAppsDir && workspaceSignals.hasPackagesDir);

  return {
    isMonorepo,
    appRoots,
    packageRoots,
    signals: workspaceSignals,
  };
}

function collectWorkspaceRoots(files, prefix, projectRoot) {
  const roots = new Set();
  for (const file of files) {
    const parts = file.split(path.sep);
    if (parts[0] !== prefix || !parts[1]) {
      continue;
    }
    roots.add(path.join(projectRoot, parts[0], parts[1]));
  }
  return [...roots].sort();
}

function detectGuidanceContext(files) {
  const guidanceFiles = files.filter((file) =>
    /(^|\/)(AGENT\.md|AGENTS\.md|CLAUDE\.md|SKILL\.md)$/.test(file),
  );

  const hiddenAgentDirs = [".claude", ".codex", ".cursor"]
    .map((dir) => {
      const matchedFiles = files.filter((file) => file.startsWith(`${dir}/`));
      return {
        name: dir,
        exists: matchedFiles.length > 0,
        files: matchedFiles.slice(0, 12),
      };
    })
    .filter((item) => item.exists);

  return {
    guidanceFiles,
    hiddenAgentDirs,
  };
}

async function detectGuidanceDiffs(projectRoot, guidanceContext, runtimeFacts) {
  const candidateFiles = [...guidanceContext.guidanceFiles];
  for (const dir of guidanceContext.hiddenAgentDirs) {
    candidateFiles.push(...dir.files.filter((file) => /\.(md|txt|ya?ml|json)$/i.test(file)).slice(0, 8));
  }
  const uniqueFiles = [...new Set(candidateFiles)].slice(0, 20);
  const combinedText = (
    await Promise.all(
      uniqueFiles.map(async (file) => {
        try {
          return await fs.readFile(path.join(projectRoot, file), "utf8");
        } catch {
          return "";
        }
      }),
    )
  )
    .join("\n")
    .toLowerCase();

  if (!combinedText.trim()) return [];

  const diffs = [];
  const { ecosystem, stack, workspace, entries } = runtimeFacts;
  const guidanceMentionsAppRouter = /\bapp router\b|\bapp\/layout\b/.test(combinedText);
  const guidanceMentionsPagesRouter = /\bpages router\b|\bpages\/_app\b|\bpages directory\b/.test(combinedText);
  const runtimeUsesAppRouter = entries.likelyEntries.some((item) => /app\/layout\.tsx$/.test(item));
  const runtimeUsesPagesRouter = entries.likelyEntries.some((item) => /pages\/_app\.(tsx|jsx)$/.test(item));

  if (runtimeUsesAppRouter && guidanceMentionsPagesRouter && !guidanceMentionsAppRouter) {
    diffs.push({
      kind: "guidance-routing-mismatch",
      confidence: 0.9,
      summary: "Project guidance still points to a pages-based entry, but the current runtime entry is App Router.",
      derivedFrom: [
        "guidance-text: pages router",
        `entry: ${entries.likelyEntries.find((item) => /app\/layout\.tsx$/.test(item)) ?? entries.likelyEntries[0] ?? "unknown"}`,
      ],
    });
  }

  if (runtimeUsesPagesRouter && guidanceMentionsAppRouter && !guidanceMentionsPagesRouter) {
    diffs.push({
      kind: "guidance-routing-mismatch",
      confidence: 0.9,
      summary: "Project guidance talks about App Router, but the current runtime entry still looks pages-based.",
      derivedFrom: [
        "guidance-text: app router",
        `entry: ${entries.likelyEntries.find((item) => /pages\/_app\.(tsx|jsx)$/.test(item)) ?? entries.likelyEntries[0] ?? "unknown"}`,
      ],
    });
  }

  if (workspace.isMonorepo && !/\bmonorepo\b|\bworkspace\b|\bapps\/\b|\bpackages\/\b/.test(combinedText)) {
    diffs.push({
      kind: "guidance-missing-monorepo-structure",
      confidence: 0.7,
      summary: "The repository is structured as a monorepo, but the current project guidance barely mentions the app/package split.",
      derivedFrom: [
        "workspace: monorepo",
        `appRoots: ${workspace.appRoots.length}`,
        `packageRoots: ${workspace.packageRoots.length}`,
      ],
    });
  }

  const stackExpectations = [
    { label: "next.js", shouldExist: stack.frameworks.includes("Next.js") },
    { label: "flutter", shouldExist: ecosystem.kind === "flutter" },
    { label: "react native", shouldExist: ecosystem.kind === "react-native" },
    { label: "supabase", shouldExist: stack.data.includes("Supabase") },
    { label: "zustand", shouldExist: stack.state.includes("Zustand") },
  ];

  for (const item of stackExpectations) {
    const mentioned = combinedText.includes(item.label);
    if (mentioned && !item.shouldExist) {
      diffs.push({
        kind: "guidance-stack-mismatch",
        confidence: 0.65,
        summary: `Project guidance mentions ${item.label}, but the current dependency scan does not support it.`,
        derivedFrom: [`guidance-text: ${item.label}`, `runtime-ecosystem: ${ecosystem.kind}`],
      });
    }
  }

  return diffs.slice(0, 6);
}

function detectEntries(projectRoot, files, ecosystem) {
  const matched = files.filter((file) => {
    return [
      /(^|\/)app\/layout\.tsx$/,
      /(^|\/)pages\/_app\.tsx$/,
      /(^|\/)src\/main\.(tsx|jsx|ts|js)$/,
      /(^|\/)src\/index\.(tsx|jsx|ts|js)$/,
      /(^|\/)main\.(tsx|jsx|ts|js)$/,
      /(^|\/)App\.(vue|tsx|jsx|ts|js)$/,
      /(^|\/)lib\/main\.dart$/,
      /(^|\/)src\/app\.config\.(ts|tsx|js|jsx)$/,
      /(^|\/)App\.(kt|java|swift)$/,
    ].some((regex) => regex.test(file));
  });
  const providerFiles = files.filter((file) => /providers?|provider/i.test(path.basename(file)));
  if (ecosystem.kind === "wechat-miniprogram" && files.includes("app.json")) {
    matched.unshift("app.json");
  }
  if (ecosystem.kind === "uniapp") {
    if (files.includes("pages.json")) matched.unshift("pages.json");
    if (files.includes("main.js")) matched.unshift("main.js");
    if (files.includes("App.vue")) matched.unshift("App.vue");
  }
  if (ecosystem.kind === "ios" && files.includes("Package.swift")) {
    matched.unshift("Package.swift");
  }
  if (ecosystem.kind === "android" && (files.includes("settings.gradle") || files.includes("settings.gradle.kts"))) {
    matched.unshift(files.includes("settings.gradle.kts") ? "settings.gradle.kts" : "settings.gradle");
  }
  return {
    likelyEntries: [...new Set(matched)]
      .sort((a, b) => scoreEntryCandidate(b, ecosystem) - scoreEntryCandidate(a, ecosystem))
      .map((item) => path.join(projectRoot, item)),
    providers: providerFiles.slice(0, 10).map((item) => path.join(projectRoot, item)),
  };
}

function scoreEntryCandidate(file, ecosystem) {
  let score = 0;
  if (/app\/layout\.tsx$/.test(file)) score += 14;
  if (/pages\/_app\.(tsx|jsx)$/.test(file)) score += 12;
  if (/src\/main\.(tsx|jsx|ts|js)$/.test(file) || /^main\.(tsx|jsx|ts|js)$/.test(file)) score += 12;
  if (/^App\.vue$/.test(file)) score += 11;
  if (/^pages\.json$/.test(file)) score += 11;
  if (/lib\/main\.dart$/.test(file)) score += 12;
  if (/src\/app\.config\.(ts|tsx|js|jsx)$/.test(file)) score += 12;
  if (/Package\.swift$|Podfile$|settings\.gradle(\.kts)?$/.test(file)) score += 10;
  if (/(^|\/)(web|frontend|app|admin|mobile)(\/|$)/i.test(file)) score += 4;
  if (/(^|\/)(document|docs|doc|example|demo|playground)(\/|$)/i.test(file)) score -= 8;
  if (ecosystem.kind === "web" && /src\/app\/layout\.tsx$/.test(file)) score += 2;
  score -= file.split(path.sep).length * 0.1;
  return score;
}

function detectConfigFiles(files, ecosystem) {
  const configMatchers = [
    /next\.config\./,
    /vite\.config\./,
    /webpack\./,
    /tailwind\.config\./,
    /turbo\.json$/,
    /pnpm-workspace\.yaml$/,
    /playwright\.config\./,
    /eslint/,
    /prettier/,
    /tsconfig.*\.json$/,
    /pubspec\.yaml$/,
    /project\.config\.json$/,
    /app\.json$/,
    /pages\.json$/,
    /manifest\.json$/,
    /Package\.swift$/,
    /Podfile$/,
    /settings\.gradle(\.kts)?$/,
    /build\.gradle(\.kts)?$/,
    /libs\.versions\.toml$/,
  ];
  const ecosystemSpecific = ecosystem.kind === "wechat-miniprogram" ? [/project\.tt\.json$/] : [];
  return files.filter((file) => [...configMatchers, ...ecosystemSpecific].some((re) => re.test(file))).slice(0, 25);
}

function detectRouteGroups(files, ecosystem) {
  const routes = [];
  for (const file of files) {
    if (file.includes("app/") && /page|layout|route/.test(path.basename(file))) {
      routes.push(file);
    }
    if (file.includes("pages/") && /\.(tsx|ts|jsx|js|vue)$/.test(file)) {
      routes.push(file);
    }
    if (ecosystem.kind === "flutter" && /^lib\/.*(page|screen|route).*\.dart$/i.test(file)) {
      routes.push(file);
    }
    if (["wechat-miniprogram", "uniapp", "taro"].includes(ecosystem.kind) && /(^|\/)pages\//.test(file)) {
      routes.push(file);
    }
  }
  return summarizeRouteGroups(routes);
}

function summarizeRouteGroups(routeFiles) {
  const groups = new Map();
  for (const routeFile of routeFiles) {
    const parts = routeFile.split(path.sep);
    const markerIndex = parts.findIndex((part) => part === "app" || part === "pages");
    const key = markerIndex >= 0 ? parts.slice(0, Math.min(parts.length, markerIndex + 2)).join("/") : parts[0];
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  return [...groups.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

async function collectSourceProfiles(projectRoot, files, ecosystem) {
  const codeFiles = files.filter(
    (file) =>
      !isAnalysisNoisePath(file) &&
      (
        /\.(t|j)sx?$/.test(file) ||
        file.endsWith(".mjs") ||
        file.endsWith(".vue") ||
        file.endsWith(".dart") ||
        file.endsWith(".swift") ||
        file.endsWith(".kt") ||
        file.endsWith(".java")
      ),
  );
  const fileSet = new Set(files);
  const profiles = [];

  for (const file of codeFiles) {
    const fullPath = path.join(projectRoot, file);
    let content = "";
    try {
      content = await fs.readFile(fullPath, "utf8");
    } catch {
      continue;
    }
    const lineCount = content.split("\n").length;
    const importStats = collectImportStats(content, file);
    const keywords = detectKeywords(content, file, inferModuleKey(file));
    const stateSignalCount = countMatches(
      content,
      /\b(useState|useReducer|useStore|zustand|redux|BlocProvider|ChangeNotifierProvider|StateNotifierProvider|Riverpod|MobX|@State|MutableStateFlow|LiveData)\b/g,
    );
    const effectSignalCount = countMatches(
      content,
      /\b(useEffect|useLayoutEffect|watchEffect|LaunchedEffect|DisposableEffect|didChangeDependencies|viewDidLoad|viewWillAppear|onAppear|componentDidMount)\b/g,
    );
    const asyncSignalCount = countMatches(
      content,
      /\b(async|await|Promise|Future<|Future\.|Task\s*\{|launch\s*\(|withContext\s*\(|DispatchQueue\.)/g,
    );
    const apiCallCount = countMatches(content, /\bApi\.[A-Za-z0-9_]+\b/g);
    const uiContainerCount = countMatches(
      content,
      /\b(Modal|Drawer|Dialog|BottomSheet|Navigator|TabBar|PageView|BitzTable|UICollectionView|UITableView|RecyclerView|ListView|CustomScrollView)\b/g,
    );
    const tags = detectFileTags(file, content, ecosystem, {
      lineCount,
      apiCallCount,
      stateSignalCount,
      effectSignalCount,
      asyncSignalCount,
      uiContainerCount,
      keywords,
    });
    profiles.push({
      file,
      fullPath,
      module: inferModuleKey(file),
      lineCount,
      clientComponent: content.includes('"use client"') || content.includes("'use client'"),
      providerFile: /provider/i.test(path.basename(file)),
      storeFile: /store/i.test(path.basename(file)) || /\bzustand\b/i.test(content),
      routeFile:
        /(page|layout|route)\.(t|j)sx?$/.test(path.basename(file)) ||
        (/\b(page|screen|viewcontroller|activity|fragment)\b/i.test(path.basename(file)) && [".swift", ".kt", ".java", ".dart", ".vue"].includes(path.extname(file))) ||
        (/^pages\//.test(file) && file.endsWith(".vue")) ||
        (ecosystem.kind === "flutter" && /\bWidget\b|\bMaterialApp\b|\bCupertinoApp\b/.test(content)),
      importCount: importStats.total,
      externalImportCount: importStats.external,
      apiCallCount,
      stateSignalCount,
      effectSignalCount,
      asyncSignalCount,
      uiContainerCount,
      keywords,
      tags,
      imports: resolveImportTargets(file, collectImportSources(content, file), fileSet),
    });
  }
  return profiles;
}

function collectModuleAnalysis(sourceProfiles, ecosystem) {
  const grouped = new Map();
  for (const profile of sourceProfiles) {
    if (!grouped.has(profile.module)) {
      grouped.set(profile.module, []);
    }
    grouped.get(profile.module).push(profile);
  }

  const results = [];
  for (const [module, moduleProfiles] of grouped.entries()) {
    const summary = {
      module,
      fileCount: moduleProfiles.length,
      clientComponents: 0,
      providers: 0,
      stores: 0,
      routeFiles: 0,
      importCount: 0,
      externalImportCount: 0,
      apiCallCount: 0,
      stateSignalCount: 0,
      effectSignalCount: 0,
      asyncSignalCount: 0,
      uiContainerCount: 0,
      largeFiles: [],
      keywords: new Set(),
      evidence: [],
      complexityDrivers: new Set(),
      fileTags: new Set(),
      reasonHints: [],
    };

    for (const profile of moduleProfiles.slice(0, 20)) {
      if (profile.clientComponent) {
        summary.clientComponents += 1;
      }
      if (profile.providerFile) {
        summary.providers += 1;
      }
      if (profile.storeFile) {
        summary.stores += 1;
      }
      if (profile.routeFile) {
        summary.routeFiles += 1;
      }
      summary.importCount += profile.importCount;
      summary.externalImportCount += profile.externalImportCount;
      summary.apiCallCount += profile.apiCallCount;
      summary.stateSignalCount += profile.stateSignalCount;
      summary.effectSignalCount += profile.effectSignalCount;
      summary.asyncSignalCount += profile.asyncSignalCount;
      summary.uiContainerCount += profile.uiContainerCount;
      if (profile.lineCount >= 220) {
        summary.largeFiles.push({ file: profile.file, lineCount: profile.lineCount });
      }
      for (const keyword of profile.keywords) {
        summary.keywords.add(keyword);
      }
      for (const tag of profile.tags) {
        summary.fileTags.add(tag);
      }
      collectComplexityDrivers(summary, profile.file, profile.lineCount);
      if (summary.evidence.length < 6) {
        summary.evidence.push(profile.file);
      }
    }
    summary.reasonHints = buildReasonHints(summary, ecosystem);

    results.push({
      ...summary,
      keywords: [...summary.keywords].sort(),
      fileTags: [...summary.fileTags].sort(),
      reasonHints: summary.reasonHints,
    });
  }
  return results;
}

function collectImportSources(content, file) {
  const extension = path.extname(file);
  const isJsLike = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue"].includes(extension);
  const isDart = extension === ".dart";
  const isSwift = extension === ".swift";
  const isKotlin = extension === ".kt" || extension === ".java";
  const sources = [];
  if (isJsLike) {
    for (const match of content.matchAll(/import[\s\S]*?from\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const source = match[1] ?? match[2] ?? "";
      if (source) sources.push(source);
    }
  } else if (isDart) {
    for (const match of content.matchAll(/import\s+['"]([^'"]+)['"]/g)) {
      if (match[1]) sources.push(match[1]);
    }
  } else if (isSwift) {
    for (const match of content.matchAll(/^import\s+([A-Za-z0-9_]+)/gm)) {
      if (match[1]) sources.push(match[1]);
    }
  } else if (isKotlin) {
    for (const match of content.matchAll(/^import\s+([A-Za-z0-9_.]+)/gm)) {
      if (match[1]) sources.push(match[1]);
    }
  }
  return sources;
}

function resolveImportTargets(file, sources, fileSet) {
  const resolved = [];
  for (const source of sources) {
    const target = resolveImportSource(file, source, fileSet);
    if (target) resolved.push(target);
  }
  return [...new Set(resolved)];
}

function resolveImportSource(fromFile, source, fileSet) {
  if (source.startsWith(".")) {
    const baseDir = path.dirname(fromFile);
    const normalizedBase = path.normalize(path.join(baseDir, source));
    for (const candidate of expandImportCandidates(normalizedBase)) {
      if (fileSet.has(candidate)) return candidate;
    }
  }

  if (/^(~\/|@\/)/.test(source)) {
    const normalizedBase = path.normalize(source.replace(/^~?\@\//, "src/"));
    for (const candidate of expandImportCandidates(normalizedBase)) {
      if (fileSet.has(candidate)) return candidate;
    }
  }

  return null;
}

function expandImportCandidates(basePath) {
  const ext = path.extname(basePath);
  const candidates = [];
  if (ext) {
    candidates.push(basePath);
  } else {
    for (const suffix of [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".mjs",
      ".cjs",
      ".dart",
      ".swift",
      ".kt",
      ".java",
    ]) {
      candidates.push(`${basePath}${suffix}`);
    }
    for (const suffix of [
      "index.ts",
      "index.tsx",
      "index.js",
      "index.jsx",
      "index.mjs",
      "index.cjs",
      "index.dart",
      "index.swift",
      "index.kt",
      "index.java",
    ]) {
      candidates.push(path.join(basePath, suffix));
    }
  }
  return candidates.map((item) => path.normalize(item));
}

function detectFileTags(file, content, ecosystem, counts) {
  const tags = new Set();
  const basename = path.basename(file);
  const lower = `${file}\n${content}`.toLowerCase();
  if (
    /(page|layout|route)\.(t|j)sx?$/.test(basename) ||
    /(^|\/)pages\//.test(file) ||
    /(^|\/)app\//.test(file) ||
    /\b(viewcontroller|activity|fragment|screen)\b/i.test(basename)
  ) {
    tags.add("route");
  }
  if (/provider/i.test(basename) || /provider/.test(lower)) {
    tags.add("provider");
  }
  if (/store/i.test(basename) || counts.stateSignalCount > 0) {
    tags.add("state");
  }
  if (
    counts.apiCallCount > 0 ||
    /(^|\/)(api|apis|service|services|request|requests|client|clients|network)\//.test(file) ||
    /\b(fetch|axios|supabase|graphql|trpc|react-query|usequery|mutation)\b/.test(lower)
  ) {
    tags.add("data");
  }
  if (counts.uiContainerCount > 0) {
    tags.add("ui");
  }
  if (counts.asyncSignalCount > 0) {
    tags.add("async");
  }
  if (counts.effectSignalCount > 0) {
    tags.add("effect");
  }
  if (counts.keywords.includes("editor")) {
    tags.add("editor");
  }
  if (counts.keywords.includes("realtime")) {
    tags.add("realtime");
  }
  if (/(router|navigation|routes?)/i.test(file)) {
    tags.add("navigation");
  }
  if (ecosystem.kind === "react-native" && /\bnative\b|\bbridge\b/.test(lower)) {
    tags.add("bridge");
  }
  if (["wechat-miniprogram", "uniapp", "taro"].includes(ecosystem.kind) && /\b(wx|uni|tt)\./.test(lower)) {
    tags.add("bridge");
  }
  return [...tags];
}

function buildReasonHints(summary, ecosystem) {
  const reasons = [];
  const hasTag = (tag) =>
    Array.isArray(summary.fileTags) ? summary.fileTags.includes(tag) : summary.fileTags instanceof Set ? summary.fileTags.has(tag) : false;
  if (summary.importCount >= 12) {
    reasons.push("This module pulls in many other files and libraries, so it has to coordinate many moving parts.");
  }
  if (summary.stateSignalCount >= 3 && summary.effectSignalCount >= 2) {
    reasons.push("It does not rely on just one simple state path; multiple state paths and side effects are mixed together.");
  }
  if (summary.asyncSignalCount >= 3 && (summary.stateSignalCount >= 2 || summary.uiContainerCount >= 2)) {
    reasons.push("Async requests, state updates, and UI interaction sit in the same layer, so changes here are more likely to interfere with each other.");
  }
  if (summary.uiContainerCount >= 3) {
    reasons.push("The page is not just rendering content; it also carries several modal, drawer, dialog, table, or editor flows, which widens the interaction surface.");
  }
  if (summary.apiCallCount >= 3) {
    reasons.push("Data fetching is spread across multiple call sites, so request flow is harder to follow than a single centralized path.");
  }
  if (summary.largeFiles.length > 0) {
    reasons.push("Some files in this area are already large, which usually means more logic is being coordinated in one place.");
  }
  if (["flutter", "react-native", "ios", "android", "wechat-miniprogram", "uniapp", "taro"].includes(ecosystem.kind) && hasTag("bridge")) {
    reasons.push("This area also touches platform or bridge calls, so runtime behavior depends on more than one layer.");
  }
  if (reasons.length === 0) {
    if (hasTag("route") && hasTag("state")) {
      reasons.push("This area already mixes page structure with state handling, so changes here are more likely to affect both rendering and behavior.");
    } else if (hasTag("state") && hasTag("data")) {
      reasons.push("This area already mixes state handling with data access, so it is a good place to inspect how updates and requests interact.");
    } else if (hasTag("provider")) {
      reasons.push("This file sits close to a provider boundary, so a small change here can affect a wider slice of the app than a leaf component would.");
    } else if (summary.importCount > 0 || summary.fileCount > 0) {
      reasons.push("This area is worth reading because it already coordinates more than one responsibility, even if no single metric spikes on its own.");
    }
  }
  return reasons.slice(0, 4);
}

function inferModuleKey(file) {
  const parts = file.split(path.sep);
  const srcIndex = parts.indexOf("src");
  const appIndex = parts.indexOf("app");
  const pagesIndex = parts.indexOf("pages");
  const modulesIndex = parts.indexOf("Modules");

  if (parts[0] === "apps" && parts[1]) {
    if (appIndex >= 0 && parts[appIndex + 1]) {
      return normalizeScopedModule(parts.slice(0, Math.min(parts.length, appIndex + 2)));
    }
    if (srcIndex >= 0 && parts[srcIndex + 1] === "app" && parts[srcIndex + 2]) {
      return normalizeScopedModule(parts.slice(0, Math.min(parts.length, srcIndex + 3)));
    }
    if (srcIndex >= 0 && parts[srcIndex + 1] === "pages" && parts[srcIndex + 2]) {
      return normalizeScopedModule(parts.slice(0, Math.min(parts.length, srcIndex + 3)));
    }
  }
  if (parts[0] === "packages" && parts[1]) {
    if (parts[2] === "components" && parts[3] === "pages" && parts[4]) {
      return normalizeScopedModule(parts.slice(0, 5));
    }
    if (parts[2] === "features" && parts[3]) {
      return normalizeScopedModule(parts.slice(0, 4));
    }
    if (parts[2] === "src" && parts[3]) {
      return normalizeScopedModule(parts.slice(0, 4));
    }
  }
  if (srcIndex >= 0 && parts[srcIndex + 1] === "pages" && parts[srcIndex + 2]) {
    return normalizeScopedModule(parts.slice(0, Math.min(parts.length, srcIndex + 3)));
  }
  if (srcIndex >= 0 && parts[srcIndex + 1] === "app" && parts[srcIndex + 2]) {
    return normalizeScopedModule(parts.slice(0, Math.min(parts.length, srcIndex + 3)));
  }
  if (parts[0] === "pages" && parts[1]) {
    return normalizeScopedModule(parts.slice(0, 2));
  }
  if (parts[0] === "api" && parts[1]) {
    return normalizeScopedModule(parts.slice(0, 2));
  }
  if (modulesIndex >= 0 && parts[modulesIndex + 1]) {
    return normalizeScopedModule(parts.slice(0, modulesIndex + 2));
  }
  if (parts[0] === "apps" && parts[1] && parts[2]) {
    return parts.slice(0, Math.min(parts.length, 4)).join("/");
  }
  if (parts[0] === "packages" && parts[1]) {
    return parts.slice(0, Math.min(parts.length, 3)).join("/");
  }
  return parts.slice(0, Math.min(parts.length, 3)).join("/");
}

function normalizeScopedModule(parts) {
  return parts
    .filter(Boolean)
    .filter((part) => !/^\(.*\)$/.test(part))
    .join("/");
}

function detectKeywords(content, file, module) {
  const hits = [];
  const rules = [
    ["editor", /\btiptap\b|\byjs\b|\bslate\b|\bquill\b|\beditor\b/i],
    ["realtime", /\bpartykit\b|\bwebsocket\b|\byjs\b|\bcollab(orative)?\b/i],
    ["state", /\bzustand\b|\bredux\b|\bjotai\b|\buseStore\b/i],
    ["data", /\breact-query\b|\buseQuery\b|\bsupabase\b|\bgraphql\b|\bserver-client\b/i],
    ["upload", /\bupload\b|\bs3\b|\bpresign\b|\bmultipart\b/i],
    ["billing", /\bbilling\b|\bstripe\b|\bsubscription\b|\blemon\b/i],
    ["auth", /\bauth\b|\bsession\b|\bsignIn\b|\bsignOut\b|\boauth\b|\bmulti-factor\b/i],
    ["analytics", /\bposthog\b|\bsentry\b|\bhotjar\b|\bgtm\b/i],
    ["admin", /\badmin\b/i],
    ["mini-program", /\bwx\.|\buni\.|\btt\./i],
    ["native", /\bActivity\b|\bFragment\b|\bUIViewController\b|\bSwiftUI\b/i],
  ];
  for (const [label, regex] of rules) {
    if (regex.test(content) || pathSegmentsContain(module, label)) {
      hits.push(label);
    }
  }
  return hits;
}

function rankRiskModules(moduleAnalysis) {
  return moduleAnalysis
    .map((item) => {
      let score = 0;
      score += item.clientComponents * 2;
      score += item.providers * 3;
      score += item.stores * 3;
      score += item.routeFiles * 2;
      score += Math.min(item.importCount, 30);
      score += Math.min(item.externalImportCount, 18);
      score += item.apiCallCount * 2;
      score += item.stateSignalCount * 2;
      score += item.effectSignalCount * 2;
      score += item.asyncSignalCount;
      score += item.uiContainerCount;
      score += item.largeFiles.length * 3;
      score += item.keywords.length * 2;
      if (item.keywords.includes("editor")) score += 5;
      if (item.keywords.includes("realtime")) score += 5;
      if (item.keywords.includes("billing")) score += 4;
      if (item.keywords.includes("auth")) score += 4;
      if (item.keywords.includes("upload")) score += 3;
      if (item.module.includes("_components")) score += 1;
      const confidence = clampScore(
        0.35 +
          Math.min(item.reasonHints.length * 0.12, 0.24) +
          Math.min(item.fileTags.length * 0.04, 0.16) +
          Math.min(score / 220, 0.25),
      );
      return {
        module: item.module,
        score,
        confidence,
        moduleSummary: {
          clientComponents: item.clientComponents,
          providers: item.providers,
          stores: item.stores,
          routeFiles: item.routeFiles,
          importCount: item.importCount,
          externalImportCount: item.externalImportCount,
          apiCallCount: item.apiCallCount,
          stateSignalCount: item.stateSignalCount,
          effectSignalCount: item.effectSignalCount,
          asyncSignalCount: item.asyncSignalCount,
          uiContainerCount: item.uiContainerCount,
          largeFiles: item.largeFiles,
          keywords: item.keywords,
          fileTags: item.fileTags,
          complexityDrivers: [...item.complexityDrivers].sort(),
          reasonHints: item.reasonHints,
          derivedFrom: [
            `files:${item.fileCount}`,
            `imports:${item.importCount}`,
            `apiCalls:${item.apiCallCount}`,
            `stateSignals:${item.stateSignalCount}`,
            `effects:${item.effectSignalCount}`,
            `asyncSignals:${item.asyncSignalCount}`,
            `uiContainers:${item.uiContainerCount}`,
          ],
        },
        evidence: item.evidence,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function detectReadingChains(projectRoot, sourceProfiles, entries, controlPoints, ecosystem) {
  const profileMap = new Map(sourceProfiles.map((profile) => [profile.file, profile]));
  const chains = [];
  const seen = new Set();

  const routeCandidates = sourceProfiles
    .filter((profile) => profile.tags.includes("route") && isUsefulRouteCandidate(profile.file))
    .sort((a, b) => scoreRouteProfile(b) - scoreRouteProfile(a));
  const stateCandidates = sourceProfiles
    .filter((profile) => profile.tags.includes("state"))
    .sort((a, b) => b.stateSignalCount - a.stateSignalCount);
  const dataCandidates = sourceProfiles
    .filter((profile) => profile.tags.includes("data") && !/(^|\/)(public|assets)(\/|$)/.test(profile.file))
    .sort((a, b) => b.apiCallCount - a.apiCallCount);

  for (const entry of entries.likelyEntries.slice(0, 4)) {
    const relativeEntry = path.relative(projectRoot, entry);
    const entryProfile = profileMap.get(relativeEntry);
    if (!entryProfile && !isConfigOnlyEntry(relativeEntry, ecosystem)) continue;
    const scope = inferEntryScope(relativeEntry);
    const provider =
      findClosestInterestingImport(relativeEntry, profileMap, (profile) => profile.providerFile) ??
      pickScopedProfile(scope, sourceProfiles, (profile) => profile.providerFile, scoreProviderProfile);
    const route =
      pickScopedProfile(scope, routeCandidates, (profile) => profile.file !== relativeEntry, scoreRouteProfile) ??
      findClosestInterestingImport(
        provider ?? relativeEntry,
        profileMap,
        (profile) => profile.tags.includes("route") && profile.file !== relativeEntry,
      );
    const state = findClosestInterestingImport(
      route ?? provider ?? relativeEntry,
      profileMap,
      (profile) => profile.tags.includes("state") && !profile.tags.includes("provider"),
    ) ?? pickScopedProfile(scope, stateCandidates, () => true, (profile) => scoreStateProfile(profile, route));
    const data = findClosestInterestingImport(
      state ?? route ?? provider ?? relativeEntry,
      profileMap,
      (profile) => profile.tags.includes("data"),
    ) ?? pickScopedProfile(scope, dataCandidates, () => true, (profile) => scoreDataProfile(profile, state ?? route));
    const files = uniqueNonEmpty([
      relativeEntry,
      provider,
      route,
      state,
      data,
    ]);
    pushReadingChain(
      chains,
      seen,
      projectRoot,
      files,
      "entry-to-data",
      buildChainSummary(files, profileMap, ecosystem),
      clampScore(0.48 + Math.min(files.length * 0.08, 0.24)),
      deriveChainEvidence(files, profileMap),
    );
  }

  for (const routeProfile of routeCandidates.slice(0, 3)) {
    const state = findClosestInterestingImport(routeProfile.file, profileMap, (profile) => profile.tags.includes("state"));
    const data = findClosestInterestingImport(state ?? routeProfile.file, profileMap, (profile) => profile.tags.includes("data"));
    const files = uniqueNonEmpty([routeProfile.file, state, data]);
    pushReadingChain(
      chains,
      seen,
      projectRoot,
      files,
      "route-cross-section",
      "A good first read is to follow one business route into the state it touches and then into the request path it depends on.",
      clampScore(0.46 + Math.min(files.length * 0.07, 0.21)),
      deriveChainEvidence(files, profileMap),
    );
  }

  const controlSeed = controlPoints
    .flatMap((item) => item.files)
    .map((file) => path.relative(projectRoot, file))
    .find((file) => profileMap.has(file));
  if (controlSeed) {
    const navigation = findClosestInterestingImport(controlSeed, profileMap, (profile) => profile.tags.includes("navigation"));
    const state = findClosestInterestingImport(controlSeed, profileMap, (profile) => profile.tags.includes("state"));
    const data = findClosestInterestingImport(controlSeed, profileMap, (profile) => profile.tags.includes("data"));
    pushReadingChain(
      chains,
      seen,
      projectRoot,
      uniqueNonEmpty([controlSeed, navigation, state, data]),
      "control-point",
      "This is the shortest control path from an application shell file into navigation, state, and request logic.",
      0.58,
      deriveChainEvidence(uniqueNonEmpty([controlSeed, navigation, state, data]), profileMap),
    );
  }

  if (chains.length === 0 && ["uniapp", "wechat-miniprogram", "taro"].includes(ecosystem.kind)) {
    const configSeed =
      entries.likelyEntries
        .map((file) => path.relative(projectRoot, file))
        .find((file) => /pages\.json$|app\.json$|app\.config\.(ts|tsx|js|jsx)$/.test(file)) ?? null;
    const entrySeed =
      entries.likelyEntries
        .map((file) => path.relative(projectRoot, file))
        .find((file) => /main\.(ts|js)$|App\.(vue|tsx|jsx|ts|js)$/.test(file)) ?? null;
    const routeSeed = routeCandidates[0]?.file ?? null;
    const stateSeed = pickScopedProfile(inferEntryScope(routeSeed ?? entrySeed ?? configSeed ?? "pages"), stateCandidates, () => true, (profile) =>
      scoreStateProfile(profile, routeSeed ?? entrySeed),
    );
    pushReadingChain(
      chains,
      seen,
      projectRoot,
      uniqueNonEmpty([configSeed, entrySeed, routeSeed, stateSeed]),
      "entry-to-data",
      "Start from the page registry, then follow the app bootstrap into one concrete page area and the shared state it depends on.",
      0.64,
      deriveChainEvidence(uniqueNonEmpty([configSeed, entrySeed, routeSeed, stateSeed]), profileMap),
    );
  }

  if (chains.length === 0 && ["ios", "android"].includes(ecosystem.kind)) {
    const routerSeed = pickControlPointFile(controlPoints, "router", projectRoot);
    const networkSeed = pickControlPointFile(controlPoints, "network", projectRoot);
    const stateSeed = pickControlPointFile(controlPoints, "state", projectRoot);
    const uiShellSeed = pickControlPointFile(controlPoints, "ui-shell", projectRoot);
    pushReadingChain(
      chains,
      seen,
      projectRoot,
      uniqueNonEmpty([uiShellSeed, routerSeed, stateSeed, networkSeed]),
      "control-point",
      "Read the app shell first, then follow navigation, state, and request coordination in the order the native app is likely to hand off control.",
      0.62,
      deriveChainEvidence(uniqueNonEmpty([uiShellSeed, routerSeed, stateSeed, networkSeed]), profileMap),
    );
  }

  return chains.slice(0, 4);
}

function findClosestInterestingImport(startFile, profileMap, predicate) {
  const queue = [{ file: startFile, depth: 0 }];
  const seen = new Set([startFile]);
  while (queue.length > 0) {
    const current = queue.shift();
    const profile = profileMap.get(current.file);
    if (!profile) continue;
    if (current.depth > 0 && predicate(profile)) {
      return current.file;
    }
    if (current.depth >= 4) continue;
    for (const imported of profile.imports) {
      if (!seen.has(imported) && profileMap.has(imported)) {
        seen.add(imported);
        queue.push({ file: imported, depth: current.depth + 1 });
      }
    }
  }
  return null;
}

function pushReadingChain(chains, seen, projectRoot, relativeFiles, kind, summary, confidence, derivedFrom) {
  if (relativeFiles.length < 2) return;
  const key = relativeFiles.join(" -> ");
  if (seen.has(key)) return;
  seen.add(key);
  chains.push({
    kind,
    files: relativeFiles.map((file) => path.join(projectRoot, file)),
    summary,
    confidence,
    derivedFrom,
  });
}

function buildChainSummary(files, profileMap, ecosystem) {
  const profiles = files.map((file) => profileMap.get(file)).filter(Boolean);
  const hasProvider = profiles.some((profile) => profile.tags.includes("provider"));
  const hasState = profiles.some((profile) => profile.tags.includes("state"));
  const hasData = profiles.some((profile) => profile.tags.includes("data"));
  if (ecosystem.kind === "web" && hasProvider && hasState && hasData) {
    return "Start at the route shell, then follow the global provider layer into the page state and the request path it depends on.";
  }
  if (hasState && hasData) {
    return "Follow this chain to see where page logic hands off to state and then to the request or service layer.";
  }
  return "Use this connected path as a first read instead of jumping across isolated files.";
}

function detectCrossCuttingModules(moduleAnalysis, risks) {
  const riskScoreByModule = new Map(risks.map((item) => [item.module, item.score]));
  return moduleAnalysis
    .map((item) => {
      const tagGroups = item.fileTags.filter((tag) =>
        ["route", "provider", "state", "data", "ui", "editor", "realtime", "navigation", "bridge"].includes(tag),
      );
      const reasonHints = buildCrossCuttingReasonHints(item, tagGroups);
      return {
        module: item.module,
        score: crossCuttingScore(item, tagGroups, riskScoreByModule),
        confidence: clampScore(0.38 + tagGroups.length * 0.08 + item.reasonHints.length * 0.05 + Math.min(item.fileCount / 18, 0.12)),
        tagGroups,
        evidence: item.evidence,
        reasonHints,
        derivedFrom: [`tags:${tagGroups.join(",") || "none"}`, `module:${item.module}`],
      };
    })
    .filter((item) => item.tagGroups.length >= 3 && !isAnalysisNoisePath(item.module))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function isAnalysisNoisePath(file) {
  return file.split(path.sep).some((segment) => {
    if (!segment) return false;
    if (segment.startsWith(".") && !ALLOWED_HIDDEN_CONTEXT_DIRS.has(segment)) return true;
    return ["node_modules", "dist", "build", "vendor", "coverage", "tmp", "temp", "generated"].includes(segment.toLowerCase());
  });
}

function isUsefulRouteCandidate(file) {
  return !/(^|\/)(api)(\/|$)/.test(file) && !/(^|\/)(icon|icons)(\/|$)/.test(file) && !/(privacy|terms|cookie-policy|legal)/i.test(file);
}

function inferEntryScope(file) {
  const parts = file.split(path.sep);
  if (parts[0] === "apps" && parts[1]) return parts.slice(0, 2).join("/");
  const srcIndex = parts.indexOf("src");
  if (srcIndex > 0) return parts.slice(0, srcIndex + 1).join("/");
  if (parts[0] === "lib") return "lib";
  if (parts[0] === "pages") return "pages";
  return parts[0] ?? file;
}

function pickScopedProfile(scope, candidates, predicate, scoreFn) {
  return candidates
    .filter((profile) => profile.file.startsWith(`${scope}/`) && predicate(profile))
    .sort((a, b) => scoreFn(b) - scoreFn(a))[0]?.file ?? null;
}

function scoreRouteProfile(profile) {
  let score = 0;
  if (/page\.(t|j)sx?$/.test(profile.file)) score += 8;
  if (/index\.(t|j)sx?$/.test(profile.file)) score += 6;
  if (profile.tags.includes("state")) score += 4;
  if (profile.tags.includes("data")) score += 4;
  if (profile.tags.includes("ui")) score += 3;
  if (profile.tags.includes("provider")) score += 2;
  if (profile.asyncSignalCount > 0) score += Math.min(profile.asyncSignalCount, 4);
  if (/layout\.(t|j)sx?$/.test(profile.file)) score -= 2;
  if (/route\.(t|j)sx?$/.test(profile.file)) score -= 2;
  if (/(docs|document)/i.test(profile.file)) score -= 6;
  return score;
}

function scoreProviderProfile(profile) {
  return profile.importCount + profile.stateSignalCount * 2 + profile.asyncSignalCount;
}

function scoreStateProfile(profile, anchorFile) {
  let score = profile.stateSignalCount * 3 + profile.effectSignalCount * 2 + profile.importCount;
  if (anchorFile && sharePathPrefix(profile.file, anchorFile)) score += 6;
  return score;
}

function scoreDataProfile(profile, anchorFile) {
  let score = profile.apiCallCount * 4 + profile.asyncSignalCount * 2 + profile.importCount;
  if (anchorFile && sharePathPrefix(profile.file, anchorFile)) score += 5;
  return score;
}

function sharePathPrefix(a, b) {
  const aParts = a.split(path.sep);
  const bParts = b.split(path.sep);
  let shared = 0;
  for (let i = 0; i < Math.min(aParts.length, bParts.length); i += 1) {
    if (aParts[i] !== bParts[i]) break;
    shared += 1;
  }
  return shared >= 3;
}

function isConfigOnlyEntry(file, ecosystem) {
  return ["flutter", "wechat-miniprogram", "taro", "uniapp", "ios", "android"].includes(ecosystem.kind) && !!file;
}

function crossCuttingScore(item, tagGroups, riskScoreByModule) {
  let score = (riskScoreByModule.get(item.module) ?? 0) + tagGroups.length * 5 + item.fileCount;
  if (tagGroups.includes("route") && tagGroups.includes("state") && tagGroups.includes("data")) score += 12;
  if (tagGroups.includes("ui") && (tagGroups.includes("state") || tagGroups.includes("data"))) score += 8;
  if (tagGroups.includes("bridge")) score += 4;
  if (item.module.includes("/pages/") || item.module.includes("/app/") || item.module.startsWith("pages/") || item.module.startsWith("src/pages")) score += 5;
  if (item.module.includes("/components/pages/") || item.module.includes("/features/")) score += 3;
  if (/vendor|dist|build/.test(item.module)) score -= 20;
  return score;
}

function buildCrossCuttingReasonHints(item, tagGroups) {
  const reasons = [];
  if (tagGroups.includes("route") && tagGroups.includes("state") && tagGroups.includes("data")) {
    reasons.push("This area is not just a page or just a store; route logic, state changes, and request flow all meet here.");
  }
  if (tagGroups.includes("ui") && (tagGroups.includes("state") || tagGroups.includes("data"))) {
    reasons.push("UI containers and state or request logic are mixed in the same area, so interaction changes are more likely to spill into data flow.");
  }
  if (tagGroups.includes("editor") || tagGroups.includes("realtime")) {
    reasons.push("This module also carries richer interaction behavior, which usually makes the runtime path harder to reason about.");
  }
  if (tagGroups.includes("bridge")) {
    reasons.push("Part of the behavior crosses a platform or runtime boundary, so you have to read more than one layer to understand it.");
  }
  if (reasons.length === 0 && item.reasonHints.length > 0) {
    reasons.push(item.reasonHints[0]);
  }
  return reasons.slice(0, 3);
}

function uniqueNonEmpty(items) {
  return [...new Set(items.filter(Boolean))];
}

function deriveChainEvidence(files, profileMap) {
  return files.flatMap((file) => {
    const profile = profileMap.get(file);
    if (!profile) return [];
    return [`${file}:tags=${profile.tags.join(",") || "none"}`];
  });
}

function pickControlPointFile(controlPoints, kind, projectRoot) {
  return controlPoints
    .find((item) => item.kind === kind)
    ?.files.map((file) => path.relative(projectRoot, file))
    .find((file) => !isAnalysisNoisePath(file)) ?? null;
}

function clampScore(value) {
  return Math.max(0.05, Math.min(0.99, Number(value.toFixed(2))));
}

function collectImportStats(content, file) {
  const extension = path.extname(file);
  const isJsLike = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue"].includes(extension);
  const isDart = extension === ".dart";
  const isSwift = extension === ".swift";
  const isKotlin = extension === ".kt" || extension === ".java";
  let total = 0;
  let external = 0;

  if (isJsLike) {
    for (const match of content.matchAll(/import[\s\S]*?from\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const source = match[1] ?? match[2] ?? "";
      total += 1;
      if (!source.startsWith(".") && !source.startsWith("/")) external += 1;
    }
  } else if (isDart) {
    for (const match of content.matchAll(/import\s+['"]([^'"]+)['"]/g)) {
      const source = match[1] ?? "";
      total += 1;
      if (!source.startsWith(".") && !source.startsWith("/")) external += 1;
    }
  } else if (isSwift) {
    for (const _ of content.matchAll(/^import\s+[A-Za-z0-9_]+/gm)) {
      total += 1;
      external += 1;
    }
  } else if (isKotlin) {
    for (const _ of content.matchAll(/^import\s+[A-Za-z0-9_.]+/gm)) {
      total += 1;
      external += 1;
    }
  }

  return { total, external };
}

function countMatches(content, regex) {
  return [...content.matchAll(regex)].length;
}

function collectComplexityDrivers(summary, file, lineCount) {
  if (lineCount >= 350) summary.complexityDrivers.add("large-file");
  if (summary.importCount >= 12) summary.complexityDrivers.add("high-import-fan-in");
  if (summary.apiCallCount >= 3) summary.complexityDrivers.add("multiple-api-call-sites");
  if (summary.stateSignalCount >= 3) summary.complexityDrivers.add("multiple-state-sources");
  if (summary.effectSignalCount >= 2) summary.complexityDrivers.add("multiple-effects-or-lifecycle-hooks");
  if (summary.uiContainerCount >= 3) summary.complexityDrivers.add("multiple-ui-containers");
  if (summary.asyncSignalCount >= 3) summary.complexityDrivers.add("heavy-async-flow");
  if (/config|router|navigation|routes?/i.test(file)) summary.complexityDrivers.add("coordination-file");
}

function detectControlPoints(projectRoot, files, ecosystem) {
  const controlMatchers = [
    { kind: "app-entry", patterns: [/^src\/main\.(tsx|jsx|ts|js)$/, /^lib\/main\.dart$/, /^main\.(tsx|jsx|ts|js)$/] },
    { kind: "router", patterns: [/router\/index/, /router\/config/, /navigation/i, /routes?/i, /src\/app\.config\./] },
    { kind: "network", patterns: [/api\/request/, /services\/index/, /Api\.(ts|js|dart|swift|kt|java)$/, /network/i] },
    { kind: "state", patterns: [/store/i, /bloc/i, /provider/i, /riverpod/i, /redux/i, /zustand/i] },
    { kind: "ui-shell", patterns: [/layout/i, /App\.(tsx|jsx|ts|js|swift|kt|java)$/, /SceneDelegate/, /AppDelegate/] },
  ];

  return controlMatchers
    .map((matcher) => {
      const hits = files
        .filter((file) => isControlPointCandidate(file, matcher.kind, ecosystem))
        .filter((file) => matcher.patterns.some((pattern) => pattern.test(file)))
        .sort((a, b) => scoreControlPointCandidate(b, matcher.kind, ecosystem) - scoreControlPointCandidate(a, matcher.kind, ecosystem))
        .slice(0, 8)
        .map((file) => path.join(projectRoot, file));
      return { kind: matcher.kind, files: hits };
    })
    .filter((item) => item.files.length > 0 || (matcherNeedsPlaceholder(item.kind, ecosystem) && item.files.length === 0));
}

function matcherNeedsPlaceholder(kind, ecosystem) {
  return kind === "router" && ["wechat-miniprogram", "uniapp", "taro"].includes(ecosystem.kind);
}

function isControlPointCandidate(file, kind, ecosystem) {
  if (isAnalysisNoisePath(file)) return false;
  const ext = path.extname(file).toLowerCase();
  const allowed = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".dart", ".swift", ".kt", ".java", ".vue", ".json", ".gradle", ".kts"]);
  if (!allowed.has(ext) && !["Podfile", "pages.json", "manifest.json", "project.config.json", "app.json"].includes(path.basename(file))) {
    return false;
  }
  if (kind === "router" && /\.(png|jpg|jpeg|gif|svg|plist|xcassets)$/i.test(file)) return false;
  if (kind === "state" && !/\b(store|redux|zustand|pinia|vuex|provider|bloc|riverpod|viewmodel)\b/i.test(file)) {
    return false;
  }
  if (kind === "ui-shell" && ecosystem.kind === "ios") {
    return /\b(AppDelegate|SceneDelegate|ViewController|TabBarController|NavigationController)\b/i.test(file);
  }
  return true;
}

function scoreControlPointCandidate(file, kind, ecosystem) {
  let score = 0;
  const base = path.basename(file);
  if (kind === "app-entry") {
    if (/^main\.(ts|js|tsx|jsx)$/.test(base)) score += 20;
    if (/^App\.vue$/.test(base)) score += 18;
    if (/^lib\/main\.dart$/.test(file)) score += 18;
  }
  if (kind === "router") {
    if (/(^|\/)(pages\.json|app\.json|project\.config\.json)$/.test(file)) score += 20;
    if (/\b(router|routes?|navigation)\b/i.test(file)) score += 14;
    if (ecosystem.kind === "ios" && /\/Libs\/Router\//.test(file)) score += 16;
  }
  if (kind === "network") {
    if (/\/Network\//.test(file) || /\b(api|request|service|network)\b/i.test(file)) score += 16;
  }
  if (kind === "state") {
    if (/\b(viewmodel|store|pinia|vuex|redux|provider|bloc)\b/i.test(file)) score += 16;
  }
  if (kind === "ui-shell") {
    if (/\b(AppDelegate|SceneDelegate)\b/.test(base)) score += 20;
    if (/^App\.vue$/.test(base)) score += 18;
    if (/layout\.(tsx|jsx|ts|js)$/.test(base)) score += 16;
  }
  if (/sampledata|images\.xcassets|contents\.json/i.test(file)) score -= 20;
  score -= file.split(path.sep).length * 0.1;
  return score;
}

async function collectDependencyData(projectRoot, files, ecosystem) {
  const dependencyNames = new Set();
  const sources = [];
  let packageJson = null;

  const packageJsonFiles = files.filter((file) => file.endsWith("package.json"));
  for (const file of packageJsonFiles) {
    try {
      const content = JSON.parse(await fs.readFile(path.join(projectRoot, file), "utf8"));
      if (file === "package.json" && !packageJson) packageJson = content;
      for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
        for (const name of Object.keys(content[section] ?? {})) {
          dependencyNames.add(name);
        }
      }
      sources.push({ type: "package.json", path: path.join(projectRoot, file) });
    } catch {}
  }

  if (files.includes("pubspec.yaml")) {
    const pubspecPath = path.join(projectRoot, "pubspec.yaml");
    const content = await readText(pubspecPath);
    if (content) {
      for (const name of parseYamlDependencyBlock(content, ["dependencies", "dev_dependencies"])) {
        dependencyNames.add(name);
      }
      sources.push({ type: "pubspec.yaml", path: pubspecPath });
    }
  }

  for (const file of files.filter((item) => /(^|\/)(Package\.swift|Podfile|Podfile\.lock)$/.test(item))) {
    const fullPath = path.join(projectRoot, file);
    const content = await readText(fullPath);
    if (!content) continue;
    for (const name of parseIosDependencies(file, content)) {
      dependencyNames.add(name);
    }
    sources.push({ type: path.basename(file), path: fullPath });
  }

  for (const file of files.filter((item) => /(^|\/)(settings\.gradle(\.kts)?|build\.gradle(\.kts)?|libs\.versions\.toml)$/.test(item))) {
    const fullPath = path.join(projectRoot, file);
    const content = await readText(fullPath);
    if (!content) continue;
    for (const name of parseAndroidDependencies(file, content)) {
      dependencyNames.add(name);
    }
    sources.push({ type: path.basename(file), path: fullPath });
  }

  if (["wechat-miniprogram", "uniapp", "taro"].includes(ecosystem.kind)) {
    for (const implied of detectMiniProgramFrameworks(files)) {
      dependencyNames.add(implied);
    }
  }

  return {
    names: [...dependencyNames],
    sources,
    packageJson,
  };
}

async function readText(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function parseYamlDependencyBlock(content, sections) {
  const found = new Set();
  let activeSection = null;
  for (const rawLine of content.split("\n")) {
    const line = rawLine.replace(/\t/g, "    ");
    const sectionMatch = /^([A-Za-z_][A-Za-z0-9_]*):\s*$/.exec(line);
    if (sectionMatch) {
      activeSection = sections.includes(sectionMatch[1]) ? sectionMatch[1] : null;
      continue;
    }
    if (!activeSection) continue;
    const depMatch = /^\s{2}([A-Za-z0-9_.-]+):/.exec(line);
    if (depMatch) {
      found.add(depMatch[1]);
      continue;
    }
    if (/^\S/.test(line)) {
      activeSection = null;
    }
  }
  return [...found];
}

function parseIosDependencies(file, content) {
  const names = new Set();
  if (file.endsWith("Package.swift")) {
    for (const match of content.matchAll(/package\s*\(\s*url:\s*"[^"]+\/([^/"\s]+?)(?:\.git)?"/g)) {
      names.add(match[1]);
    }
  }
  if (file.endsWith("Podfile") || file.endsWith("Podfile.lock")) {
    for (const match of content.matchAll(/pod\s+['"]([^'"]+)['"]/g)) {
      names.add(match[1]);
    }
    for (const match of content.matchAll(/^\s*-\s+([A-Za-z0-9_+\-/]+)\s+\(/gm)) {
      names.add(match[1]);
    }
  }
  return [...names];
}

function parseAndroidDependencies(file, content) {
  const names = new Set();
  for (const match of content.matchAll(/["']([A-Za-z0-9_.-]+:[A-Za-z0-9_.-]+)(?::[A-Za-z0-9+_.-]+)?["']/g)) {
    names.add(match[1]);
  }
  for (const match of content.matchAll(/([A-Za-z0-9_.-]+)\s*=\s*["'][A-Za-z0-9+_.:-]+["']/g)) {
    names.add(match[1]);
  }
  if (/com\.android\.application/.test(content)) names.add("com.android.application");
  if (/org\.jetbrains\.kotlin\.android/.test(content)) names.add("org.jetbrains.kotlin.android");
  return [...names];
}

function detectMiniProgramFrameworks(files) {
  const names = new Set();
  if (files.includes("manifest.json")) names.add("@dcloudio/uni-app");
  if (files.some((file) => /(^|\/)src\/app\.config\.(ts|tsx|js|jsx)$/.test(file))) names.add("@tarojs/taro");
  if (files.includes("project.config.json")) names.add("wechat-miniprogram");
  return [...names];
}

function hasFileSyncHint(projectRoot, filename) {
  try {
    const stat = fsSync.statSync(path.join(projectRoot, filename));
    return stat.isFile();
  } catch {
    return false;
  }
}

function pathSegmentsContain(value, segment) {
  return value.split("/").some((part) => part.toLowerCase().includes(segment));
}

function renderAnalysisMarkdown(output) {
  const stackLines = [];
  for (const [label, values] of Object.entries(output.stack)) {
    if (values.length > 0) {
      stackLines.push(`- ${label}: ${values.join(", ")}`);
    }
  }

  return [
    "# Frontend Quickstart Analysis",
    "",
    `- projectRoot: \`${output.projectRoot}\``,
    `- ecosystem: ${formatEcosystemLabel(output.ecosystem.kind)} (confidence: ${output.ecosystem.confidence})`,
    ...(output.dependencySources.length > 0
      ? output.dependencySources.map((item) => `- dependency source: ${item.type} -> \`${item.path}\``)
      : ["- dependency source: none detected"]),
    `- packageManager: ${output.packageManager}`,
    "",
    "## Stack",
    "",
    ...(stackLines.length > 0 ? stackLines : ["- none detected"]),
    "",
    "## Workspace Shape",
    "",
    `- monorepo: ${output.workspace.isMonorepo ? "yes" : "no"}`,
    ...(output.workspace.appRoots.length > 0
      ? output.workspace.appRoots.map((item) => `- app root: ${item}`)
      : ["- app root: none detected"]),
    ...(output.workspace.packageRoots.length > 0
      ? output.workspace.packageRoots.map((item) => `- package root: ${item}`)
      : ["- package root: none detected"]),
    "",
    "## Guidance Context",
    "",
    ...(output.guidanceContext.guidanceFiles.length > 0
      ? output.guidanceContext.guidanceFiles.map((item) => `- guidance file: ${item}`)
      : ["- no AGENT/CLAUDE/SKILL guidance files detected"]),
    ...(output.guidanceContext.hiddenAgentDirs.length > 0
      ? output.guidanceContext.hiddenAgentDirs.map(
          (item) => `- hidden agent dir: ${item.name} (${item.files.length} indexed files)`,
        )
      : ["- no hidden agent directories detected"]),
    "",
    "## Entries",
    "",
    ...output.entries.likelyEntries.map((item) => `- ${item}`),
    "",
    "## Control Points",
    "",
    ...output.controlPoints.flatMap((item) =>
      item.files.length > 0 ? item.files.map((file) => `- ${item.kind}: ${file}`) : [`- ${item.kind}: none detected`],
    ),
    "",
    "## Reading Chains",
    "",
    ...(output.readingChains.length > 0
      ? output.readingChains.flatMap((item) => [
          `- ${item.kind} (confidence: ${item.confidence}): ${item.files.join(" -> ")}`,
          `  - ${item.summary}`,
        ])
      : ["- none detected"]),
    "",
    "## Config Files",
    "",
    ...output.configFiles.map((item) => `- ${item}`),
    "",
    "## Risk Modules",
    "",
    ...output.riskModules.map((item) => {
      const reasons = item.moduleSummary.reasonHints.length > 0 ? item.moduleSummary.reasonHints : ["No reason hints generated."];
      return [`- ${item.module} (confidence: ${item.confidence})`, ...reasons.map((reason) => `  - ${reason}`)].join("\n");
    }),
    "",
    "## Cross-Cutting Modules",
    "",
    ...(output.crossCuttingModules.length > 0
      ? output.crossCuttingModules.flatMap((item) => [
          `- ${item.module} (confidence: ${item.confidence}): ${item.tagGroups.join(", ")}`,
          ...item.reasonHints.map((reason) => `  - ${reason}`),
        ])
      : ["- none detected"]),
    "",
    "## Guidance Diffs",
    "",
    ...(output.guidanceDiffs.length > 0
      ? output.guidanceDiffs.flatMap((item) => [
          `- ${item.kind} (confidence: ${item.confidence})`,
          `  - ${item.summary}`,
        ])
      : ["- none detected"]),
  ].join("\n");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
