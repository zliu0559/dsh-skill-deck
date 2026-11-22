# 技能面板（Skill Deck）

[![CI](https://github.com/zliu0559/dsh-skill-deck/actions/workflows/ci.yml/badge.svg)](https://github.com/zliu0559/dsh-skill-deck/actions/workflows/ci.yml)

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件，在左侧边栏加一页 **技能**（同时保留 **设置 → 技能**）：浏览用户级技能目录下的全部技能，一键启停两种调用方式，直接编辑 `SKILL.md`，给技能标注分类、作者和系列，打开技能目录，或把技能移入回收站。同一份数据可以切换成列表、分组卡片墙或系列看板（地图）。

[English](README.md) | 中文

## 为什么

DSH 从磁盘发现技能并热加载，但改动只能手动编辑文件。技能面板把这些文件放进一个克制的小界面：

- **从侧栏直接打开**：**技能** 入口排在自带页面之后，设置 → 技能 也照常可用。
- **一份数据，三种视图**：列表适合密度，卡片墙按分类、作者或来源分组，地图则是**系列看板**：每个系列一个模块，拖动技能即可重新归类（失败会回滚，成功可撤销），一次请求就能重命名整个系列，并可在应用前审查推断出的系列建议。视图和分组方式会被记住。
- **标注不碰 `SKILL.md`**：分类、作者和系列保存在插件自己的文件里；frontmatter 里已有的作者会自动导入，分类和系列建议来自已经在用的值；系列只能手动维护。
- **不拖动也能整理**：桌面端每个技能块都有「移到系列」操作，触摸详情条也保留同名操作，键盘和触摸用户同样能整理看板。
- **看清到底加载了什么**：名称、描述、启停了哪些调用方式、文件数、大小、最后修改时间。
- **改开关不用碰 YAML**：「模型」写 `disable-model-invocation`，「命令」写 `user-invocable`，文件其余字节原样保留。
- **编辑整份文档**：`SKILL.md` 全文本编辑，原子写入，并带修订值校验，避免覆盖外部改动。
- **新建技能**：填一个名字和一句话描述，插件写入合法的 `SKILL.md` 并直接打开编辑器。
- **复制技能**：整目录复制成新名字，并把 frontmatter 的 `name` 改写为副本名。
- 面板底部显示插件版本、平台、各根目录的技能数，并有「复制诊断信息」按钮，出问题时可直接贴给我。
- **删除是安全的**：技能目录会被移动到 `~/.dsh/skills-trash/`，不会直接销毁。

## 安装

技能面板是一个 bundle 插件，不需要构建，也没有运行时依赖。

### 桌面版

1. 打开 **设置 → 插件**。
2. 点 **添加插件**，粘贴：

   ```text
   https://github.com/zliu0559/dsh-skill-deck/archive/refs/heads/main.tar.gz
   ```

3. 重启应用，左侧边栏会出现 **技能** 入口，**设置 → 技能** 也仍然可用。

### Web profile

```sh
dsh plugin --profile web add github:zliu0559/dsh-skill-deck
```

然后重启 `dsh web`。

### 本地目录

```sh
git clone https://github.com/zliu0559/dsh-skill-deck.git
```

通过 **设置 → 插件 → 添加插件** 选目录，或 `dsh plugin --profile web add <路径>`。

## 作用范围

| 目录 | 权限 |
|---|---|
| `$DSH_HOME/skills`（默认 `~/.dsh/skills`） | 读 + 写 |
| `$DSH_AGENTS_HOME/skills`（默认 `~/.agents/skills`） | 读 + 写 |
| `$DSH_HOME/skill-deck/annotations.json`（默认 `~/.dsh/skill-deck/annotations.json`） | 读 + 写（只存插件自己的标注） |

标注只写入这个插件自己的 JSON 文件，打标签不会改写 `SKILL.md`。当前 schema 是版本 2；版本 1 的文件会在读取时迁移，并在下一次保存时写成版本 2。文件不存在时视为没有标注。文件损坏或来自更新版本时，界面会忽略它，并在下一次写入前把它复制成同目录的 `annotations.corrupt-<时间戳>.json`，避免字节被静默丢弃。

项目级目录（`<repo>/.dsh/skills`、`<repo>/.agents/skills`）故意不在范围内：它们属于具体工作区，不属于 harness profile。

删除会把技能目录移动到 `$DSH_HOME/skills-trash/<时间戳>-<名称>/`；单文件 `<名称>.md` 也移进同一目录并保留 `.md` 后缀。不会递归销毁任何内容。删除技能时也会移除它在标注文件里的条目。

## 限制

- 与 DSH 发现规则一致，只扫一层：`<root>/<name>/SKILL.md` 或 `<root>/<name>.md`。
- 超过 2 MiB 的技能不允许编辑。
- 不允许改 `name:` 字段：目录名仍是唯一事实来源。
- 列表展示的是磁盘上的文件，不是所有 provider 合并后的目录：其他插件内置或虚拟的技能不会出现在这里。

## 开发

两半都是纯 ESM，无需构建。

```sh
npm install   # React 只是 devDependency，渲染测试用
npm test
```

`index.js` 是 Host 半（挂在 `/dsh-skill-deck/*` 下的路由），`client.js` 是通过 `window.__ModuleLoader__` 注册的浏览器模块（列表、卡片墙和系列看板渲染器都在同一个无构建文件里），`lib/` 放文件系统、frontmatter 与标注逻辑，测试直接复用。

Host API 是同源 JSON，通过 `webServer.register` 挂载；每个写操作都会先按名称重新发现技能再定位路径，所以请求无法指向受管目录之外的文件。

## 安全

接口只对本机、同源开放，写请求必须是 JSON；请求只携带技能名，从不携带路径。设计说明与上报方式见 [SECURITY.md](SECURITY.md)。

## 路线图

- 项目级目录（`<repo>/.dsh/skills`）+ 工作区切换。
- 从 GitHub `owner/repo` 直接安装技能，而不只是编辑本地已有技能。
- 有了项目级目录之后，再按根目录过滤。

## 发布

`main` 放已发布代码，`develop` 集成进行中的工作。版本遵循 SemVer，每次发布都是一个 `vX.Y.Z` 标签，并自动生成 GitHub Release。安装固定版本：

```text
https://github.com/zliu0559/dsh-skill-deck/archive/refs/tags/v0.3.0.tar.gz
```

完整流程见 [docs/RELEASING.md](docs/RELEASING.md)。

## 许可

MIT
