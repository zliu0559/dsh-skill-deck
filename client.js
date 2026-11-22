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
    const { useCallback, useEffect, useMemo, useRef, useState } = React;

    const NS = 'dsh-skill-deck';
    const API = '/dsh-skill-deck';

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
      .deck-row { display: grid; grid-template-columns: minmax(0,1fr) auto auto; gap: 12px; align-items: center; padding: 12px 14px; border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.22)); border-radius: var(--dsw-radius-lg, 10px); }
      .deck-name { display: flex; align-items: center; gap: 8px; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; }
      .deck-desc { margin-top: 4px; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary, inherit); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .deck-meta { margin-top: 6px; font-size: 11px; color: var(--dsw-alias-label-caption, inherit); display: flex; gap: 10px; flex-wrap: wrap; }
      .deck-badge { display: inline-flex; align-items: center; height: 18px; padding: 0 7px; border-radius: 999px; font-size: 10px; font-weight: 600; letter-spacing: .2px; background: rgba(59,130,246,.14); color: var(--dsw-alias-state-business-primary, #3b82f6); }
      .deck-badge.muted { background: rgba(127,127,127,.16); color: var(--dsw-alias-label-tertiary, inherit); }
      .deck-badge.warn { background: rgba(220,38,38,.14); color: var(--dsw-alias-state-error-primary, #dc2626); }
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
      .deck-toast { position: fixed; right: 24px; bottom: 24px; z-index: 70; padding: 10px 14px; border-radius: var(--dsw-radius-md, 8px); background: #111827; color: #f9fafb; font-size: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.35); }
      .deck-toast.error { background: #7f1d1d; }
      @media (max-width: 720px) { .deck-row { grid-template-columns: 1fr; } }
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

    function Badge(props) {
      return h('span', { className: 'deck-badge' + (props.muted ? ' muted' : '') + (props.warn ? ' warn' : '') }, props.children);
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

    function SkillRow(props) {
      const { skill, busy, onToggle, onEdit, onReveal, onDuplicate, onRemove } = props;
      return h(
        'li',
        { className: 'deck-row' },
        h(
          'div',
          null,
          h(
            'div',
            { className: 'deck-name' },
            skill.name,
            skill.modelInvocable ? h(Badge, null, t('modelSurface')) : null,
            skill.userInvocable ? h(Badge, { muted: true }, t('userSurface')) : null,
            skill.valid ? null : h(Badge, { warn: true }, t('invalid')),
          ),
          h('div', { className: 'deck-desc' }, skill.description || t('invalid')),
          h(
            'div',
            { className: 'deck-meta' },
            h('span', null, skill.root),
            h('span', null, skill.files + ' ' + t('files') + ' · ' + formatBytes(skill.bytes)),
            skill.updatedAt ? h('span', null, skill.updatedAt.slice(0, 10)) : null,
          ),
        ),
        h(
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
        ),
        h(
          'div',
          { className: 'deck-actions' },
          h(
            'button',
            {
              className: 'deck-btn',
              disabled: busy === skill.name + ':read',
              onClick: () => onEdit(skill),
            },
            t('edit'),
          ),
          h('button', { className: 'deck-btn', onClick: () => onReveal(skill) }, t('reveal')),
          h('button', { className: 'deck-btn', onClick: () => onDuplicate(skill) }, t('duplicate')),
          h('button', { className: 'deck-btn danger', onClick: () => onRemove(skill) }, t('remove')),
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

    function Panel() {
      const [state, setState] = useState({ status: 'loading', error: null, skills: [], roots: [], totals: null, version: '', platform: '', client: null });
      const [query, setQuery] = useState('');
      const [filter, setFilter] = useState('all');
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
      const [copied, setCopied] = useState(false);
      const toastTimer = useRef(null);

      const notify = useCallback((message, kind) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ message, kind: kind || 'ok' });
        toastTimer.current = setTimeout(() => setToast(null), 2600);
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

      const rows = visible.map((skill) =>
        h(SkillRow, {
          key: skill.name,
          skill,
          busy,
          onToggle: toggle,
          onEdit: openEditor,
          onReveal: reveal,
          onDuplicate: openDuplicate,
          onRemove: (target) => {
            setConfirming(target);
            setConfirmText('');
          },
        }),
      );

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
              : h('ul', { className: 'deck-list' }, rows);

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
              { className: 'deck-select', value: filter, onChange: (event) => setFilter(event.target.value) },
              h('option', { value: 'all' }, t('filterAll') + ' (' + counts.all + ')'),
              h('option', { value: 'enabled' }, t('filterEnabled') + ' (' + counts.enabled + ')'),
              h('option', { value: 'disabled' }, t('filterDisabled') + ' (' + counts.disabled + ')'),
              h('option', { value: 'invalid' }, t('filterInvalid') + ' (' + counts.invalid + ')'),
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
        toast ? h('div', { className: 'deck-toast' + (toast.kind === 'error' ? ' error' : ''), role: 'status' }, toast.message) : null,
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
    }

    return { name: NS, inject: ['slots'], apply, components: { Panel, SkillRow, CreateDialog, DuplicateDialog, DiagFooter } };
  },
});

