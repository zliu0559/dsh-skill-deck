/**
 * dsh-skill-deck — Client half.
 *
 * Registers a Settings section that lists the skills under the DSH user roots
 * and lets the user toggle the two invocation surfaces, edit a SKILL.md,
 * reveal it in the file manager, or move it to the trash.
 */
window.__ModuleLoader__.load({
  id: 'dsh-skill-deck',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } = React;

    const NS = 'dsh-skill-deck';
    const API = '/dsh-skill-deck';
    const UNCATEGORIZED = 'Uncategorized';
    const UNKNOWN_AUTHOR = 'Unknown';
    const VIEWS = ['list', 'cards', 'map'];
    const VIEW_KEY = NS + '/view';
    const GROUP_KEY = NS + '/groupBy';

    const zh = {
      title: '技能',
      subtitle: '浏览、启停、编辑和删除 DSH 用户级技能目录里的技能。',
      search: '搜索名称或描述…',
      filterAll: '全部',
      filterEnabled: '已启用',
      filterDisabled: '已停用',
      filterInvalid: '有问题的',
      refresh: '刷新',
      refreshing: '刷新中…',
      loading: '正在读取技能…',
      loadFailed: '读取失败',
      retry: '重试',
      empty: '还没有技能。把 <name>/SKILL.md 放进 ~/.dsh/skills 即可。',
      noMatch: '没有匹配的技能。',
      modelSurface: '模型',
      userSurface: '手动',
      modelHint: '允许模型按任务自动调用',
      userHint: '允许通过斜杠命令手动调用',
      enabled: '已启用',
      disabled: '已停用',
      invalid: '需修复',
      unknownError: '未知错误',
      files: '个文件',
      edit: '编辑',
      reveal: '打开目录',
      remove: '删除',
      save: '保存',
      saving: '保存中…',
      cancel: '取消',
      close: '关闭',
      editTitle: '编辑 SKILL.md',
      editHint: '整份文件原样保存，脚本和资源不受影响。',
      dirty: '有未保存的修改，确定关闭？',
      conflict: '文件在磁盘上已被修改，请重新加载后再改。',
      conflictHint: '磁盘上的版本更新了。',
      reload: '重新加载',
      saved: '已保存',
      toggled: '已更新',
      trashed: '已移入回收站',
      deleteTitle: '删除技能',
      deleteBody: '确定删除？技能目录会被移动到回收站，而不是直接销毁：',
      deleteConfirm: '输入技能名以确认',
      deleteAction: '移入回收站',
      revealFailed: '无法打开目录',
      unsupported: '当前版本不支持这个操作。',
      create: '新建',
      createTitle: '新建技能',
      createName: '技能名',
      createNameHint: 'kebab-case，例如 my-new-skill；目录名会与它一致。',
      createDescription: '一句话描述',
      createDescriptionHint: '模型靠它判断何时调用这个技能。',
      createScope: '保存到',
      createScopeUser: '~/.dsh/skills（个人）',
      createScopeAgents: '~/.agents/skills（共享）',
      createAction: '创建',
      creating: '创建中…',
      created: '已创建，正在打开编辑器',
      nameRequired: '请填写合规的技能名和描述。',
      copyDiag: '复制诊断信息',
      copied: '已复制',
      copyFailed: '复制失败，请手动选取。',
      duplicate: '复制',
      duplicateTitle: '复制技能',
      duplicateName: '新名称',
      duplicateHint: '会把整个技能目录复制一份，并把 frontmatter 里的 name 改成新名字。',
      duplicateAction: '创建副本',
      duplicating: '复制中…',
      duplicated: '副本已创建',
      clientLoaded: '浏览器端已加载',
      clientMissing: '浏览器端未加载',
      tag: '标签',
      categoryLabel: '分类',
      authorLabel: '作者',
      seriesLabel: '系列',
      uncategorized: '未分类',
      unknownAuthor: '未知作者',
      unknownRoot: '未知来源',
      unassigned: '未分组',
      annotationTitle: '分类、作者与系列',
      annotationCategory: '分类',
      annotationCategoryHint: '可以从已有分类里选，也可以输入新的；留空表示未分类。',
      annotationAuthor: '作者',
      annotationAuthorHint: '留空会使用 SKILL.md 里的作者，没有则显示未知作者。',
      annotationSeries: '系列',
      annotationSeriesHint: '可以从已有系列里选，也可以输入新的；留空表示未分组。',
      annotationHint: '标注保存在插件自己的文件里，不会改动 SKILL.md。',
      annotationAction: '保存标注',
      annotationSaving: '保存中…',
      annotated: '标注已保存',
      viewLabel: '视图',
      viewList: '列表',
      viewCards: '卡片',
      viewMap: '地图',
      mapLabel: '技能地图',
      mapStatusLegend: '状态图例',
      mapDetails: '技能详情',
      mapPick: '点按技能查看详情。',
      groupBy: '分组',
      groupByCategory: '分类',
      groupByAuthor: '作者',
      groupByRoot: '来源',
      filterLabel: '状态',
      renameSeries: '重命名',
      renameSeriesTitle: '重命名系列',
      renameSeriesAction: '重命名',
      renameSeriesHint: '这个系列里的每个技能都会在同一次请求里更新。',
      renaming: '重命名中…',
      seriesRenamed: '系列已重命名',
      unassignedHint: '把技能拖到这里可以移出系列。',
      movedTo: '已移到',
      movedOut: '已移出系列',
      undo: '撤销',
      undone: '已撤销移动',
      moveToSeries: '移到系列',
      dropToSeries: '移入',
      dropToUnassigned: '移出系列',
      dropToNewSeries: '松开以新建系列',
      newSeriesZone: '拖到这里新建系列。',
      newSeriesTitle: '新建系列',
      newSeriesHint: '技能会加入这个系列；已有同名系列会直接沿用。',
      newSeriesAction: '创建并移入',
      suggestSeries: '建议系列',
      suggestTitle: '建议系列',
      suggestInferred: '推断',
      suggestInferredHint: '以下分组由 frontmatter 元数据推断，请先检查并修改再应用。',
      suggestSeriesName: '系列名',
      suggestApply: '应用建议',
      suggestApplying: '应用中…',
      suggestApplied: '系列建议已应用',
      suggestUndone: '已撤销系列建议',
      suggestNone: '没有可以建议系列的技能。',
    };

    const en = {
      title: 'Skills',
      subtitle: 'Browse, toggle, edit and remove the skills in your DSH user roots.',
      search: 'Search name or description…',
      filterAll: 'All',
      filterEnabled: 'Enabled',
      filterDisabled: 'Disabled',
      filterInvalid: 'Needs attention',
      refresh: 'Refresh',
      refreshing: 'Refreshing…',
      loading: 'Reading skills…',
      loadFailed: 'Could not load skills',
      retry: 'Retry',
      empty: 'No skills yet. Drop <name>/SKILL.md into ~/.dsh/skills to add one.',
      noMatch: 'No matching skills.',
      modelSurface: 'Model',
      userSurface: 'Slash',
      modelHint: 'Let the model invoke this skill on its own',
      userHint: 'Allow invoking it as a slash command',
      enabled: 'Enabled',
      disabled: 'Disabled',
      invalid: 'Needs fixing',
      unknownError: 'Unknown error',
      files: 'files',
      edit: 'Edit',
      reveal: 'Open folder',
      remove: 'Remove',
      save: 'Save',
      saving: 'Saving…',
      cancel: 'Cancel',
      close: 'Close',
      editTitle: 'Edit SKILL.md',
      editHint: 'The whole file is saved as-is; scripts and assets are untouched.',
      dirty: 'You have unsaved changes. Close anyway?',
      conflict: 'The file changed on disk. Reload it before editing again.',
      conflictHint: 'A newer copy exists on disk.',
      reload: 'Reload',
      saved: 'Saved',
      toggled: 'Updated',
      trashed: 'Moved to trash',
      deleteTitle: 'Remove skill',
      deleteBody: 'The skill is moved to the trash folder instead of being destroyed:',
      deleteConfirm: 'Type the skill name to confirm',
      deleteAction: 'Move to trash',
      revealFailed: 'Could not open the folder',
      unsupported: 'This build does not support that action.',
      create: 'New',
      createTitle: 'New skill',
      createName: 'Skill name',
      createNameHint: 'kebab-case, e.g. my-new-skill; the folder is named after it.',
      createDescription: 'One-line description',
      createDescriptionHint: 'The model reads this to decide when to invoke the skill.',
      createScope: 'Save to',
      createScopeUser: '~/.dsh/skills (personal)',
      createScopeAgents: '~/.agents/skills (shared)',
      createAction: 'Create',
      creating: 'Creating…',
      created: 'Created — opening the editor',
      nameRequired: 'Enter a valid name and a description.',
      copyDiag: 'Copy diagnostics',
      copied: 'Copied',
      copyFailed: 'Could not copy; select the text manually.',
      duplicate: 'Duplicate',
      duplicateTitle: 'Duplicate skill',
      duplicateName: 'New name',
      duplicateHint: 'Copies the whole skill folder and rewrites the name in its frontmatter.',
      duplicateAction: 'Create copy',
      duplicating: 'Duplicating…',
      duplicated: 'Copy created',
      clientLoaded: 'Browser half loaded',
      clientMissing: 'Browser half not loaded',
      tag: 'Tag',
      categoryLabel: 'Category',
      authorLabel: 'Author',
      seriesLabel: 'Series',
      uncategorized: 'Uncategorized',
      unknownAuthor: 'Unknown',
      unknownRoot: 'Unknown root',
      unassigned: 'Unassigned',
      annotationTitle: 'Category, author and series',
      annotationCategory: 'Category',
      annotationCategoryHint: 'Pick an existing category or type a new one; leave it empty for Uncategorized.',
      annotationAuthor: 'Author',
      annotationAuthorHint: 'Leave it empty to use the SKILL.md author, or Unknown when there is none.',
      annotationSeries: 'Series',
      annotationSeriesHint: 'Pick an existing series or type a new one; leave it empty for Unassigned.',
      annotationHint: 'Annotations live in a plugin-owned file; SKILL.md is never changed.',
      annotationAction: 'Save tags',
      annotationSaving: 'Saving…',
      annotated: 'Tags saved',
      viewLabel: 'View',
      viewList: 'List',
      viewCards: 'Cards',
      viewMap: 'Map',
      mapLabel: 'Skill map',
      mapStatusLegend: 'Status legend',
      mapDetails: 'Skill details',
      mapPick: 'Tap a skill to see details.',
      groupBy: 'Group by',
      groupByCategory: 'Category',
      groupByAuthor: 'Author',
      groupByRoot: 'Root',
      filterLabel: 'Status',
      renameSeries: 'Rename',
      renameSeriesTitle: 'Rename series',
      renameSeriesAction: 'Rename',
      renameSeriesHint: 'Every skill in this series is updated in one request.',
      renaming: 'Renaming…',
      seriesRenamed: 'Series renamed',
      unassignedHint: 'Drag a skill here to remove it from its series.',
      movedTo: 'Moved to',
      movedOut: 'Removed from series',
      undo: 'Undo',
      undone: 'Move undone',
      moveToSeries: 'Move to series',
      dropToSeries: 'Assign to',
      dropToUnassigned: 'Remove from series',
      dropToNewSeries: 'Drop to create a new series',
      newSeriesZone: 'Drop a skill here to create a new series.',
      newSeriesTitle: 'New series',
      newSeriesHint: 'The skill joins this series; an existing name is reused as-is.',
      newSeriesAction: 'Create and move',
      suggestSeries: 'Suggest series',
      suggestTitle: 'Suggest series',
      suggestInferred: 'Inferred',
      suggestInferredHint: 'This grouping is inferred from frontmatter metadata. Review and edit it before applying.',
      suggestSeriesName: 'Series name',
      suggestApply: 'Apply suggestions',
      suggestApplying: 'Applying…',
      suggestApplied: 'Suggested series applied',
      suggestUndone: 'Suggested series undone',
      suggestNone: 'No skills to suggest a series for.',
    };

    const language = (navigator.language || 'en').toLowerCase();
    const dict = language.startsWith('zh') ? zh : en;
    const t = (key) => dict[key] ?? key;

    const CSS = `
      .deck { display: flex; flex-direction: column; gap: 14px; font-size: 13px; color: var(--dsw-alias-label-primary, inherit); }
      .deck-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
      .deck-title { font-size: 16px; font-weight: 600; margin: 0; }
      .deck-sub { margin: 4px 0 0; font-size: 12px; opacity: .62; }
      .deck-tools { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .deck-input { height: 30px; padding: 0 10px; border-radius: var(--dsw-radius-md, 8px); border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3)); background: var(--dsw-alias-bg-layer-1, transparent); color: inherit; font-size: 12px; min-width: 200px; }
      .deck-select { height: 30px; padding: 0 8px; border-radius: var(--dsw-radius-md, 8px); border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3)); background: var(--dsw-alias-bg-layer-1, transparent); color: inherit; font-size: 12px; }
      .deck-btn { height: 30px; padding: 0 12px; border-radius: var(--dsw-radius-md, 8px); border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3)); background: transparent; color: inherit; font-size: 12px; cursor: pointer; }
      .deck-btn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12)); }
      .deck-btn:disabled { opacity: .5; cursor: default; background: transparent; }
      .deck-btn:focus-visible, .deck-input:focus-visible, .deck-select:focus-visible, .deck-switch:focus-visible { outline: 2px solid var(--dsw-focus-ring-color, #3b82f6); outline-offset: 2px; }
      .deck-btn.primary { background: var(--dsw-alias-brand-primary, #3b82f6); border-color: var(--dsw-alias-brand-primary, #3b82f6); color: var(--dsw-alias-label-primary-inverted, #fff); }
      .deck-btn.primary:hover { filter: brightness(.94); background: var(--dsw-alias-brand-primary, #3b82f6); }
      .deck-btn.danger { color: var(--dsw-alias-state-error-primary, #dc2626); border-color: rgba(220,38,38,.4); }
      .deck-list { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none; }
      .deck-view { display: inline-flex; border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3)); border-radius: var(--dsw-radius-md, 8px); overflow: hidden; }
      .deck-view .deck-btn { height: 28px; border: 0; border-radius: 0; }
      .deck-view .deck-btn + .deck-btn { border-left: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3)); }
      .deck-view .deck-btn[aria-pressed='true'] { background: rgba(59,130,246,.14); color: var(--dsw-alias-state-business-primary, #3b82f6); font-weight: 600; }
      .deck-cards { display: flex; flex-direction: column; gap: 18px; }
      .deck-group { display: flex; flex-direction: column; gap: 8px; }
      .deck-group-head { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 13px; font-weight: 600; }
      .deck-group-count { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 18px; padding: 0 6px; border-radius: 999px; background: rgba(127,127,127,.16); font-size: 10px; font-weight: 600; }
      .deck-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px; align-items: stretch; }
      .deck-card { display: flex; flex-direction: column; gap: 8px; min-width: 0; padding: 12px 14px; border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.22)); border-radius: var(--dsw-radius-lg, 10px); }
      .deck-card:focus-visible { outline: 2px solid var(--dsw-focus-ring-color, #3b82f6); outline-offset: 2px; }
      .deck-card-name { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; }
      .deck-card-desc { font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary, inherit); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      .deck-card-meta { display: flex; gap: 8px; flex-wrap: wrap; font-size: 11px; color: var(--dsw-alias-label-caption, inherit); }
      .deck-card-controls { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-top: auto; }
      .deck-card-actions { display: flex; gap: 6px; flex-wrap: wrap; }
      .deck-card-actions .deck-btn { height: 24px; padding: 0 8px; font-size: 11px; }
      .deck-map { display: flex; flex-direction: column; gap: 14px; }
      .deck-map-tools { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
      .deck-map-tools .deck-btn { height: 26px; padding: 0 10px; font-size: 11px; }
      .deck-suggest-group { display: flex; flex-direction: column; gap: 8px; padding: 10px 0; border-top: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2)); }
      .deck-suggest-group:first-of-type { border-top: 0; padding-top: 0; }
      .deck-suggest-row { display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; }
      .deck-suggest-skill-name { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      .deck-suggest-evidence { margin-left: auto; font-size: 11px; color: var(--dsw-alias-label-caption, inherit); }
      .deck-map-module { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.22)); border-radius: var(--dsw-radius-lg, 10px); }
      .deck-map-module.is-empty { padding: 8px 12px; }
      .deck-map-module-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .deck-map-module-title { margin: 0; font-size: 13px; font-weight: 600; }
      .deck-map-module-count { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 18px; padding: 0 6px; border-radius: 999px; background: rgba(127,127,127,.16); font-size: 10px; font-weight: 600; }
      .deck-map-module-status { font-size: 11px; color: var(--dsw-alias-label-secondary, inherit); }
      .deck-map-rename { margin-left: auto; height: 24px; padding: 0 9px; font-size: 11px; }
      .deck-map-dropzone { padding: 8px 10px; border: 1px dashed var(--dsw-alias-border-l2, rgba(127,127,127,.3)); border-radius: var(--dsw-radius-md, 8px); font-size: 11px; color: var(--dsw-alias-label-tertiary, inherit); }
      .deck-map-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; align-items: stretch; }
      .deck-map-tile { position: relative; display: flex; flex-direction: column; gap: 6px; box-sizing: border-box; width: 100%; aspect-ratio: 3 / 2; margin: 0; padding: 10px 11px; border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.22)); border-radius: var(--dsw-radius-lg, 10px); color: inherit; font: inherit; text-align: left; cursor: pointer; overflow: hidden; }
      .deck-map-tile:hover { border-color: var(--dsw-alias-border-l1, rgba(127,127,127,.45)); filter: brightness(.98); }
      .deck-map-tile:focus-visible { outline: 2px solid var(--dsw-focus-ring-color, #3b82f6); outline-offset: 2px; }
      .deck-map-tile:disabled { opacity: .6; cursor: default; }
      .deck-map-tile[draggable='true'] { cursor: grab; }
      .deck-map.is-dragging .deck-map-tile:active { cursor: grabbing; }
      .deck-map-module.is-dimmed { opacity: .42; }
      .deck-map-module.is-drop-target { border-color: var(--dsw-alias-state-business-primary, #3b82f6); box-shadow: 0 0 0 2px rgba(59,130,246,.35); }
      .deck-map-drop-label { padding: 2px 0; font-size: 11px; font-weight: 600; color: var(--dsw-alias-state-business-primary, #3b82f6); }
      .deck-map-newseries { padding: 10px 12px; border: 1px dashed var(--dsw-alias-border-l2, rgba(127,127,127,.3)); border-radius: var(--dsw-radius-md, 8px); font-size: 11px; color: var(--dsw-alias-label-tertiary, inherit); }
      .deck-map-newseries.is-drop-target { border-color: var(--dsw-alias-state-business-primary, #3b82f6); background: rgba(59,130,246,.08); color: var(--dsw-alias-state-business-primary, #3b82f6); font-weight: 600; }
      .deck-map-tile-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; font-weight: 600; }
      .deck-map-tile-badges { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; overflow: hidden; }
      .deck-map-tile-badges .deck-badge { height: 16px; padding: 0 5px; font-size: 9px; }
      .deck-map-tile-foot { display: flex; align-items: center; gap: 6px; margin-top: auto; font-size: 10px; color: var(--dsw-alias-label-secondary, inherit); }
      .deck-status-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
      .deck-map-size { flex: none; font-size: 10px; opacity: .86; }
      .deck-map-legend { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 14px; font-size: 11px; color: var(--dsw-alias-label-secondary, inherit); }
      .deck-legend-item { display: inline-flex; align-items: center; gap: 6px; }
      .deck-legend-swatch { width: 10px; height: 10px; border-radius: 50%; flex: none; }
      .deck-legend-label { font-weight: 600; }
      .deck-legend-count { min-width: 18px; padding: 0 5px; border-radius: 999px; background: rgba(127,127,127,.16); text-align: center; font-size: 10px; font-weight: 600; }
      .deck-map-popover { position: fixed; z-index: 40; box-sizing: border-box; width: 260px; max-width: calc(100vw - 16px); padding: 12px 14px; border-radius: var(--dsw-radius-lg, 10px); border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3)); background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, inherit); box-shadow: var(--dsw-elevation-prominent, 0 16px 40px rgba(0,0,0,.28)); font-size: 12px; pointer-events: none; }
      .deck-map-popover-name { margin-bottom: 5px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-weight: 600; word-break: break-word; }
      .deck-map-popover-desc { margin-bottom: 7px; line-height: 1.5; color: var(--dsw-alias-label-secondary, inherit); }
      .deck-map-popover-meta { display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: var(--dsw-alias-label-caption, inherit); }
      .deck-map-strip { position: sticky; bottom: 0; z-index: 5; display: flex; align-items: flex-start; gap: 8px 14px; padding: 12px 14px; border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3)); border-radius: var(--dsw-radius-lg, 10px); background: var(--dsw-alias-bg-layer-1, #fff); box-shadow: 0 -8px 24px rgba(0,0,0,.14); }
      .deck-map-strip-info { display: flex; flex: 1 1 220px; flex-direction: column; gap: 4px; min-width: 0; }
      .deck-map-strip-name { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; font-weight: 600; }
      .deck-map-strip-desc { font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary, inherit); }
      .deck-map-strip-meta { font-size: 11px; color: var(--dsw-alias-label-caption, inherit); }
      .deck-map-strip .deck-btn { flex: none; align-self: center; }
      @media (max-width: 640px) { .deck-map-popover { display: none; } }
      .deck-row { display: grid; grid-template-columns: minmax(0,1fr) auto auto; gap: 12px; align-items: center; padding: 12px 14px; border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.22)); border-radius: var(--dsw-radius-lg, 10px); }
      .deck-name { display: flex; align-items: center; gap: 8px; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; }
      .deck-desc { margin-top: 4px; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary, inherit); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .deck-meta { margin-top: 6px; font-size: 11px; color: var(--dsw-alias-label-caption, inherit); display: flex; gap: 10px; flex-wrap: wrap; }
      .deck-badge { display: inline-flex; align-items: center; height: 18px; padding: 0 7px; border-radius: 999px; font-size: 10px; font-weight: 600; letter-spacing: .2px; background: rgba(59,130,246,.14); color: var(--dsw-alias-state-business-primary, #3b82f6); }
      .deck-badge.muted { background: rgba(127,127,127,.16); color: var(--dsw-alias-label-tertiary, inherit); }
      .deck-badge.warn { background: rgba(220,38,38,.14); color: var(--dsw-alias-state-error-primary, #dc2626); }
      .deck-tag { display: inline-flex; align-items: center; height: 18px; padding: 0 7px; border-radius: 999px; background: rgba(127,127,127,.13); font-size: 10px; }
      .deck-switches { display: flex; gap: 6px; }
      .deck-switch { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 9px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3)); background: transparent; color: var(--dsw-alias-label-tertiary, inherit); font-size: 11px; cursor: pointer; }
      .deck-switch .dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(127,127,127,.5); }
      .deck-switch.on { border-color: rgba(34,197,94,.5); background: rgba(34,197,94,.12); color: var(--dsw-alias-state-success-primary, #16a34a); }
      .deck-switch.on .dot { background: var(--dsw-alias-state-success-primary, #22c55e); }
      .deck-switch:disabled { opacity: .5; cursor: default; }
      .deck-actions { display: flex; gap: 6px; }
      .deck-actions .deck-btn { height: 26px; padding: 0 9px; font-size: 11px; }
      .deck-empty { padding: 28px; text-align: center; font-size: 12px; color: var(--dsw-alias-label-tertiary, inherit); border: 1px dashed var(--dsw-alias-border-l2, rgba(127,127,127,.3)); border-radius: var(--dsw-radius-lg, 10px); }
      .deck-error { padding: 14px; border-radius: var(--dsw-radius-lg, 10px); border: 1px solid rgba(220,38,38,.35); background: rgba(220,38,38,.08); color: var(--dsw-alias-state-error-primary, #dc2626); font-size: 12px; }
      .deck-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 60; padding: 24px; }
      .deck-modal { width: min(820px, 100%); max-height: 88vh; display: flex; flex-direction: column; border-radius: var(--dsw-radius-lg, 12px); background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, inherit); border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3)); box-shadow: var(--dsw-elevation-prominent, 0 20px 60px rgba(0,0,0,.45)); overflow: hidden; }
      .deck-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2)); }
      .deck-modal-title { font-size: 14px; font-weight: 600; }
      .deck-modal-body { padding: 14px 16px; overflow: auto; }
      .deck-modal-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-top: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2)); }
      .deck-editor { width: 100%; min-height: 52vh; resize: vertical; border-radius: var(--dsw-radius-md, 8px); border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3)); background: var(--dsw-alias-bg-base, rgba(127,127,127,.06)); color: inherit; padding: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.55; }
      .deck-note { font-size: 11px; color: var(--dsw-alias-label-caption, inherit); }
      .deck-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
      .deck-field-label { font-size: 12px; font-weight: 600; }
      .deck-field .deck-input, .deck-field .deck-select { width: 100%; min-width: 0; }
      .deck-foot { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding-top: 10px; border-top: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2)); }
      .deck-foot .deck-btn { height: 24px; padding: 0 9px; font-size: 11px; margin-left: auto; }
      .deck-toast { position: fixed; right: 24px; bottom: 24px; z-index: 70; display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: var(--dsw-radius-md, 8px); background: #111827; color: #f9fafb; font-size: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.35); }
      .deck-toast.error { background: #7f1d1d; }
      .deck-toast-action { height: 24px; padding: 0 10px; border-radius: 999px; border: 1px solid rgba(249,250,251,.45); background: transparent; color: inherit; font-size: 11px; font-weight: 600; cursor: pointer; }
      .deck-toast-action:hover { background: rgba(249,250,251,.14); }
      .deck-toast-action:focus-visible { outline: 2px solid #f9fafb; outline-offset: 2px; }
      .deck-page { box-sizing: border-box; height: 100%; min-height: 0; overflow: auto; padding: 28px clamp(20px, 4vw, 48px) 32px; }
      [data-platform='darwin'] .deck-page { padding-top: calc(28px + var(--dsh-frame-top-clearance, 0px)); }
      .deck-page > .deck { width: 100%; max-width: 960px; margin: 0 auto; }
      .deck-icon { display: block; opacity: .72; }
      .deck-icon.active { opacity: 1; }
      @media (max-width: 720px) { .deck-row, .deck-card-grid { grid-template-columns: 1fr; } }
    `;

    function injectStyles() {
      const tagId = NS + '/panel.css';
      if (document.querySelector('style[data-plugin-css="' + tagId + '"]')) return;
      const tag = document.createElement('style');
      tag.dataset.plugin = NS;
      tag.dataset.pluginCss = tagId;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    /**
     * Tell the Host that this bundle ran, and then that the panel rendered.
     * The signal is the only way to prove the client half is actually alive.
     * @param {'loaded'|'rendered'} kind
     */
    function signal(kind) {
      try {
        fetch(API + '/signal', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ kind }),
        }).catch(() => {});
      } catch {
        /* a page without fetch still renders the panel */
      }
    }

    async function api(path, body) {      const init = body
        ? {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          }
        : { credentials: 'same-origin' };
      const response = await fetch(API + path, init);
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        /* a non-JSON body from a proxy still counts as a failure below */
      }
      if (!response.ok || !payload || payload.ok !== true) {
        const message = payload && payload.error ? payload.error : 'HTTP ' + response.status;
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }
      return payload;
    }

    function formatBytes(bytes) {
      if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    }

    function displayCategory(value) {
      return !value || value.toLowerCase() === UNCATEGORIZED.toLowerCase() ? t('uncategorized') : value;
    }

    function displayAuthor(value) {
      return !value || value.toLowerCase() === UNKNOWN_AUTHOR.toLowerCase() ? t('unknownAuthor') : value;
    }

    function displaySeries(value) {
      return !value ? t('unassigned') : value;
    }

    function readPreference(key, allowed, fallback) {
      try {
        const value = window.localStorage.getItem(key);
        if (allowed.includes(value)) return value;
      } catch {
        /* storage may be unavailable (private mode, sandboxed page) */
      }
      return fallback;
    }

    function writePreference(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* the preference simply does not survive this visit */
      }
    }

    /**
     * One descriptor per grouping axis: how to read the value, which values are
     * the fallback bucket, and how the group heading is displayed. Adding an
     * axis means adding an entry here (and its labels), not editing several
     * cascades and the selector.
     */
    const GROUP_AXES = {
      category: {
        labelKey: 'groupByCategory',
        value: (skill) => skill.category,
        fallback: (value) => value === '' || value.toLowerCase() === UNCATEGORIZED.toLowerCase(),
        fallbackLabel: () => t('uncategorized'),
      },
      author: {
        labelKey: 'groupByAuthor',
        value: (skill) => skill.author,
        fallback: (value) => value === '' || value.toLowerCase() === UNKNOWN_AUTHOR.toLowerCase(),
        fallbackLabel: () => t('unknownAuthor'),
      },
      root: {
        labelKey: 'groupByRoot',
        value: (skill) => skill.root,
        display: (value, rootLabels) => rootLabels.get(value) ?? value,
        fallback: (value) => value === '',
        fallbackLabel: () => t('unknownRoot'),
      },
      series: {
        labelKey: 'seriesLabel',
        value: (skill) => skill.series,
        fallback: (value) => value === '',
        fallbackLabel: () => t('unassigned'),
      },
    };
    // The Map always groups by series; only Cards exposes a grouping choice.
    const GROUPINGS = ['category', 'author', 'root'];

    function groupLabelFor(axis, value, fallback, rootLabels) {
      if (fallback) return axis.fallbackLabel();
      return axis.display ? axis.display(value, rootLabels) : value;
    }

    /**
     * Group the already-filtered skills. Values compare trimmed and
     * case-insensitively; the first spelling seen is displayed. Sections sort
     * by descending count then name, with the fallback group always last.
     * @param {Array<object>} skills
     * @param {string} dimension
     * @param {Map<string, string>} [rootLabels] root id to display label
     */
    function groupSkills(skills, dimension, rootLabels = new Map()) {
      const axis = GROUP_AXES[dimension] ?? GROUP_AXES.category;
      const groups = new Map();
      for (const skill of skills) {
        const value = String(axis.value(skill) ?? '').trim();
        const fallback = axis.fallback(value);
        const key = fallback ? '\u0000fallback' : value.toLowerCase();
        let group = groups.get(key);
        if (!group) {
          group = {
            key,
            label: groupLabelFor(axis, value, fallback, rootLabels),
            fallback,
            count: 0,
            skills: [],
          };
          groups.set(key, group);
        }
        group.count += 1;
        group.skills.push(skill);
      }
      return [...groups.values()].sort((a, b) => {
        if (a.fallback !== b.fallback) return a.fallback ? 1 : -1;
        if (a.count !== b.count) return b.count - a.count;
        return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
      });
    }

    /**
     * Coarse source modules for the Suggest series flow. `metadata.author` is
     * the huashu signal, `metadata.credits.author` the Humanlayer one, and any
     * skill without another known source falls back to Matt Pocock. The
     * grouping is always inferred: the user reviews it before it is written.
     */
    const SUGGEST_MODULES = [
      { key: 'huashu', name: 'huashu' },
      { key: 'humanlayer', name: 'Humanlayer' },
      { key: 'matt-pocock', name: 'Matt Pocock' },
    ];

    /** A skill keeps its existing series; suggestions never replace one. */
    function hasSeries(skill) {
      return String(skill.manualSeries || skill.series || '').trim() !== '';
    }

    function suggestionModuleFor(skill) {
      if (skill.authorSource === 'metadata.author') return 'huashu';
      if (skill.authorSource === 'metadata.credits.author') return 'humanlayer';
      return 'matt-pocock';
    }

    /**
     * Build the review proposal from every unassigned skill in the deck.
     * Assigned skills are excluded up front, so applying the result cannot
     * overwrite a manual series. Empty modules are not shown.
     * @param {Array<object>} skills
     * @returns {Array<{key: string, defaultName: string, skills: Array<object>}>}
     */
    function proposeSeries(skills) {
      const groups = new Map(
        SUGGEST_MODULES.map((module) => [
          module.key,
          { key: module.key, defaultName: module.name, skills: [] },
        ]),
      );
      for (const skill of skills) {
        if (hasSeries(skill)) continue;
        groups.get(suggestionModuleFor(skill)).skills.push(skill);
      }
      return [...groups.values()]
        .filter((group) => group.skills.length > 0)
        .map((group) => ({ ...group, skills: [...group.skills].sort(bySkillName) }));
    }

    /**
     * Every tile has the same area; bundle bytes are not an area metric here.
     * Status is derived from the skill, with invalid winning over disabled so
     * a broken skill never merely looks switched off.
     */
    const MAP_STATUS_ORDER = ['invalid', 'disabled', 'enabled'];
    const MAP_STATUS_LABEL = { invalid: 'invalid', disabled: 'disabled', enabled: 'enabled' };
    const MAP_STATUS_TINT = {
      invalid: 'rgba(220, 38, 38, .14)',
      disabled: 'rgba(127, 127, 127, .16)',
      enabled: 'rgba(34, 197, 94, .14)',
    };
    const MAP_STATUS_SOLID = {
      invalid: '#dc2626',
      disabled: '#6b7280',
      enabled: '#16a34a',
    };

    function mapStatus(skill) {
      if (!skill.valid) return 'invalid';
      if (!skill.modelInvocable && !skill.userInvocable) return 'disabled';
      return 'enabled';
    }

    /** One line per module, listing only the statuses present in that series. */
    function moduleStatusSummary(skills) {
      const counts = { invalid: 0, disabled: 0, enabled: 0 };
      for (const skill of skills) counts[mapStatus(skill)] += 1;
      return MAP_STATUS_ORDER.filter((status) => counts[status] > 0)
        .map((status) => counts[status] + ' ' + t(MAP_STATUS_LABEL[status]))
        .join(' · ');
    }

    function bySkillName(a, b) {
      return String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' });
    }

    /** Read the dragged skill name back; state is only a last-resort fallback. */
    function readDraggedName(event) {
      const transfer = event.dataTransfer;
      if (!transfer || typeof transfer.getData !== 'function') return '';
      for (const type of ['application/x-dsh-skill', 'text/plain']) {
        try {
          const value = String(transfer.getData(type) || '').trim();
          if (value) return value;
        } catch {
          /* a browser may restrict this type; try the next one */
        }
      }
      return '';
    }

    /** The label follows the pointer and names the series it will land in. */
    function dropLabelFor(target) {
      if (!target) return '';
      if (target.kind === 'new') return t('dropToNewSeries');
      if (target.kind === 'unassigned') return t('dropToUnassigned');
      return t('dropToSeries') + ' · ' + target.label;
    }

    const MAP_COMPACT_QUERY = '(max-width: 640px), (pointer: coarse), (any-pointer: coarse)';

    function hasTouchPointer() {
      return typeof navigator !== 'undefined' && Number(navigator.maxTouchPoints) > 0;
    }

    /**
     * The map swaps its hover overlay for a details strip on narrow screens
     * and touch pointers. matchMedia drives the switch so a resized window
     * also updates the interaction model.
     */
    function useCompactMap() {
      const query = useMemo(() => {
        if (typeof window.matchMedia !== 'function') return null;
        try {
          return window.matchMedia(MAP_COMPACT_QUERY);
        } catch {
          return null;
        }
      }, []);
      const [compact, setCompact] = useState(() => {
        if (hasTouchPointer()) return true;
        if (query) return Boolean(query.matches);
        return (window.innerWidth || 0) <= 640;
      });
      useEffect(() => {
        if (!query) return undefined;
        const onChange = (event) => setCompact(Boolean(event.matches));
        if (typeof query.addEventListener === 'function') query.addEventListener('change', onChange);
        else if (typeof query.addListener === 'function') query.addListener(onChange);
        return () => {
          if (typeof query.removeEventListener === 'function') query.removeEventListener('change', onChange);
          else if (typeof query.removeListener === 'function') query.removeListener(onChange);
        };
      }, [query]);
      return compact;
    }

    function rootLabelFor(skill, rootLabels) {
      if (!skill.root) return t('unknownRoot');
      return (rootLabels && rootLabels.get(skill.root)) || skill.root;
    }

    /**
     * Map tiles always show both invocation surfaces so the mute state is
     * visible without hovering; the invalid marker joins them when needed.
     */
    function MapBadges(props) {
      const { skill } = props;
      return h(
        React.Fragment,
        null,
        h(Badge, { key: 'model', muted: !skill.modelInvocable }, t('modelSurface')),
        h(Badge, { key: 'user', muted: !skill.userInvocable }, t('userSurface')),
        skill.valid ? null : h(Badge, { key: 'invalid', warn: true }, t('invalid')),
      );
    }

    function mapDetailRows(skill, rootLabels) {
      return [
        skill.files + ' ' + t('files') + ' · ' + formatBytes(skill.bytes),
        rootLabelFor(skill, rootLabels),
        t('categoryLabel') + ' · ' + displayCategory(skill.category),
        t('authorLabel') + ' · ' + displayAuthor(skill.author),
        t('seriesLabel') + ' · ' + displaySeries(skill.series),
      ];
    }

    /**
     * Equal-area status board. Tiles sit in a responsive CSS grid per group.
     * The desktop overlay is positioned from measured viewport space; the
     * compact layout replaces it with a sticky details strip.
     */
    function SkillMap(props) {
      const {
        groups,
        busy,
        onEdit,
        rootLabels,
        onRenameSeries,
        onMove,
        onAnnotate,
        seriesSuggestions,
        onSuggest,
      } = props;
      const compact = useCompactMap();
      const [hovered, setHovered] = useState(null);
      const [focused, setFocused] = useState(null);
      const [selected, setSelected] = useState(null);
      const [placement, setPlacement] = useState(null);
      const [drag, setDrag] = useState(null);
      const [target, setTarget] = useState(null);
      const [newSeries, setNewSeries] = useState(null);
      const tileRefs = useRef(new Map());
      const popoverRef = useRef(null);
      const boardRef = useRef(null);
      const dragRef = useRef(null);

      const skills = useMemo(() => groups.flatMap((group) => group.skills), [groups]);
      const byName = useMemo(() => new Map(skills.map((skill) => [skill.name, skill])), [skills]);
      // The unassigned bucket is a permanent drop target, so it renders last
      // even when no visible skill belongs to it.
      const modules = useMemo(() => {
        const list = groups.slice();
        if (!list.some((group) => group.fallback)) {
          list.push({
            key: '\u0000fallback',
            label: t('unassigned'),
            fallback: true,
            count: 0,
            skills: [],
          });
        }
        return list;
      }, [groups]);
      const activeName = compact ? null : (hovered ?? focused);
      const activeSkill = activeName ? byName.get(activeName) ?? null : null;
      const selectedSkill = compact && selected ? byName.get(selected) ?? null : null;

      const statusCounts = useMemo(() => {
        const next = { invalid: 0, disabled: 0, enabled: 0 };
        for (const skill of skills) next[mapStatus(skill)] += 1;
        return next;
      }, [skills]);

      // Measure after commit, so the fixed overlay flips above the tile and
      // clamps inside the viewport instead of guessing from the grid.
      useLayoutEffect(() => {
        if (!activeSkill) {
          setPlacement(null);
          return;
        }
        const tile = tileRefs.current.get(activeSkill.name);
        const popover = popoverRef.current;
        if (!tile || !popover) return;
        const anchor = tile.getBoundingClientRect();
        const size = popover.getBoundingClientRect();
        const width = size.width || 260;
        const height = size.height || 140;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1024;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 768;
        const margin = 8;
        const gap = 8;
        const maxLeft = Math.max(margin, viewportWidth - width - margin);
        const left = Math.min(Math.max(margin, anchor.left), maxLeft);
        const belowTop = anchor.bottom + gap;
        const aboveTop = anchor.top - height - gap;
        const fitsBelow = belowTop + height <= viewportHeight - margin;
        const fitsAbove = aboveTop >= margin;
        const side = !fitsBelow && fitsAbove ? 'above' : 'below';
        const top =
          side === 'above'
            ? aboveTop
            : Math.min(belowTop, Math.max(margin, viewportHeight - height - margin));
        setPlacement({ side, left, top });
      }, [activeSkill]);

      const tileRef = (name) => (node) => {
        if (node) tileRefs.current.set(name, node);
        else tileRefs.current.delete(name);
      };

      const chooseTile = (skill) => {
        if (!compact) {
          onEdit(skill);
          return;
        }
        if (selected === skill.name) onEdit(skill);
        else setSelected(skill.name);
      };

      // Drag state lives in a ref too, so a drop can read the source even when
      // React has not committed the dragstart render yet.
      const endDrag = () => {
        dragRef.current = null;
        setDrag(null);
        setTarget(null);
      };

      const beginDrag = (event, skill) => {
        const transfer = event.dataTransfer;
        if (transfer) {
          transfer.effectAllowed = 'move';
          try {
            transfer.setData('application/x-dsh-skill', skill.name);
            transfer.setData('text/plain', skill.name);
          } catch {
            /* a browser may refuse; the ref still carries the source */
          }
        }
        const next = { name: skill.name, fromSeries: skill.manualSeries ?? skill.series ?? '' };
        dragRef.current = next;
        setDrag(next);
      };

      const targetForModule = (group) => ({
        kind: group.fallback ? 'unassigned' : 'series',
        key: group.key,
        label: group.label,
        series: group.fallback ? '' : group.label,
      });

      const hoverTarget = (event, next) => {
        if (!dragRef.current) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        setTarget((current) =>
          current && current.kind === next.kind && current.key === next.key ? current : next,
        );
      };

      const leaveTarget = (event, key) => {
        if (!dragRef.current) return;
        const to = event.relatedTarget;
        if (to && event.currentTarget.contains(to)) return;
        setTarget((current) => (current && current.key === key ? null : current));
      };

      /** A drop always assigns a series; it never changes tile order. */
      const handleDrop = (event, next) => {
        if (!dragRef.current) return;
        event.preventDefault();
        const active = dragRef.current;
        const name = readDraggedName(event) || active.name;
        const skill = byName.get(name) ?? null;
        endDrag();
        if (!skill) return;
        if (next.kind === 'new') {
          setNewSeries({ skill, value: '' });
          return;
        }
        onMove(skill, next.series);
      };

      // Repeated dragover events near an edge turn into continuous scrolling.
      const handleBoardDragOver = (event) => {
        if (!dragRef.current) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        const board = boardRef.current;
        if (!board) return;
        const box = board.getBoundingClientRect();
        if (!box || !(box.height > 0)) return;
        const margin = 56;
        const step = 24;
        let delta = 0;
        if (event.clientY > box.bottom - margin) delta = step;
        else if (event.clientY < box.top + margin) delta = -step;
        if (!delta) return;
        const page = typeof board.closest === 'function' ? board.closest('.deck-page') : null;
        if (page) {
          if (typeof page.scrollBy === 'function') page.scrollBy(0, delta);
          else page.scrollTop += delta;
        } else if (typeof window.scrollBy === 'function') {
          window.scrollBy(0, delta);
        }
      };

      const submitNewSeries = () => {
        if (!newSeries) return;
        const value = newSeries.value.trim();
        if (!value) return;
        // Typing an existing name in another case selects that series rather
        // than creating a near-duplicate spelling.
        const existing = (seriesSuggestions || []).find(
          (option) => option.toLowerCase() === value.toLowerCase(),
        );
        const skill = newSeries.skill;
        setNewSeries(null);
        onMove(skill, existing ?? value);
      };

      const renderTile = (skill) => {
        const status = mapStatus(skill);
        const size = formatBytes(skill.bytes);
        const label = skill.name + ' · ' + t(MAP_STATUS_LABEL[status]) + ' · ' + size;
        return h(
          'button',
          {
            key: skill.name,
            type: 'button',
            className: 'deck-map-tile status-' + status,
            'data-skill': skill.name,
            'data-status': status,
            draggable: true,
            title: skill.name,
            'aria-label': label,
            'aria-pressed': compact ? (selected === skill.name ? 'true' : 'false') : undefined,
            disabled: busy === skill.name + ':read',
            ref: tileRef(skill.name),
            style: { backgroundColor: MAP_STATUS_TINT[status] },
            onDragStart: (event) => beginDrag(event, skill),
            onDragEnd: endDrag,
            onMouseEnter: () => setHovered(skill.name),
            onMouseLeave: () => setHovered((current) => (current === skill.name ? null : current)),
            onFocus: () => setFocused(skill.name),
            onBlur: () => setFocused((current) => (current === skill.name ? null : current)),
            onClick: () => chooseTile(skill),
          },
          h('span', { className: 'deck-map-tile-name', title: skill.name }, skill.name),
          h('span', { className: 'deck-map-tile-badges' }, h(MapBadges, { skill })),
          h(
            'span',
            { className: 'deck-map-tile-foot' },
            h('span', {
              className: 'deck-status-dot',
              'data-status': status,
              style: { backgroundColor: MAP_STATUS_SOLID[status] },
              'aria-hidden': 'true',
            }),
            h('span', { className: 'deck-map-size' }, size),
          ),
        );
      };

      const detailRows = activeSkill ? mapDetailRows(activeSkill, rootLabels) : [];
      const selectedRows = selectedSkill ? mapDetailRows(selectedSkill, rootLabels) : [];

      const popover =
        !compact && activeSkill
          ? h(
              'div',
              {
                className: 'deck-map-popover',
                role: 'tooltip',
                'data-skill': activeSkill.name,
                'data-placement': placement ? placement.side : 'below',
                ref: popoverRef,
                style: placement
                  ? { left: placement.left + 'px', top: placement.top + 'px' }
                  : { left: '0px', top: '0px', visibility: 'hidden' },
              },
              h('div', { className: 'deck-map-popover-name' }, activeSkill.name),
              h(
                'div',
                { className: 'deck-map-popover-desc' },
                activeSkill.description || t('invalid'),
              ),
              h(
                'div',
                { className: 'deck-map-popover-meta' },
                detailRows.map((row, index) => h('span', { key: index }, row)),
              ),
            )
          : null;

      const strip = compact
        ? h(
            'div',
            { className: 'deck-map-strip', role: 'region', 'aria-label': t('mapDetails') },
            selectedSkill
              ? [
                  h(
                    'div',
                    { key: 'info', className: 'deck-map-strip-info' },
                    h('span', { className: 'deck-map-strip-name' }, selectedSkill.name),
                    h(
                      'span',
                      { className: 'deck-map-strip-desc' },
                      selectedSkill.description || t('invalid'),
                    ),
                    h('span', { className: 'deck-map-strip-meta' }, selectedRows.join(' · ')),
                  ),
                  h(
                    'button',
                    {
                      key: 'move',
                      className: 'deck-btn',
                      onClick: () => onAnnotate && onAnnotate(selectedSkill),
                    },
                    t('moveToSeries'),
                  ),
                  h(
                    'button',
                    {
                      key: 'edit',
                      className: 'deck-btn primary',
                      onClick: () => onEdit(selectedSkill),
                    },
                    t('edit'),
                  ),
                ]
              : h('span', { className: 'deck-map-strip-meta' }, t('mapPick')),
          )
        : null;

      return h(
        'div',
        {
          className: 'deck-map' + (drag ? ' is-dragging' : ''),
          role: 'group',
          'aria-label': t('mapLabel'),
          ref: boardRef,
          onDragOver: handleBoardDragOver,
        },
        h(
          'div',
          { className: 'deck-map-tools' },
          h(
            'button',
            {
              type: 'button',
              className: 'deck-btn deck-map-suggest',
              onClick: () => onSuggest && onSuggest(),
            },
            t('suggestSeries'),
          ),
        ),
        modules.map((group) => {
          const empty = group.count === 0;
          const moduleTarget = targetForModule(group);
          const isTarget = Boolean(target) && target.key === group.key;
          // While a drag is live every other module recedes, so the target is
          // unmistakable even when the pointer is between tiles.
          const dimmed = Boolean(drag) && !isTarget;
          return h(
            'section',
            {
              key: group.key,
              className:
                'deck-map-module' +
                (group.fallback ? ' unassigned' : '') +
                (empty ? ' is-empty' : '') +
                (isTarget ? ' is-drop-target' : '') +
                (dimmed ? ' is-dimmed' : ''),
              'data-series': group.key,
              'data-unassigned': group.fallback ? 'true' : 'false',
              'data-drop-target': isTarget ? 'true' : undefined,
              onDragOver: (event) => hoverTarget(event, moduleTarget),
              onDragLeave: (event) => leaveTarget(event, group.key),
              onDrop: (event) => handleDrop(event, moduleTarget),
            },
            h(
              'div',
              { className: 'deck-map-module-head' },
              h('h4', { className: 'deck-map-module-title' }, group.label),
              h('span', { className: 'deck-map-module-count' }, String(group.count)),
              empty
                ? null
                : h(
                    'span',
                    { className: 'deck-map-module-status' },
                    moduleStatusSummary(group.skills),
                  ),
              group.fallback
                ? null
                : h(
                    'button',
                    {
                      type: 'button',
                      className: 'deck-btn deck-map-rename',
                      onClick: () => onRenameSeries && onRenameSeries(group),
                    },
                    t('renameSeries'),
                  ),
            ),
            isTarget
              ? h(
                  'div',
                  { className: 'deck-map-drop-label', 'data-drop-label': 'true' },
                  dropLabelFor(target),
                )
              : null,
            empty
              ? h('div', { className: 'deck-map-dropzone' }, t('unassignedHint'))
              : h(
                  'div',
                  { className: 'deck-map-grid' },
                  [...group.skills].sort(bySkillName).map(renderTile),
                ),
          );
        }),
        h(
          'div',
          {
            className: 'deck-map-newseries' + (target && target.kind === 'new' ? ' is-drop-target' : ''),
            'data-new-series': 'true',
            'data-drop-target': target && target.kind === 'new' ? 'true' : undefined,
            onDragOver: (event) =>
              hoverTarget(event, { kind: 'new', key: '\u0000new', label: t('newSeriesZone') }),
            onDragLeave: (event) => leaveTarget(event, '\u0000new'),
            onDrop: (event) =>
              handleDrop(event, { kind: 'new', key: '\u0000new', label: t('newSeriesZone') }),
          },
          h(
            'span',
            target && target.kind === 'new' ? { 'data-drop-label': 'true' } : null,
            target && target.kind === 'new' ? t('dropToNewSeries') : t('newSeriesZone'),
          ),
        ),
        h(
          'div',
          { className: 'deck-map-legend', role: 'list', 'aria-label': t('mapStatusLegend') },
          MAP_STATUS_ORDER.map((status) =>
            h(
              'div',
              {
                key: status,
                className: 'deck-legend-item',
                role: 'listitem',
                'data-status': status,
              },
              h('span', {
                className: 'deck-legend-swatch',
                'data-status': status,
                style: { backgroundColor: MAP_STATUS_SOLID[status] },
              }),
              h('span', { className: 'deck-legend-label' }, t(MAP_STATUS_LABEL[status])),
              h('span', { className: 'deck-legend-count' }, String(statusCounts[status])),
            ),
          ),
        ),
        popover,
        strip,
        newSeries
          ? h(NewSeriesDialog, {
              skill: newSeries.skill,
              value: newSeries.value,
              suggestions: seriesSuggestions,
              onChange: (value) => setNewSeries((current) => (current ? { ...current, value } : current)),
              onSubmit: submitNewSeries,
              onClose: () => setNewSeries(null),
            })
          : null,
      );
    }

    function Badge(props) {
      return h('span', { className: 'deck-badge' + (props.muted ? ' muted' : '') + (props.warn ? ' warn' : '') }, props.children);
    }

    /**
     * The sidebar entry: the host owns the button, label, tooltip and active
     * state, and renders this glyph with `{ size, active }`.
     */
    function DeckIcon(props) {
      const size = typeof props.size === 'number' ? props.size : 18;
      return h(
        'svg',
        {
          className: 'deck-icon' + (props.active ? ' active' : ''),
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        h('rect', { x: 3.5, y: 4.5, width: 17, height: 4.2, rx: 1.4 }),
        h('rect', { x: 3.5, y: 10.4, width: 17, height: 4.2, rx: 1.4, opacity: 0.85 }),
        h('rect', { x: 3.5, y: 16.3, width: 11, height: 4.2, rx: 1.4, opacity: 0.7 }),
      );
    }

    function SurfaceSwitch(props) {
      const { on, label, title, disabled, onClick } = props;
      return h(
        'button',
        {
          type: 'button',
          className: 'deck-switch' + (on ? ' on' : ''),
          disabled,
          title,
          'aria-pressed': on ? 'true' : 'false',
          onClick,
        },
        h('span', { className: 'dot' }),
        label,
      );
    }

    function Modal(props) {
      useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') props.onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [props.onClose]);
      return h(
        'div',
        {
          className: 'deck-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) props.onClose();
          },
        },
        h(
          'div',
          { className: 'deck-modal', role: 'dialog', 'aria-modal': 'true' },
          h(
            'div',
            { className: 'deck-modal-head' },
            h('div', { className: 'deck-modal-title' }, props.title),
            h('button', { className: 'deck-btn', onClick: props.onClose }, t('close')),
          ),
          props.children,
        ),
      );
    }

    function SkillBadges(props) {
      const { skill } = props;
      return h(
        React.Fragment,
        null,
        skill.modelInvocable ? h(Badge, { key: 'model' }, t('modelSurface')) : null,
        skill.userInvocable ? h(Badge, { key: 'user', muted: true }, t('userSurface')) : null,
        skill.valid ? null : h(Badge, { key: 'invalid', warn: true }, t('invalid')),
      );
    }

    function SurfaceToggles(props) {
      const { skill, busy, onToggle } = props;
      return h(
        'div',
        { className: 'deck-switches' },
        h(SurfaceSwitch, {
          on: skill.modelInvocable,
          label: t('modelSurface'),
          title: t('modelHint'),
          disabled: busy === skill.name + ':model',
          onClick: () => onToggle(skill, 'model', !skill.modelInvocable),
        }),
        h(SurfaceSwitch, {
          on: skill.userInvocable,
          label: t('userSurface'),
          title: t('userHint'),
          disabled: busy === skill.name + ':user',
          onClick: () => onToggle(skill, 'user', !skill.userInvocable),
        }),
      );
    }

    function SkillActions(props) {
      const { skill, busy, className, onEdit, onAnnotate, onReveal, onDuplicate, onRemove } = props;
      return h(
        'div',
        { className },
        h(
          'button',
          {
            className: 'deck-btn',
            disabled: busy === skill.name + ':read',
            onClick: () => onEdit(skill),
          },
          t('edit'),
        ),
        h('button', { className: 'deck-btn', onClick: () => onAnnotate && onAnnotate(skill) }, t('tag')),
        h('button', { className: 'deck-btn', onClick: () => onReveal(skill) }, t('reveal')),
        h('button', { className: 'deck-btn', onClick: () => onDuplicate(skill) }, t('duplicate')),
        h('button', { className: 'deck-btn danger', onClick: () => onRemove(skill) }, t('remove')),
      );
    }

    function SkillRow(props) {
      const { skill, busy, onToggle, onEdit, onReveal, onDuplicate, onRemove, onAnnotate } = props;
      return h(
        'li',
        { className: 'deck-row' },
        h(
          'div',
          null,
          h('div', { className: 'deck-name' }, skill.name, h(SkillBadges, { skill })),
          h('div', { className: 'deck-desc' }, skill.description || t('invalid')),
          h(
            'div',
            { className: 'deck-meta' },
            h('span', null, skill.root),
            h('span', { className: 'deck-tag' }, t('categoryLabel') + ' · ' + displayCategory(skill.category)),
            h('span', { className: 'deck-tag' }, t('authorLabel') + ' · ' + displayAuthor(skill.author)),
            h('span', null, skill.files + ' ' + t('files') + ' · ' + formatBytes(skill.bytes)),
            skill.updatedAt ? h('span', null, skill.updatedAt.slice(0, 10)) : null,
          ),
        ),
        h(SurfaceToggles, { skill, busy, onToggle }),
        h(SkillActions, {
          skill,
          busy,
          className: 'deck-actions',
          onEdit,
          onAnnotate,
          onReveal,
          onDuplicate,
          onRemove,
        }),
      );
    }

    function SkillCard(props) {
      const { skill, busy, onToggle, onEdit, onReveal, onDuplicate, onRemove, onAnnotate } = props;
      return h(
        'article',
        {
          className: 'deck-card',
          'data-skill': skill.name,
          tabIndex: 0,
          'aria-label': skill.name,
        },
        h('div', { className: 'deck-card-name' }, skill.name, h(SkillBadges, { skill })),
        h('div', { className: 'deck-card-desc' }, skill.description || t('invalid')),
        h(
          'div',
          { className: 'deck-card-meta' },
          h('span', null, skill.root),
          h('span', null, skill.files + ' ' + t('files') + ' · ' + formatBytes(skill.bytes)),
        ),
        h(
          'div',
          { className: 'deck-card-controls' },
          h(SurfaceToggles, { skill, busy, onToggle }),
          h(SkillActions, {
            skill,
            busy,
            className: 'deck-card-actions',
            onEdit,
            onAnnotate,
            onReveal,
            onDuplicate,
            onRemove,
          }),
        ),
      );
    }

    function GroupHead(props) {
      const { group } = props;
      return h(
        'h4',
        { className: 'deck-group-head' },
        h('span', { className: 'deck-group-title' }, group.label),
        h('span', { className: 'deck-group-count' }, String(group.count)),
      );
    }

    function SkillList(props) {
      const { skills, rowProps } = props;
      return h(
        'ul',
        { className: 'deck-list' },
        skills.map((skill) => h(SkillRow, rowProps(skill))),
      );
    }

    function SkillCardWall(props) {
      const { groups, cardProps } = props;
      return h(
        'div',
        { className: 'deck-cards' },
        groups.map((group) =>
          h(
            'section',
            { key: group.key, className: 'deck-group', 'data-group': group.key },
            h(GroupHead, { group }),
            h(
              'div',
              { className: 'deck-card-grid' },
              group.skills.map((skill) => h(SkillCard, cardProps(skill))),
            ),
          ),
        ),
      );
    }

    function DiagFooter(props) {
      const { version, platform, roots, client, onCopy, copied } = props;
      return h(
        'div',
        { className: 'deck-foot' },
        h('span', { className: 'deck-note' }, 'v' + version + (platform ? ' · ' + platform : '')),
        h(
          'span',
          { className: 'deck-note', title: client?.userAgent ?? '' },
          client && client.loadedAt ? t('clientLoaded') + ' ' + client.loadedAt.slice(11, 19) + 'Z' : t('clientMissing'),
        ),
        (roots ?? []).map((root) =>
          h(
            'span',
            { key: root.id, className: 'deck-note', title: root.path },
            root.label + ' · ' + root.count,
          ),
        ),
        h(
          'button',
          { className: 'deck-btn', onClick: onCopy, title: t('copyDiag') },
          copied ? t('copied') : t('copyDiag'),
        ),
      );
    }

    function DuplicateDialog(props) {
      const { source, name, busy, error, onName, onSubmit, onClose } = props;
      return h(
        Modal,
        { title: t('duplicateTitle') + ' · ' + source.name, onClose },
        h(
          'div',
          { className: 'deck-modal-body' },
          h(
            'label',
            { className: 'deck-field' },
            h('span', { className: 'deck-field-label' }, t('duplicateName')),
            h('input', {
              className: 'deck-input',
              value: name,
              spellCheck: false,
              'aria-label': t('duplicateName'),
              onChange: (event) => onName(event.target.value),
            }),
            h('span', { className: 'deck-note' }, t('duplicateHint')),
          ),
          error ? h('p', { className: 'deck-error' }, error) : null,
        ),
        h(
          'div',
          { className: 'deck-modal-foot' },
          h('span', { className: 'deck-note' }, source.path),
          h(
            'div',
            { style: { display: 'flex', gap: 8 } },
            h('button', { className: 'deck-btn', onClick: onClose }, t('cancel')),
            h(
              'button',
              { className: 'deck-btn primary', disabled: busy || name.trim() === '', onClick: onSubmit },
              busy ? t('duplicating') : t('duplicateAction'),
            ),
          ),
        ),
      );
    }

    function CreateDialog(props) {
      const { form, busy, error, onChange, onSubmit, onClose } = props;
      const ready = form.name.trim() !== '' && form.description.trim() !== '';
      const field = (label, control, hint) =>
        h(
          'label',
          { className: 'deck-field' },
          h('span', { className: 'deck-field-label' }, label),
          control,
          hint ? h('span', { className: 'deck-note' }, hint) : null,
        );
      return h(
        Modal,
        { title: t('createTitle'), onClose },
        h(
          'div',
          { className: 'deck-modal-body' },
          field(
            t('createName'),
            h('input', {
              className: 'deck-input',
              value: form.name,
              placeholder: 'my-new-skill',
              spellCheck: false,
              'aria-label': t('createName'),
              onChange: (event) => onChange('name', event.target.value),
            }),
            t('createNameHint'),
          ),
          field(
            t('createDescription'),
            h('input', {
              className: 'deck-input',
              value: form.description,
              'aria-label': t('createDescription'),
              onChange: (event) => onChange('description', event.target.value),
            }),
            t('createDescriptionHint'),
          ),
          field(
            t('createScope'),
            h(
              'select',
              {
                className: 'deck-select',
                value: form.scope,
                'aria-label': t('createScope'),
                onChange: (event) => onChange('scope', event.target.value),
              },
              h('option', { value: 'user-dsh' }, t('createScopeUser')),
              h('option', { value: 'user-agents' }, t('createScopeAgents')),
            ),
          ),
          error ? h('p', { className: 'deck-error', style: { marginTop: 10 } }, error) : null,
        ),
        h(
          'div',
          { className: 'deck-modal-foot' },
          h('span', { className: 'deck-note' }, t('createNameHint')),
          h(
            'div',
            { style: { display: 'flex', gap: 8 } },
            h('button', { className: 'deck-btn', onClick: onClose }, t('cancel')),
            h(
              'button',
              { className: 'deck-btn primary', disabled: busy || !ready, onClick: onSubmit },
              busy ? t('creating') : t('createAction'),
            ),
          ),
        ),
      );
    }

    function AnnotationDialog(props) {
      const {
        skill,
        form,
        suggestions,
        seriesSuggestions,
        busy,
        error,
        onChange,
        onSubmit,
        onClose,
      } = props;
      const listId = NS + '-category-suggestions';
      const seriesListId = NS + '-series-suggestions';
      // Only a skill without a manual author gets a fallback placeholder; once
      // the user has pinned one, the field carries that value instead.
      const authorFallback =
        !skill.manualAuthor && skill.author && skill.author !== UNKNOWN_AUTHOR ? skill.author : '';
      return h(
        Modal,
        { title: t('annotationTitle') + ' · ' + skill.name, onClose },
        h(
          'div',
          { className: 'deck-modal-body' },
          h(
            'label',
            { className: 'deck-field' },
            h('span', { className: 'deck-field-label' }, t('annotationCategory')),
            h('input', {
              className: 'deck-input',
              value: form.category,
              list: listId,
              spellCheck: false,
              'aria-label': t('annotationCategory'),
              onChange: (event) => onChange('category', event.target.value),
            }),
            h(
              'datalist',
              { id: listId },
              suggestions.map((value) => h('option', { key: value, value })),
            ),
            h('span', { className: 'deck-note' }, t('annotationCategoryHint')),
          ),
          h(
            'label',
            { className: 'deck-field' },
            h('span', { className: 'deck-field-label' }, t('annotationAuthor')),
            h('input', {
              className: 'deck-input',
              value: form.author,
              placeholder: authorFallback || undefined,
              spellCheck: false,
              'aria-label': t('annotationAuthor'),
              onChange: (event) => onChange('author', event.target.value),
            }),
            h('span', { className: 'deck-note' }, t('annotationAuthorHint')),
          ),
          h(
            'label',
            { className: 'deck-field' },
            h('span', { className: 'deck-field-label' }, t('annotationSeries')),
            h('input', {
              className: 'deck-input',
              value: form.series,
              list: seriesListId,
              spellCheck: false,
              'aria-label': t('annotationSeries'),
              onChange: (event) => onChange('series', event.target.value),
            }),
            h(
              'datalist',
              { id: seriesListId },
              (seriesSuggestions || []).map((value) => h('option', { key: value, value })),
            ),
            h('span', { className: 'deck-note' }, t('annotationSeriesHint')),
          ),
          h('p', { className: 'deck-note' }, t('annotationHint')),
          error ? h('p', { className: 'deck-error' }, error) : null,
        ),
        h(
          'div',
          { className: 'deck-modal-foot' },
          h('span', { className: 'deck-note' }, skill.path),
          h(
            'div',
            { style: { display: 'flex', gap: 8 } },
            h('button', { className: 'deck-btn', onClick: onClose }, t('cancel')),
            h(
              'button',
              { className: 'deck-btn primary', disabled: busy, onClick: onSubmit },
              busy ? t('annotationSaving') : t('annotationAction'),
            ),
          ),
        ),
      );
    }

    function NewSeriesDialog(props) {
      const { skill, value, suggestions, onChange, onSubmit, onClose } = props;
      const listId = NS + '-new-series-suggestions';
      return h(
        Modal,
        { title: t('newSeriesTitle') + ' · ' + skill.name, onClose },
        h(
          'div',
          { className: 'deck-modal-body' },
          h(
            'label',
            { className: 'deck-field' },
            h('span', { className: 'deck-field-label' }, t('annotationSeries')),
            h('input', {
              className: 'deck-input',
              value,
              list: listId,
              spellCheck: false,
              autoFocus: true,
              'aria-label': t('annotationSeries'),
              onChange: (event) => onChange(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Enter' && value.trim() !== '') onSubmit();
              },
            }),
            h(
              'datalist',
              { id: listId },
              (suggestions || []).map((option) => h('option', { key: option, value: option })),
            ),
            h('span', { className: 'deck-note' }, t('newSeriesHint')),
          ),
        ),
        h(
          'div',
          { className: 'deck-modal-foot' },
          h('span', { className: 'deck-note' }, skill.path),
          h(
            'div',
            { style: { display: 'flex', gap: 8 } },
            h('button', { className: 'deck-btn', onClick: onClose }, t('cancel')),
            h(
              'button',
              { className: 'deck-btn primary', disabled: value.trim() === '', onClick: onSubmit },
              t('newSeriesAction'),
            ),
          ),
        ),
      );
    }

    function RenameSeriesDialog(props) {
      const { from, value, busy, error, onChange, onSubmit, onClose } = props;
      return h(
        Modal,
        { title: t('renameSeriesTitle') + ' · ' + from, onClose },
        h(
          'div',
          { className: 'deck-modal-body' },
          h(
            'label',
            { className: 'deck-field' },
            h('span', { className: 'deck-field-label' }, t('annotationSeries')),
            h('input', {
              className: 'deck-input',
              value,
              spellCheck: false,
              'aria-label': t('annotationSeries'),
              onChange: (event) => onChange(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Enter' && value.trim() !== '' && !busy) onSubmit();
              },
            }),
            h('span', { className: 'deck-note' }, t('renameSeriesHint')),
          ),
          error ? h('p', { className: 'deck-error' }, error) : null,
        ),
        h(
          'div',
          { className: 'deck-modal-foot' },
          h('span', { className: 'deck-note' }, from),
          h(
            'div',
            { style: { display: 'flex', gap: 8 } },
            h('button', { className: 'deck-btn', onClick: onClose }, t('cancel')),
            h(
              'button',
              {
                className: 'deck-btn primary',
                disabled: busy || value.trim() === '',
                onClick: onSubmit,
              },
              busy ? t('renaming') : t('renameSeriesAction'),
            ),
          ),
        ),
      );
    }

    /**
     * Review dialog for inferred series. Every module name is editable and
     * every skill carries its own checkbox, so the proposal is only ever a
     * starting point. The caller owns the proposal and the write.
     */
    function SeriesSuggestDialog(props) {
      const { groups, names, checked, busy, error, onNameChange, onToggleSkill, onSubmit, onClose } =
        props;
      const ready = groups.some(
        (group) =>
          String(names[group.key] ?? '').trim() !== '' &&
          group.skills.some((skill) => checked[skill.name]),
      );
      return h(
        Modal,
        { title: t('suggestTitle'), onClose },
        h(
          'div',
          { className: 'deck-modal-body' },
          h(
            'p',
            { className: 'deck-note', 'data-inferred': 'true' },
            h('span', { className: 'deck-badge muted' }, t('suggestInferred')),
            ' ' + t('suggestInferredHint'),
          ),
          groups.length === 0 ? h('p', { className: 'deck-empty' }, t('suggestNone')) : null,
          groups.map((group) =>
            h(
              'section',
              { key: group.key, className: 'deck-suggest-group', 'data-module': group.key },
              h(
                'label',
                { className: 'deck-field' },
                h('span', { className: 'deck-field-label' }, t('suggestSeriesName')),
                h('input', {
                  className: 'deck-input deck-suggest-name',
                  value: names[group.key] ?? '',
                  spellCheck: false,
                  'aria-label': t('suggestSeriesName') + ' · ' + group.defaultName,
                  onChange: (event) => onNameChange(group.key, event.target.value),
                }),
              ),
              h(
                'div',
                { className: 'deck-suggest-skills' },
                group.skills.map((skill) =>
                  h(
                    'label',
                    { key: skill.name, className: 'deck-suggest-row', 'data-skill': skill.name },
                    h('input', {
                      type: 'checkbox',
                      checked: Boolean(checked[skill.name]),
                      onChange: (event) => onToggleSkill(skill.name, event.target.checked),
                    }),
                    h('span', { className: 'deck-suggest-skill-name' }, skill.name),
                    skill.authorSource
                      ? h('span', { className: 'deck-suggest-evidence' }, skill.author)
                      : null,
                  ),
                ),
              ),
            ),
          ),
          error ? h('p', { className: 'deck-error' }, error) : null,
        ),
        h(
          'div',
          { className: 'deck-modal-foot' },
          h('span'),
          h(
            'div',
            { style: { display: 'flex', gap: 8 } },
            h('button', { className: 'deck-btn', onClick: onClose }, t('cancel')),
            h(
              'button',
              { className: 'deck-btn primary', disabled: busy || !ready, onClick: onSubmit },
              busy ? t('suggestApplying') : t('suggestApply'),
            ),
          ),
        ),
      );
    }

    /**
     * The center-column page. It reuses Panel and owns the page's scroll area;
     * the frame reserves its top strip through --dsh-frame-top-clearance.
     */
    function DeckPage() {
      return h('div', { className: 'deck-page' }, h(Panel));
    }

    function Panel() {
      const [state, setState] = useState({ status: 'loading', error: null, skills: [], roots: [], totals: null, version: '', platform: '', client: null });
      const [query, setQuery] = useState('');
      const [filter, setFilter] = useState('all');
      const [view, setView] = useState(() => readPreference(VIEW_KEY, VIEWS, 'list'));
      const [groupBy, setGroupBy] = useState(() => readPreference(GROUP_KEY, GROUPINGS, 'category'));
      const [busy, setBusy] = useState('');
      const [editor, setEditor] = useState(null);
      const [draft, setDraft] = useState('');
      const [saving, setSaving] = useState(false);
      const [conflict, setConflict] = useState(false);
      const [confirming, setConfirming] = useState(null);
      const [confirmText, setConfirmText] = useState('');
      const [toast, setToast] = useState(null);
      const [creating, setCreating] = useState(false);
      const [createForm, setCreateForm] = useState({ name: '', description: '', scope: 'user-dsh' });
      const [createError, setCreateError] = useState('');
      const [createBusy, setCreateBusy] = useState(false);
      const [duplicating, setDuplicating] = useState(null);
      const [dupName, setDupName] = useState('');
      const [dupError, setDupError] = useState('');
      const [dupBusy, setDupBusy] = useState(false);
      const [annotating, setAnnotating] = useState(null);
      const [annotationForm, setAnnotationForm] = useState({ category: '', author: '', series: '' });
      const [annotationError, setAnnotationError] = useState('');
      const [annotationBusy, setAnnotationBusy] = useState(false);
      const [renaming, setRenaming] = useState(null);
      const [renameValue, setRenameValue] = useState('');
      const [renameError, setRenameError] = useState('');
      const [renameBusy, setRenameBusy] = useState(false);
      const [suggestion, setSuggestion] = useState(null);
      const [suggestNames, setSuggestNames] = useState({});
      const [suggestChecked, setSuggestChecked] = useState({});
      const [suggestError, setSuggestError] = useState('');
      const [suggestBusy, setSuggestBusy] = useState(false);
      const [copied, setCopied] = useState(false);
      const toastTimer = useRef(null);

      const notify = useCallback((message, kind, action) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ message, kind: kind || 'ok', action: action ?? null });
        // An actionable toast has to stay long enough to click; plain messages
        // keep their existing short dwell time.
        toastTimer.current = setTimeout(() => setToast(null), action ? 8000 : 2600);
      }, []);

      const chooseView = useCallback((next) => {
        setView(next);
        writePreference(VIEW_KEY, next);
      }, []);

      const chooseGroupBy = useCallback((next) => {
        setGroupBy(next);
        writePreference(GROUP_KEY, next);
      }, []);

      const load = useCallback(async () => {
        setState((prev) => ({ ...prev, status: prev.skills.length ? prev.status : 'loading', error: null }));
        try {
          const payload = await api('/state');
          setState({
            status: 'ready',
            error: null,
            skills: payload.skills,
            roots: payload.roots,
            totals: payload.totals,
            version: payload.version ?? '',
            platform: payload.platform ?? '',
            client: payload.client ?? null,
          });
        } catch (error) {
          setState({ status: 'error', error: error.message, skills: [], roots: [], totals: null });
        }
      }, []);

      useEffect(() => {
        load();
      }, [load]);

      useEffect(() => {
        signal('rendered');
      }, []);

      useEffect(
        () => () => {
          if (toastTimer.current) clearTimeout(toastTimer.current);
        },
        [],
      );

      const replaceSkill = useCallback((skill) => {
        setState((prev) => ({
          ...prev,
          skills: prev.skills.map((item) => (item.name === skill.name ? skill : item)),
        }));
      }, []);

      // Series is manual-only, so both effective and manual values move together.
      const setSkillSeries = useCallback((name, series) => {
        setState((prev) => ({
          ...prev,
          skills: prev.skills.map((item) =>
            item.name === name ? { ...item, series, manualSeries: series } : item,
          ),
        }));
      }, []);

      const undoMove = useCallback(
        async (name, previousSeries) => {
          try {
            const payload = await api('/annotate', { name, series: previousSeries });
            if (payload.skill) replaceSkill(payload.skill);
            notify(t('undone'));
          } catch (error) {
            notify(error.message, 'error');
          }
        },
        [notify, replaceSkill],
      );

      /**
       * Optimistic drag move: the board moves first, the annotation write
       * follows, and only a failure puts the skill back. A successful move
       * leaves an undo toast that writes the previous series back.
       */
      const moveSkill = useCallback(
        async (skill, series) => {
          const previous = skill.manualSeries ?? skill.series ?? '';
          const next = String(series ?? '');
          if (previous.trim().toLowerCase() === next.trim().toLowerCase()) return;
          setSkillSeries(skill.name, next);
          try {
            const payload = await api('/annotate', { name: skill.name, series: next });
            if (payload.skill) replaceSkill(payload.skill);
            notify(
              next ? t('movedTo') + ' · ' + next : t('movedOut'),
              'ok',
              { label: t('undo'), onClick: () => undoMove(skill.name, previous) },
            );
          } catch (error) {
            setSkillSeries(skill.name, previous);
            notify(error.message || t('unknownError'), 'error');
          }
        },
        [notify, replaceSkill, setSkillSeries, undoMove],
      );

      const openDuplicate = useCallback((skill) => {
        setDuplicating(skill);
        setDupName(skill.name + '-copy');
        setDupError('');
      }, []);

      const submitDuplicate = useCallback(async () => {
        if (!duplicating) return;
        const newName = dupName.trim();
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(newName)) {
          setDupError(t('nameRequired'));
          return;
        }
        setDupBusy(true);
        try {
          await api('/duplicate', { name: duplicating.name, newName });
          setDuplicating(null);
          notify(t('duplicated'));
          await load();
        } catch (error) {
          setDupError(error.message);
        } finally {
          setDupBusy(false);
        }
      }, [dupName, duplicating, load, notify]);

      const openAnnotation = useCallback((skill) => {
        setAnnotating(skill);
        // Pre-fill what the user actually saved. The effective author may come
        // from frontmatter and must not be pinned into the annotation file by a
        // category-only edit.
        setAnnotationForm({
          category: skill.manualCategory ?? '',
          author: skill.manualAuthor ?? '',
          series: skill.manualSeries ?? '',
        });
        setAnnotationError('');
      }, []);

      const submitAnnotation = useCallback(async () => {
        if (!annotating) return;
        setAnnotationBusy(true);
        try {
          const payload = await api('/annotate', {
            name: annotating.name,
            category: annotationForm.category,
            author: annotationForm.author,
            series: annotationForm.series,
          });
          replaceSkill(payload.skill);
          setAnnotating(null);
          notify(t('annotated'));
        } catch (error) {
          setAnnotationError(error.message);
        } finally {
          setAnnotationBusy(false);
        }
      }, [annotating, annotationForm, notify, replaceSkill]);

      const openRenameSeries = useCallback((group) => {
        const first = [...group.skills].sort(bySkillName)[0];
        if (!first) return;
        setRenaming({ from: group.label, name: first.name, count: group.count });
        setRenameValue(group.label);
        setRenameError('');
      }, []);

      const openSuggestSeries = useCallback(() => {
        const groups = proposeSeries(state.skills);
        const names = {};
        const checked = {};
        for (const group of groups) {
          names[group.key] = group.defaultName;
          for (const skill of group.skills) checked[skill.name] = true;
        }
        setSuggestion({ groups });
        setSuggestNames(names);
        setSuggestChecked(checked);
        setSuggestError('');
      }, [state.skills]);

      const undoSeriesSuggestion = useCallback(
        async (applied) => {
          try {
            for (const assignment of applied) {
              const payload = await api('/annotate', {
                name: assignment.name,
                series: assignment.previousSeries,
              });
              replaceSkill(payload.skill);
            }
            notify(t('suggestUndone'));
          } catch (error) {
            notify(error.message, 'error');
            await load();
          }
        },
        [load, notify, replaceSkill],
      );

      const submitSuggestSeries = useCallback(async () => {
        if (!suggestion || suggestBusy) return;
        // Re-check every candidate at apply time: a skill that already carries
        // a manual series is skipped, so the write can never overwrite one.
        const assignments = [];
        for (const group of suggestion.groups) {
          const series = String(suggestNames[group.key] ?? '').trim();
          if (!series) continue;
          for (const skill of group.skills) {
            if (!suggestChecked[skill.name] || hasSeries(skill)) continue;
            assignments.push({
              name: skill.name,
              previousSeries: String(skill.manualSeries ?? ''),
              series,
            });
          }
        }
        if (assignments.length === 0) return;
        setSuggestBusy(true);
        const applied = [];
        try {
          for (const assignment of assignments) {
            const payload = await api('/annotate', {
              name: assignment.name,
              series: assignment.series,
            });
            replaceSkill(payload.skill);
            applied.push(assignment);
          }
          setSuggestion(null);
          notify(t('suggestApplied'), 'ok', {
            label: t('undo'),
            onClick: () => undoSeriesSuggestion(applied),
          });
        } catch (error) {
          setSuggestError(error.message);
          if (applied.length) await load();
        } finally {
          setSuggestBusy(false);
        }
      }, [
        load,
        notify,
        replaceSkill,
        suggestBusy,
        suggestChecked,
        suggestNames,
        suggestion,
        undoSeriesSuggestion,
      ]);

      const submitRenameSeries = useCallback(async () => {
        if (!renaming || renameBusy) return;
        const series = renameValue.trim();
        if (!series) return;
        setRenameBusy(true);
        try {
          await api('/annotate', {
            name: renaming.name,
            previousSeries: renaming.from,
            series,
          });
          setRenaming(null);
          notify(t('seriesRenamed'));
          await load();
        } catch (error) {
          setRenameError(error.message);
        } finally {
          setRenameBusy(false);
        }
      }, [load, notify, renameBusy, renameValue, renaming]);

      const toggle = useCallback(
        async (skill, surface, enabled) => {
          setBusy(skill.name + ':' + surface);
          try {
            const payload = await api('/toggle', { name: skill.name, surface, enabled });
            replaceSkill(payload.skill);
            notify(t('toggled'));
          } catch (error) {
            notify(error.message, 'error');
            load();
          } finally {
            setBusy('');
          }
        },
        [load, notify, replaceSkill],
      );

      const openEditor = useCallback(
        async (skill) => {
          setBusy(skill.name + ':read');
          try {
            const payload = await api('/read', { name: skill.name });
            setEditor({ name: skill.name, revision: payload.revision, path: skill.path, base: payload.content });
            setDraft(payload.content);
            setConflict(false);
          } catch (error) {
            notify(error.message, 'error');
          } finally {
            setBusy('');
          }
        },
        [notify],
      );

      const reloadEditor = useCallback(async () => {
        if (!editor) return;
        setBusy(editor.name + ':read');
        try {
          const payload = await api('/read', { name: editor.name });
          setEditor({ ...editor, revision: payload.revision, base: payload.content });
          setDraft(payload.content);
          setConflict(false);
        } catch (error) {
          notify(error.message, 'error');
        } finally {
          setBusy('');
        }
      }, [editor, notify]);

      const openCreate = useCallback(() => {
        setCreateForm({ name: '', description: '', scope: 'user-dsh' });
        setCreateError('');
        setCreating(true);
      }, []);

      const submitCreate = useCallback(async () => {
        const name = createForm.name.trim();
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || createForm.description.trim() === '') {
          setCreateError(t('nameRequired'));
          return;
        }
        setCreateBusy(true);
        try {
          const payload = await api('/create', {
            name,
            description: createForm.description.trim(),
            scope: createForm.scope,
          });
          setCreating(false);
          notify(t('created'));
          await load();
          openEditor({ name: payload.skill.name, path: payload.skill.path });
        } catch (error) {
          setCreateError(error.message);
        } finally {
          setCreateBusy(false);
        }
      }, [createForm, load, notify, openEditor]);

      const closeEditor = useCallback(() => {
        if (saving) return;
        const dirty = editor && draft !== editor.base;
        if (dirty && !window.confirm(t('dirty'))) return;
        setEditor(null);
        setDraft('');
        setConflict(false);
      }, [draft, editor, saving]);

      const saveEditor = useCallback(async () => {
        if (!editor) return;
        setSaving(true);
        try {
          const payload = await api('/save', { name: editor.name, content: draft, revision: editor.revision });
          replaceSkill(payload.skill);
          setEditor(null);
          setDraft('');
          notify(t('saved'));
        } catch (error) {
          if (error.status === 409) {
            setConflict(true);
            notify(t('conflict'), 'error');
          } else notify(error.message, 'error');
        } finally {
          setSaving(false);
        }
      }, [draft, editor, notify, replaceSkill]);

      const remove = useCallback(async () => {
        if (!confirming) return;
        setBusy(confirming.name + ':delete');
        try {
          await api('/delete', { name: confirming.name, confirm: confirmText });
          setState((prev) => ({
            ...prev,
            skills: prev.skills.filter((item) => item.name !== confirming.name),
            totals: prev.totals ? { ...prev.totals, skills: Math.max(0, prev.totals.skills - 1) } : prev.totals,
          }));
          setConfirming(null);
          setConfirmText('');
          notify(t('trashed'));
        } catch (error) {
          notify(error.message, 'error');
        } finally {
          setBusy('');
        }
      }, [confirmText, confirming, notify]);

      const reveal = useCallback(
        async (skill) => {
          try {
            await api('/reveal', { name: skill.name });
          } catch (error) {
            notify(error.message || t('revealFailed'), 'error');
          }
        },
        [notify],
      );

      const copyDiag = useCallback(async () => {
        const lines = ['dsh-skill-deck v' + (state.version || '?') + ' (' + (state.platform || '?') + ')'];
        for (const root of state.roots) {
          const count = state.skills.filter((skill) => skill.root === root.id).length;
          lines.push('root ' + root.id + ': ' + count + ' — ' + root.path);
        }
        lines.push('totals: ' + JSON.stringify(state.totals));
        lines.push('client: ' + JSON.stringify(state.client));
        try {
          await navigator.clipboard.writeText(lines.join('\n'));
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          notify(t('copyFailed'), 'error');
        }
      }, [notify, state]);

      const rootsWithCounts = useMemo(
        () =>
          state.roots.map((root) => ({
            ...root,
            count: state.skills.filter((skill) => skill.root === root.id).length,
          })),
        [state.roots, state.skills],
      );

      const counts = useMemo(() => {
        const enabled = state.skills.filter((skill) => skill.modelInvocable || skill.userInvocable).length;
        return {
          all: state.skills.length,
          enabled,
          disabled: state.skills.length - enabled,
          invalid: state.skills.filter((skill) => !skill.valid).length,
        };
      }, [state.skills]);

      const suggestionsFor = useCallback((read) => {
        const seen = new Map();
        for (const skill of state.skills) {
          const value = String(read(skill) || '').trim();
          if (!value) continue;
          const key = value.toLowerCase();
          if (!seen.has(key)) seen.set(key, value);
        }
        return [...seen.values()].sort((a, b) => a.localeCompare(b));
      }, [state.skills]);

      const categorySuggestions = useMemo(
        () => suggestionsFor((skill) => skill.manualCategory),
        [suggestionsFor],
      );
      const seriesSuggestions = useMemo(
        () => suggestionsFor((skill) => skill.manualSeries),
        [suggestionsFor],
      );

      const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return state.skills.filter((skill) => {
          if (filter === 'enabled' && (!skill.modelInvocable && !skill.userInvocable)) return false;
          if (filter === 'disabled' && (skill.modelInvocable || skill.userInvocable)) return false;
          if (filter === 'invalid' && skill.valid) return false;
          if (!needle) return true;
          return (
            skill.name.toLowerCase().includes(needle) ||
            (skill.description || '').toLowerCase().includes(needle)
          );
        });
      }, [filter, query, state.skills]);

      const rootLabels = useMemo(
        () => new Map(state.roots.map((root) => [root.id, root.label])),
        [state.roots],
      );

      const cardGroups = useMemo(
        () => groupSkills(visible, groupBy, rootLabels),
        [groupBy, rootLabels, visible],
      );
      // The Map always groups by series; the Cards group-by choice never
      // changes the board.
      const seriesGroups = useMemo(() => groupSkills(visible, 'series'), [visible]);

      const skillProps = (skill) => ({
        key: skill.name,
        skill,
        busy,
        onToggle: toggle,
        onEdit: openEditor,
        onReveal: reveal,
        onDuplicate: openDuplicate,
        onAnnotate: openAnnotation,
        onRemove: (target) => {
          setConfirming(target);
          setConfirmText('');
        },
      });

      const body =
        state.status === 'loading'
          ? h('div', { className: 'deck-empty' }, t('loading'))
          : state.status === 'error'
            ? h(
                'div',
                { className: 'deck-error' },
                h('div', null, t('loadFailed') + '：' + state.error),
                h(
                  'button',
                  { className: 'deck-btn', style: { marginTop: 10 }, onClick: load },
                  t('retry'),
                ),
              )
            : visible.length === 0
              ? h('div', { className: 'deck-empty' }, state.skills.length === 0 ? t('empty') : t('noMatch'))
              : view === 'map'
                ? h(SkillMap, {
                    groups: seriesGroups,
                    busy,
                    onEdit: openEditor,
                    rootLabels,
                    onRenameSeries: openRenameSeries,
                    onMove: moveSkill,
                    onAnnotate: openAnnotation,
                    seriesSuggestions,
                    onSuggest: openSuggestSeries,
                  })
                : view === 'cards'
                  ? h(SkillCardWall, { groups: cardGroups, cardProps: skillProps })
                  : h(SkillList, { skills: visible, rowProps: skillProps });

      return h(
        'div',
        { className: 'deck' },
        h(
          'div',
          { className: 'deck-head' },
          h(
            'div',
            null,
            h('h3', { className: 'deck-title' }, t('title'), state.totals ? h('span', { className: 'deck-badge muted', style: { marginLeft: 8 } }, state.totals.skills) : null),
            h(
              'p',
              { className: 'deck-sub' },
              t('subtitle'),
              state.status === 'ready' && (query.trim() !== '' || filter !== 'all')
                ? ' · ' + visible.length + ' / ' + state.skills.length
                : null,
            ),
          ),
          h(
            'div',
            { className: 'deck-tools' },
            h('input', {
              className: 'deck-input',
              type: 'search',
              value: query,
              placeholder: t('search'),
              'aria-label': t('search'),
              onChange: (event) => setQuery(event.target.value),
            }),
            h(
              'select',
              {
                className: 'deck-select deck-filter',
                value: filter,
                'aria-label': t('filterLabel'),
                onChange: (event) => setFilter(event.target.value),
              },
              h('option', { value: 'all' }, t('filterAll') + ' (' + counts.all + ')'),
              h('option', { value: 'enabled' }, t('filterEnabled') + ' (' + counts.enabled + ')'),
              h('option', { value: 'disabled' }, t('filterDisabled') + ' (' + counts.disabled + ')'),
              h('option', { value: 'invalid' }, t('filterInvalid') + ' (' + counts.invalid + ')'),
            ),
            h(
              'div',
              { className: 'deck-view', role: 'group', 'aria-label': t('viewLabel') },
              h(
                'button',
                {
                  type: 'button',
                  className: 'deck-btn',
                  'aria-pressed': view === 'list' ? 'true' : 'false',
                  onClick: () => chooseView('list'),
                },
                t('viewList'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'deck-btn',
                  'aria-pressed': view === 'cards' ? 'true' : 'false',
                  onClick: () => chooseView('cards'),
                },
                t('viewCards'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'deck-btn',
                  'aria-pressed': view === 'map' ? 'true' : 'false',
                  onClick: () => chooseView('map'),
                },
                t('viewMap'),
              ),
            ),
            view === 'map'
              ? null
              : h(
                  'select',
                  {
                    className: 'deck-select deck-groupby',
                    value: groupBy,
                    'aria-label': t('groupBy'),
                    onChange: (event) => chooseGroupBy(event.target.value),
                  },
                  GROUPINGS.map((id) =>
                    h('option', { key: id, value: id }, t(GROUP_AXES[id].labelKey)),
                  ),
                ),
            h('button', { className: 'deck-btn', onClick: openCreate }, t('create')),
            h(
              'button',
              { className: 'deck-btn', onClick: load, disabled: state.status === 'loading' },
              state.status === 'loading' ? t('refreshing') : t('refresh'),
            ),
          ),
        ),
        body,
        state.status === 'ready'
          ? h(DiagFooter, {
              version: state.version,
              platform: state.platform,
              roots: rootsWithCounts,
              client: state.client,
              onCopy: copyDiag,
              copied,
            })
          : null,
        editor
          ? h(
              Modal,
              { title: t('editTitle') + ' · ' + editor.name, onClose: closeEditor },
              h(
                'div',
                { className: 'deck-modal-body' },
                h('textarea', {
                  className: 'deck-editor',
                  value: draft,
                  spellCheck: false,
                  onChange: (event) => setDraft(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
                      event.preventDefault();
                      saveEditor();
                    }
                  },
                }),
                h('p', { className: 'deck-note' }, t('editHint')),
                conflict ? h('p', { className: 'deck-error', style: { marginTop: 10 } }, t('conflict')) : null,
              ),
              h(
                'div',
                { className: 'deck-modal-foot' },
                h('span', { className: 'deck-note' }, editor.path),
                h(
                  'div',
                  { style: { display: 'flex', gap: 8 } },
                  conflict
                    ? h('button', { className: 'deck-btn', onClick: reloadEditor }, t('reload'))
                    : null,
                  h('button', { className: 'deck-btn', onClick: closeEditor }, t('cancel')),
                  h(
                    'button',
                    { className: 'deck-btn primary', onClick: saveEditor, disabled: saving || conflict },
                    saving ? t('saving') : t('save'),
                  ),
                ),
              ),
            )
          : null,
        confirming
          ? h(
              Modal,
              { title: t('deleteTitle') + ' · ' + confirming.name, onClose: () => setConfirming(null) },
              h(
                'div',
                { className: 'deck-modal-body' },
                h('p', null, t('deleteBody')),
                h('code', null, confirming.dir || confirming.path),
                h('p', { className: 'deck-note' }, t('deleteConfirm')),
                h('input', {
                  className: 'deck-input',
                  style: { width: '100%', marginTop: 8 },
                  value: confirmText,
                  onChange: (event) => setConfirmText(event.target.value),
                }),
              ),
              h(
                'div',
                { className: 'deck-modal-foot' },
                h('span'),
                h(
                  'div',
                  { style: { display: 'flex', gap: 8 } },
                  h('button', { className: 'deck-btn', onClick: () => setConfirming(null) }, t('cancel')),
                  h(
                    'button',
                    {
                      className: 'deck-btn danger',
                      disabled: confirmText !== confirming.name || busy === confirming.name + ':delete',
                      onClick: remove,
                    },
                    t('deleteAction'),
                  ),
                ),
              ),
            )
          : null,
        annotating
          ? h(AnnotationDialog, {
              skill: annotating,
              form: annotationForm,
              suggestions: categorySuggestions,
              seriesSuggestions,
              busy: annotationBusy,
              error: annotationError,
              onChange: (field, value) => {
                setAnnotationForm((prev) => ({ ...prev, [field]: value }));
                if (annotationError) setAnnotationError('');
              },
              onSubmit: submitAnnotation,
              onClose: () => setAnnotating(null),
            })
          : null,
        suggestion
          ? h(SeriesSuggestDialog, {
              groups: suggestion.groups,
              names: suggestNames,
              checked: suggestChecked,
              busy: suggestBusy,
              error: suggestError,
              onNameChange: (key, value) => {
                setSuggestNames((prev) => ({ ...prev, [key]: value }));
                if (suggestError) setSuggestError('');
              },
              onToggleSkill: (name, value) => {
                setSuggestChecked((prev) => ({ ...prev, [name]: value }));
                if (suggestError) setSuggestError('');
              },
              onSubmit: submitSuggestSeries,
              onClose: () => setSuggestion(null),
            })
          : null,
        renaming
          ? h(RenameSeriesDialog, {
              from: renaming.from,
              value: renameValue,
              busy: renameBusy,
              error: renameError,
              onChange: (value) => {
                setRenameValue(value);
                if (renameError) setRenameError('');
              },
              onSubmit: submitRenameSeries,
              onClose: () => setRenaming(null),
            })
          : null,
        duplicating
          ? h(DuplicateDialog, {
              source: duplicating,
              name: dupName,
              busy: dupBusy,
              error: dupError,
              onName: (value) => {
                setDupName(value);
                if (dupError) setDupError('');
              },
              onSubmit: submitDuplicate,
              onClose: () => setDuplicating(null),
            })
          : null,
        creating
          ? h(CreateDialog, {
              form: createForm,
              busy: createBusy,
              error: createError,
              onChange: (field, value) => {
                setCreateForm((prev) => ({ ...prev, [field]: value }));
                if (createError) setCreateError('');
              },
              onSubmit: submitCreate,
              onClose: () => setCreating(false),
            })
          : null,
        toast
          ? h(
              'div',
              {
                className: 'deck-toast' + (toast.kind === 'error' ? ' error' : ''),
                role: 'status',
                'data-kind': toast.kind,
              },
              h('span', null, toast.message),
              toast.action
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'deck-btn deck-toast-action',
                      onClick: () => {
                        const action = toast.action;
                        if (toastTimer.current) clearTimeout(toastTimer.current);
                        setToast(null);
                        action.onClick();
                      },
                    },
                    toast.action.label,
                  )
                : null,
            )
          : null,
      );
    }

    function apply(ctx) {
      injectStyles();
      signal('loaded');
      ctx.effect(
        () => () => {
          const tag = document.querySelector('style[data-plugin-css="' + NS + '/panel.css"]');
          if (tag) tag.remove();
        },
        NS + ': styles',
      );
      ctx.slots.inject('settings.section', () =>
        ctx.slots.register(
          {
            name: 'settings.section',
            id: NS,
            order: 62,
            label: () => t('title'),
            inject: () => ({}),
          },
          () => h(Panel),
        ),
      );
      // Shipped panels use orders 0 (Plugins) and 10 (Automation tasks).
      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: NS,
            order: 20,
            label: () => t('title'),
          },
          DeckIcon,
        ),
      );
      ctx.slots.inject('main', () =>
        ctx.slots.register(
          {
            name: 'main',
            key: NS,
          },
          () => h(DeckPage),
        ),
      );
    }

    return {
      name: NS,
      inject: ['slots'],
      apply,
      components: {
        Panel,
        DeckPage,
        DeckIcon,
        SkillRow,
        SkillCard,
        CreateDialog,
        DuplicateDialog,
        AnnotationDialog,
        RenameSeriesDialog,
        NewSeriesDialog,
        SeriesSuggestDialog,
        DiagFooter,
      },
    };
  },
});

