class Serializer { // Serializer.js v0.0.1 <15th September, 2025> - Author: Satyam Verma <github.com/SatyamV7> - License: LGPL-3.0-or-later
    #serialize; #serializeComplex; #escape; #config; #fields; #replacer; #replacerfnreg = new Set();
    constructor(config) {
        this.#config = { depth: Infinity, indent: 4, deterministic: false, accessors: false, maxLength: Infinity, compact: false };

        this.#fields = [['depth', 'number'], ['indent', 'number'], ['deterministic', 'boolean'], ['accessors', 'boolean'], ['maxLength', 'number'], ['compact', 'boolean']];

        this.#serialize = function (data) {
            switch (typeof data) {
                case 'string':
                    const escaped = (string => {
                        let result = [];
                        for (let i = 0; i < string.length; i++) {
                            const characters = string[i];
                            switch (characters) {
                                case '\n':
                                    result.push('\\\u006E');
                                    break;

                                case '\t':
                                    result.push('\\\u0074');
                                    break;

                                case '\r':
                                    result.push('\\\u0072');
                                    break;

                                case '\b':
                                    result.push('\\\u0062');
                                    break;

                                case '\f':
                                    result.push('\\\u0066');
                                    break;

                                case '\\':
                                    result.push('\\\u005C');
                                    break;

                                default:
                                    result.push(characters);
                            }
                        }
                        return result.join('');
                    })(data);
                    if (!escaped.includes("'")) return `'${escaped}'`;
                    if (!escaped.includes('"')) return `"${escaped}"`;
                    return `"${escaped.replaceAll('"', '\\"')}"`;

                case 'bigint':
                    return `${data}n`;

                case 'number':
                    return data.toString();

                case 'boolean':
                    return data.toString();

                case 'symbol':
                    return data.toString();

                case 'function':
                    if (Object.getOwnPropertyDescriptor(data, 'prototype')?.writable === false) return `[class ${data.name || '(anonymous)'}]`;
                    else return `[${data.constructor.name + (data.name ? ':' : '')} ${data.name || '(anonymous)'}]`;

                case 'object':
                    if (data === null) return 'null';
                    return `${data?.constructor?.name || 'Object'} { }`;

                case 'undefined':
                    return 'undefined';
            }
        };

