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

test('exports the cordis client shape and registers a Settings section', () => {
  const module = captured.factory((id) => {
    assert.equal(id, 'react');
    return reactStub;
  });
  assert.equal(module.name, 'dsh-skill-deck');
  assert.deepEqual(module.inject, ['slots']);

  const registrations = [];
  const effects = [];
  const ctx = {
    slots: {
      inject(name, callback) {
        assert.equal(name, 'settings.section');
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

  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].options.name, 'settings.section');
  assert.equal(registrations[0].options.id, 'dsh-skill-deck');
  assert.equal(typeof registrations[0].options.label, 'function');
  assert.equal(typeof registrations[0].component, 'function');
  assert.equal(appended.length, 1, 'styles injected once');
  assert.equal(effects.length, 1, 'style cleanup registered');
});
