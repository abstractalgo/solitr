// store-2.0.12.js – extracted from solitr.com's application.js (parts: 001).
// Identifier names restored from the source map by tools/unminify.js.
(function (f) {
  if ("object" == typeof exports && "undefined" != typeof module)
    module.exports = f();
  else if ("function" == typeof define && define.amd) define([], f);
  else {
    ("undefined" != typeof window
      ? window
      : "undefined" != typeof global
        ? global
        : "undefined" != typeof self
          ? self
          : this
    ).store = f();
  }
})(function () {
  return (function e(t, n, r) {
    function s(_o, u) {
      if (!n[_o]) {
        if (!t[_o]) {
          var a = "function" == typeof require && require;
          if (!u && a) return a(_o, !0);
          if (i) return i(_o, !0);
          var f = new Error("Cannot find module '" + _o + "'");
          throw ((f.code = "MODULE_NOT_FOUND"), f);
        }
        var l = (n[_o] = {
          exports: {},
        });
        t[_o][0].call(
          l.exports,
          function (e) {
            var n = t[_o][1][e];
            return s(n || e);
          },
          l,
          l.exports,
          e,
          t,
          n,
          r,
        );
      }
      return n[_o].exports;
    }
    for (
      var i = "function" == typeof require && require, o = 0;
      o < r.length;
      o++
    )
      s(r[o]);
    return s;
  })(
    {
      1: [
        function (require, module, exports) {
          var engine = require("../src/store-engine"),
            storages = [
              require("../storages/localStorage"),
              require("../storages/sessionStorage"),
              require("../storages/cookieStorage"),
              require("../storages/memoryStorage"),
            ];
          module.exports = engine.createStore(storages, []);
        },
        {
          "../src/store-engine": 2,
          "../storages/cookieStorage": 4,
          "../storages/localStorage": 5,
          "../storages/memoryStorage": 6,
          "../storages/sessionStorage": 7,
        },
      ],
      2: [
        function (require, module, exports) {
          var util = require("./util"),
            slice = util.slice,
            pluck = util.pluck,
            each = util.each,
            bind = util.bind,
            create = util.create,
            isList = util.isList,
            isFunction = util.isFunction,
            isObject = util.isObject;
          module.exports = {
            createStore: createStore,
          };
          var storeAPI = {
            version: "2.0.12",
            enabled: !1,
            get: function (key, optionalDefaultValue) {
              var data = this.storage.read(this._namespacePrefix + key);
              return this._deserialize(data, optionalDefaultValue);
            },
            set: function (key, value) {
              return void 0 === value
                ? this.remove(key)
                : (this.storage.write(
                    this._namespacePrefix + key,
                    this._serialize(value),
                  ),
                  value);
            },
            remove: function (key) {
              this.storage.remove(this._namespacePrefix + key);
            },
            each: function (callback) {
              var self = this;
              this.storage.each(function (val, namespacedKey) {
                callback.call(
                  self,
                  self._deserialize(val),
                  (namespacedKey || "").replace(self._namespaceRegexp, ""),
                );
              });
            },
            clearAll: function () {
              this.storage.clearAll();
            },
            hasNamespace: function (namespace) {
              return this._namespacePrefix == "__storejs_" + namespace + "_";
            },
            createStore: function () {
              return createStore.apply(this, arguments);
            },
            addPlugin: function (plugin) {
              this._addPlugin(plugin);
            },
            namespace: function (namespace) {
              return createStore(this.storage, this.plugins, namespace);
            },
          };
          function createStore(storages, plugins, namespace) {
            (namespace || (namespace = ""),
              storages && !isList(storages) && (storages = [storages]),
              plugins && !isList(plugins) && (plugins = [plugins]));
            var namespacePrefix = namespace
                ? "__storejs_" + namespace + "_"
                : "",
              namespaceRegexp = namespace
                ? new RegExp("^" + namespacePrefix)
                : null;
            if (!/^[a-zA-Z0-9_\-]*$/.test(namespace))
              throw new Error(
                "store.js namespaces can only have alphanumerics + underscores and dashes",
              );
            var store = create(
              {
                _namespacePrefix: namespacePrefix,
                _namespaceRegexp: namespaceRegexp,
                _testStorage: function (storage) {
                  try {
                    var testStr = "__storejs__test__";
                    storage.write(testStr, testStr);
                    var ok = storage.read(testStr) === testStr;
                    return (storage.remove(testStr), ok);
                  } catch (e) {
                    return !1;
                  }
                },
                _assignPluginFnProp: function (pluginFnProp, propName) {
                  var oldFn = this[propName];
                  this[propName] = function () {
                    var args = slice(arguments, 0),
                      self = this;
                    var newFnArgs = [
                      function () {
                        if (oldFn)
                          return (
                            each(arguments, function (arg, i) {
                              args[i] = arg;
                            }),
                            oldFn.apply(self, args)
                          );
                      },
                    ].concat(args);
                    return pluginFnProp.apply(self, newFnArgs);
                  };
                },
                _serialize: function (obj) {
                  return JSON.stringify(obj);
                },
                _deserialize: function (strVal, defaultVal) {
                  if (!strVal) return defaultVal;
                  var val = "";
                  try {
                    val = JSON.parse(strVal);
                  } catch (e) {
                    val = strVal;
                  }
                  return void 0 !== val ? val : defaultVal;
                },
                _addStorage: function (storage) {
                  this.enabled ||
                    (this._testStorage(storage) &&
                      ((this.storage = storage), (this.enabled = !0)));
                },
                _addPlugin: function (plugin) {
                  var self = this;
                  if (isList(plugin))
                    each(plugin, function (_plugin) {
                      self._addPlugin(_plugin);
                    });
                  else if (
                    !pluck(this.plugins, function (seenPlugin) {
                      return plugin === seenPlugin;
                    })
                  ) {
                    if ((this.plugins.push(plugin), !isFunction(plugin)))
                      throw new Error(
                        "Plugins must be function values that return objects",
                      );
                    var pluginProperties = plugin.call(this);
                    if (!isObject(pluginProperties))
                      throw new Error(
                        "Plugins must return an object of function properties",
                      );
                    each(pluginProperties, function (pluginFnProp, propName) {
                      if (!isFunction(pluginFnProp))
                        throw new Error(
                          "Bad plugin property: " +
                            propName +
                            " from plugin " +
                            plugin.name +
                            ". Plugins should only return functions.",
                        );
                      self._assignPluginFnProp(pluginFnProp, propName);
                    });
                  }
                },
                addStorage: function (storage) {
                  (!(function () {
                    var _console =
                      "undefined" == typeof console ? null : console;
                    _console &&
                      (_console.warn ? _console.warn : _console.log).apply(
                        _console,
                        arguments,
                      );
                  })(
                    "store.addStorage(storage) is deprecated. Use createStore([storages])",
                  ),
                    this._addStorage(storage));
                },
              },
              storeAPI,
              {
                plugins: [],
              },
            );
            return (
              (store.raw = {}),
              each(store, function (prop, propName) {
                isFunction(prop) && (store.raw[propName] = bind(store, prop));
              }),
              each(storages, function (storage) {
                store._addStorage(storage);
              }),
              each(plugins, function (plugin) {
                store._addPlugin(plugin);
              }),
              store
            );
          }
        },
        {
          "./util": 3,
        },
      ],
      3: [
        function (require, module, exports) {
          (function (global) {
            var assign = Object.assign
                ? Object.assign
                : function (obj, props1, props2, etc) {
                    for (var i = 1; i < arguments.length; i++)
                      each(Object(arguments[i]), function (val, key) {
                        obj[key] = val;
                      });
                    return obj;
                  },
              create = (function () {
                if (Object.create)
                  return function (obj, assignProps1, assignProps2, etc) {
                    var assignArgsList = slice(arguments, 1);
                    return assign.apply(
                      this,
                      [Object.create(obj)].concat(assignArgsList),
                    );
                  };
                {
                  function F() {}
                  return function (obj, assignProps1, assignProps2, etc) {
                    var assignArgsList = slice(arguments, 1);
                    return (
                      (F.prototype = obj),
                      assign.apply(this, [new F()].concat(assignArgsList))
                    );
                  };
                }
              })(),
              trim = String.prototype.trim
                ? function (str) {
                    return String.prototype.trim.call(str);
                  }
                : function (str) {
                    return str.replace(
                      /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,
                      "",
                    );
                  },
              Global = "undefined" != typeof window ? window : global;
            function slice(arr, index) {
              return Array.prototype.slice.call(arr, index || 0);
            }
            function each(obj, fn) {
              pluck(obj, function (val, key) {
                return (fn(val, key), !1);
              });
            }
            function pluck(obj, fn) {
              if (isList(obj)) {
                for (var i = 0; i < obj.length; i++)
                  if (fn(obj[i], i)) return obj[i];
              } else
                for (var key in obj)
                  if (obj.hasOwnProperty(key) && fn(obj[key], key))
                    return obj[key];
            }
            function isList(val) {
              return (
                null != val &&
                "function" != typeof val &&
                "number" == typeof val.length
              );
            }
            module.exports = {
              assign: assign,
              create: create,
              trim: trim,
              bind: function (obj, fn) {
                return function () {
                  return fn.apply(
                    obj,
                    Array.prototype.slice.call(arguments, 0),
                  );
                };
              },
              slice: slice,
              each: each,
              map: function (obj, fn) {
                var res = isList(obj) ? [] : {};
                return (
                  pluck(obj, function (v, k) {
                    return ((res[k] = fn(v, k)), !1);
                  }),
                  res
                );
              },
              pluck: pluck,
              isList: isList,
              isFunction: function (val) {
                return val && "[object Function]" === {}.toString.call(val);
              },
              isObject: function (val) {
                return val && "[object Object]" === {}.toString.call(val);
              },
              Global: Global,
            };
          }).call(
            this,
            "undefined" != typeof global
              ? global
              : "undefined" != typeof self
                ? self
                : "undefined" != typeof window
                  ? window
                  : {},
          );
        },
        {},
      ],
      4: [
        function (require, module, exports) {
          var util = require("../src/util"),
            Global = util.Global,
            trim = util.trim;
          module.exports = {
            name: "cookieStorage",
            read: function (key) {
              if (!key || !_has(key)) return null;
              var regexpStr =
                "(?:^|.*;\\s*)" +
                escape(key).replace(/[\-\.\+\*]/g, "\\$&") +
                "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*";
              return unescape(doc.cookie.replace(new RegExp(regexpStr), "$1"));
            },
            write: function (key, data) {
              if (!key) return;
              doc.cookie =
                escape(key) +
                "=" +
                escape(data) +
                "; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=/";
            },
            each: each,
            remove: remove,
            clearAll: function () {
              each(function (_, key) {
                remove(key);
              });
            },
          };
          var doc = Global.document;
          function each(callback) {
            for (
              var cookies = doc.cookie.split(/; ?/g), i = cookies.length - 1;
              i >= 0;
              i--
            )
              if (trim(cookies[i])) {
                var kvp = cookies[i].split("="),
                  key = unescape(kvp[0]);
                callback(unescape(kvp[1]), key);
              }
          }
          function remove(key) {
            key &&
              _has(key) &&
              (doc.cookie =
                escape(key) +
                "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/");
          }
          function _has(key) {
            return new RegExp(
              "(?:^|;\\s*)" +
                escape(key).replace(/[\-\.\+\*]/g, "\\$&") +
                "\\s*\\=",
            ).test(doc.cookie);
          }
        },
        {
          "../src/util": 3,
        },
      ],
      5: [
        function (require, module, exports) {
          var Global = require("../src/util").Global;
          function localStorage() {
            return Global.localStorage;
          }
          function read(key) {
            return localStorage().getItem(key);
          }
          module.exports = {
            name: "localStorage",
            read: read,
            write: function (key, data) {
              return localStorage().setItem(key, data);
            },
            each: function (fn) {
              for (var i = localStorage().length - 1; i >= 0; i--) {
                var key = localStorage().key(i);
                fn(read(key), key);
              }
            },
            remove: function (key) {
              return localStorage().removeItem(key);
            },
            clearAll: function () {
              return localStorage().clear();
            },
          };
        },
        {
          "../src/util": 3,
        },
      ],
      6: [
        function (require, module, exports) {
          module.exports = {
            name: "memoryStorage",
            read: function (key) {
              return memoryStorage[key];
            },
            write: function (key, data) {
              memoryStorage[key] = data;
            },
            each: function (callback) {
              for (var key in memoryStorage)
                memoryStorage.hasOwnProperty(key) &&
                  callback(memoryStorage[key], key);
            },
            remove: function (key) {
              delete memoryStorage[key];
            },
            clearAll: function (key) {
              memoryStorage = {};
            },
          };
          var memoryStorage = {};
        },
        {},
      ],
      7: [
        function (require, module, exports) {
          var Global = require("../src/util").Global;
          function sessionStorage() {
            return Global.sessionStorage;
          }
          function read(key) {
            return sessionStorage().getItem(key);
          }
          module.exports = {
            name: "sessionStorage",
            read: read,
            write: function (key, data) {
              return sessionStorage().setItem(key, data);
            },
            each: function (fn) {
              for (var i = sessionStorage().length - 1; i >= 0; i--) {
                var key = sessionStorage().key(i);
                fn(read(key), key);
              }
            },
            remove: function (key) {
              return sessionStorage().removeItem(key);
            },
            clearAll: function () {
              return sessionStorage().clear();
            },
          };
        },
        {
          "../src/util": 3,
        },
      ],
    },
    {},
    [1],
  )(1);
});
