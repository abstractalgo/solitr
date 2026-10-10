// jquery.ui.touch-punch.js – extracted from solitr.com's application.js (parts: 011).
// Identifier names restored from the source map by tools/unminify.js.
(function ($) {
  if ((($.support.touch = "ontouchend" in document), $.support.touch)) {
    var touchHandled,
      mouseProto = $.ui.mouse.prototype,
      _mouseInit = mouseProto._mouseInit,
      _mouseDestroy = mouseProto._mouseDestroy;
    ((mouseProto._touchStart = function (event) {
      !touchHandled &&
        this._mouseCapture(event.originalEvent.changedTouches[0]) &&
        ((touchHandled = !0),
        (this._touchMoved = !1),
        simulateMouseEvent(event, "mouseover"),
        simulateMouseEvent(event, "mousemove"),
        simulateMouseEvent(event, "mousedown"));
    }),
      (mouseProto._touchMove = function (event) {
        touchHandled &&
          ((this._touchMoved = !0), simulateMouseEvent(event, "mousemove"));
      }),
      (mouseProto._touchEnd = function (event) {
        touchHandled &&
          (simulateMouseEvent(event, "mouseup"),
          simulateMouseEvent(event, "mouseout"),
          this._touchMoved || simulateMouseEvent(event, "click"),
          (touchHandled = !1));
      }),
      (mouseProto._mouseInit = function () {
        (this.element.bind({
          touchstart: $.proxy(this, "_touchStart"),
          touchmove: $.proxy(this, "_touchMove"),
          touchend: $.proxy(this, "_touchEnd"),
        }),
          _mouseInit.call(this));
      }),
      (mouseProto._mouseDestroy = function () {
        (this.element.unbind({
          touchstart: $.proxy(this, "_touchStart"),
          touchmove: $.proxy(this, "_touchMove"),
          touchend: $.proxy(this, "_touchEnd"),
        }),
          _mouseDestroy.call(this));
      }));
  }
  function simulateMouseEvent(event, simulatedType) {
    if (!(event.originalEvent.touches.length > 1)) {
      event.preventDefault();
      var touch = event.originalEvent.changedTouches[0],
        simulatedEvent = document.createEvent("MouseEvents");
      (simulatedEvent.initMouseEvent(
        simulatedType,
        !0,
        !0,
        window,
        1,
        touch.screenX,
        touch.screenY,
        touch.clientX,
        touch.clientY,
        !1,
        !1,
        !1,
        !1,
        0,
        null,
      ),
        event.target.dispatchEvent(simulatedEvent));
    }
  }
})(jQuery);