        this.#serializeComplex = function (data, visited, CallFrame, InvokeReplacer) {
            const { depth, indent, deterministic, accessors, maxLength, compact } = this.#config;
            if (this.#replacerfnreg.size !== 0 && InvokeReplacer) {
                for (const replacer of this.#replacerfnreg) {
                    const result = replacer(data, { config: { ...this.#config }, internal: { ReferenceMap: new Set(visited), CallFrame } }, this);
                    if (typeof result === 'string') return result;
                }
            }
            if (typeof data !== 'object') {
                if (deterministic && typeof data === 'string') {
                    return `"${this.#escape(data)}"`
                } else return this.#serialize(data);
            }
            if (visited.has(data)) {
                return '[Circular]';
            } else {
                visited.add(data);
            }
            if (CallFrame > depth) return `[${data?.constructor?.name || 'Object'}]`;
            else {
                let result = [];
                const indentString = '\n' + '\u0020'.repeat(CallFrame * indent);
                const smallIndentString = '\n' + '\u0020'.repeat((CallFrame - 1) * indent);
                if (data === null) {
                    return 'null';
                } else if (Array.isArray(data)) {
                    if (data.length === 0) return 'Array(0) [ ]';
                    for (let i = 0; i < data.length; i++) {
                        if (i >= maxLength) {
                            result.push('and ' + (data.length - i).toString() + ' more items...');
                            break;
                        } else {
                            result.push(this.#serializeComplex(data[i], new Set(visited), CallFrame + 1, InvokeReplacer));
                        }
                    }
                    return compact
                        ? 'Array(' + data.length.toString() + ') [' + result.join(', ') + ']'
                        : 'Array(' + data.length.toString() + ') [' + indentString + result.join(',' + indentString) + smallIndentString + ']';
                } else if (data instanceof Set) {
                    if (data.size === 0) return 'Set(0) { }';
                    let iterations = 0;
                    for (const value of data) {
                        if (iterations >= maxLength) {
                            result.push('and ' + (data.size - iterations).toString() + ' more items...');
                            break;
                        } else {
                            result.push(this.#serializeComplex(value, new Set(visited), CallFrame + 1, InvokeReplacer));
                            iterations++;
                        }
                    }
                    return compact
                        ? 'Set(' + data.size.toString() + ') { ' + result.join(', ') + ' }'
                        : 'Set(' + data.size.toString() + ') {' + indentString + result.join(',' + indentString) + smallIndentString + '}';
                } else if (data instanceof Map) {
                    if (data.size === 0) return 'Map(0) { }';
                    let iterations = 0;
                    for (const [key, value] of data) {
                        if (iterations >= maxLength) {
                            result.push('and ' + (data.size - iterations).toString() + ' more items...');
                            break;
                        } else {
                            result.push(this.#serializeComplex(key, new Set(visited), CallFrame + 1, InvokeReplacer) + ' => ' + this.#serializeComplex(value, new Set(visited), CallFrame + 1, InvokeReplacer));
                            iterations++;
                        }
                    }
                    return compact
                        ? 'Map(' + data.size.toString() + ') { ' + result.join(', ') + ' }'
                        : 'Map(' + data.size.toString() + ') {' + indentString + result.join(',' + indentString) + smallIndentString + '}';
                } else if (ArrayBuffer.isView(data) && !(data instanceof DataView)) {
                    if (data.length === 0) return `${data.constructor.name}(0) [ ]`;
                    return compact
                        ? `${data.constructor.name}(${data.length.toString()}) [${data.join(', ')}]`
                        : `${data.constructor.name}(${data.length.toString()}) [${indentString + data.join(',' + indentString) + smallIndentString}]`;
                } else if (data instanceof DataView) {
                    const buffer = this.#serializeComplex(data.buffer, visited, CallFrame + 1, InvokeReplacer);
                    return `DataView(${data.byteLength}) {${indentString}byteLength: ${data.byteLength},${indentString}byteOffset: ${data.byteOffset},${indentString}buffer: ${buffer}${smallIndentString}}`;
                } else if (data instanceof ArrayBuffer) {
                    const buffer = ((data) => {
                        for (const byte of new Uint8Array(data)) {
                            result.push(byte.toString(16).padStart(2, '0'));
                        }
                        return result.join(' ');
                    })(data);                    
                    return `ArrayBuffer(${data.byteLength}) {${indentString}[Uint8Contents]: <${buffer}>,${indentString}byteLength: ${data.byteLength}${smallIndentString}}`;
                } else if (typeof SharedArrayBuffer !== 'undefined' && data instanceof SharedArrayBuffer) {
                    const buffer = ((data) => {
                        for (const byte of new Uint8Array(data)) {
                            result.push(byte.toString(16).padStart(2, '0'));
                        }
                        return result.join(' ');
                    })(data);
                    return `SharedArrayBuffer(${data.byteLength}) {${indentString}[Uint8Contents]: <${buffer}>,${indentString}byteLength: ${data.byteLength}${smallIndentString}}`;
                } else if (data instanceof Error) {
                    return `Uncaught ${data.constructor.name}: ${data.message}\n\nStack Trace: ${data.stack}`;
                } else if (data instanceof WeakRef) {
                    const deref = data.deref();
                    if (deref === undefined) return 'WeakRef { <cleared> }';
                    return compact ? `WeakRef { ${this.#serializeComplex(deref, new Set(visited), CallFrame + 1, InvokeReplacer)} }` : `WeakRef {${indentString}${this.#serializeComplex(deref, new Set(visited), CallFrame + 1, InvokeReplacer)}${smallIndentString}}`;
                } else if (data instanceof Date || data instanceof RegExp) {
                    return data.toString();
                } else if (data instanceof WeakSet) {
                    return 'WeakSet { <items unknown> }';
                } else if (data instanceof WeakMap) {
                    return 'WeakMap { <items unknown> }';
                } else if (data instanceof Promise) {
                    return 'Promise { <state unknown> }';
                } else {
                    const FormatKey = key => {
                        if (typeof key === 'symbol') return key.toString();
                        if (deterministic) return '"' + this.#escape(key) + '"';
                        if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) return key;
                        else return this.#serialize(key);
                    };
                    const FormatValue = key => {
                        if (!accessors) {
                            const Getter = typeof descriptors[key]?.get === 'function';
                            const Setter = typeof descriptors[key]?.set === 'function';
                            if (Getter || Setter) {
                                if (!Setter) return '[Getter]';
                                if (!Getter) return '[Setter]';
                                else return '[Getter/Setter]';
                            }
                        }
                        return this.#serializeComplex(data[key], new Set(visited), CallFrame + 1, InvokeReplacer);
                    };
                    const className = data?.constructor?.name || 'Object';
                    const keys = deterministic ? [...Object.getOwnPropertyNames(data).sort(), ...Object.getOwnPropertySymbols(data).sort((a, b) => {
                        const [A, B] = [a.description ?? '', b.description ?? ''];; return A === B ? 0 : A > B ? 1 : -1;
                    })] : Reflect.ownKeys(data);
                    if (keys.length === 0) return `${className} { }`;
                    const descriptors = Object.getOwnPropertyDescriptors(data);
                    for (let i = 0; i < keys.length; i++) {
                        if (i >= maxLength) {
                            result.push('and ' + (keys.length - i).toString() + ' more items...');
                            break;
                        } else {
                            const key = keys[i];
                            result.push(FormatKey(key) + ': ' + FormatValue(key));
                        }
                    }
                    return compact
                        ? className + ' { ' + result.join(', ') + ' }'
                        : className + ' {' + indentString + result.join(',' + indentString) + smallIndentString + '}';
                }
            }
        };

        this.#escape = function (string) {
            const result = [];
            for (let i = 0; i < string.length; i++) {
                const characters = string[i];
                switch (characters) {
                    case '\\':
                        result.push('\\\u005C');
                        break;

                    case '\'':
                        result.push("\\\u0027");
                        break;

                    case '\"':
                        result.push('\\\u0022');
                        break;

                    case '\n':
                        result.push('\\\u006E');
                        break;

                    case '\t':
                        result.push('\\\u0074');
                        break;

                    case '\r':
                        result.push('\\\u0072');
                        break;

                    case '\b':
                        result.push('\\\u0062');
                        break;

                    case '\f':
                        result.push('\\\u0066');
                        break;

                    default:
                        result.push(characters);
                }
            }
            return result.join('');
        };


        this.#replacer = Object.freeze({
            add: (...replacerfn) => {
                replacerfn.forEach(replacer => {
                    if (typeof replacer === 'function') this.#replacerfnreg.add(replacer);
                });
            },
            delete: (...replacerfn) => {
                replacerfn.forEach(replacer => {
                    if (typeof replacer === 'function') this.#replacerfnreg.delete(replacer);
                });
            },
            clear: () => {
                this.#replacerfnreg.clear();
            }
        });

        this.configure(config);
    }

    get version() {
        return 'Serializer.js v0.0.1-r1';
    }

    get replacer() {
        return this.#replacer;
    }

    serialize(data, internal = { CallFrame: 1, ReferenceMap: new Set(), InvokeReplacer: true }) {
        return this.#serializeComplex(data, internal.ReferenceMap ?? new Set(), internal.CallFrame ?? 1, internal.InvokeReplacer ?? true);
    }

    describe(data) {
        return this.#serialize(data);
    }

    escape(string) {
        return this.#escape(string);
    }

    configure(config) {
        if (config) {
            for (let i = 0; i < this.#fields.length; i++) {
                const [key, type] = this.#fields[i];
                this.#config[key] = config.hasOwnProperty(key) && typeof config[key] === type ? config[key] : this.#config[key];
            }
        }
        return this.#config;
    }
}

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory();
    } else {
        root.Serializer = factory();
    }
})(globalThis, function () {
    return Serializer;
});