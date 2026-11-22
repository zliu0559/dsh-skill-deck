import assert from 'node:assert/strict';
import test from 'node:test';

// Minimal browser stubs: this test only proves the module registers itself and
// that `apply` wires the Settings slot without touching a real DOM.
let captured = null;
const appended = [];
globalThis.window = {
  __ModuleLoader__: {
    load(definition) {
      captured = definition;
    },
  },
};
Object.defineProperty(globalThis, 'navigator', {
  value: { language: 'zh-CN' },
  configurable: true,
});globalThis.document = {
  querySelector: () => null,
  createElement: () => ({ dataset: {}, textContent: '' }),
  head: {
    appendChild(element) {
      appended.push(element);
    },
  },
};

const reactStub = {
  createElement: (...args) => ({ type: args[0], props: args[1] }),
  useState: () => [undefined, () => {}],
  useEffect: () => {},
  useMemo: (factory) => factory(),
  useRef: () => ({ current: null }),
  useCallback: (fn) => fn,
};

await import('../client.js');

test('registers a lazily loaded browser module', () => {
  assert.ok(captured, 'ModuleLoader.load was called');
  assert.equal(captured.id, 'dsh-skill-deck');
  assert.equal(typeof captured.factory, 'function');
});

test('exports the cordis client shape and registers Settings, sidebar and main', () => {
  const module = captured.factory((id) => {
    assert.equal(id, 'react');
    return reactStub;
  });
  assert.equal(module.name, 'dsh-skill-deck');
  assert.deepEqual(module.inject, ['slots']);

  const injected = [];
  const registrations = [];
  const effects = [];
  const ctx = {
    slots: {
      inject(name, callback) {
        injected.push(name);
        callback();
      },
      register(options, component) {
        registrations.push({ options, component });
        return () => {};
      },
    },
    effect(factory) {
      effects.push(factory());
    },
  };
  module.apply(ctx);

  assert.deepEqual(injected, ['settings.section', 'sidebar.panellist', 'main']);
  assert.equal(registrations.length, 3);

  const bySlot = (name) => registrations.find((entry) => entry.options.name === name);

  const settings = bySlot('settings.section');
  assert.ok(settings, 'Settings section registration');
  assert.equal(settings.options.id, 'dsh-skill-deck');
  assert.equal(settings.options.order, 62);
  assert.equal(typeof settings.options.label, 'function');
  assert.equal(settings.options.label(), '技能');
  assert.equal(typeof settings.component, 'function');

  const sidebar = bySlot('sidebar.panellist');
  assert.ok(sidebar, 'sidebar entry registration');
  assert.equal(sidebar.options.id, 'dsh-skill-deck');
  assert.equal(sidebar.options.order, 20, 'after Plugins (0) and Automation tasks (10)');
  assert.equal(typeof sidebar.options.label, 'function');
  assert.equal(sidebar.options.label(), '技能');
  assert.equal(sidebar.component, module.components.DeckIcon, 'the registered component is the icon');
  assert.notEqual(sidebar.component, module.components.Panel);

  const main = bySlot('main');
  assert.ok(main, 'main page registration');
  assert.equal(main.options.key, 'dsh-skill-deck');
  assert.equal(typeof main.component, 'function');
  assert.equal(main.component().type, module.components.DeckPage);

  assert.equal(appended.length, 1, 'styles injected once');
  assert.equal(effects.length, 1, 'style cleanup registered');

  const css = appended[0].textContent;
  assert.match(css, /\.deck-page\s*\{[^}]*height:\s*100%[^}]*overflow:\s*auto/, 'page owns its scroll container');
  assert.match(css, /var\(--dsh-frame-top-clearance/, 'page leaves the frame top strip clear');
});
