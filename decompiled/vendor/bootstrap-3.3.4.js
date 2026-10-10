// bootstrap-3.3.4.js – extracted from solitr.com's application.js (parts: 002 003 004).
// Identifier names restored from the source map by tools/unminify.js.
(function ($) {
  "use strict";

  var backdrop = ".dropdown-backdrop",
    toggle = '[data-toggle="dropdown"]',
    Dropdown = function (element) {
      $(element).on("click.bs.dropdown", this.toggle);
    };
  function clearMenus(e) {
    (e && 3 === e.which) ||
      ($(backdrop).remove(),
      $(toggle).each(function () {
        var $this = $(this),
          $parent = getParent($this),
          relatedTarget = {
            relatedTarget: this,
          };
        $parent.hasClass("open") &&
          ($parent.trigger((e = $.Event("hide.bs.dropdown", relatedTarget))),
          e.isDefaultPrevented() ||
            ($this.attr("aria-expanded", "false"),
            $parent
              .removeClass("open")
              .trigger("hidden.bs.dropdown", relatedTarget)));
      }));
  }
  function getParent($this) {
    var selector = $this.attr("data-target");
    selector ||
      (selector =
        (selector = $this.attr("href")) &&
        /#[A-Za-z]/.test(selector) &&
        selector.replace(/.*(?=#[^\s]*$)/, ""));
    var $parent = selector && $(selector);
    return $parent && $parent.length ? $parent : $this.parent();
  }
  ((Dropdown.VERSION = "3.3.4"),
    (Dropdown.prototype.toggle = function (e) {
      var $this = $(this);
      if (!$this.is(".disabled, :disabled")) {
        var $parent = getParent($this),
          isActive = $parent.hasClass("open");
        if ((clearMenus(), !isActive)) {
          "ontouchstart" in document.documentElement &&
            !$parent.closest(".navbar-nav").length &&
            $('<div class="dropdown-backdrop"/>')
              .insertAfter($(this))
              .on("click", clearMenus);
          var relatedTarget = {
            relatedTarget: this,
          };
          if (
            ($parent.trigger((e = $.Event("show.bs.dropdown", relatedTarget))),
            e.isDefaultPrevented())
          )
            return;
          ($this.trigger("focus").attr("aria-expanded", "true"),
            $parent
              .toggleClass("open")
              .trigger("shown.bs.dropdown", relatedTarget));
        }
        return !1;
      }
    }),
    (Dropdown.prototype.keydown = function (e) {
      if (
        /(38|40|27|32)/.test(e.which) &&
        !/input|textarea/i.test(e.target.tagName)
      ) {
        var $this = $(this);
        if (
          (e.preventDefault(),
          e.stopPropagation(),
          !$this.is(".disabled, :disabled"))
        ) {
          var $parent = getParent($this),
            isActive = $parent.hasClass("open");
          if ((!isActive && 27 != e.which) || (isActive && 27 == e.which))
            return (
              27 == e.which && $parent.find(toggle).trigger("focus"),
              $this.trigger("click")
            );
          var desc = " li:not(.disabled):visible a",
            $items = $parent.find(
              '[role="menu"]' + desc + ', [role="listbox"]' + desc,
            );
          if ($items.length) {
            var index = $items.index(e.target);
            (38 == e.which && index > 0 && index--,
              40 == e.which && index < $items.length - 1 && index++,
              ~index || (index = 0),
              $items.eq(index).trigger("focus"));
          }
        }
      }
    }));
  var old = $.fn.dropdown;
  (($.fn.dropdown = function (option) {
    return this.each(function () {
      var $this = $(this),
        data = $this.data("bs.dropdown");
      (data || $this.data("bs.dropdown", (data = new Dropdown(this))),
        "string" == typeof option && data[option].call($this));
    });
  }),
    ($.fn.dropdown.Constructor = Dropdown),
    ($.fn.dropdown.noConflict = function () {
      return (($.fn.dropdown = old), this);
    }),
    $(document)
      .on("click.bs.dropdown.data-api", clearMenus)
      .on("click.bs.dropdown.data-api", ".dropdown form", function (e) {
        e.stopPropagation();
      })
      .on("click.bs.dropdown.data-api", toggle, Dropdown.prototype.toggle)
      .on("keydown.bs.dropdown.data-api", toggle, Dropdown.prototype.keydown)
      .on(
        "keydown.bs.dropdown.data-api",
        '[role="menu"]',
        Dropdown.prototype.keydown,
      )
      .on(
        "keydown.bs.dropdown.data-api",
        '[role="listbox"]',
        Dropdown.prototype.keydown,
      ));
})(jQuery);
(function ($) {
  "use strict";

  var Modal = function (element, options) {
    ((this.options = options),
      (this.$body = $(document.body)),
      (this.$element = $(element)),
      (this.$dialog = this.$element.find(".modal-dialog")),
      (this.$backdrop = null),
      (this.isShown = null),
      (this.originalBodyPad = null),
      (this.scrollbarWidth = 0),
      (this.ignoreBackdropClick = !1),
      this.options.remote &&
        this.$element.find(".modal-content").load(
          this.options.remote,
          $.proxy(function () {
            this.$element.trigger("loaded.bs.modal");
          }, this),
        ));
  };
  function Plugin(option, _relatedTarget) {
    return this.each(function () {
      var $this = $(this),
        data = $this.data("bs.modal"),
        options = $.extend(
          {},
          Modal.DEFAULTS,
          $this.data(),
          "object" == typeof option && option,
        );
      (data || $this.data("bs.modal", (data = new Modal(this, options))),
        "string" == typeof option
          ? data[option](_relatedTarget)
          : options.show && data.show(_relatedTarget));
    });
  }
  ((Modal.VERSION = "3.3.4"),
    (Modal.TRANSITION_DURATION = 300),
    (Modal.BACKDROP_TRANSITION_DURATION = 150),
    (Modal.DEFAULTS = {
      backdrop: !0,
      keyboard: !0,
      show: !0,
    }),
    (Modal.prototype.toggle = function (_relatedTarget) {
      return this.isShown ? this.hide() : this.show(_relatedTarget);
    }),
    (Modal.prototype.show = function (_relatedTarget) {
      var that = this,
        e = $.Event("show.bs.modal", {
          relatedTarget: _relatedTarget,
        });
      (this.$element.trigger(e),
        this.isShown ||
          e.isDefaultPrevented() ||
          ((this.isShown = !0),
          this.checkScrollbar(),
          this.setScrollbar(),
          this.$body.addClass("modal-open"),
          this.escape(),
          this.resize(),
          this.$element.on(
            "click.dismiss.bs.modal",
            '[data-dismiss="modal"]',
            $.proxy(this.hide, this),
          ),
          this.$dialog.on("mousedown.dismiss.bs.modal", function () {
            that.$element.one("mouseup.dismiss.bs.modal", function (_e) {
              $(_e.target).is(that.$element) && (that.ignoreBackdropClick = !0);
            });
          }),
          this.backdrop(function () {
            var transition =
              $.support.transition && that.$element.hasClass("fade");
            (that.$element.parent().length ||
              that.$element.appendTo(that.$body),
              that.$element.show().scrollTop(0),
              that.adjustDialog(),
              transition && that.$element[0].offsetWidth,
              that.$element.addClass("in").attr("aria-hidden", !1),
              that.enforceFocus());
            var _e = $.Event("shown.bs.modal", {
              relatedTarget: _relatedTarget,
            });
            transition
              ? that.$dialog
                  .one("bsTransitionEnd", function () {
                    that.$element.trigger("focus").trigger(_e);
                  })
                  .emulateTransitionEnd(Modal.TRANSITION_DURATION)
              : that.$element.trigger("focus").trigger(_e);
          })));
    }),
    (Modal.prototype.hide = function (e) {
      (e && e.preventDefault(),
        (e = $.Event("hide.bs.modal")),
        this.$element.trigger(e),
        this.isShown &&
          !e.isDefaultPrevented() &&
          ((this.isShown = !1),
          this.escape(),
          this.resize(),
          $(document).off("focusin.bs.modal"),
          this.$element
            .removeClass("in")
            .attr("aria-hidden", !0)
            .off("click.dismiss.bs.modal")
            .off("mouseup.dismiss.bs.modal"),
          this.$dialog.off("mousedown.dismiss.bs.modal"),
          $.support.transition && this.$element.hasClass("fade")
            ? this.$element
                .one("bsTransitionEnd", $.proxy(this.hideModal, this))
                .emulateTransitionEnd(Modal.TRANSITION_DURATION)
            : this.hideModal()));
    }),
    (Modal.prototype.enforceFocus = function () {
      $(document)
        .off("focusin.bs.modal")
        .on(
          "focusin.bs.modal",
          $.proxy(function (e) {
            this.$element[0] === e.target ||
              this.$element.has(e.target).length ||
              this.$element.trigger("focus");
          }, this),
        );
    }),
    (Modal.prototype.escape = function () {
      this.isShown && this.options.keyboard
        ? this.$element.on(
            "keydown.dismiss.bs.modal",
            $.proxy(function (e) {
              27 == e.which && this.hide();
            }, this),
          )
        : this.isShown || this.$element.off("keydown.dismiss.bs.modal");
    }),
    (Modal.prototype.resize = function () {
      this.isShown
        ? $(window).on("resize.bs.modal", $.proxy(this.handleUpdate, this))
        : $(window).off("resize.bs.modal");
    }),
    (Modal.prototype.hideModal = function () {
      var that = this;
      (this.$element.hide(),
        this.backdrop(function () {
          (that.$body.removeClass("modal-open"),
            that.resetAdjustments(),
            that.resetScrollbar(),
            that.$element.trigger("hidden.bs.modal"));
        }));
    }),
    (Modal.prototype.removeBackdrop = function () {
      (this.$backdrop && this.$backdrop.remove(), (this.$backdrop = null));
    }),
    (Modal.prototype.backdrop = function (callback) {
      var that = this,
        animate = this.$element.hasClass("fade") ? "fade" : "";
      if (this.isShown && this.options.backdrop) {
        var doAnimate = $.support.transition && animate;
        if (
          ((this.$backdrop = $(
            '<div class="modal-backdrop ' + animate + '" />',
          ).appendTo(this.$body)),
          this.$element.on(
            "click.dismiss.bs.modal",
            $.proxy(function (e) {
              this.ignoreBackdropClick
                ? (this.ignoreBackdropClick = !1)
                : e.target === e.currentTarget &&
                  ("static" == this.options.backdrop
                    ? this.$element[0].focus()
                    : this.hide());
            }, this),
          ),
          doAnimate && this.$backdrop[0].offsetWidth,
          this.$backdrop.addClass("in"),
          !callback)
        )
          return;
        doAnimate
          ? this.$backdrop
              .one("bsTransitionEnd", callback)
              .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION)
          : callback();
      } else if (!this.isShown && this.$backdrop) {
        this.$backdrop.removeClass("in");
        var callbackRemove = function () {
          (that.removeBackdrop(), callback && callback());
        };
        $.support.transition && this.$element.hasClass("fade")
          ? this.$backdrop
              .one("bsTransitionEnd", callbackRemove)
              .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION)
          : callbackRemove();
      } else callback && callback();
    }),
    (Modal.prototype.handleUpdate = function () {
      this.adjustDialog();
    }),
    (Modal.prototype.adjustDialog = function () {
      var modalIsOverflowing =
        this.$element[0].scrollHeight > document.documentElement.clientHeight;
      this.$element.css({
        paddingLeft:
          !this.bodyIsOverflowing && modalIsOverflowing
            ? this.scrollbarWidth
            : "",
        paddingRight:
          this.bodyIsOverflowing && !modalIsOverflowing
            ? this.scrollbarWidth
            : "",
      });
    }),
    (Modal.prototype.resetAdjustments = function () {
      this.$element.css({
        paddingLeft: "",
        paddingRight: "",
      });
    }),
    (Modal.prototype.checkScrollbar = function () {
      var fullWindowWidth = window.innerWidth;
      if (!fullWindowWidth) {
        var documentElementRect =
          document.documentElement.getBoundingClientRect();
        fullWindowWidth =
          documentElementRect.right - Math.abs(documentElementRect.left);
      }
      ((this.bodyIsOverflowing = document.body.clientWidth < fullWindowWidth),
        (this.scrollbarWidth = this.measureScrollbar()));
    }),
    (Modal.prototype.setScrollbar = function () {
      var bodyPad = parseInt(this.$body.css("padding-right") || 0, 10);
      ((this.originalBodyPad = document.body.style.paddingRight || ""),
        this.bodyIsOverflowing &&
          this.$body.css("padding-right", bodyPad + this.scrollbarWidth));
    }),
    (Modal.prototype.resetScrollbar = function () {
      this.$body.css("padding-right", this.originalBodyPad);
    }),
    (Modal.prototype.measureScrollbar = function () {
      var scrollDiv = document.createElement("div");
      ((scrollDiv.className = "modal-scrollbar-measure"),
        this.$body.append(scrollDiv));
      var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
      return (this.$body[0].removeChild(scrollDiv), scrollbarWidth);
    }));
  var old = $.fn.modal;
  (($.fn.modal = Plugin),
    ($.fn.modal.Constructor = Modal),
    ($.fn.modal.noConflict = function () {
      return (($.fn.modal = old), this);
    }),
    $(document).on(
      "click.bs.modal.data-api",
      '[data-toggle="modal"]',
      function (e) {
        var $this = $(this),
          href = $this.attr("href"),
          $target = $(
            $this.attr("data-target") ||
              (href && href.replace(/.*(?=#[^\s]+$)/, "")),
          ),
          option = $target.data("bs.modal")
            ? "toggle"
            : $.extend(
                {
                  remote: !/#/.test(href) && href,
                },
                $target.data(),
                $this.data(),
              );
        ($this.is("a") && e.preventDefault(),
          $target.one("show.bs.modal", function (showEvent) {
            showEvent.isDefaultPrevented() ||
              $target.one("hidden.bs.modal", function () {
                $this.is(":visible") && $this.trigger("focus");
              });
          }),
          Plugin.call($target, option, this));
      },
    ));
})(jQuery);
(function ($) {
  "use strict";

  (($.fn.emulateTransitionEnd = function (duration) {
    var called = !1,
      $el = this;
    $(this).one("bsTransitionEnd", function () {
      called = !0;
    });
    return (
      setTimeout(function () {
        called || $($el).trigger($.support.transition.end);
      }, duration),
      this
    );
  }),
    $(function () {
      (($.support.transition = (function () {
        var el = document.createElement("bootstrap"),
          transEndEventNames = {
            WebkitTransition: "webkitTransitionEnd",
            MozTransition: "transitionend",
            OTransition: "oTransitionEnd otransitionend",
            transition: "transitionend",
          };
        for (var name in transEndEventNames)
          if (void 0 !== el.style[name])
            return {
              end: transEndEventNames[name],
            };
        return !1;
      })()),
        $.support.transition &&
          ($.event.special.bsTransitionEnd = {
            bindType: $.support.transition.end,
            delegateType: $.support.transition.end,
            handle: function (e) {
              if ($(e.target).is(this))
                return e.handleObj.handler.apply(this, arguments);
            },
          }));
    }));
})(jQuery);
