// jquery.transform.js – extracted from solitr.com's application.js (parts: 012 013 014 015 016 017).
// Identifier names restored from the source map by tools/unminify.js.
var Sylvester = {
  version: "0.1.3",
  precision: 1e-6,
};
function Matrix() {}
Matrix.prototype = {
  e: function (i, j) {
    return i < 1 ||
      i > this.elements.length ||
      j < 1 ||
      j > this.elements[0].length
      ? null
      : this.elements[i - 1][j - 1];
  },
  map: function (fn) {
    var i,
      nj,
      j,
      els = [],
      ni = this.elements.length,
      ki = ni,
      kj = this.elements[0].length;
    do {
      ((nj = kj), (els[(i = ki - ni)] = []));
      do {
        ((j = kj - nj), (els[i][j] = fn(this.elements[i][j], i + 1, j + 1)));
      } while (--nj);
    } while (--ni);
    return Matrix.create(els);
  },
  multiply: function (matrix) {
    if (!matrix.elements)
      return this.map(function (x) {
        return x * matrix;
      });
    var returnVector = !!matrix.modulus;
    if (
      (void 0 === (M = matrix.elements || matrix)[0][0] &&
        (M = Matrix.create(M).elements),
      !this.canMultiplyFromLeft(M))
    )
      return null;
    var i,
      nj,
      j,
      sum,
      nc,
      c,
      ni = this.elements.length,
      ki = ni,
      kj = M[0].length,
      cols = this.elements[0].length,
      elements = [];
    do {
      ((elements[(i = ki - ni)] = []), (nj = kj));
      do {
        ((j = kj - nj), (sum = 0), (nc = cols));
        do {
          ((c = cols - nc), (sum += this.elements[i][c] * M[c][j]));
        } while (--nc);
        elements[i][j] = sum;
      } while (--nj);
    } while (--ni);
    var M = Matrix.create(elements);
    return returnVector ? M.col(1) : M;
  },
  x: function (matrix) {
    return this.multiply(matrix);
  },
  canMultiplyFromLeft: function (matrix) {
    var M = matrix.elements || matrix;
    return (
      void 0 === M[0][0] && (M = Matrix.create(M).elements),
      this.elements[0].length == M.length
    );
  },
  setElements: function (els) {
    var i,
      elements = els.elements || els;
    if (void 0 !== elements[0][0]) {
      var nj,
        kj,
        j,
        ni = elements.length,
        ki = ni;
      this.elements = [];
      do {
        ((kj = nj = elements[(i = ki - ni)].length), (this.elements[i] = []));
        do {
          ((j = kj - nj), (this.elements[i][j] = elements[i][j]));
        } while (--nj);
      } while (--ni);
      return this;
    }
    var n = elements.length,
      k = n;
    this.elements = [];
    do {
      ((i = k - n), this.elements.push([elements[i]]));
    } while (--n);
    return this;
  },
};
Matrix.create = function (elements) {
  return new Matrix().setElements(elements);
};
$M = Matrix.create;
(function ($) {
  if (!$.cssHooks) throw "jQuery 1.4.3+ is needed for this plugin to work";
  var vendorProp,
    supportedProp,
    supports3d,
    supports2d,
    supportsFilter,
    translationUnit = "",
    prop = "transform",
    capProp = prop.charAt(0).toUpperCase() + prop.slice(1),
    prefixes = ["Moz", "Webkit", "O", "ms"],
    div = document.createElement("div");
  if (prop in div.style)
    ((supportedProp = prop), (supports3d = !1), (supports2d = !0));
  else
    for (var i = 0; i < prefixes.length; i++)
      if ((vendorProp = prefixes[i] + capProp) in div.style) {
        ((supportedProp = vendorProp),
          "Moz" === prefixes[i] && (translationUnit = "px"),
          (supports3d = !1),
          (supports2d = !0));
        break;
      }
  (supportedProp ||
    ((supportsFilter = "filter" in div.style), (supportedProp = "filter")),
    (div = null),
    ($.support[prop] = supportedProp));
  var transformProperty = supportedProp,
    properties = {
      rotateX: {
        defaultValue: 0,
        matrix: function (a) {
          return supports3d
            ? $M([
                [1, 0, 0, 0],
                [0, Math.cos(a), Math.sin(-a), 0],
                [0, Math.sin(a), Math.cos(a), 0],
                [0, 0, 0, 1],
              ])
            : $M([
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
              ]);
        },
      },
      rotateY: {
        defaultValue: 0,
        matrix: function (b) {
          return supports3d
            ? $M([
                [Math.cos(b), 0, Math.sin(b), 0],
                [0, 1, 0, 0],
                [Math.sin(-b), 0, Math.cos(b), 0],
                [0, 0, 0, 1],
              ])
            : $M([
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
              ]);
        },
      },
      rotateZ: {
        defaultValue: 0,
        matrix: function (c) {
          return supports3d
            ? $M([
                [Math.cos(c), Math.sin(-c), 0, 0],
                [Math.sin(c), Math.cos(c), 0, 0],
                [0, 0, 1, 0],
                [0, 0, 0, 1],
              ])
            : $M([
                [Math.cos(c), Math.sin(-c), 0],
                [Math.sin(c), Math.cos(c), 0],
                [0, 0, 1],
              ]);
        },
      },
      scale: {
        defaultValue: 1,
        matrix: function (s) {
          return supports3d
            ? $M([
                [s, 0, 0, 0],
                [0, s, 0, 0],
                [0, 0, s, 0],
                [0, 0, 0, 1],
              ])
            : $M([
                [s, 0, 0],
                [0, s, 0],
                [0, 0, 1],
              ]);
        },
      },
      scaleX: {
        defaultValue: 1,
        matrix: function (s) {
          return supports3d
            ? $M([
                [s, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 0, 1, 0],
                [0, 0, 0, 1],
              ])
            : $M([
                [s, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
              ]);
        },
      },
      scaleY: {
        defaultValue: 1,
        matrix: function (s) {
          return supports3d
            ? $M([
                [1, 0, 0, 0],
                [0, s, 0, 0],
                [0, 0, 1, 0],
                [0, 0, 0, 1],
              ])
            : $M([
                [1, 0, 0],
                [0, s, 0],
                [0, 0, 1],
              ]);
        },
      },
      scaleZ: {
        defaultValue: 1,
        matrix: function (s) {
          return supports3d
            ? $M([
                [1, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 0, s, 0],
                [0, 0, 0, 1],
              ])
            : $M([
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
              ]);
        },
      },
      translateX: {
        defaultValue: 0,
        matrix: function (tx) {
          return supports3d
            ? $M([
                [1, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 0, 1, 0],
                [tx, 0, 0, 1],
              ])
            : $M([
                [1, 0, 0],
                [0, 1, 0],
                [tx, 0, 1],
              ]);
        },
      },
      translateY: {
        defaultValue: 0,
        matrix: function (ty) {
          return supports3d
            ? $M([
                [1, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 0, 1, 0],
                [0, ty, 0, 1],
              ])
            : $M([
                [1, 0, 0],
                [0, 1, 0],
                [0, ty, 1],
              ]);
        },
      },
      translateZ: {
        defaultValue: 0,
        matrix: function (tz) {
          return supports3d
            ? $M([
                [1, 0, 0, 0],
                [0, 1, 0, 0],
                [0, 0, 1, 0],
                [0, 0, tz, 1],
              ])
            : $M([
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
              ]);
        },
      },
    },
    hookFor = function (_name) {
      return (
        ($.fx.step[_name] = function (fx) {
          $.cssHooks[_name].set(fx.elem, fx.now + fx.unit);
        }),
        {
          get: function (elem, computed, extra) {
            var transforms = $(elem).data("transforms");
            return (
              void 0 === transforms &&
                ((transforms = {}), $(elem).data("transforms", transforms)),
              transforms[_name] || properties[_name].defaultValue
            );
          },
          set: function (elem, value) {
            var transforms = $(elem).data("transforms");
            void 0 === transforms && (transforms = {});
            var propInfo = properties[_name];
            ("function" == typeof propInfo.apply
              ? (transforms[_name] = propInfo.apply(
                  transforms[_name] || propInfo.defaultValue,
                  value,
                ))
              : (transforms[_name] = value),
              $(elem).data("transforms", transforms),
              (function (_elem) {
                var tM,
                  _transforms = $(_elem).data("transforms");
                for (var __name in ((tM = supports3d
                  ? $M([
                      [1, 0, 0, 0],
                      [0, 1, 0, 0],
                      [0, 0, 1, 0],
                      [0, 0, 0, 1],
                    ])
                  : $M([
                      [1, 0, 0],
                      [0, 1, 0],
                      [0, 0, 1],
                    ])),
                properties))
                  tM = tM.x(
                    properties[__name].matrix(
                      _transforms[__name] || properties[__name].defaultValue,
                    ),
                  );
                (supports3d
                  ? ((s = "matrix3d("),
                    (s +=
                      tM.e(1, 1).toFixed(10) +
                      "," +
                      tM.e(1, 2).toFixed(10) +
                      "," +
                      tM.e(1, 3).toFixed(10) +
                      "," +
                      tM.e(1, 4).toFixed(10) +
                      ","),
                    (s +=
                      tM.e(2, 1).toFixed(10) +
                      "," +
                      tM.e(2, 2).toFixed(10) +
                      "," +
                      tM.e(2, 3).toFixed(10) +
                      "," +
                      tM.e(2, 4).toFixed(10) +
                      ","),
                    (s +=
                      tM.e(3, 1).toFixed(10) +
                      "," +
                      tM.e(3, 2).toFixed(10) +
                      "," +
                      tM.e(3, 3).toFixed(10) +
                      "," +
                      tM.e(3, 4).toFixed(10) +
                      ","),
                    (s +=
                      tM.e(4, 1).toFixed(10) +
                      "," +
                      tM.e(4, 2).toFixed(10) +
                      "," +
                      tM.e(4, 3).toFixed(10) +
                      "," +
                      tM.e(4, 4).toFixed(10)),
                    (s += ")"))
                  : supports2d
                    ? ((s = "matrix("),
                      (s +=
                        tM.e(1, 1).toFixed(10) +
                        "," +
                        tM.e(1, 2).toFixed(10) +
                        ","),
                      (s +=
                        tM.e(2, 1).toFixed(10) +
                        "," +
                        tM.e(2, 2).toFixed(10) +
                        ","),
                      (s +=
                        tM.e(3, 1).toFixed(10) +
                        translationUnit +
                        "," +
                        tM.e(3, 2).toFixed(10) +
                        translationUnit),
                      (s += ")"))
                    : supportsFilter &&
                      ((s = "progid:DXImageTransform.Microsoft."),
                      (s += "Matrix("),
                      (s += "M11=" + tM.e(1, 1).toFixed(10) + ","),
                      (s += "M12=" + tM.e(1, 2).toFixed(10) + ","),
                      (s += "M21=" + tM.e(2, 1).toFixed(10) + ","),
                      (s += "M22=" + tM.e(2, 2).toFixed(10) + ","),
                      (s += "SizingMethod='auto expand'"),
                      (s += ")"),
                      (_elem.style.top = tM.e(3, 1)),
                      (_elem.style.left = tM.e(3, 2))),
                  (_elem.style[transformProperty] = s));
              })(elem));
          },
        }
      );
    };
  if (transformProperty)
    for (var name in properties)
      (($.cssHooks[name] = hookFor(name)), ($.cssNumber[name] = !0));
})(jQuery);
