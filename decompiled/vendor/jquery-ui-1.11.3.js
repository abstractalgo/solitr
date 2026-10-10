// jquery-ui-1.11.3.js – extracted from solitr.com's application.js (parts: 006 007 008 009).
// Identifier names restored from the source map by tools/unminify.js.
(function (factory) {
  "function" == typeof define && define.amd
    ? define(["jquery"], factory)
    : factory(jQuery);
})(function ($) {
  var uuid, removeData, eventType, orig;
  function focusable(element, isTabIndexNotNaN) {
    var map,
      mapName,
      img,
      nodeName = element.nodeName.toLowerCase();
    return "area" === nodeName
      ? ((mapName = (map = element.parentNode).name),
        !(!element.href || !mapName || "map" !== map.nodeName.toLowerCase()) &&
          !!(img = $("img[usemap='#" + mapName + "']")[0]) &&
          visible(img))
      : (/^(input|select|textarea|button|object)$/.test(nodeName)
          ? !element.disabled
          : ("a" === nodeName && element.href) || isTabIndexNotNaN) &&
          visible(element);
  }
  function visible(element) {
    return (
      $.expr.filters.visible(element) &&
      !$(element)
        .parents()
        .addBack()
        .filter(function () {
          return "hidden" === $.css(this, "visibility");
        }).length
    );
  }
  (($.ui = $.ui || {}),
    $.extend($.ui, {
      version: "1.11.3",
      keyCode: {
        BACKSPACE: 8,
        COMMA: 188,
        DELETE: 46,
        DOWN: 40,
        END: 35,
        ENTER: 13,
        ESCAPE: 27,
        HOME: 36,
        LEFT: 37,
        PAGE_DOWN: 34,
        PAGE_UP: 33,
        PERIOD: 190,
        RIGHT: 39,
        SPACE: 32,
        TAB: 9,
        UP: 38,
      },
    }),
    $.fn.extend({
      scrollParent: function (includeHidden) {
        var position = this.css("position"),
          excludeStaticParent = "absolute" === position,
          overflowRegex = includeHidden
            ? /(auto|scroll|hidden)/
            : /(auto|scroll)/,
          scrollParent = this.parents()
            .filter(function () {
              var parent = $(this);
              return (
                (!excludeStaticParent || "static" !== parent.css("position")) &&
                overflowRegex.test(
                  parent.css("overflow") +
                    parent.css("overflow-y") +
                    parent.css("overflow-x"),
                )
              );
            })
            .eq(0);
        return "fixed" !== position && scrollParent.length
          ? scrollParent
          : $(this[0].ownerDocument || document);
      },
      uniqueId:
        ((uuid = 0),
        function () {
          return this.each(function () {
            this.id || (this.id = "ui-id-" + ++uuid);
          });
        }),
      removeUniqueId: function () {
        return this.each(function () {
          /^ui-id-\d+$/.test(this.id) && $(this).removeAttr("id");
        });
      },
    }),
    $.extend($.expr[":"], {
      data: $.expr.createPseudo
        ? $.expr.createPseudo(function (dataName) {
            return function (elem) {
              return !!$.data(elem, dataName);
            };
          })
        : function (elem, i, match) {
            return !!$.data(elem, match[3]);
          },
      focusable: function (element) {
        return focusable(element, !isNaN($.attr(element, "tabindex")));
      },
      tabbable: function (element) {
        var tabIndex = $.attr(element, "tabindex"),
          isTabIndexNaN = isNaN(tabIndex);
        return (
          (isTabIndexNaN || tabIndex >= 0) && focusable(element, !isTabIndexNaN)
        );
      },
    }),
    $("<a>").outerWidth(1).jquery ||
      $.each(["Width", "Height"], function (i, name) {
        var side = "Width" === name ? ["Left", "Right"] : ["Top", "Bottom"],
          type = name.toLowerCase(),
          _orig = {
            innerWidth: $.fn.innerWidth,
            innerHeight: $.fn.innerHeight,
            outerWidth: $.fn.outerWidth,
            outerHeight: $.fn.outerHeight,
          };
        function reduce(elem, size, border, margin) {
          return (
            $.each(side, function () {
              ((size -= parseFloat($.css(elem, "padding" + this)) || 0),
                border &&
                  (size -=
                    parseFloat($.css(elem, "border" + this + "Width")) || 0),
                margin &&
                  (size -= parseFloat($.css(elem, "margin" + this)) || 0));
            }),
            size
          );
        }
        (($.fn["inner" + name] = function (size) {
          return void 0 === size
            ? _orig["inner" + name].call(this)
            : this.each(function () {
                $(this).css(type, reduce(this, size) + "px");
              });
        }),
          ($.fn["outer" + name] = function (size, margin) {
            return "number" != typeof size
              ? _orig["outer" + name].call(this, size)
              : this.each(function () {
                  $(this).css(type, reduce(this, size, !0, margin) + "px");
                });
          }));
      }),
    $.fn.addBack ||
      ($.fn.addBack = function (selector) {
        return this.add(
          null == selector ? this.prevObject : this.prevObject.filter(selector),
        );
      }),
    $("<a>").data("a-b", "a").removeData("a-b").data("a-b") &&
      ($.fn.removeData =
        ((removeData = $.fn.removeData),
        function (key) {
          return arguments.length
            ? removeData.call(this, $.camelCase(key))
            : removeData.call(this);
        })),
    ($.ui.ie = !!/msie [\w.]+/.exec(navigator.userAgent.toLowerCase())),
    $.fn.extend({
      focus:
        ((orig = $.fn.focus),
        function (delay, fn) {
          return "number" == typeof delay
            ? this.each(function () {
                var elem = this;
                setTimeout(function () {
                  ($(elem).focus(), fn && fn.call(elem));
                }, delay);
              })
            : orig.apply(this, arguments);
        }),
      disableSelection:
        ((eventType =
          "onselectstart" in document.createElement("div")
            ? "selectstart"
            : "mousedown"),
        function () {
          return this.bind(
            eventType + ".ui-disableSelection",
            function (event) {
              event.preventDefault();
            },
          );
        }),
      enableSelection: function () {
        return this.unbind(".ui-disableSelection");
      },
      zIndex: function (zIndex) {
        if (void 0 !== zIndex) return this.css("zIndex", zIndex);
        if (this.length)
          for (
            var position, value, elem = $(this[0]);
            elem.length && elem[0] !== document;
          ) {
            if (
              ("absolute" === (position = elem.css("position")) ||
                "relative" === position ||
                "fixed" === position) &&
              ((value = parseInt(elem.css("zIndex"), 10)),
              !isNaN(value) && 0 !== value)
            )
              return value;
            elem = elem.parent();
          }
        return 0;
      },
    }),
    ($.ui.plugin = {
      add: function (module, option, set) {
        var i,
          proto = $.ui[module].prototype;
        for (i in set)
          ((proto.plugins[i] = proto.plugins[i] || []),
            proto.plugins[i].push([option, set[i]]));
      },
      call: function (instance, name, args, allowDisconnected) {
        var i,
          set = instance.plugins[name];
        if (
          set &&
          (allowDisconnected ||
            (instance.element[0].parentNode &&
              11 !== instance.element[0].parentNode.nodeType))
        )
          for (i = 0; i < set.length; i++)
            instance.options[set[i][0]] &&
              set[i][1].apply(instance.element, args);
      },
    }));
});
(function (factory) {
  "function" == typeof define && define.amd
    ? define(["jquery"], factory)
    : factory(jQuery);
})(function ($) {
  var orig,
    widget_uuid = 0,
    widget_slice = Array.prototype.slice;
  return (
    ($.cleanData =
      ((orig = $.cleanData),
      function (elems) {
        var events, elem, i;
        for (i = 0; null != (elem = elems[i]); i++)
          try {
            (events = $._data(elem, "events")) &&
              events.remove &&
              $(elem).triggerHandler("remove");
          } catch (e) {}
        orig(elems);
      })),
    ($.widget = function (name, base, prototype) {
      var fullName,
        existingConstructor,
        constructor,
        basePrototype,
        proxiedPrototype = {},
        namespace = name.split(".")[0];
      return (
        (name = name.split(".")[1]),
        (fullName = namespace + "-" + name),
        prototype || ((prototype = base), (base = $.Widget)),
        ($.expr[":"][fullName.toLowerCase()] = function (elem) {
          return !!$.data(elem, fullName);
        }),
        ($[namespace] = $[namespace] || {}),
        (existingConstructor = $[namespace][name]),
        (constructor = $[namespace][name] =
          function (options, element) {
            if (!this._createWidget) return new constructor(options, element);
            arguments.length && this._createWidget(options, element);
          }),
        $.extend(constructor, existingConstructor, {
          version: prototype.version,
          _proto: $.extend({}, prototype),
          _childConstructors: [],
        }),
        ((basePrototype = new base()).options = $.widget.extend(
          {},
          basePrototype.options,
        )),
        $.each(prototype, function (prop, value) {
          var _super, _superApply;
          $.isFunction(value)
            ? (proxiedPrototype[prop] =
                ((_super = function () {
                  return base.prototype[prop].apply(this, arguments);
                }),
                (_superApply = function (args) {
                  return base.prototype[prop].apply(this, args);
                }),
                function () {
                  var returnValue,
                    __super = this._super,
                    __superApply = this._superApply;
                  return (
                    (this._super = _super),
                    (this._superApply = _superApply),
                    (returnValue = value.apply(this, arguments)),
                    (this._super = __super),
                    (this._superApply = __superApply),
                    returnValue
                  );
                }))
            : (proxiedPrototype[prop] = value);
        }),
        (constructor.prototype = $.widget.extend(
          basePrototype,
          {
            widgetEventPrefix:
              (existingConstructor && basePrototype.widgetEventPrefix) || name,
          },
          proxiedPrototype,
          {
            constructor: constructor,
            namespace: namespace,
            widgetName: name,
            widgetFullName: fullName,
          },
        )),
        existingConstructor
          ? ($.each(
              existingConstructor._childConstructors,
              function (i, child) {
                var childPrototype = child.prototype;
                $.widget(
                  childPrototype.namespace + "." + childPrototype.widgetName,
                  constructor,
                  child._proto,
                );
              },
            ),
            delete existingConstructor._childConstructors)
          : base._childConstructors.push(constructor),
        $.widget.bridge(name, constructor),
        constructor
      );
    }),
    ($.widget.extend = function (target) {
      for (
        var key,
          value,
          input = widget_slice.call(arguments, 1),
          inputIndex = 0,
          inputLength = input.length;
        inputIndex < inputLength;
        inputIndex++
      )
        for (key in input[inputIndex])
          ((value = input[inputIndex][key]),
            input[inputIndex].hasOwnProperty(key) &&
              void 0 !== value &&
              ($.isPlainObject(value)
                ? (target[key] = $.isPlainObject(target[key])
                    ? $.widget.extend({}, target[key], value)
                    : $.widget.extend({}, value))
                : (target[key] = value)));
      return target;
    }),
    ($.widget.bridge = function (name, object) {
      var fullName = object.prototype.widgetFullName || name;
      $.fn[name] = function (options) {
        var isMethodCall = "string" == typeof options,
          args = widget_slice.call(arguments, 1),
          returnValue = this;
        return (
          isMethodCall
            ? this.each(function () {
                var methodValue,
                  instance = $.data(this, fullName);
                return "instance" === options
                  ? ((returnValue = instance), !1)
                  : instance
                    ? $.isFunction(instance[options]) &&
                      "_" !== options.charAt(0)
                      ? (methodValue = instance[options].apply(
                          instance,
                          args,
                        )) !== instance && void 0 !== methodValue
                        ? ((returnValue =
                            methodValue && methodValue.jquery
                              ? returnValue.pushStack(methodValue.get())
                              : methodValue),
                          !1)
                        : void 0
                      : $.error(
                          "no such method '" +
                            options +
                            "' for " +
                            name +
                            " widget instance",
                        )
                    : $.error(
                        "cannot call methods on " +
                          name +
                          " prior to initialization; attempted to call method '" +
                          options +
                          "'",
                      );
              })
            : (args.length &&
                (options = $.widget.extend.apply(null, [options].concat(args))),
              this.each(function () {
                var instance = $.data(this, fullName);
                instance
                  ? (instance.option(options || {}),
                    instance._init && instance._init())
                  : $.data(this, fullName, new object(options, this));
              })),
          returnValue
        );
      };
    }),
    ($.Widget = function () {}),
    ($.Widget._childConstructors = []),
    ($.Widget.prototype = {
      widgetName: "widget",
      widgetEventPrefix: "",
      defaultElement: "<div>",
      options: {
        disabled: !1,
        create: null,
      },
      _createWidget: function (options, element) {
        ((element = $(element || this.defaultElement || this)[0]),
          (this.element = $(element)),
          (this.uuid = widget_uuid++),
          (this.eventNamespace = "." + this.widgetName + this.uuid),
          (this.bindings = $()),
          (this.hoverable = $()),
          (this.focusable = $()),
          element !== this &&
            ($.data(element, this.widgetFullName, this),
            this._on(!0, this.element, {
              remove: function (event) {
                event.target === element && this.destroy();
              },
            }),
            (this.document = $(
              element.style
                ? element.ownerDocument
                : element.document || element,
            )),
            (this.window = $(
              this.document[0].defaultView || this.document[0].parentWindow,
            ))),
          (this.options = $.widget.extend(
            {},
            this.options,
            this._getCreateOptions(),
            options,
          )),
          this._create(),
          this._trigger("create", null, this._getCreateEventData()),
          this._init());
      },
      _getCreateOptions: $.noop,
      _getCreateEventData: $.noop,
      _create: $.noop,
      _init: $.noop,
      destroy: function () {
        (this._destroy(),
          this.element
            .unbind(this.eventNamespace)
            .removeData(this.widgetFullName)
            .removeData($.camelCase(this.widgetFullName)),
          this.widget()
            .unbind(this.eventNamespace)
            .removeAttr("aria-disabled")
            .removeClass(this.widgetFullName + "-disabled ui-state-disabled"),
          this.bindings.unbind(this.eventNamespace),
          this.hoverable.removeClass("ui-state-hover"),
          this.focusable.removeClass("ui-state-focus"));
      },
      _destroy: $.noop,
      widget: function () {
        return this.element;
      },
      option: function (key, value) {
        var parts,
          curOption,
          i,
          options = key;
        if (0 === arguments.length) return $.widget.extend({}, this.options);
        if ("string" == typeof key)
          if (
            ((options = {}),
            (parts = key.split(".")),
            (key = parts.shift()),
            parts.length)
          ) {
            for (
              curOption = options[key] = $.widget.extend({}, this.options[key]),
                i = 0;
              i < parts.length - 1;
              i++
            )
              ((curOption[parts[i]] = curOption[parts[i]] || {}),
                (curOption = curOption[parts[i]]));
            if (((key = parts.pop()), 1 === arguments.length))
              return void 0 === curOption[key] ? null : curOption[key];
            curOption[key] = value;
          } else {
            if (1 === arguments.length)
              return void 0 === this.options[key] ? null : this.options[key];
            options[key] = value;
          }
        return (this._setOptions(options), this);
      },
      _setOptions: function (options) {
        var key;
        for (key in options) this._setOption(key, options[key]);
        return this;
      },
      _setOption: function (key, value) {
        return (
          (this.options[key] = value),
          "disabled" === key &&
            (this.widget().toggleClass(
              this.widgetFullName + "-disabled",
              !!value,
            ),
            value &&
              (this.hoverable.removeClass("ui-state-hover"),
              this.focusable.removeClass("ui-state-focus"))),
          this
        );
      },
      enable: function () {
        return this._setOptions({
          disabled: !1,
        });
      },
      disable: function () {
        return this._setOptions({
          disabled: !0,
        });
      },
      _on: function (suppressDisabledCheck, element, handlers) {
        var delegateElement,
          instance = this;
        ("boolean" != typeof suppressDisabledCheck &&
          ((handlers = element),
          (element = suppressDisabledCheck),
          (suppressDisabledCheck = !1)),
          handlers
            ? ((element = delegateElement = $(element)),
              (this.bindings = this.bindings.add(element)))
            : ((handlers = element),
              (element = this.element),
              (delegateElement = this.widget())),
          $.each(handlers, function (event, handler) {
            function handlerProxy() {
              if (
                suppressDisabledCheck ||
                (!0 !== instance.options.disabled &&
                  !$(this).hasClass("ui-state-disabled"))
              )
                return (
                  "string" == typeof handler ? instance[handler] : handler
                ).apply(instance, arguments);
            }
            "string" != typeof handler &&
              (handlerProxy.guid = handler.guid =
                handler.guid || handlerProxy.guid || $.guid++);
            var match = event.match(/^([\w:-]*)\s*(.*)$/),
              eventName = match[1] + instance.eventNamespace,
              selector = match[2];
            selector
              ? delegateElement.delegate(selector, eventName, handlerProxy)
              : element.bind(eventName, handlerProxy);
          }));
      },
      _off: function (element, eventName) {
        ((eventName =
          (eventName || "").split(" ").join(this.eventNamespace + " ") +
          this.eventNamespace),
          element.unbind(eventName).undelegate(eventName),
          (this.bindings = $(this.bindings.not(element).get())),
          (this.focusable = $(this.focusable.not(element).get())),
          (this.hoverable = $(this.hoverable.not(element).get())));
      },
      _delay: function (handler, delay) {
        var instance = this;
        return setTimeout(function () {
          return (
            "string" == typeof handler ? instance[handler] : handler
          ).apply(instance, arguments);
        }, delay || 0);
      },
      _hoverable: function (element) {
        ((this.hoverable = this.hoverable.add(element)),
          this._on(element, {
            mouseenter: function (event) {
              $(event.currentTarget).addClass("ui-state-hover");
            },
            mouseleave: function (event) {
              $(event.currentTarget).removeClass("ui-state-hover");
            },
          }));
      },
      _focusable: function (element) {
        ((this.focusable = this.focusable.add(element)),
          this._on(element, {
            focusin: function (event) {
              $(event.currentTarget).addClass("ui-state-focus");
            },
            focusout: function (event) {
              $(event.currentTarget).removeClass("ui-state-focus");
            },
          }));
      },
      _trigger: function (type, event, data) {
        var prop,
          _orig,
          callback = this.options[type];
        if (
          ((data = data || {}),
          ((event = $.Event(event)).type = (
            type === this.widgetEventPrefix
              ? type
              : this.widgetEventPrefix + type
          ).toLowerCase()),
          (event.target = this.element[0]),
          (_orig = event.originalEvent))
        )
          for (prop in _orig) prop in event || (event[prop] = _orig[prop]);
        return (
          this.element.trigger(event, data),
          !(
            ($.isFunction(callback) &&
              !1 === callback.apply(this.element[0], [event].concat(data))) ||
            event.isDefaultPrevented()
          )
        );
      },
    }),
    $.each(
      {
        show: "fadeIn",
        hide: "fadeOut",
      },
      function (method, defaultEffect) {
        $.Widget.prototype["_" + method] = function (
          element,
          options,
          callback,
        ) {
          "string" == typeof options &&
            (options = {
              effect: options,
            });
          var hasOptions,
            effectName = options
              ? !0 === options || "number" == typeof options
                ? defaultEffect
                : options.effect || defaultEffect
              : method;
          ("number" == typeof (options = options || {}) &&
            (options = {
              duration: options,
            }),
            (hasOptions = !$.isEmptyObject(options)),
            (options.complete = callback),
            options.delay && element.delay(options.delay),
            hasOptions && $.effects && $.effects.effect[effectName]
              ? element[method](options)
              : effectName !== method && element[effectName]
                ? element[effectName](
                    options.duration,
                    options.easing,
                    callback,
                  )
                : element.queue(function (next) {
                    ($(this)[method](),
                      callback && callback.call(element[0]),
                      next());
                  }));
        };
      },
    ),
    $.widget
  );
});
(function (factory) {
  "function" == typeof define && define.amd
    ? define(["jquery", "./widget"], factory)
    : factory(jQuery);
})(function ($) {
  var mouseHandled = !1;
  return (
    $(document).mouseup(function () {
      mouseHandled = !1;
    }),
    $.widget("ui.mouse", {
      version: "1.11.3",
      options: {
        cancel: "input,textarea,button,select,option",
        distance: 1,
        delay: 0,
      },
      _mouseInit: function () {
        var that = this;
        (this.element
          .bind("mousedown." + this.widgetName, function (event) {
            return that._mouseDown(event);
          })
          .bind("click." + this.widgetName, function (event) {
            if (
              !0 ===
              $.data(event.target, that.widgetName + ".preventClickEvent")
            )
              return (
                $.removeData(
                  event.target,
                  that.widgetName + ".preventClickEvent",
                ),
                event.stopImmediatePropagation(),
                !1
              );
          }),
          (this.started = !1));
      },
      _mouseDestroy: function () {
        (this.element.unbind("." + this.widgetName),
          this._mouseMoveDelegate &&
            this.document
              .unbind("mousemove." + this.widgetName, this._mouseMoveDelegate)
              .unbind("mouseup." + this.widgetName, this._mouseUpDelegate));
      },
      _mouseDown: function (event) {
        if (!mouseHandled) {
          ((this._mouseMoved = !1),
            this._mouseStarted && this._mouseUp(event),
            (this._mouseDownEvent = event));
          var that = this,
            btnIsLeft = 1 === event.which,
            elIsCancel =
              !(
                "string" != typeof this.options.cancel || !event.target.nodeName
              ) && $(event.target).closest(this.options.cancel).length;
          return (
            !(btnIsLeft && !elIsCancel && this._mouseCapture(event)) ||
            ((this.mouseDelayMet = !this.options.delay),
            this.mouseDelayMet ||
              (this._mouseDelayTimer = setTimeout(function () {
                that.mouseDelayMet = !0;
              }, this.options.delay)),
            this._mouseDistanceMet(event) &&
            this._mouseDelayMet(event) &&
            ((this._mouseStarted = !1 !== this._mouseStart(event)),
            !this._mouseStarted)
              ? (event.preventDefault(), !0)
              : (!0 ===
                  $.data(
                    event.target,
                    this.widgetName + ".preventClickEvent",
                  ) &&
                  $.removeData(
                    event.target,
                    this.widgetName + ".preventClickEvent",
                  ),
                (this._mouseMoveDelegate = function (_event) {
                  return that._mouseMove(_event);
                }),
                (this._mouseUpDelegate = function (_event) {
                  return that._mouseUp(_event);
                }),
                this.document
                  .bind("mousemove." + this.widgetName, this._mouseMoveDelegate)
                  .bind("mouseup." + this.widgetName, this._mouseUpDelegate),
                event.preventDefault(),
                (mouseHandled = !0),
                !0))
          );
        }
      },
      _mouseMove: function (event) {
        if (this._mouseMoved) {
          if (
            $.ui.ie &&
            (!document.documentMode || document.documentMode < 9) &&
            !event.button
          )
            return this._mouseUp(event);
          if (!event.which) return this._mouseUp(event);
        }
        return (
          (event.which || event.button) && (this._mouseMoved = !0),
          this._mouseStarted
            ? (this._mouseDrag(event), event.preventDefault())
            : (this._mouseDistanceMet(event) &&
                this._mouseDelayMet(event) &&
                ((this._mouseStarted =
                  !1 !== this._mouseStart(this._mouseDownEvent, event)),
                this._mouseStarted
                  ? this._mouseDrag(event)
                  : this._mouseUp(event)),
              !this._mouseStarted)
        );
      },
      _mouseUp: function (event) {
        return (
          this.document
            .unbind("mousemove." + this.widgetName, this._mouseMoveDelegate)
            .unbind("mouseup." + this.widgetName, this._mouseUpDelegate),
          this._mouseStarted &&
            ((this._mouseStarted = !1),
            event.target === this._mouseDownEvent.target &&
              $.data(event.target, this.widgetName + ".preventClickEvent", !0),
            this._mouseStop(event)),
          (mouseHandled = !1),
          !1
        );
      },
      _mouseDistanceMet: function (event) {
        return (
          Math.max(
            Math.abs(this._mouseDownEvent.pageX - event.pageX),
            Math.abs(this._mouseDownEvent.pageY - event.pageY),
          ) >= this.options.distance
        );
      },
      _mouseDelayMet: function () {
        return this.mouseDelayMet;
      },
      _mouseStart: function () {},
      _mouseDrag: function () {},
      _mouseStop: function () {},
      _mouseCapture: function () {
        return !0;
      },
    })
  );
});
(function (factory) {
  "function" == typeof define && define.amd
    ? define(["jquery"], factory)
    : factory(jQuery);
})(function ($) {
  var baseEasings,
    jQuery = $;
  return (
    ($.effects = {
      effect: {},
    }),
    (function (_jQuery, _undefined) {
      var colors,
        rplusequals = /^([\-+])=\s*(\d+\.?\d*)/,
        stringParsers = [
          {
            re: /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d?(?:\.\d+)?)\s*)?\)/,
            parse: function (execResult) {
              return [
                execResult[1],
                execResult[2],
                execResult[3],
                execResult[4],
              ];
            },
          },
          {
            re: /rgba?\(\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d?(?:\.\d+)?)\s*)?\)/,
            parse: function (execResult) {
              return [
                2.55 * execResult[1],
                2.55 * execResult[2],
                2.55 * execResult[3],
                execResult[4],
              ];
            },
          },
          {
            re: /#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/,
            parse: function (execResult) {
              return [
                parseInt(execResult[1], 16),
                parseInt(execResult[2], 16),
                parseInt(execResult[3], 16),
              ];
            },
          },
          {
            re: /#([a-f0-9])([a-f0-9])([a-f0-9])/,
            parse: function (execResult) {
              return [
                parseInt(execResult[1] + execResult[1], 16),
                parseInt(execResult[2] + execResult[2], 16),
                parseInt(execResult[3] + execResult[3], 16),
              ];
            },
          },
          {
            re: /hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d?(?:\.\d+)?)\s*)?\)/,
            space: "hsla",
            parse: function (execResult) {
              return [
                execResult[1],
                execResult[2] / 100,
                execResult[3] / 100,
                execResult[4],
              ];
            },
          },
        ],
        color = (_jQuery.Color = function (_color, green, blue, alpha) {
          return new _jQuery.Color.fn.parse(_color, green, blue, alpha);
        }),
        spaces = {
          rgba: {
            props: {
              red: {
                idx: 0,
                type: "byte",
              },
              green: {
                idx: 1,
                type: "byte",
              },
              blue: {
                idx: 2,
                type: "byte",
              },
            },
          },
          hsla: {
            props: {
              hue: {
                idx: 0,
                type: "degrees",
              },
              saturation: {
                idx: 1,
                type: "percent",
              },
              lightness: {
                idx: 2,
                type: "percent",
              },
            },
          },
        },
        propTypes = {
          byte: {
            floor: !0,
            max: 255,
          },
          percent: {
            max: 1,
          },
          degrees: {
            mod: 360,
            floor: !0,
          },
        },
        support = (color.support = {}),
        supportElem = _jQuery("<p>")[0],
        each = _jQuery.each;
      function clamp(value, prop, allowEmpty) {
        var type = propTypes[prop.type] || {};
        return null == value
          ? allowEmpty || !prop.def
            ? null
            : prop.def
          : ((value = type.floor ? ~~value : parseFloat(value)),
            isNaN(value)
              ? prop.def
              : type.mod
                ? (value + type.mod) % type.mod
                : 0 > value
                  ? 0
                  : type.max < value
                    ? type.max
                    : value);
      }
      function stringParse(string) {
        var inst = color(),
          rgba = (inst._rgba = []);
        return (
          (string = string.toLowerCase()),
          each(stringParsers, function (i, parser) {
            var parsed,
              match = parser.re.exec(string),
              values = match && parser.parse(match),
              spaceName = parser.space || "rgba";
            if (values)
              return (
                (parsed = inst[spaceName](values)),
                (inst[spaces[spaceName].cache] =
                  parsed[spaces[spaceName].cache]),
                (rgba = inst._rgba = parsed._rgba),
                !1
              );
          }),
          rgba.length
            ? ("0,0,0,0" === rgba.join() &&
                _jQuery.extend(rgba, colors.transparent),
              inst)
            : colors[string]
        );
      }
      function hue2rgb(p, q, h) {
        return 6 * (h = (h + 1) % 1) < 1
          ? p + (q - p) * h * 6
          : 2 * h < 1
            ? q
            : 3 * h < 2
              ? p + (q - p) * (2 / 3 - h) * 6
              : p;
      }
      ((supportElem.style.cssText = "background-color:rgba(1,1,1,.5)"),
        (support.rgba = supportElem.style.backgroundColor.indexOf("rgba") > -1),
        each(spaces, function (spaceName, space) {
          ((space.cache = "_" + spaceName),
            (space.props.alpha = {
              idx: 3,
              type: "percent",
              def: 1,
            }));
        }),
        (color.fn = _jQuery.extend(color.prototype, {
          parse: function (red, green, blue, alpha) {
            if (void 0 === red)
              return ((this._rgba = [null, null, null, null]), this);
            (red.jquery || red.nodeType) &&
              ((red = _jQuery(red).css(green)), (green = void 0));
            var inst = this,
              type = _jQuery.type(red),
              rgba = (this._rgba = []);
            return (
              void 0 !== green &&
                ((red = [red, green, blue, alpha]), (type = "array")),
              "string" === type
                ? this.parse(stringParse(red) || colors._default)
                : "array" === type
                  ? (each(spaces.rgba.props, function (key, prop) {
                      rgba[prop.idx] = clamp(red[prop.idx], prop);
                    }),
                    this)
                  : "object" === type
                    ? (each(
                        spaces,
                        red instanceof color
                          ? function (spaceName, space) {
                              red[space.cache] &&
                                (inst[space.cache] = red[space.cache].slice());
                            }
                          : function (spaceName, space) {
                              var cache = space.cache;
                              (each(space.props, function (key, prop) {
                                if (!inst[cache] && space.to) {
                                  if ("alpha" === key || null == red[key])
                                    return;
                                  inst[cache] = space.to(inst._rgba);
                                }
                                inst[cache][prop.idx] = clamp(
                                  red[key],
                                  prop,
                                  !0,
                                );
                              }),
                                inst[cache] &&
                                  _jQuery.inArray(
                                    null,
                                    inst[cache].slice(0, 3),
                                  ) < 0 &&
                                  ((inst[cache][3] = 1),
                                  space.from &&
                                    (inst._rgba = space.from(inst[cache]))));
                            },
                      ),
                      this)
                    : void 0
            );
          },
          is: function (compare) {
            var is = color(compare),
              same = !0,
              inst = this;
            return (
              each(spaces, function (_, space) {
                var localCache,
                  isCache = is[space.cache];
                return (
                  isCache &&
                    ((localCache =
                      inst[space.cache] ||
                      (space.to && space.to(inst._rgba)) ||
                      []),
                    each(space.props, function (__, prop) {
                      if (null != isCache[prop.idx])
                        return (same =
                          isCache[prop.idx] === localCache[prop.idx]);
                    })),
                  same
                );
              }),
              same
            );
          },
          _space: function () {
            var used = [],
              inst = this;
            return (
              each(spaces, function (spaceName, space) {
                inst[space.cache] && used.push(spaceName);
              }),
              used.pop()
            );
          },
          transition: function (other, distance) {
            var end = color(other),
              spaceName = end._space(),
              space = spaces[spaceName],
              startColor = 0 === this.alpha() ? color("transparent") : this,
              start = startColor[space.cache] || space.to(startColor._rgba),
              result = start.slice();
            return (
              (end = end[space.cache]),
              each(space.props, function (key, prop) {
                var index = prop.idx,
                  startValue = start[index],
                  endValue = end[index],
                  type = propTypes[prop.type] || {};
                null !== endValue &&
                  (null === startValue
                    ? (result[index] = endValue)
                    : (type.mod &&
                        (endValue - startValue > type.mod / 2
                          ? (startValue += type.mod)
                          : startValue - endValue > type.mod / 2 &&
                            (startValue -= type.mod)),
                      (result[index] = clamp(
                        (endValue - startValue) * distance + startValue,
                        prop,
                      ))));
              }),
              this[spaceName](result)
            );
          },
          blend: function (opaque) {
            if (1 === this._rgba[3]) return this;
            var rgb = this._rgba.slice(),
              a = rgb.pop(),
              blend = color(opaque)._rgba;
            return color(
              _jQuery.map(rgb, function (v, i) {
                return (1 - a) * blend[i] + a * v;
              }),
            );
          },
          toRgbaString: function () {
            var prefix = "rgba(",
              rgba = _jQuery.map(this._rgba, function (v, i) {
                return null == v ? (i > 2 ? 1 : 0) : v;
              });
            return (
              1 === rgba[3] && (rgba.pop(), (prefix = "rgb(")),
              prefix + rgba.join() + ")"
            );
          },
          toHslaString: function () {
            var prefix = "hsla(",
              hsla = _jQuery.map(this.hsla(), function (v, i) {
                return (
                  null == v && (v = i > 2 ? 1 : 0),
                  i && i < 3 && (v = Math.round(100 * v) + "%"),
                  v
                );
              });
            return (
              1 === hsla[3] && (hsla.pop(), (prefix = "hsl(")),
              prefix + hsla.join() + ")"
            );
          },
          toHexString: function (includeAlpha) {
            var rgba = this._rgba.slice(),
              alpha = rgba.pop();
            return (
              includeAlpha && rgba.push(~~(255 * alpha)),
              "#" +
                _jQuery
                  .map(rgba, function (v) {
                    return 1 === (v = (v || 0).toString(16)).length
                      ? "0" + v
                      : v;
                  })
                  .join("")
            );
          },
          toString: function () {
            return 0 === this._rgba[3] ? "transparent" : this.toRgbaString();
          },
        })),
        (color.fn.parse.prototype = color.fn),
        (spaces.hsla.to = function (rgba) {
          if (null == rgba[0] || null == rgba[1] || null == rgba[2])
            return [null, null, null, rgba[3]];
          var h,
            s,
            r = rgba[0] / 255,
            g = rgba[1] / 255,
            b = rgba[2] / 255,
            a = rgba[3],
            max = Math.max(r, g, b),
            min = Math.min(r, g, b),
            diff = max - min,
            add = max + min,
            l = 0.5 * add;
          return (
            (h =
              min === max
                ? 0
                : r === max
                  ? (60 * (g - b)) / diff + 360
                  : g === max
                    ? (60 * (b - r)) / diff + 120
                    : (60 * (r - g)) / diff + 240),
            (s = 0 === diff ? 0 : l <= 0.5 ? diff / add : diff / (2 - add)),
            [Math.round(h) % 360, s, l, null == a ? 1 : a]
          );
        }),
        (spaces.hsla.from = function (hsla) {
          if (null == hsla[0] || null == hsla[1] || null == hsla[2])
            return [null, null, null, hsla[3]];
          var h = hsla[0] / 360,
            s = hsla[1],
            l = hsla[2],
            a = hsla[3],
            q = l <= 0.5 ? l * (1 + s) : l + s - l * s,
            p = 2 * l - q;
          return [
            Math.round(255 * hue2rgb(p, q, h + 1 / 3)),
            Math.round(255 * hue2rgb(p, q, h)),
            Math.round(255 * hue2rgb(p, q, h - 1 / 3)),
            a,
          ];
        }),
        each(spaces, function (spaceName, space) {
          var props = space.props,
            cache = space.cache,
            to = space.to,
            from = space.from;
          ((color.fn[spaceName] = function (value) {
            if (
              (to && !this[cache] && (this[cache] = to(this._rgba)),
              void 0 === value)
            )
              return this[cache].slice();
            var ret,
              type = _jQuery.type(value),
              arr = "array" === type || "object" === type ? value : arguments,
              local = this[cache].slice();
            return (
              each(props, function (key, prop) {
                var val = arr["object" === type ? key : prop.idx];
                (null == val && (val = local[prop.idx]),
                  (local[prop.idx] = clamp(val, prop)));
              }),
              from
                ? (((ret = color(from(local)))[cache] = local), ret)
                : color(local)
            );
          }),
            each(props, function (key, prop) {
              color.fn[key] ||
                (color.fn[key] = function (value) {
                  var match,
                    vtype = _jQuery.type(value),
                    fn =
                      "alpha" === key
                        ? this._hsla
                          ? "hsla"
                          : "rgba"
                        : spaceName,
                    local = this[fn](),
                    cur = local[prop.idx];
                  return "undefined" === vtype
                    ? cur
                    : ("function" === vtype &&
                        ((value = value.call(this, cur)),
                        (vtype = _jQuery.type(value))),
                      null == value && prop.empty
                        ? this
                        : ("string" === vtype &&
                            (match = rplusequals.exec(value)) &&
                            (value =
                              cur +
                              parseFloat(match[2]) *
                                ("+" === match[1] ? 1 : -1)),
                          (local[prop.idx] = value),
                          this[fn](local)));
                });
            }));
        }),
        (color.hook = function (hook) {
          var hooks = hook.split(" ");
          each(hooks, function (i, _hook) {
            ((_jQuery.cssHooks[_hook] = {
              set: function (elem, value) {
                var parsed,
                  curElem,
                  backgroundColor = "";
                if (
                  "transparent" !== value &&
                  ("string" !== _jQuery.type(value) ||
                    (parsed = stringParse(value)))
                ) {
                  if (
                    ((value = color(parsed || value)),
                    !support.rgba && 1 !== value._rgba[3])
                  ) {
                    for (
                      curElem =
                        "backgroundColor" === _hook ? elem.parentNode : elem;
                      ("" === backgroundColor ||
                        "transparent" === backgroundColor) &&
                      curElem &&
                      curElem.style;
                    )
                      try {
                        ((backgroundColor = _jQuery.css(
                          curElem,
                          "backgroundColor",
                        )),
                          (curElem = curElem.parentNode));
                      } catch (e) {}
                    value = value.blend(
                      backgroundColor && "transparent" !== backgroundColor
                        ? backgroundColor
                        : "_default",
                    );
                  }
                  value = value.toRgbaString();
                }
                try {
                  elem.style[_hook] = value;
                } catch (e) {}
              },
            }),
              (_jQuery.fx.step[_hook] = function (fx) {
                (fx.colorInit ||
                  ((fx.start = color(fx.elem, _hook)),
                  (fx.end = color(fx.end)),
                  (fx.colorInit = !0)),
                  _jQuery.cssHooks[_hook].set(
                    fx.elem,
                    fx.start.transition(fx.end, fx.pos),
                  ));
              }));
          });
        }),
        color.hook(
          "backgroundColor borderBottomColor borderLeftColor borderRightColor borderTopColor color columnRuleColor outlineColor textDecorationColor textEmphasisColor",
        ),
        (_jQuery.cssHooks.borderColor = {
          expand: function (value) {
            var expanded = {};
            return (
              each(["Top", "Right", "Bottom", "Left"], function (i, part) {
                expanded["border" + part + "Color"] = value;
              }),
              expanded
            );
          },
        }),
        (colors = _jQuery.Color.names =
          {
            aqua: "#00ffff",
            black: "#000000",
            blue: "#0000ff",
            fuchsia: "#ff00ff",
            gray: "#808080",
            green: "#008000",
            lime: "#00ff00",
            maroon: "#800000",
            navy: "#000080",
            olive: "#808000",
            purple: "#800080",
            red: "#ff0000",
            silver: "#c0c0c0",
            teal: "#008080",
            white: "#ffffff",
            yellow: "#ffff00",
            transparent: [null, null, null, 0],
            _default: "#ffffff",
          }));
    })(jQuery),
    (function () {
      var orig,
        classAnimationActions = ["add", "remove", "toggle"],
        shorthandStyles = {
          border: 1,
          borderBottom: 1,
          borderColor: 1,
          borderLeft: 1,
          borderRight: 1,
          borderTop: 1,
          borderWidth: 1,
          margin: 1,
          padding: 1,
        };
      function getElementStyles(elem) {
        var key,
          len,
          style = elem.ownerDocument.defaultView
            ? elem.ownerDocument.defaultView.getComputedStyle(elem, null)
            : elem.currentStyle,
          styles = {};
        if (style && style.length && style[0] && style[style[0]])
          for (len = style.length; len--;)
            "string" == typeof style[(key = style[len])] &&
              (styles[$.camelCase(key)] = style[key]);
        else
          for (key in style)
            "string" == typeof style[key] && (styles[key] = style[key]);
        return styles;
      }
      ($.each(
        [
          "borderLeftStyle",
          "borderRightStyle",
          "borderBottomStyle",
          "borderTopStyle",
        ],
        function (_, prop) {
          $.fx.step[prop] = function (fx) {
            (("none" !== fx.end && !fx.setAttr) ||
              (1 === fx.pos && !fx.setAttr)) &&
              (jQuery.style(fx.elem, prop, fx.end), (fx.setAttr = !0));
          };
        },
      ),
        $.fn.addBack ||
          ($.fn.addBack = function (selector) {
            return this.add(
              null == selector
                ? this.prevObject
                : this.prevObject.filter(selector),
            );
          }),
        ($.effects.animateClass = function (value, duration, easing, callback) {
          var o = $.speed(duration, easing, callback);
          return this.queue(function () {
            var applyClassChange,
              animated = $(this),
              baseClass = animated.attr("class") || "",
              allAnimations = o.children
                ? animated.find("*").addBack()
                : animated;
            ((allAnimations = allAnimations.map(function () {
              return {
                el: $(this),
                start: getElementStyles(this),
              };
            })),
              (applyClassChange = function () {
                $.each(classAnimationActions, function (i, action) {
                  value[action] && animated[action + "Class"](value[action]);
                });
              })(),
              (allAnimations = allAnimations.map(function () {
                return (
                  (this.end = getElementStyles(this.el[0])),
                  (this.diff = (function (oldStyle, newStyle) {
                    var name,
                      _value,
                      diff = {};
                    for (name in newStyle)
                      ((_value = newStyle[name]),
                        oldStyle[name] !== _value &&
                          (shorthandStyles[name] ||
                            (!$.fx.step[name] && isNaN(parseFloat(_value))) ||
                            (diff[name] = _value)));
                    return diff;
                  })(this.start, this.end)),
                  this
                );
              })),
              animated.attr("class", baseClass),
              (allAnimations = allAnimations.map(function () {
                var styleInfo = this,
                  dfd = $.Deferred(),
                  opts = $.extend({}, o, {
                    queue: !1,
                    complete: function () {
                      dfd.resolve(styleInfo);
                    },
                  });
                return (this.el.animate(this.diff, opts), dfd.promise());
              })),
              $.when.apply($, allAnimations.get()).done(function () {
                (applyClassChange(),
                  $.each(arguments, function () {
                    var el = this.el;
                    $.each(this.diff, function (key) {
                      el.css(key, "");
                    });
                  }),
                  o.complete.call(animated[0]));
              }));
          });
        }),
        $.fn.extend({
          addClass:
            ((orig = $.fn.addClass),
            function (classNames, speed, easing, callback) {
              return speed
                ? $.effects.animateClass.call(
                    this,
                    {
                      add: classNames,
                    },
                    speed,
                    easing,
                    callback,
                  )
                : orig.apply(this, arguments);
            }),
          removeClass: (function (_orig) {
            return function (classNames, speed, easing, callback) {
              return arguments.length > 1
                ? $.effects.animateClass.call(
                    this,
                    {
                      remove: classNames,
                    },
                    speed,
                    easing,
                    callback,
                  )
                : _orig.apply(this, arguments);
            };
          })($.fn.removeClass),
          toggleClass: (function (_orig) {
            return function (classNames, force, speed, easing, callback) {
              return "boolean" == typeof force || void 0 === force
                ? speed
                  ? $.effects.animateClass.call(
                      this,
                      force
                        ? {
                            add: classNames,
                          }
                        : {
                            remove: classNames,
                          },
                      speed,
                      easing,
                      callback,
                    )
                  : _orig.apply(this, arguments)
                : $.effects.animateClass.call(
                    this,
                    {
                      toggle: classNames,
                    },
                    force,
                    speed,
                    easing,
                  );
            };
          })($.fn.toggleClass),
          switchClass: function (remove, add, speed, easing, callback) {
            return $.effects.animateClass.call(
              this,
              {
                add: add,
                remove: remove,
              },
              speed,
              easing,
              callback,
            );
          },
        }));
    })(),
    (function () {
      function _normalizeArguments(effect, options, speed, callback) {
        return (
          $.isPlainObject(effect) &&
            ((options = effect), (effect = effect.effect)),
          (effect = {
            effect: effect,
          }),
          null == options && (options = {}),
          $.isFunction(options) &&
            ((callback = options), (speed = null), (options = {})),
          ("number" == typeof options || $.fx.speeds[options]) &&
            ((callback = speed), (speed = options), (options = {})),
          $.isFunction(speed) && ((callback = speed), (speed = null)),
          options && $.extend(effect, options),
          (speed = speed || options.duration),
          (effect.duration = $.fx.off
            ? 0
            : "number" == typeof speed
              ? speed
              : speed in $.fx.speeds
                ? $.fx.speeds[speed]
                : $.fx.speeds._default),
          (effect.complete = callback || options.complete),
          effect
        );
      }
      function standardAnimationOption(option) {
        return (
          !(option && "number" != typeof option && !$.fx.speeds[option]) ||
          ("string" == typeof option && !$.effects.effect[option]) ||
          !!$.isFunction(option) ||
          ("object" == typeof option && !option.effect)
        );
      }
      var orig;
      ($.extend($.effects, {
        version: "1.11.3",
        save: function (element, set) {
          for (var i = 0; i < set.length; i++)
            null !== set[i] &&
              element.data("ui-effects-" + set[i], element[0].style[set[i]]);
        },
        restore: function (element, set) {
          var val, i;
          for (i = 0; i < set.length; i++)
            null !== set[i] &&
              (void 0 === (val = element.data("ui-effects-" + set[i])) &&
                (val = ""),
              element.css(set[i], val));
        },
        setMode: function (el, mode) {
          return (
            "toggle" === mode && (mode = el.is(":hidden") ? "show" : "hide"),
            mode
          );
        },
        getBaseline: function (origin, original) {
          var y, x;
          switch (origin[0]) {
            case "top":
              y = 0;
              break;
            case "middle":
              y = 0.5;
              break;
            case "bottom":
              y = 1;
              break;
            default:
              y = origin[0] / original.height;
          }
          switch (origin[1]) {
            case "left":
              x = 0;
              break;
            case "center":
              x = 0.5;
              break;
            case "right":
              x = 1;
              break;
            default:
              x = origin[1] / original.width;
          }
          return {
            x: x,
            y: y,
          };
        },
        createWrapper: function (element) {
          if (element.parent().is(".ui-effects-wrapper"))
            return element.parent();
          var props = {
              width: element.outerWidth(!0),
              height: element.outerHeight(!0),
              float: element.css("float"),
            },
            wrapper = $("<div></div>").addClass("ui-effects-wrapper").css({
              fontSize: "100%",
              background: "transparent",
              border: "none",
              margin: 0,
              padding: 0,
            }),
            size = {
              width: element.width(),
              height: element.height(),
            },
            active = document.activeElement;
          try {
            active.id;
          } catch (e) {
            active = document.body;
          }
          return (
            element.wrap(wrapper),
            (element[0] === active || $.contains(element[0], active)) &&
              $(active).focus(),
            (wrapper = element.parent()),
            "static" === element.css("position")
              ? (wrapper.css({
                  position: "relative",
                }),
                element.css({
                  position: "relative",
                }))
              : ($.extend(props, {
                  position: element.css("position"),
                  zIndex: element.css("z-index"),
                }),
                $.each(["top", "left", "bottom", "right"], function (i, pos) {
                  ((props[pos] = element.css(pos)),
                    isNaN(parseInt(props[pos], 10)) && (props[pos] = "auto"));
                }),
                element.css({
                  position: "relative",
                  top: 0,
                  left: 0,
                  right: "auto",
                  bottom: "auto",
                })),
            element.css(size),
            wrapper.css(props).show()
          );
        },
        removeWrapper: function (element) {
          var active = document.activeElement;
          return (
            element.parent().is(".ui-effects-wrapper") &&
              (element.parent().replaceWith(element),
              (element[0] === active || $.contains(element[0], active)) &&
                $(active).focus()),
            element
          );
        },
        setTransition: function (element, list, factor, value) {
          return (
            (value = value || {}),
            $.each(list, function (i, x) {
              var unit = element.cssUnit(x);
              unit[0] > 0 && (value[x] = unit[0] * factor + unit[1]);
            }),
            value
          );
        },
      }),
        $.fn.extend({
          effect: function () {
            var args = _normalizeArguments.apply(this, arguments),
              mode = args.mode,
              queue = args.queue,
              effectMethod = $.effects.effect[args.effect];
            if ($.fx.off || !effectMethod)
              return mode
                ? this[mode](args.duration, args.complete)
                : this.each(function () {
                    args.complete && args.complete.call(this);
                  });
            function run(next) {
              var elem = $(this),
                complete = args.complete,
                _mode = args.mode;
              function done() {
                ($.isFunction(complete) && complete.call(elem[0]),
                  $.isFunction(next) && next());
              }
              (elem.is(":hidden") ? "hide" === _mode : "show" === _mode)
                ? (elem[_mode](), done())
                : effectMethod.call(elem[0], args, done);
            }
            return !1 === queue
              ? this.each(run)
              : this.queue(queue || "fx", run);
          },
          show:
            ((orig = $.fn.show),
            function (option) {
              if (standardAnimationOption(option))
                return orig.apply(this, arguments);
              var args = _normalizeArguments.apply(this, arguments);
              return ((args.mode = "show"), this.effect.call(this, args));
            }),
          hide: (function (_orig) {
            return function (option) {
              if (standardAnimationOption(option))
                return _orig.apply(this, arguments);
              var args = _normalizeArguments.apply(this, arguments);
              return ((args.mode = "hide"), this.effect.call(this, args));
            };
          })($.fn.hide),
          toggle: (function (_orig) {
            return function (option) {
              if (standardAnimationOption(option) || "boolean" == typeof option)
                return _orig.apply(this, arguments);
              var args = _normalizeArguments.apply(this, arguments);
              return ((args.mode = "toggle"), this.effect.call(this, args));
            };
          })($.fn.toggle),
          cssUnit: function (key) {
            var style = this.css(key),
              val = [];
            return (
              $.each(["em", "px", "%", "pt"], function (i, unit) {
                style.indexOf(unit) > 0 && (val = [parseFloat(style), unit]);
              }),
              val
            );
          },
        }));
    })(),
    (baseEasings = {}),
    $.each(["Quad", "Cubic", "Quart", "Quint", "Expo"], function (i, name) {
      baseEasings[name] = function (p) {
        return Math.pow(p, i + 2);
      };
    }),
    $.extend(baseEasings, {
      Sine: function (p) {
        return 1 - Math.cos((p * Math.PI) / 2);
      },
      Circ: function (p) {
        return 1 - Math.sqrt(1 - p * p);
      },
      Elastic: function (p) {
        return 0 === p || 1 === p
          ? p
          : -Math.pow(2, 8 * (p - 1)) *
              Math.sin(((80 * (p - 1) - 7.5) * Math.PI) / 15);
      },
      Back: function (p) {
        return p * p * (3 * p - 2);
      },
      Bounce: function (p) {
        for (
          var pow2, bounce = 4;
          p < ((pow2 = Math.pow(2, --bounce)) - 1) / 11;
        );
        return (
          1 / Math.pow(4, 3 - bounce) -
          7.5625 * Math.pow((3 * pow2 - 2) / 22 - p, 2)
        );
      },
    }),
    $.each(baseEasings, function (name, easeIn) {
      (($.easing["easeIn" + name] = easeIn),
        ($.easing["easeOut" + name] = function (p) {
          return 1 - easeIn(1 - p);
        }),
        ($.easing["easeInOut" + name] = function (p) {
          return p < 0.5 ? easeIn(2 * p) / 2 : 1 - easeIn(-2 * p + 2) / 2;
        }));
    }),
    $.effects
  );
});
