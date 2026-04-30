[English](README.md) | [简体中文](README.zh-CN.md)

# Frontend Quickstart

需要尽快看懂一个项目时，可以用这个 skill 生成分析报告、技能推荐和架构图。

## 能做什么

- 识别项目主要技术和关键入口
- 生成 `project-analysis.md`
- 生成 `recommended-skills.md`
- 生成架构图
- 补一张 Mermaid 模块关系图
- 默认对最该先看的前三个模块里排第 1 的那个做一次性能分析
- 中文交付时会把最终文档统一收成中文

## 内置 Skills

| Skill | 什么时候用 | 作用 |
| --- | --- | --- |
| `frontend-quickstart` | 初次看项目 | 统筹分析流程并产出结果 |
| `find-skills` | 需要推荐 skill | 搜索并确认可安装的 skill id |
| `receiving-code-review` | 需要补风险判断 | 找出更值得先看的模块 |
| `performance-optimizer` | 需要继续分析某个重模块 | 对排在最前面的那个模块做性能分析 |
| `risk-hotspot-mermaid` | 模块关系已经明确 | 生成 Mermaid 模块关系图 |
| `project-translate` | 最终文件要用中文 | 把报告和推荐清单收成自然中文 |
| `frontend-diagram` | 需要结构图 | 生成架构图 |

单独测试 `performance-optimizer` 时，可以直接说：

- `用 performance-optimizer 分析当前项目`
- `只跑 performance-optimizer`
- `找出这个项目最值得先优化的地方`
- `生成 performance-analysis.md`

## 平台支持

这个仓库支持这些工具的安装或打包：

- Codex：按 [`.codex/INSTALL.md`](.codex/INSTALL.md) 安装
- OpenCode：按 [`.opencode/INSTALL.md`](.opencode/INSTALL.md) 安装
- Claude：见 [`.claude-plugin/`](.claude-plugin)
- Cursor：见 [`.cursor-plugin/`](.cursor-plugin)

如果是直接按技能目录安装，仓库根目录本身就是 skill 入口。

## 工作流

1. 先读代码和已有说明文件。
2. 运行分析脚本，生成 `.frontend-quickstart/analysis.json`。
3. 根据扫描结果整理技术栈、关键模块和优先阅读路径。
4. 推荐相关 skills，并确认 install id 和 GitHub 来源一致。
5. 对最该先看的前三个模块里排第 1 的那个做一次性能分析。
6. 生成 `project-analysis.md`、`recommended-skills.md`、架构图，并补 Mermaid 模块关系图。
7. 中文交付时，把最终文档里的英文草稿段落收成中文。
8. 最后运行校验脚本。

## 安装

注意：安装方式取决于你正在使用的 agent。

将这个仓库安装为 `frontend-quickstart`。

### Codex

1. 克隆仓库：

```bash
git clone https://github.com/aaronyyan/frontend-quickstart.git ~/frontend-quickstart
```

2. 链接到 Codex skills 目录：

```bash
mkdir -p ~/.agents/skills
ln -s ~/frontend-quickstart ~/.agents/skills/frontend-quickstart
```

3. 重启 Codex。

补充说明见 [`.codex/INSTALL.md`](.codex/INSTALL.md) 和 [docs/README.codex.md](docs/README.codex.md)。

### OpenCode

1. 克隆仓库：

```bash
git clone https://github.com/aaronyyan/frontend-quickstart.git ~/frontend-quickstart
```

2. 链接到 OpenCode skills 目录：

```bash
mkdir -p ~/.config/opencode/skills
ln -s ~/frontend-quickstart ~/.config/opencode/skills/frontend-quickstart
```

3. 重启 OpenCode。

补充说明见 [`.opencode/INSTALL.md`](.opencode/INSTALL.md) 和 [docs/README.opencode.md](docs/README.opencode.md)。

### Claude Code

这个仓库附带了 [`.claude-plugin/`](.claude-plugin) 打包目录。

如果走本地技能目录方式，把整个仓库作为一个 skill 目录安装到 Claude 的 skills 目录里。

如果走插件或分发流程，就使用 [`.claude-plugin/`](.claude-plugin) 里的元数据。

### Cursor

这个仓库附带了 [`.cursor-plugin/`](.cursor-plugin) 打包目录。

如果走插件打包或发布流程，就使用 [`.cursor-plugin/`](.cursor-plugin) 里的元数据。
