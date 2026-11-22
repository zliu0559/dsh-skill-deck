# 技能面板（Skill Deck）

[![CI](https://github.com/zliu0559/dsh-skill-deck/actions/workflows/ci.yml/badge.svg)](https://github.com/zliu0559/dsh-skill-deck/actions/workflows/ci.yml)

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件，在设置里加一页 **技能**：浏览用户级技能目录下的全部技能，一键启停两种调用方式，直接编辑 `SKILL.md`，打开技能目录，或把技能移入回收站。

[English](README.md) | 中文

## 为什么

DSH 从磁盘发现技能并热加载，但改动只能手动编辑文件。技能面板把这些文件放进一个克制的小界面：

- **看清到底加载了什么**：名称、描述、启停了哪些调用方式、文件数、大小、最后修改时间。
- **改开关不用碰 YAML**：「模型」写 `disable-model-invocation`，「命令」写 `user-invocable`，文件其余字节原样保留。
- **编辑整份文档**：`SKILL.md` 全文本编辑，原子写入，并带修订值校验，避免覆盖外部改动。
- **删除是安全的**：技能目录会被移动到 `~/.dsh/skills-trash/`，不会直接销毁。

## 安装

技能面板是一个 bundle 插件，不需要构建，也没有运行时依赖。

### 桌面版

1. 打开 **设置 → 插件**。
2. 点 **添加插件**，粘贴：

   ```text
   https://github.com/zliu0559/dsh-skill-deck/archive/refs/heads/main.tar.gz
   ```

3. 重启应用，**设置 → 技能** 就会出现。

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

项目级目录（`<repo>/.dsh/skills`、`<repo>/.agents/skills`）故意不在范围内：它们属于具体工作区，不属于 harness profile。

删除会把技能目录移动到 `$DSH_HOME/skills-trash/<时间戳>-<名称>/`；单文件 `<名称>.md` 也移进同一目录并保留 `.md` 后缀。不会递归销毁任何内容。

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

`index.js` 是 Host 半（挂在 `/dsh-skill-deck/*` 下的路由），`client.js` 是通过 `window.__ModuleLoader__` 注册的浏览器模块，`lib/` 放文件系统与 frontmatter 逻辑，测试直接复用。

Host API 是同源 JSON，通过 `webServer.register` 挂载；每个写操作都会先按名称重新发现技能再定位路径，所以请求无法指向受管目录之外的文件。

## 路线图

- 项目级目录（`<repo>/.dsh/skills`）+ 工作区切换。
- 从 GitHub `owner/repo` 直接安装技能，而不只是编辑本地已有技能。
- 不想手写 frontmatter 的人可以用的「新建技能」表单。

## 许可

MIT
