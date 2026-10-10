// $.fn.rawdraggable: a minimal jQuery UI widget on top of $.ui.mouse.
//
// It doesn't move anything itself; it hands mouse-capture / start / drag /
// stop events (with jQuery UI's click-vs-drag `distance` threshold, and touch
// support via jquery.ui.touch-punch) to callbacks passed as options.
// SolitaireBaseController._registerDragAndDrop() supplies those callbacks.

$.widget("ui.rawdraggable", $.ui.mouse, {
  widgetEventPrefix: "rawdraggable",
  options: {
    mouseStart(_e) {},
    mouseDrag(_e) {},
    mouseStop(_e) {},
    mouseCapture(_e) {
      return true;
    },
  },
  _init() {
    this._mouseInit();
  },
  _create() {
    this.element.addClass("ui-rawdraggable");
  },
  _destroy() {
    this._mouseDestroy();
    this.element.removeClass("ui-rawdraggable");
  },
  _mouseStart(e) {
    return this.options.mouseStart(e);
  },
  _mouseDrag(e) {
    return this.options.mouseDrag(e);
  },
  _mouseStop(e) {
    return this.options.mouseStop(e);
  },
  _mouseCapture(e) {
    return this.options.mouseCapture(e);
  },
});
