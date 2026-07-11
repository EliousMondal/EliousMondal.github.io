(function () {
  "use strict";

  const TWO_PI_C_FS = 1.883651567e-4;
  const palette = ["#2f7777", "#bb623d", "#d1a24f", "#5c6f91", "#8a5f80", "#4f8b62"];

  function byId(id) { return document.getElementById(id); }
  function clamp(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, value)); }
  function number(id, minimum, maximum, fallback) {
    const element = byId(id);
    const value = element ? Number(element.value) : fallback;
    return Number.isFinite(value) ? clamp(value, minimum, maximum) : fallback;
  }
  function colors() {
    const style = getComputedStyle(document.documentElement);
    return {
      ink: style.getPropertyValue("--ink").trim() || "#122d32",
      muted: style.getPropertyValue("--muted").trim() || "#566b6d",
      line: style.getPropertyValue("--line-strong").trim() || "rgba(18,45,50,.3)",
      surface: style.getPropertyValue("--surface").trim() || "#fffdf8",
      teal: style.getPropertyValue("--teal").trim() || "#2f7777",
      copper: style.getPropertyValue("--copper").trim() || "#bb623d"
    };
  }
  function canvasContext(canvas, height) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(280, canvas.clientWidth || 720);
    const logicalHeight = height || Number(canvas.dataset.height) || 300;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(logicalHeight * ratio);
    canvas.style.height = logicalHeight + "px";
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { context: context, width: width, height: logicalHeight };
  }
  function extent(values) {
    let minimum = Infinity;
    let maximum = -Infinity;
    values.forEach(function (value) {
      if (Number.isFinite(value)) {
        minimum = Math.min(minimum, value);
        maximum = Math.max(maximum, value);
      }
    });
    if (!Number.isFinite(minimum) || minimum === maximum) return [minimum || 0, (maximum || 0) + 1];
    return [minimum, maximum];
  }
  function plot(canvas, series, options) {
    const setup = canvasContext(canvas, options && options.height);
    const context = setup.context;
    const width = setup.width;
    const height = setup.height;
    const theme = colors();
    const margin = { left: 56, right: 18, top: 24, bottom: 44 };
    const xs = [];
    const ys = [];
    series.forEach(function (item) { xs.push.apply(xs, item.x); ys.push.apply(ys, item.y); });
    const xRange = options && options.xRange ? options.xRange : extent(xs);
    const yRange = options && options.yRange ? options.yRange : extent(ys);
    const xPad = (xRange[1] - xRange[0]) || 1;
    const yPad = (yRange[1] - yRange[0]) || 1;
    const x0 = xRange[0];
    const x1 = xRange[1];
    const y0 = yRange[0] - 0.05 * yPad;
    const y1 = yRange[1] + 0.08 * yPad;
    const px = function (x) { return margin.left + (x - x0) / (x1 - x0 || 1) * (width - margin.left - margin.right); };
    const py = function (y) { return height - margin.bottom - (y - y0) / (y1 - y0 || 1) * (height - margin.top - margin.bottom); };

    context.clearRect(0, 0, width, height);
    context.fillStyle = theme.surface;
    context.fillRect(0, 0, width, height);
    context.strokeStyle = theme.line;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(margin.left, margin.top);
    context.lineTo(margin.left, height - margin.bottom);
    context.lineTo(width - margin.right, height - margin.bottom);
    context.stroke();

    context.font = "12px Inter, sans-serif";
    context.fillStyle = theme.muted;
    context.textAlign = "center";
    for (let tick = 0; tick <= 4; tick += 1) {
      const value = x0 + tick * (x1 - x0) / 4;
      const x = px(value);
      context.fillText(value.toFixed(Math.abs(x1 - x0) < 10 ? 2 : 0), x, height - 20);
    }
    context.save();
    context.translate(15, height / 2);
    context.rotate(-Math.PI / 2);
    context.fillText((options && options.yLabel) || "value", 0, 0);
    context.restore();
    context.fillText((options && options.xLabel) || "x", (margin.left + width - margin.right) / 2, height - 3);
    context.textAlign = "right";
    for (let tick = 0; tick <= 4; tick += 1) {
      const value = y0 + tick * (y1 - y0) / 4;
      context.fillText(value.toPrecision(3), margin.left - 8, py(value) + 4);
    }

    series.forEach(function (item, index) {
      context.beginPath();
      context.strokeStyle = item.color || palette[index % palette.length];
      context.lineWidth = item.width || 2;
      context.setLineDash(item.dash || []);
      for (let i = 0; i < item.x.length; i += 1) {
        const x = px(item.x[i]);
        const y = py(item.y[i]);
        if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.stroke();
      context.setLineDash([]);
    });

    if (options && options.legend) {
      context.textAlign = "left";
      context.font = "11px Inter, sans-serif";
      options.legend.forEach(function (label, index) {
        const x = margin.left + 8 + (index % 3) * 145;
        const y = margin.top + 8 + Math.floor(index / 3) * 18;
        context.fillStyle = series[index] ? (series[index].color || palette[index % palette.length]) : palette[index % palette.length];
        context.fillRect(x, y - 7, 13, 2);
        context.fillStyle = theme.ink;
        context.fillText(label, x + 19, y - 3);
      });
    }
  }

  function identity(size) {
    return Array.from({ length: size }, function (_, row) {
      return Array.from({ length: size }, function (_, column) { return row === column ? 1 : 0; });
    });
  }
  function jacobiEigen(matrix) {
    const size = matrix.length;
    const a = matrix.map(function (row) { return row.slice(); });
    const vectors = identity(size);
    const tolerance = 1e-11;
    for (let sweep = 0; sweep < 32; sweep += 1) {
      let largest = 0;
      for (let p = 0; p < size - 1; p += 1) {
        for (let q = p + 1; q < size; q += 1) {
          largest = Math.max(largest, Math.abs(a[p][q]));
          if (Math.abs(a[p][q]) < tolerance) continue;
          const angle = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
          const cosine = Math.cos(angle);
          const sine = Math.sin(angle);
          const app = a[p][p];
          const aqq = a[q][q];
          const apq = a[p][q];
          a[p][p] = cosine * cosine * app - 2 * sine * cosine * apq + sine * sine * aqq;
          a[q][q] = sine * sine * app + 2 * sine * cosine * apq + cosine * cosine * aqq;
          a[p][q] = 0;
          a[q][p] = 0;
          for (let r = 0; r < size; r += 1) {
            if (r !== p && r !== q) {
              const arp = a[r][p];
              const arq = a[r][q];
              a[r][p] = cosine * arp - sine * arq;
              a[p][r] = a[r][p];
              a[r][q] = sine * arp + cosine * arq;
              a[q][r] = a[r][q];
            }
            const vrp = vectors[r][p];
            const vrq = vectors[r][q];
            vectors[r][p] = cosine * vrp - sine * vrq;
            vectors[r][q] = sine * vrp + cosine * vrq;
          }
        }
      }
      if (largest < tolerance) break;
    }
    const order = Array.from({ length: size }, function (_, index) { return index; })
      .sort(function (left, right) { return a[left][left] - a[right][right]; });
    return {
      values: order.map(function (index) { return a[index][index]; }),
      vectors: Array.from({ length: size }, function (_, row) {
        return order.map(function (column) { return vectors[row][column]; });
      })
    };
  }

  function setupDVR() {
    const root = byId("dvr-lab");
    if (!root) return null;
    const canvas = byId("dvr-canvas");
    const output = byId("dvr-eigenvalues");
    const potentialSelect = byId("dvr-potential");
    const customControls = byId("dvr-custom-controls");

    function render() {
      const count = Math.round(number("dvr-grid", 24, 72, 40));
      const minimum = number("dvr-xmin", -12, -1, -6);
      const maximum = Math.max(minimum + 2, number("dvr-xmax", 1, 12, 6));
      const states = Math.round(number("dvr-states", 1, 6, 4));
      const spacing = (maximum - minimum) / (count - 1);
      const x = Array.from({ length: count }, function (_, index) { return minimum + index * spacing; });
      const type = potentialSelect.value;
      const a4 = number("dvr-a4", -1, 1, 0.04);
      const a2 = number("dvr-a2", -4, 4, -0.8);
      const a1 = number("dvr-a1", -4, 4, 0);
      const potential = x.map(function (position) {
        if (type === "double") return 0.05 * Math.pow(position * position - 9, 2);
        if (type === "morse") return 8 * Math.pow(1 - Math.exp(-0.65 * (position + 1.7)), 2);
        if (type === "quartic") return a4 * Math.pow(position, 4) + a2 * position * position + a1 * position;
        return 0.5 * position * position;
      });
      const hamiltonian = Array.from({ length: count }, function (_, row) {
        return Array.from({ length: count }, function (_, column) {
          if (row === column) return Math.PI * Math.PI / (6 * spacing * spacing) + potential[row];
          const difference = row - column;
          return Math.pow(-1, difference) / (spacing * spacing * difference * difference);
        });
      });
      const eigen = jacobiEigen(hamiltonian);
      const displayStates = Math.min(states, eigen.values.length);
      const scale = Math.max(0.45, (Math.max.apply(null, potential) - Math.min.apply(null, potential)) * 0.055);
      const curves = [{ x: x, y: potential, color: colors().ink, width: 2 }];
      const legend = ["V(x)"];
      for (let state = 0; state < displayStates; state += 1) {
        const wavefunction = x.map(function (_, index) { return eigen.vectors[index][state]; });
        const norm = Math.sqrt(wavefunction.reduce(function (sum, value) { return sum + value * value * spacing; }, 0));
        curves.push({
          x: x,
          y: wavefunction.map(function (value) { return eigen.values[state] + scale * value / (norm || 1); }),
          color: palette[state % palette.length],
          width: 2
        });
        legend.push("ψ" + state + " + E" + state);
      }
      plot(canvas, curves, { xLabel: "x (dimensionless)", yLabel: "energy", legend: legend, height: 360 });
      output.innerHTML = eigen.values.slice(0, displayStates).map(function (value, index) {
        return "<span><strong>E<sub>" + index + "</sub></strong> " + value.toFixed(5) + "</span>";
      }).join("");
      customControls.hidden = type !== "quartic";
    }
    root.addEventListener("input", render);
    root.addEventListener("change", render);
    render();
    return render;
  }

  function factorial(value) {
    let result = 1;
    for (let i = 2; i <= value; i += 1) result *= i;
    return result;
  }
  function besselJ(order, value) {
    let sum = 0;
    const half = value / 2;
    for (let k = 0; k < 70; k += 1) {
      const numerator = Math.pow(-1, k) * Math.pow(half, 2 * k + order);
      const denominator = factorial(k) * factorial(k + order);
      const term = numerator / denominator;
      sum += term;
      if (Math.abs(term) < 1e-14) break;
    }
    return sum;
  }
  function matVec(matrix, vector) {
    return matrix.map(function (row) {
      return row.reduce(function (sum, value, index) { return sum + value * vector[index]; }, 0);
    });
  }
  function setupChebyshev() {
    const root = byId("cheb-lab");
    if (!root) return null;
    const canvas = byId("cheb-canvas");
    const report = byId("cheb-report");

    function render() {
      const size = Math.round(number("cheb-levels", 3, 4, 3));
      const coupling = number("cheb-coupling", 0.1, 1.5, 0.6);
      const detuning = number("cheb-detuning", -1.5, 1.5, 0.35);
      const initialControl = byId("cheb-initial");
      Array.from(initialControl.options).forEach(function (option) {
        option.disabled = Number(option.value) >= size;
      });
      if (Number(initialControl.value) >= size) initialControl.value = String(size - 1);
      const initial = Math.round(number("cheb-initial", 0, size - 1, 0));
      const duration = number("cheb-time", 2, 12, 8);
      const order = Math.round(number("cheb-order", 8, 42, 28));
      const matrix = Array.from({ length: size }, function (_, row) {
        return Array.from({ length: size }, function (_, column) {
          if (row === column) return (row - (size - 1) / 2) * detuning;
          return Math.abs(row - column) === 1 ? coupling : 0;
        });
      });
      const eigen = jacobiEigen(matrix);
      const minimum = eigen.values[0];
      const maximum = eigen.values[eigen.values.length - 1];
      const a = Math.max((maximum - minimum) / 2, 1e-8);
      const center = (maximum + minimum) / 2;
      const scaled = matrix.map(function (row, i) {
        return row.map(function (value, j) { return (value - (i === j ? center : 0)) / a; });
      });
      const initialVector = Array.from({ length: size }, function (_, index) { return index === initial ? 1 : 0; });
      const times = Array.from({ length: 121 }, function (_, index) { return duration * index / 120; });
      const chebPopulations = Array.from({ length: size }, function () { return []; });
      const exactPopulations = Array.from({ length: size }, function () { return []; });
      let maximumError = 0;

      times.forEach(function (time) {
        let phiPrevious = initialVector.slice();
        let phiCurrent = matVec(scaled, phiPrevious);
        const real = Array(size).fill(0);
        const imaginary = Array(size).fill(0);
        for (let component = 0; component < size; component += 1) real[component] = besselJ(0, a * time) * phiPrevious[component];
        for (let n = 1; n <= order; n += 1) {
          const bessel = 2 * besselJ(n, a * time);
          const cycle = n % 4;
          for (let component = 0; component < size; component += 1) {
            if (cycle === 0) real[component] += bessel * phiCurrent[component];
            if (cycle === 1) imaginary[component] -= bessel * phiCurrent[component];
            if (cycle === 2) real[component] -= bessel * phiCurrent[component];
            if (cycle === 3) imaginary[component] += bessel * phiCurrent[component];
          }
          const next = matVec(scaled, phiCurrent).map(function (value, index) { return 2 * value - phiPrevious[index]; });
          phiPrevious = phiCurrent;
          phiCurrent = next;
        }
        const cosine = Math.cos(center * time);
        const sine = Math.sin(center * time);
        for (let component = 0; component < size; component += 1) {
          const rotatedReal = cosine * real[component] + sine * imaginary[component];
          const rotatedImaginary = cosine * imaginary[component] - sine * real[component];
          chebPopulations[component].push(rotatedReal * rotatedReal + rotatedImaginary * rotatedImaginary);
          let exactReal = 0;
          let exactImaginary = 0;
          for (let state = 0; state < size; state += 1) {
            const weight = eigen.vectors[component][state] * eigen.vectors[initial][state];
            exactReal += weight * Math.cos(eigen.values[state] * time);
            exactImaginary -= weight * Math.sin(eigen.values[state] * time);
          }
          const exactPopulation = exactReal * exactReal + exactImaginary * exactImaginary;
          exactPopulations[component].push(exactPopulation);
          maximumError = Math.max(maximumError, Math.abs(exactPopulation - chebPopulations[component][chebPopulations[component].length - 1]));
        }
      });
      const series = [];
      const legend = [];
      for (let state = 0; state < size; state += 1) {
        series.push({ x: times, y: chebPopulations[state], color: palette[state], width: 2.3 });
        legend.push("Chebyshev P" + state);
        series.push({ x: times, y: exactPopulations[state], color: palette[state], width: 1.2, dash: [4, 4] });
        legend.push("exact P" + state);
      }
      plot(canvas, series, { xLabel: "time (dimensionless)", yLabel: "population", yRange: [0, 1], legend: legend, height: 350 });
      report.innerHTML = "Spectral interval: <strong>[" + minimum.toFixed(3) + ", " + maximum.toFixed(3) + "]</strong> · maximum population error: <strong>" + maximumError.toExponential(2) + "</strong>";
    }
    root.addEventListener("input", render);
    root.addEventListener("change", render);
    render();
    return render;
  }

  function complexLabel(real, imaginary) {
    const tolerance = 1e-8;
    if (Math.abs(imaginary) < tolerance) return real.toFixed(2);
    if (Math.abs(real) < tolerance) return imaginary.toFixed(2) + "i";
    return real.toFixed(2) + (imaginary >= 0 ? "+" : "") + imaginary.toFixed(2) + "i";
  }
  function setupFFT() {
    const root = byId("fft-lab");
    if (!root) return null;
    const timeCanvas = byId("fft-time-canvas");
    const frequencyCanvas = byId("fft-frequency-canvas");
    const matrixOutput = byId("fft-matrix");
    const stageOutput = byId("fft-stage-output");
    const stageControl = byId("fft-stage");

    function bitReverse(value, bits) {
      let reversed = 0;
      for (let i = 0; i < bits; i += 1) { reversed = (reversed << 1) | ((value >> i) & 1); }
      return reversed;
    }
    function render() {
      const size = Math.round(number("fft-size", 4, 16, 8));
      const spacing = number("fft-dt", 0.02, 1, 0.125);
      const signalType = byId("fft-signal").value;
      const time = Array.from({ length: size }, function (_, index) { return index * spacing; });
      const signal = time.map(function (value, index) {
        if (signalType === "two") return Math.sin(2 * Math.PI * 2 * index / size) + 0.55 * Math.sin(2 * Math.PI * 3 * index / size);
        if (signalType === "pulse") return Math.exp(-Math.pow((index - size / 2) / Math.max(1, size / 6), 2));
        return Math.sin(2 * Math.PI * 2 * index / size);
      });
      const dftReal = [];
      const dftImaginary = [];
      for (let k = 0; k < size; k += 1) {
        let real = 0;
        let imaginary = 0;
        for (let n = 0; n < size; n += 1) {
          const angle = -2 * Math.PI * k * n / size;
          real += signal[n] * Math.cos(angle);
          imaginary += signal[n] * Math.sin(angle);
        }
        dftReal.push(real);
        dftImaginary.push(imaginary);
      }
      const magnitude = dftReal.map(function (value, index) { return Math.hypot(value, dftImaginary[index]) / size; });
      const frequencies = Array.from({ length: size }, function (_, index) { return index / (size * spacing); });
      plot(timeCanvas, [{ x: time, y: signal, color: colors().teal }], { xLabel: "t", yLabel: "signal", height: 250 });
      plot(frequencyCanvas, [{ x: frequencies.slice(0, size / 2 + 1), y: magnitude.slice(0, size / 2 + 1), color: colors().copper }], { xLabel: "frequency", yLabel: "|Xₖ|", yRange: [0, Math.max.apply(null, magnitude) || 1], height: 250 });

      const preview = Math.min(size, 8);
      const rows = [];
      for (let row = 0; row < preview; row += 1) {
        const entries = [];
        for (let column = 0; column < preview; column += 1) {
          const angle = -2 * Math.PI * row * column / size;
          entries.push(complexLabel(Math.cos(angle), Math.sin(angle)));
        }
        rows.push(entries.join("  "));
      }
      matrixOutput.textContent = "First " + preview + " × " + preview + " entries of F" + size + ":\n" + rows.join("\n");

      const bits = Math.log2(size);
      stageControl.max = String(bits);
      const chosenStage = Math.min(Math.round(Number(stageControl.value)), bits);
      stageControl.value = String(chosenStage);
      let data = Array.from({ length: size }, function (_, index) { return { real: signal[bitReverse(index, bits)], imaginary: 0 }; });
      const stages = [data.map(function (item) { return Object.assign({}, item); })];
      for (let length = 2; length <= size; length *= 2) {
        for (let start = 0; start < size; start += length) {
          for (let j = 0; j < length / 2; j += 1) {
            const angle = -2 * Math.PI * j / length;
            const twiddleReal = Math.cos(angle);
            const twiddleImaginary = Math.sin(angle);
            const odd = data[start + j + length / 2];
            const productReal = twiddleReal * odd.real - twiddleImaginary * odd.imaginary;
            const productImaginary = twiddleReal * odd.imaginary + twiddleImaginary * odd.real;
            const even = data[start + j];
            data[start + j] = { real: even.real + productReal, imaginary: even.imaginary + productImaginary };
            data[start + j + length / 2] = { real: even.real - productReal, imaginary: even.imaginary - productImaginary };
          }
        }
        stages.push(data.map(function (item) { return Object.assign({}, item); }));
      }
      stageOutput.innerHTML = "<strong>Stage " + chosenStage + " of " + bits + "</strong><span>" + stages[chosenStage].map(function (item) { return complexLabel(item.real, item.imaginary); }).join(" · ") + "</span>";
    }
    root.addEventListener("input", render);
    root.addEventListener("change", render);
    render();
    return render;
  }

  function coth(value) {
    if (Math.abs(value) < 1e-5) return 1 / value + value / 3;
    return Math.cosh(value) / Math.sinh(value);
  }
  function setupSpectra() {
    const root = byId("spectra-lab");
    if (!root) return null;
    const spectralCanvas = byId("spectral-density-canvas");
    const correlationCanvas = byId("correlation-canvas");
    const spectrumCanvas = byId("spectrum-canvas");
    const report = byId("spectra-report");

    function render() {
      const lambdaD = number("spec-lambda-d", 0, 200, 45);
      const gammaD = number("spec-gamma-d", 1, 300, 35);
      const lambdaU = number("spec-lambda-u", 0, 150, 18);
      const omegaU = number("spec-omega-u", 50, 1800, 650);
      const gammaU = number("spec-gamma-u", 1, 300, 45);
      const temperature = number("spec-temperature", 50, 600, 300);
      const kBT = 0.69503476 * temperature;
      const omegaMaximum = Math.max(1800, omegaU * 2.2);
      const omega = Array.from({ length: 300 }, function (_, index) { return 1 + index * (omegaMaximum - 1) / 299; });
      const spacing = omega[1] - omega[0];
      const drude = omega.map(function (frequency) { return 2 * lambdaD * gammaD * frequency / (frequency * frequency + gammaD * gammaD); });
      const brownian = omega.map(function (frequency) {
        const denominator = Math.pow(omegaU * omegaU - frequency * frequency, 2) + gammaU * gammaU * frequency * frequency;
        return 2 * lambdaU * gammaU * omegaU * omegaU * frequency / denominator;
      });
      const total = drude.map(function (value, index) { return value + brownian[index]; });
      plot(spectralCanvas, [
        { x: omega, y: drude, color: palette[0] },
        { x: omega, y: brownian, color: palette[1] },
        { x: omega, y: total, color: colors().ink, width: 2.5 }
      ], { xLabel: "ω (cm⁻¹)", yLabel: "J(ω)", legend: ["Drude–Lorentz", "Brownian", "total"], height: 300 });

      const times = Array.from({ length: 220 }, function (_, index) { return index * 500 / 219; });
      const realCorrelation = [];
      const imaginaryCorrelation = [];
      times.forEach(function (time) {
        let real = 0;
        let imaginary = 0;
        for (let index = 0; index < omega.length; index += 1) {
          const phase = omega[index] * TWO_PI_C_FS * time;
          real += total[index] * coth(omega[index] / (2 * kBT)) * Math.cos(phase) * spacing;
          imaginary -= total[index] * Math.sin(phase) * spacing;
        }
        realCorrelation.push(2 * real / Math.PI);
        imaginaryCorrelation.push(2 * imaginary / Math.PI);
      });
      const correlationScale = Math.max.apply(null, realCorrelation.map(Math.abs)) || 1;
      plot(correlationCanvas, [
        { x: times, y: realCorrelation.map(function (value) { return value / correlationScale; }), color: palette[0] },
        { x: times, y: imaginaryCorrelation.map(function (value) { return value / correlationScale; }), color: palette[1] }
      ], { xLabel: "t (fs)", yLabel: "C(t) / max|C|", yRange: [-1, 1], legend: ["Re C(t)", "Im C(t)"], height: 260 });

      const deltaTime = times[1] - times[0];
      const conversionSquared = TWO_PI_C_FS * TWO_PI_C_FS;
      const gReal = [];
      const gImaginary = [];
      for (let i = 0; i < times.length; i += 1) {
        let real = 0;
        let imaginary = 0;
        for (let j = 0; j <= i; j += 1) {
          const kernel = times[i] - times[j];
          real += kernel * realCorrelation[j] * deltaTime * conversionSquared;
          imaginary += kernel * imaginaryCorrelation[j] * deltaTime * conversionSquared;
        }
        gReal.push(real);
        gImaginary.push(imaginary);
      }
      const detuning = Array.from({ length: 241 }, function (_, index) { return -900 + index * 1800 / 240; });
      const absorption = detuning.map(function (frequency) {
        let value = 0;
        for (let index = 0; index < times.length; index += 1) {
          const phase = frequency * TWO_PI_C_FS * times[index] - gImaginary[index];
          value += Math.exp(-Math.min(gReal[index], 45) - times[index] / 750) * Math.cos(phase) * deltaTime;
        }
        return Math.max(0, value);
      });
      const absorptionMaximum = Math.max.apply(null, absorption) || 1;
      const normalized = absorption.map(function (value) { return value / absorptionMaximum; });
      plot(spectrumCanvas, [{ x: detuning, y: normalized, color: colors().copper, width: 2.5 }], { xLabel: "ω − ω₀ (cm⁻¹)", yLabel: "normalized absorption", yRange: [0, 1], height: 300 });
      const peakIndex = normalized.indexOf(Math.max.apply(null, normalized));
      report.innerHTML = "Educational cumulant spectrum · peak shift: <strong>" + detuning[peakIndex].toFixed(0) + " cm⁻¹</strong> · bath memory shown over <strong>500 fs</strong>.";
    }
    root.addEventListener("input", render);
    root.addEventListener("change", render);
    render();
    return render;
  }

  const redrawers = [setupDVR(), setupChebyshev(), setupFFT(), setupSpectra()].filter(Boolean);
  let resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { redrawers.forEach(function (redraw) { redraw(); }); }, 150);
  });
  window.addEventListener("themechange", function () { redrawers.forEach(function (redraw) { redraw(); }); });
})();
