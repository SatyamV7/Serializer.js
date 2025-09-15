Serializer.js

Serializer.js is a focused, extensible serialization utility that produces human-readable string representations of JavaScript values. It targets debugging, logging, and deterministic inspection of complex runtime state while remaining small, predictable, and configurable.


---

Table of contents

Overview

Installation

Quick start

Primary use cases

API reference

Constructor

.serialize(value[, internal])

.describe(value)

.escape(string)

.configure(config)

.replacer (add/delete/clear)


Configuration options (detailed)

Replacer API (examples)

Best practices & safety

Extending for host environments

License & contribution



---

Overview

Serializer.js is not a generic persistence serializer — it is an inspection serializer. Its goals are:

Produce readable, deterministic snapshots of JavaScript values.

Cover the bulk of ECMAScript built-ins and commonly encountered runtime objects.

Offer safe defaults but provide surgical control via a replacer API and runtime configuration.



---

Installation

Clone or copy the Serializer.js file into your project.


---

Quick start

const Serializer = require('./Serializer.js'); // or global.Serializer in browser
const s = new Serializer({ deterministic: true, indent: 2 });

const obj = { name: 'alice', meta: new Map([['k', 1]]) };
console.log(s.serialize(obj));


---

Primary use cases

Debugging complex objects (deep, circular, or accessor-heavy).

Deterministic snapshot generation for tests.

Safe inspection of host objects via replacers (DOM nodes, Buffers, streams).



---

API reference

new Serializer([config])

Create a new serializer instance. config is optional; unsupported or incorrectly typed fields are ignored and defaults used.

.serialize(value, internal)

Returns a string containing the serialized representation of value.

internal (optional): advanced callers can pass { CallFrame, ReferenceMap, InvokeReplacer } to control the walk state.


.describe(value)

Shallow description used for primitives, functions and simple values. Useful when you need a one-line label instead of a full traversal.

.escape(string)

Expose the library’s escaping routine for re-use.

.configure(config)

Set configuration values. Returns the active configuration object. Use to permanently change behavior for the serializer instance.

.replacer

An object with .add(...fns), .delete(...fns), .clear() to manage replacer functions. See the Replacer API section below.


---

Configuration options (detailed)

All defaults are conservative and safe; change them to suit your use case.

depth number – Maximum recursion depth before the serializer prints a class placeholder. Default: Infinity.

indent number – Spaces per level when pretty-printing. Ignored when compact: true.

deterministic boolean – When true, keys (including symbol keys) are emitted in a stable order and keys are escaped as strings.

accessors boolean – When false (default), getter/setter properties are reported as [Getter] / [Setter] strings; when true the serializer invokes them and serializes the result (may have side effects).

maxLength number – Truncate long arrays/sets/maps/objects and append a and N more items... indicator.

compact boolean – When true, produce a single-line compact representation.


Note: configure() accepts an object with the above fields. Passing a partial object leaves other options unchanged.

Examples:

// Limit depth to 3
const s1 = new Serializer({ depth: 3 });
console.log(s1.serialize({ nested: { deep: { deeper: { tooDeep: true }}}}));

// Compact formatting for arrays
const s2 = new Serializer({ compact: true });
console.log(s2.serialize([1, 2, 3, 4, 5]));

// Deterministic key order
const s3 = new Serializer({ deterministic: true });
console.log(s3.serialize({ b: 1, a: 2 })); // always prints keys in stable order

// Limit array length
const s4 = new Serializer({ maxLength: 2 });
console.log(s4.serialize([1, 2, 3, 4]));


---

Replacer API

The replacer system is intentionally powerful: replacers run before the core dispatch and may return a string which will be used as the final serialization for that value.

Signature:

function replacer(value, context, serializer) => string | undefined

value: the current value being serialized (by reference).

context: { config: {...}, internal: { ReferenceMap, CallFrame } } where ReferenceMap is a snapshot of visited references and CallFrame is current depth.

serializer: the live Serializer instance (you may call .serialize() or .describe() from it).


Behavior:

If replacer returns a string, that string becomes the serialized output for value.

If replacer returns undefined, the default serialization logic proceeds.


Examples:

Serialize DOM Element as HTML


serializer.replacer.add((v) => {
  if (typeof window !== 'undefined' && v instanceof window.Element) {
    return `<${v.tagName.toLowerCase()}${v.id ? ` id="${v.id}"` : ''}>`;
  }
});

Scoped configuration for deep branches


serializer.replacer.add((v, ctx, s) => {
  if (ctx.internal.CallFrame > 8) {
    s.configure({ compact: true, maxLength: 5 });
  }
  return undefined; // serializer continues with modified config
});

Mask sensitive fields


serializer.replacer.add((v) => {
  if (v && typeof v === 'object' && 'password' in v) {
    return '{ password: ***REDACTED*** }';
  }
});

Caveats:

Replacers receive the live serializer instance. Changing configuration inside a replacer affects the serializer globally for that instance and will impact sibling nodes unless you restore or reset config later.

Replacers may mutate value directly; those mutations will affect subsequent serialization steps.



---

Best practices & safety

Use a new Serializer instance for concurrent tasks to avoid races when replacers mutate configuration.

Prefer returning a replacement string over mutating deep object graphs unless you explicitly want the mutation.

Be cautious invoking accessors (accessors: true) — getters may throw or have side effects.

Limit depth / maxLength for untrusted inputs to avoid DoS-friendly deep or wide structures.



---

Extending for host environments

For host-specific objects (DOM nodes, Buffer, streams, platform internals), prefer a replacer rather than modifying library internals. Replacers are the supported extension point and are preserved across releases.

Example: Node Buffer replacer

serializer.replacer.add((v) => {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(v)) {
    return `Buffer(${v.length}) <${v.toString('hex')}>`;
  }
});


---

License

This project is released under LGPL-3.0-or-later. The core implementation is intentionally private, and extension is expected to occur via the public replacer/configure API.


---

Contributing

Contributions are welcome. Please open issues for bugs or feature requests and supply focused pull requests. Keep changes to documented public APIs backward compatible when possible.