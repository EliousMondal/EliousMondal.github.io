(function () {
  "use strict";

  const palette = ["#2f7777", "#bb623d", "#d1a24f", "#5c6f91"];

  function theme() {
    const style = getComputedStyle(document.documentElement);
    return {
      ink: style.getPropertyValue("--ink").trim() || "#122d32",
      muted: style.getPropertyValue("--muted").trim() || "#566b6d",
      line: style.getPropertyValue("--line-strong").trim() || "rgba(18,45,50,.3)",
      surface: style.getPropertyValue("--surface").trim() || "#fffdf8"
    };
  }
  function linspace(start, stop, count) {
    return Array.from({ length: count }, function (_, index) { return start + (stop - start) * index / (count - 1); });
  }
  function setup(canvas, height) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(280, canvas.clientWidth || 760);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.height = height + "px";
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { context: context, width: width, height: height };
  }
  function bounds(values) {
    const finite = values.filter(Number.isFinite);
    if (!finite.length) return [0, 1];
    const minimum = Math.min.apply(null, finite);
    const maximum = Math.max.apply(null, finite);
    return minimum === maximum ? [minimum, minimum + 1] : [minimum, maximum];
  }
  function linePlot(canvas, series, labels, axis) {
    const box = setup(canvas, 320);
    const context = box.context;
    const width = box.width;
    const height = box.height;
    const colors = theme();
    const margin = { left: 58, right: 18, top: 28, bottom: 46 };
    const allX = series.flatMap(function (item) { return item.x; });
    const allY = series.flatMap(function (item) { return item.y; });
    const xRange = axis && axis.xRange ? axis.xRange : bounds(allX);
    const yRange = axis && axis.yRange ? axis.yRange : bounds(allY);
    const yMargin = 0.08 * ((yRange[1] - yRange[0]) || 1);
    const px = function (x) { return margin.left + (x - xRange[0]) / (xRange[1] - xRange[0] || 1) * (width - margin.left - margin.right); };
    const py = function (y) { return height - margin.bottom - (y - (yRange[0] - yMargin)) / ((yRange[1] - yRange[0]) + 2 * yMargin || 1) * (height - margin.top - margin.bottom); };
    context.fillStyle = colors.surface;
    context.fillRect(0, 0, width, height);
    context.strokeStyle = colors.line;
    context.beginPath();
    context.moveTo(margin.left, margin.top);
    context.lineTo(margin.left, height - margin.bottom);
    context.lineTo(width - margin.right, height - margin.bottom);
    context.stroke();
    context.font = "12px Inter, sans-serif";
    context.fillStyle = colors.muted;
    context.textAlign = "center";
    for (let i = 0; i <= 4; i += 1) {
      const value = xRange[0] + i * (xRange[1] - xRange[0]) / 4;
      context.fillText(value.toFixed(Math.abs(xRange[1] - xRange[0]) < 20 ? 1 : 0), px(value), height - 20);
    }
    context.fillText((axis && axis.xLabel) || "x", width / 2, height - 3);
    context.save();
    context.translate(15, height / 2);
    context.rotate(-Math.PI / 2);
    context.fillText((axis && axis.yLabel) || "value", 0, 0);
    context.restore();
    context.textAlign = "right";
    for (let i = 0; i <= 4; i += 1) {
      const value = yRange[0] + i * (yRange[1] - yRange[0]) / 4;
      context.fillText(value.toPrecision(3), margin.left - 8, py(value) + 4);
    }
    series.forEach(function (item, index) {
      context.strokeStyle = item.color || palette[index % palette.length];
      context.lineWidth = item.width || 2.2;
      context.setLineDash(item.dash || []);
      context.beginPath();
      item.x.forEach(function (x, point) {
        const y = item.y[point];
        if (point === 0) context.moveTo(px(x), py(y)); else context.lineTo(px(x), py(y));
      });
      context.stroke();
      context.setLineDash([]);
    });
    context.textAlign = "left";
    context.font = "11px Inter, sans-serif";
    labels.forEach(function (label, index) {
      const x = margin.left + 10 + (index % 3) * 155;
      const y = margin.top + 10 + Math.floor(index / 3) * 17;
      context.fillStyle = series[index] ? (series[index].color || palette[index % palette.length]) : palette[index % palette.length];
      context.fillRect(x, y - 7, 13, 2);
      context.fillStyle = colors.ink;
      context.fillText(label, x + 18, y - 3);
    });
  }
  function heatmap(canvas, kind) {
    const box = setup(canvas, 360);
    const context = box.context;
    const width = box.width;
    const height = box.height;
    const colors = theme();
    context.fillStyle = colors.surface;
    context.fillRect(0, 0, width, height);
    const margin = 48;
    const plotWidth = width - margin - 20;
    const plotHeight = height - margin - 30;
    const size = 82;
    function gaussian(x, y, cx, cy, sx, sy, amplitude) {
      return amplitude * Math.exp(-0.5 * (Math.pow((x - cx) / sx, 2) + Math.pow((y - cy) / sy, 2)));
    }
    for (let ix = 0; ix < size; ix += 1) {
      for (let iy = 0; iy < size; iy += 1) {
        const x = -1 + 2 * ix / (size - 1);
        const y = -1 + 2 * iy / (size - 1);
        let value = gaussian(x, y, -0.42, -0.42, 0.17, 0.24, 1) + gaussian(x, y, 0.42, 0.42, 0.17, 0.24, 0.9);
        value += gaussian(x, y, -0.42, 0.42, 0.2, 0.16, kind === "coherence" ? 0.75 : 0.45);
        value += gaussian(x, y, 0.42, -0.42, 0.2, 0.16, kind === "coherence" ? 0.75 : 0.45);
        value -= gaussian(x, y, -0.3, -0.52, 0.22, 0.1, 0.5);
        const positive = value >= 0;
        const strength = Math.min(1, Math.abs(value));
        const base = positive ? [47, 119, 119] : [187, 98, 61];
        const background = colors.surface.startsWith("#") ? colors.surface : "#fffdf8";
        const bg = /^#[0-9a-f]{6}$/i.test(background) ? [parseInt(background.slice(1,3),16),parseInt(background.slice(3,5),16),parseInt(background.slice(5,7),16)] : [255,253,248];
        const mixed = base.map(function (channel, index) { return Math.round(bg[index] * (1 - strength) + channel * strength); });
        context.fillStyle = "rgb(" + mixed.join(",") + ")";
        context.fillRect(margin + ix * plotWidth / size, 20 + (size - 1 - iy) * plotHeight / size, plotWidth / size + 1, plotHeight / size + 1);
      }
    }
    context.strokeStyle = colors.line;
    context.strokeRect(margin, 20, plotWidth, plotHeight);
    context.fillStyle = colors.muted;
    context.font = "12px Inter, sans-serif";
    context.textAlign = "center";
    context.fillText("excitation frequency", margin + plotWidth / 2, height - 4);
    context.save();
    context.translate(14, 20 + plotHeight / 2);
    context.rotate(-Math.PI / 2);
    context.fillText("detection frequency", 0, 0);
    context.restore();
  }
  function render(canvas) {
    const type = canvas.dataset.deepPlot;
    let x;
    if (type === "adiabaticity") {
      x = linspace(0, 12, 300);
      const population = x.map(function (t) { return 0.5 * Math.pow(Math.sin(Math.sqrt(2) * t), 2); });
      linePlot(canvas, [{ x: x, y: population }, { x: x, y: x.map(function () { return 0; }), dash: [5, 4] }], ["target population", "adiabatic contribution"], { xLabel: "time", yLabel: "population / measure", yRange: [0, 0.55] });
    } else if (type === "motional") {
      x = linspace(1, 64, 160);
      linePlot(canvas, [
        { x: x, y: x.map(function (n) { return 22.075 + 38.25 / n; }) },
        { x: x, y: x.map(function (n) { return 22.075 + 38.25 / Math.sqrt(n); }), dash: [5, 4] },
        { x: x, y: x.map(function () { return 22.075; }), color: "#5c6f91", width: 1.3 }
      ], ["fast bath ∝ 1/N", "slow bath ∝ 1/√N", "cavity floor"], { xLabel: "number of molecules N", yLabel: "illustrative linewidth (meV)" });
    } else if (type === "transport") {
      x = linspace(0, 250, 260);
      const ballistic = x.map(function (t) { return t < 80 ? Math.pow(t / 80, 2) : 1 + 0.015 * (t - 80); });
      const lossy = x.map(function (t) { return 2.5 * (1 - Math.exp(-Math.pow(t / 55, 2))) * Math.exp(-Math.max(0, t - 90) / 170); });
      linePlot(canvas, [{ x: x, y: ballistic }, { x: x, y: lossy }], ["ballistic → diffusive guide", "lossy transient MSD"], { xLabel: "time (fs)", yLabel: "normalized MSD" });
    } else if (type === "coherence") {
      x = linspace(0, 250, 500);
      linePlot(canvas, [
        { x: x, y: x.map(function (t) { return Math.cos(2 * Math.PI * t / 42) * Math.exp(-t / 100); }) },
        { x: x, y: x.map(function (t) { return Math.exp(-t / 100); }), dash: [5, 4], color: "#d1a24f" },
        { x: x, y: x.map(function (t) { return -Math.exp(-t / 100); }), dash: [5, 4], color: "#d1a24f" }
      ], ["cross-peak coherence", "envelope"], { xLabel: "population time (fs)", yLabel: "normalized amplitude", yRange: [-1, 1] });
    } else if (type === "vsc-threshold") {
      x = linspace(0.05, 10, 220);
      linePlot(canvas, [
        { x: x, y: x.map(function (detuning) { return Math.sqrt(4 * detuning * (1000 + 208)); }) },
        { x: x, y: x.map(function () { return 80; }), dash: [5, 4] }
      ], ["proposed threshold", "example ΩR"], { xLabel: "|ω₀ − ωc| (cm⁻¹)", yLabel: "critical ΩR (cm⁻¹)" });
    } else if (type === "cpa") {
      x = linspace(1, 1000, 220);
      linePlot(canvas, [{ x: x, y: x.map(function (n) { return 1 / n; }) }], ["largest omitted local-force scale"], { xLabel: "effective delocalization N_eff", yLabel: "relative force correction", yRange: [0, 1] });
    } else if (type === "collective") {
      x = linspace(1, 400, 240);
      const split = x.map(function (n) { return 4 * Math.sqrt(n); });
      const reorganize = x.map(function (n) { return 50 / (4 * n); });
      linePlot(canvas, [
        { x: x, y: split.map(function (v) { return v / Math.max.apply(null, split); }) },
        { x: x, y: reorganize.map(function (v) { return v / reorganize[0]; }) }
      ], ["normalized Rabi splitting", "normalized λ/(4N)"], { xLabel: "number of emitters N", yLabel: "normalized collective quantity", yRange: [0, 1] });
    } else if (type === "linear-cost") {
      x = linspace(1, 500, 220);
      linePlot(canvas, [
        { x: x, y: x.map(function (n) { return n * n / 250000; }) },
        { x: x, y: x.map(function (n) { return n / 500; }) }
      ], ["dense Hamiltonian ∝ N²", "sparse arrowhead ∝ N"], { xLabel: "ensemble size N", yLabel: "normalized work", yRange: [0, 1] });
    } else if (type === "heatmap" || type === "coherence-map") {
      heatmap(canvas, type === "coherence-map" ? "coherence" : "spectrum");
    }
  }

  const canvases = Array.from(document.querySelectorAll("canvas[data-deep-plot]"));
  function redraw() { canvases.forEach(render); }
  redraw();
  let timer = null;
  window.addEventListener("resize", function () { clearTimeout(timer); timer = setTimeout(redraw, 160); });
  window.addEventListener("themechange", redraw);
})();
