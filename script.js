export function computeConsumption(c0, alpha, vRef, v) {
  return c0 * (1 + alpha * (v - vRef) ** 2);
}

export function computeFuelCostPerKm(consumption, price) {
  return (consumption / 100) * price;
}

export function computeTimeCostPerKm(hourlyRate, v) {
  return hourlyRate / v;
}

export function computeTotalCostPerKm(c0, alpha, vRef, price, hourlyRate, v) {
  const consumption = computeConsumption(c0, alpha, vRef, v);
  const fuelCost = computeFuelCostPerKm(consumption, price);
  const timeCost = computeTimeCostPerKm(hourlyRate, v);
  return fuelCost + timeCost;
}

export function findOptimalSpeed(
  c0,
  alpha,
  vRef,
  price,
  hourlyRate,
  { min = 60, max = 200, step = 0.5 } = {},
) {
  let best = { speed: min, cost: Infinity };
  for (let v = min; v <= max; v += step) {
    const cost = computeTotalCostPerKm(c0, alpha, vRef, price, hourlyRate, v);
    if (cost < best.cost) {
      best = { speed: v, cost };
    }
  }
  return best;
}

// === FORMATTERS ===
const fmtSpeed = new Intl.NumberFormat("hu-HU", {
  maximumFractionDigits: 0,
});

const KM_PER_MILE = 1.609344;
const LITERS_PER_GALLON = 3.785411784;

export const UNIT_SYSTEMS = Object.freeze({
  metric: {
    flag: "🇭🇺",
    speedLabel: "km/h",
    distanceLabel: "km",
    fuelPriceLabel: "/l",
    consumptionUnit: "l100",
    speedToDisplay: (v) => v,
    speedFromDisplay: (v) => v,
    distanceToDisplay: (km) => km,
    distanceFromDisplay: (v) => v,
    fuelPriceToDisplay: (perL) => perL,
    fuelPriceFromDisplay: (v) => v,
  },
  imperial: {
    flag: "🇺🇸",
    speedLabel: "mph",
    distanceLabel: "mi",
    fuelPriceLabel: "/gal",
    consumptionUnit: "mpgUS",
    speedToDisplay: (kmh) => kmh / KM_PER_MILE,
    speedFromDisplay: (mph) => mph * KM_PER_MILE,
    distanceToDisplay: (km) => km / KM_PER_MILE,
    distanceFromDisplay: (mi) => mi * KM_PER_MILE,
    fuelPriceToDisplay: (perL) => perL * LITERS_PER_GALLON,
    fuelPriceFromDisplay: (perGal) => perGal / LITERS_PER_GALLON,
  },
});

export function unitSystemOf(state) {
  return UNIT_SYSTEMS[state.unitSystem] || UNIT_SYSTEMS.metric;
}

export function formatSpeed(v, unitSystem = "metric") {
  const sys = UNIT_SYSTEMS[unitSystem] || UNIT_SYSTEMS.metric;
  return fmtSpeed.format(sys.speedToDisplay(v)) + " " + sys.speedLabel;
}

export function formatFt(
  amount,
  currency = "Ft",
  { minFrac = 0, maxFrac = 0 } = {},
) {
  const { code, locale } = CURRENCIES[currency] || CURRENCIES.Ft;
  const fmt = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  });
  return fmt.format(amount);
}

export const CURRENCIES = Object.freeze({
  Ft: { code: "HUF", locale: "hu-HU", symbol: "Ft" },
  EUR: { code: "EUR", locale: "de-DE", symbol: "€" },
  USD: { code: "USD", locale: "en-US", symbol: "$" },
  GBP: { code: "GBP", locale: "en-GB", symbol: "£" },
  CHF: { code: "CHF", locale: "de-CH", symbol: "CHF" },
  PLN: { code: "PLN", locale: "pl-PL", symbol: "zł" },
  CZK: { code: "CZK", locale: "cs-CZ", symbol: "Kč" },
  RON: { code: "RON", locale: "ro-RO", symbol: "lei" },
  SEK: { code: "SEK", locale: "sv-SE", symbol: "kr" },
  DKK: { code: "DKK", locale: "da-DK", symbol: "kr" },
  NOK: { code: "NOK", locale: "nb-NO", symbol: "kr" },
  CAD: { code: "CAD", locale: "en-CA", symbol: "CA$" },
  AUD: { code: "AUD", locale: "en-AU", symbol: "A$" },
  JPY: { code: "JPY", locale: "ja-JP", symbol: "¥" },
});

export const CONSUMPTION_UNITS = Object.freeze({
  l100: { label: "l/100 km", toL100: (v) => v, fromL100: (v) => v },
  kml: { label: "km/l", toL100: (v) => 100 / v, fromL100: (v) => 100 / v },
  mpgUS: {
    label: "mpg (US)",
    toL100: (v) => 235.215 / v,
    fromL100: (v) => 235.215 / v,
  },
  mpgUK: {
    label: "mpg (UK)",
    toL100: (v) => 282.481 / v,
    fromL100: (v) => 282.481 / v,
  },
});

export function currencySymbol(currency) {
  return CURRENCIES[currency]?.symbol || "Ft";
}

export function consumptionUnitLabel(unit) {
  return CONSUMPTION_UNITS[unit]?.label || "l/100 km";
}

export function defaultConsumptionUnit(unitSystem) {
  return (UNIT_SYSTEMS[unitSystem] || UNIT_SYSTEMS.metric).consumptionUnit;
}

export function parseDecimal(str) {
  if (typeof str !== "string") return null;
  const trimmed = str.trim();
  if (trimmed === "") return null;
  const normalized = trimmed.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

// === CHART CONFIG ===
export function buildChartConfig(state) {
  const {
    c0,
    alpha,
    vRef,
    price,
    hourlyRate,
    theme = "light",
    currency = "Ft",
    unitSystem = "metric",
  } = state;
  const sym = currencySymbol(currency);
  const sys = UNIT_SYSTEMS[unitSystem] || UNIT_SYSTEMS.metric;
  const min = 60,
    max = 200,
    step = 0.5;
  const totalData = [];
  const fuelData = [];
  const timeData = [];
  for (let v = min; v <= max; v += step) {
    const consumption = computeConsumption(c0, alpha, vRef, v);
    const fuel = computeFuelCostPerKm(consumption, price);
    const time = computeTimeCostPerKm(hourlyRate, v);
    fuelData.push({ x: v, y: fuel });
    timeData.push({ x: v, y: time });
    totalData.push({ x: v, y: fuel + time });
  }
  const opt = findOptimalSpeed(c0, alpha, vRef, price, hourlyRate, {
    min,
    max,
    step,
  });
  const colors =
    theme === "dark"
      ? {
          grid: "#3a3a4a",
          tick: "#c0c0d0",
          line: "#4fc3f7",
          fuel: "#ffb74d",
          time: "#81c784",
        }
      : {
          grid: "#e0e0e8",
          tick: "#555566",
          line: "#0277bd",
          fuel: "#e65100",
          time: "#2e7d32",
        };
  return {
    data: {
      datasets: [
        {
          label: `${t("totalCost")} (${sym}/${sys.distanceLabel})`,
          data: totalData,
          borderColor: colors.line,
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.2,
        },
        {
          label: `${t("fuelCost")} (${sym}/${sys.distanceLabel})`,
          data: fuelData,
          borderColor: colors.fuel,
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0.2,
        },
        {
          label: `${t("timeCost")} (${sym}/${sys.distanceLabel})`,
          data: timeData,
          borderColor: colors.time,
          borderWidth: 1.5,
          borderDash: [2, 4],
          pointRadius: 0,
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "linear",
          title: {
            display: true,
            text: `${t("speedAxis")} (${sys.speedLabel})`,
            color: colors.tick,
          },
          ticks: {
            color: colors.tick,
            maxTicksLimit: 8,
            callback: (val) =>
              Math.round(sys.speedToDisplay(val) / 10) * 10 + " " + sys.speedLabel,
          },
          grid: { color: colors.grid },
        },
        y: {
          title: {
            display: true,
            text: `${t("costAxis")} (${sym}/${sys.distanceLabel})`,
            color: colors.tick,
          },
          ticks: {
            color: colors.tick,
            callback: (val) => formatFt(val, currency),
          },
          grid: { color: colors.grid },
        },
      },
      plugins: {
        legend: {
          display: true,
          labels: { color: colors.tick, boxWidth: 12, font: { size: 11 } },
        },
        annotation: {
          annotations: {
            optimum: {
              type: "line",
              scaleID: "x",
              value: opt.speed,
              borderColor: colors.line,
              borderDash: [6, 6],
              borderWidth: 2,
              label: {
                display: true,
                content:
                  t("optimalLabel") + " " + formatSpeed(opt.speed, unitSystem),
                position: "start",
                color: colors.tick,
              },
            },
          },
        },
      },
    },
  };
}

export function buildConsumptionChartConfig(state) {
  const {
    c0,
    alpha,
vRef,
    theme = "light",
    measurements = [],
    consumptionUnit = "l100",
    unitSystem = "metric",
  } = state;
  const unit = CONSUMPTION_UNITS[consumptionUnit] || CONSUMPTION_UNITS.l100;
  const sys = UNIT_SYSTEMS[unitSystem] || UNIT_SYSTEMS.metric;
  const min = 60,
    max = 200,
    step = 0.5;
  const curveData = [];
  for (let v = min; v <= max; v += step) {
    curveData.push({
      x: v,
      y: unit.fromL100(computeConsumption(c0, alpha, vRef, v)),
    });
  }
  const colors =
    theme === "dark"
      ? { grid: "#3a3a4a", tick: "#c0c0d0", line: "#4fc3f7", points: "#ffb74d" }
      : {
          grid: "#e0e0e8",
          tick: "#555566",
          line: "#0277bd",
          points: "#e65100",
        };
  const datasets = [
    {
      label: `${t("estimatedConsumption")} (${unit.label})`,
      data: curveData,
      borderColor: colors.line,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.2,
    },
  ];
  if (measurements.length > 0) {
    datasets.push({
      label: t("measuredValues"),
      data: measurements.map((m) => ({
        x: m.speed,
        y: unit.fromL100(m.liters),
      })),
      borderColor: colors.points,
      backgroundColor: colors.points,
      pointRadius: 5,
      pointStyle: "circle",
      showLine: false,
      type: "scatter",
    });
  }
  return {
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "linear",
          title: {
            display: true,
            text: `${t("speedAxis")} (${sys.speedLabel})`,
            color: colors.tick,
          },
          ticks: {
            color: colors.tick,
            maxTicksLimit: 8,
            callback: (val) =>
              Math.round(sys.speedToDisplay(val) / 10) * 10 + " " + sys.speedLabel,
          },
          grid: { color: colors.grid },
        },
        y: {
          title: {
            display: true,
            text: `${t("consumptionAxis")} (${unit.label})`,
            color: colors.tick,
          },
          ticks: { color: colors.tick },
          grid: { color: colors.grid },
        },
      },
      plugins: {
        legend: {
          display: true,
          labels: { color: colors.tick, boxWidth: 12, font: { size: 11 } },
        },
      },
    },
  };
}

// === STATE ===
const STORAGE_KEY = "mennyivelmenjek:state:v3";

const CW_TO_ALPHA = 0.000625;
const V_REF = 80;

export const VEHICLE_CW = Object.freeze({
  sedan: 0.28,
  hatchback: 0.32,
  suv: 0.38,
});

export const COUNTRIES = Object.freeze({
  HU: { flag: "🇭🇺", speedLimit: 130, currency: "Ft", unitSystem: "metric" },
  DE: { flag: "🇩🇪", speedLimit: 130, currency: "EUR", unitSystem: "metric" },
  AT: { flag: "🇦🇹", speedLimit: 130, currency: "EUR", unitSystem: "metric" },
  FR: { flag: "🇫🇷", speedLimit: 130, currency: "EUR", unitSystem: "metric" },
  IT: { flag: "🇮🇹", speedLimit: 130, currency: "EUR", unitSystem: "metric" },
  ES: { flag: "🇪🇸", speedLimit: 120, currency: "EUR", unitSystem: "metric" },
  NL: { flag: "🇳🇱", speedLimit: 130, currency: "EUR", unitSystem: "metric" },
  BE: { flag: "🇧🇪", speedLimit: 120, currency: "EUR", unitSystem: "metric" },
  PL: { flag: "🇵🇱", speedLimit: 140, currency: "PLN", unitSystem: "metric" },
  CZ: { flag: "🇨🇿", speedLimit: 130, currency: "CZK", unitSystem: "metric" },
  SK: { flag: "🇸🇰", speedLimit: 130, currency: "EUR", unitSystem: "metric" },
  SI: { flag: "🇸🇮", speedLimit: 130, currency: "EUR", unitSystem: "metric" },
  HR: { flag: "🇭🇷", speedLimit: 130, currency: "EUR", unitSystem: "metric" },
  RO: { flag: "🇷🇴", speedLimit: 130, currency: "RON", unitSystem: "metric" },
  CH: { flag: "🇨🇭", speedLimit: 120, currency: "CHF", unitSystem: "metric" },
  SE: { flag: "🇸🇪", speedLimit: 120, currency: "SEK", unitSystem: "metric" },
  DK: { flag: "🇩🇰", speedLimit: 130, currency: "DKK", unitSystem: "metric" },
  NO: { flag: "🇳🇴", speedLimit: 110, currency: "NOK", unitSystem: "metric" },
  UK: { flag: "🇬🇧", speedLimit: 112, currency: "GBP", unitSystem: "imperial" },
  US: { flag: "🇺🇸", speedLimit: 120, currency: "USD", unitSystem: "imperial" },
  CA: { flag: "🇨🇦", speedLimit: 100, currency: "CAD", unitSystem: "imperial" },
  AU: { flag: "🇦🇺", speedLimit: 110, currency: "AUD", unitSystem: "imperial" },
  JP: { flag: "🇯🇵", speedLimit: 100, currency: "JPY", unitSystem: "metric" },
});

export function countryInfo(country) {
  return COUNTRIES[country] || COUNTRIES.HU;
}

export const DEFAULTS = Object.freeze({
  consumption: 6.5,
  consumptionSpeed: 130,
  vehicleType: "hatchback",
  fuelType: "gasoline",
  fuelPrice: 610,
  fuelPriceUpdated: null,
  salary: 436200,
  passengers: [],
  workHours: 160,
  freeTime: 1.5,
  distance: null,
  tripEnabled: false,
  country: "HU",
  cw: 0.32,
  autoMode: true,
  carAdvancedMode: "cw",
  measurements: [],
  lang: "hu",
  theme: null,
  currency: "Ft",
  unitSystem: "metric",
  consumptionUnit: "l100",
});

const BOUNDS = {
  consumption: [1, 30],
  consumptionSpeed: [50, 160],
  fuelPrice: [100, 2000],
  salary: [0, 50000000],
  workHours: [100, 250],
  freeTime: [0, 5],
  distance: [0, 1000],
  cw: [0.15, 0.8],
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function validate(state) {
  const out = { ...DEFAULTS };
  for (const key of Object.keys(BOUNDS)) {
    const raw = state[key];
    if (raw === null || raw === undefined || raw === "") {
      out[key] = key === "distance" ? null : DEFAULTS[key];
      continue;
    }
    const num = Number(raw);
    if (!Number.isFinite(num)) {
      out[key] = key === "distance" ? null : DEFAULTS[key];
      continue;
    }
    out[key] = num;
  }
  out.vehicleType =
    state.vehicleType in VEHICLE_CW ? state.vehicleType : DEFAULTS.vehicleType;
  out.fuelType = ["gasoline", "diesel", "manual"].includes(state.fuelType)
    ? state.fuelType
    : DEFAULTS.fuelType;
  out.autoMode = state.autoMode !== false;
  out.tripEnabled = state.tripEnabled === true;
  out.carAdvancedMode = ["cw", "measurements"].includes(state.carAdvancedMode)
    ? state.carAdvancedMode
    : "cw";
  out.lang = ["hu", "en"].includes(state.lang) ? state.lang : "hu";
  out.unitSystem = ["metric", "imperial"].includes(state.unitSystem)
    ? state.unitSystem
    : DEFAULTS.unitSystem;
  out.currency =
    state.currency in CURRENCIES ? state.currency : DEFAULTS.currency;
  out.country =
    state.country in COUNTRIES ? state.country : DEFAULTS.country;
  out.consumptionUnit =
    state.consumptionUnit in CONSUMPTION_UNITS
      ? state.consumptionUnit
      : DEFAULTS.consumptionUnit;
  out.passengers = Array.isArray(state.passengers)
    ? state.passengers
        .map((p) => clamp(Number(p) || 0, 0, 50000000))
        .slice(0, 8)
    : [];
  out.fuelPriceUpdated =
    typeof state.fuelPriceUpdated === "string" ? state.fuelPriceUpdated : null;
  out.measurements = Array.isArray(state.measurements)
    ? state.measurements
        .filter(
          (m) =>
            m &&
            Number.isFinite(Number(m.speed)) &&
            Number.isFinite(Number(m.liters)),
        )
        .map((m) => ({
          speed: clamp(Number(m.speed), 40, 200),
          liters: clamp(Number(m.liters), 1, 40),
        }))
        .slice(0, 12)
    : [];
  out.theme =
    state.theme === "dark" || state.theme === "light" ? state.theme : null;
  return out;
}

export function effectiveAlpha(state) {
  const cw = state.autoMode ? VEHICLE_CW[state.vehicleType] : state.cw;
  return cw * CW_TO_ALPHA;
}

export function effectiveCurve(state) {
  if (
    state.carAdvancedMode === "measurements" &&
    state.measurements &&
    state.measurements.length >= 3
  ) {
    const fit = fitQuadratic(state.measurements);
    if (fit) return { c0: fit.c0, alpha: fit.alpha, vRef: fit.vRef };
  }
  return { c0: deriveC0(state), alpha: effectiveAlpha(state), vRef: V_REF };
}

export function deriveC0(state) {
  const alpha = effectiveAlpha(state);
  return (
    state.consumption / (1 + alpha * (state.consumptionSpeed - V_REF) ** 2)
  );
}

export function totalHourlyRate(state) {
  const total = state.salary + state.passengers.reduce((sum, p) => sum + p, 0);
  return total / state.workHours;
}

export function fitQuadratic(measurements) {
  const pts = measurements.filter(
    (m) =>
      Number.isFinite(m.speed) &&
      Number.isFinite(m.liters) &&
      m.speed > 0 &&
      m.liters > 0,
  );
  if (pts.length < 3) return null;
  const vRef = pts.reduce((s, p) => s + p.speed, 0) / pts.length;
  let s00 = 0,
    s01 = 0,
    s02 = 0,
    s11 = 0,
    s12 = 0,
    s22 = 0,
    sy0 = 0,
    sy1 = 0,
    sy2 = 0;
  for (const p of pts) {
    const d = p.speed - vRef;
    const d2 = d * d;
    s00 += 1;
    s01 += d;
    s02 += d2;
    s11 += d * d;
    s12 += d * d2;
    s22 += d2 * d2;
    sy0 += p.liters;
    sy1 += d * p.liters;
    sy2 += d2 * p.liters;
  }
  const det =
    s00 * (s11 * s22 - s12 * s12) -
    s01 * (s01 * s22 - s12 * s02) +
    s02 * (s01 * s12 - s11 * s02);
  if (Math.abs(det) < 1e-12) return null;
  const c0 =
    (sy0 * (s11 * s22 - s12 * s12) -
      s01 * (sy1 * s22 - s12 * sy2) +
      s02 * (sy1 * s12 - s11 * sy2)) /
    det;
  const b1 =
    (s00 * (sy1 * s22 - s12 * sy2) -
      sy0 * (s01 * s22 - s12 * s02) +
      s02 * (s01 * sy2 - sy1 * s02)) /
    det;
  const b2 =
    (s00 * (s11 * sy2 - sy1 * s12) -
      s01 * (s01 * sy2 - sy1 * s02) +
      sy0 * (s01 * s12 - s11 * s02)) /
    det;
  if (b2 <= 0) return null;
  const vertexVRef = vRef - b1 / (2 * b2);
  const vertexC0 = c0 - (b1 * b1) / (4 * b2);
  if (vertexC0 <= 0.5) return null;
  return { c0: vertexC0, vRef: vertexVRef, alpha: b2 / vertexC0 };
}

export function loadState() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return { ...DEFAULTS };
    return validate(parsed);
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveState(state) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode */
  }
}

export function resetState() {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return { ...DEFAULTS };
}

// === I18N ===
const I18N = {
  hu: {
    title: "Mennyivel menjek? — Optimális autópálya sebesség kalkulátor",
    fuel: "Üzemanyag",
    fuelPriceLabel: "Üzemanyagár",
    gasoline: "Benzin 95",
    diesel: "Gázolaj",
    manual: "Egyéni",
    car: "Autó",
    simple: "Egyszerű",
    advanced: "Haladó",
    consumption: "Fogyasztás",
    measuredSpeed: "Ekkora sebességnél:",
    consumptionHint:
      "Add meg a fogyasztást és hogy milyen sebességnél mérted — a többit megbecsüljük.",
    sedan: "Szedán",
    hatchback: "Ferdehátú",
    cwHint:
      "A cw értéket a típus adja: szedán 0,28 · ferdehátú 0,32 · SUV 0,38",
    cwValue: "cw érték",
    measurements: "Mérések",
    cwLabel: "Légellenállási együttható (cw)",
    cwOverride: "A cw felülírja az egyszerű módban kiválasztott értéket.",
    measurementsHint:
      "Adj meg valós méréseket különböző sebességeknél és illesztünk rá egy görbét. Ha van mérés, a cw-t nem használjuk.",
    addMeasurement: "+ Mérés hozzáadása",
    time: "Időérték",
    salary: "Fizetés",
    salaryUnitSuffix: "hó nettó",
    addPassenger: "+ Utas hozzáadása",
    workHours: "Munkaórák havonta",
    freeTime: "Szabadidő értéke (szorzó)",
    freeTimeHint:
      "Az alapértelmezett 1,5× a túlóra pótléknak (50%) felel meg — módosíthatod, ha másképp értékeled az idődet.",
    reset: "Alapértelmezett értékek visszaállítása",
    optimalSpeed: "Optimális sebesség",
    tripCalc: "Út számítás",
    distance: "Távolság (km)",
    tripFuelCost: "Üzemanyagköltség:",
    tripTime: "Teljes útidő:",
    tripOptimal: "Optimális",
    chartFallback: "A diagram nem érhető el, de az eredmények érvényesek.",
    consumptionChart: "Becsült fogyasztás",
    disclaimer: "A modell egyszerűsített közelítés, tájékoztató jellegű.",
    rangeLimit: "Az optimum a vizsgált tartomány szélén van.",
    legalLimit:
      "⚠️ Az elméleti optimum meghaladja a {limit} sebességkorlátot. Ajánlott: {limit}.",
    theoreticalOptimum: "Elméleti optimum: {speed}",
    country: "Ország",
    defaultsNote: "Alapértelmezett értékekkel számolva",
    on: "Be",
    off: "Ki",
    invalidNumber: "Érvénytelen szám",
    fuelFetchFallback:
      "Nem sikerült lekérni — az alapértelmezett árat használjuk.",
    fuelFetchFrom: "Frissítve:",
    fuelFetchPending: "Árak lekérése folyamatban…",
    fuelSavings: "üzemanyag megtakarítás",
    fuelExtra: "üzemanyag többlet",
    timeSlower: "perc lassabb",
    timeFaster: "perc gyorsabb",
    timeSame: "azonos",
    hour: "óra",
    minute: "perc",
    totalCost: "Összköltség",
    fuelCost: "Üzemanyag",
    timeCost: "Idő",
    speedAxis: "Sebesség",
    costAxis: "Költség",
    consumptionAxis: "Fogyasztás",
    estimatedConsumption: "Becsült fogyasztás",
    measuredValues: "Mért értékek",
    optimalLabel: "Optimális:",
    passenger: "Utas",
    passengerSalary: "fizetése",
    removePassenger: "törlése",
    measurement: "Mérés",
    measurementSpeed: "sebesség",
    measurementConsumption: "fogyasztás",
    removeMeasurement: "törlése",
  },
  en: {
    title: "Optimal highway speed calculator",
    fuel: "Fuel",
    fuelPriceLabel: "Fuel price",
    gasoline: "Petrol 95",
    diesel: "Diesel",
    manual: "Manual",
    car: "Car",
    simple: "Simple",
    advanced: "Advanced",
    consumption: "Consumption",
    measuredSpeed: "Measured speed at:",
    consumptionHint:
      "Enter your fuel consumption and the speed you measured it at — the curve calculates the rest.",
    sedan: "Sedan",
    hatchback: "Hatchback",
    cwHint: "cw from vehicle type: sedan 0.28 · hatchback 0.32 · SUV 0.38",
    cwValue: "cw value",
    measurements: "Measurements",
    cwLabel: "Drag coefficient (cw)",
    cwOverride: "cw overrides the vehicle type value. Current:",
    measurementsHint:
      "Enter real measurements at different speeds — the curve is fitted from these (min. 3). When measurements exist, cw is ignored.",
    addMeasurement: "+ Add measurement",
    time: "Value of time",
    salary: "Salary",
    salaryUnitSuffix: "month net",
    addPassenger: "+ Add passenger",
    workHours: "Work hours per month",
    freeTime: "Free time value (multiplier)",
    freeTimeHint:
      "The default 1.5× corresponds to the 50% overtime premium — adjust it if you value your time differently.",
    reset: "Reset to defaults",
    optimalSpeed: "Optimal speed",
    tripCalc: "Trip calculator",
    distance: "Distance (km)",
    tripFuelCost: "Fuel cost:",
    tripTime: "Total trip time:",
    tripOptimal: "Optimal",
    chartFallback: "Chart unavailable, but results are valid.",
    consumptionChart: "Estimated consumption",
    disclaimer: "This is a simplified model for informational purposes.",
    rangeLimit: "The optimum is at the edge of the analyzed range.",
    legalLimit:
      "⚠️ The theoretical optimum exceeds the {limit} speed limit. Recommended: {limit}.",
    theoreticalOptimum: "Theoretical optimum: {speed}",
    country: "Country",
    defaultsNote: "Calculated with default values",
    on: "On",
    off: "Off",
    invalidNumber: "Invalid number",
    fuelFetchFallback: "Could not fetch — using the default price.",
    fuelFetchFrom: "Updated:",
    fuelFetchPending: "Fetching current prices…",
    fuelSavings: "fuel savings",
    fuelExtra: "fuel extra",
    timeSlower: "min slower",
    timeFaster: "min faster",
    timeSame: "same",
    hour: "h",
    minute: "min",
    totalCost: "Total cost",
    fuelCost: "Fuel",
    timeCost: "Time",
    speedAxis: "Speed",
    costAxis: "Cost",
    consumptionAxis: "Consumption",
    estimatedConsumption: "Estimated consumption",
    measuredValues: "Measured values",
    optimalLabel: "Optimal:",
    passenger: "Passenger",
    passengerSalary: "salary",
    removePassenger: "remove",
    measurement: "Measurement",
    measurementSpeed: "speed",
    measurementConsumption: "consumption",
    removeMeasurement: "remove",
  },
};

let currentLang = "hu";

function t(key) {
  return I18N[currentLang][key] || I18N.hu[key] || key;
}

function applyLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.title = t("title");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (I18N[lang][key]) el.textContent = I18N[lang][key];
  });
}

// === FUEL PRICE FETCH ===
const FUEL_API = "https://openvan.camp/api/fuel/prices";
const FUEL_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

let fuelPriceCache = null;

const FUEL_CACHE_KEY = "mennyivelmenjek:fuel:v1";

function loadFuelCache() {
  try {
    const raw = globalThis.localStorage?.getItem(FUEL_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const gasoline = Number(parsed?.gasoline);
    const diesel = Number(parsed?.diesel);
    if (!Number.isFinite(gasoline) || !Number.isFinite(diesel)) return null;
    return { gasoline, diesel, fetchedAt: parsed.fetchedAt || null };
  } catch {
    return null;
  }
}

function fuelCacheIsStale(cache) {
  if (!cache?.fetchedAt) return true;
  const fetchedAt = new Date(cache.fetchedAt).getTime();
  if (!Number.isFinite(fetchedAt)) return true;
  return Date.now() - fetchedAt > FUEL_CACHE_TTL;
}

function saveFuelCache(cache) {
  try {
    globalThis.localStorage?.setItem(FUEL_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* private mode */
  }
}

let fuelFetchInFlight = false;

async function fetchFuelPrices() {
  if (fuelPriceCache && !fuelCacheIsStale(fuelPriceCache)) {
    return fuelPriceCache;
  }
  if (!fetchFuelPrices.pending) {
    fuelFetchInFlight = true;
    fetchFuelPrices.pending = (async () => {
      try {
        const res = await fetch(FUEL_API, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const hu = json?.data?.HU;
        if (!hu?.prices?.gasoline || !hu?.prices?.diesel)
          throw new Error("Hungary data not found");
        const gasoline = Math.round(hu.prices.gasoline);
        const diesel = Math.round(hu.prices.diesel);
        fuelPriceCache = { gasoline, diesel, fetchedAt: new Date().toISOString() };
        saveFuelCache(fuelPriceCache);
        return fuelPriceCache;
      } catch (e) {
        fetchFuelPrices.pending = null; // allow retry on next trigger
        throw e;
      } finally {
        fuelFetchInFlight = false;
      }
    })();
  }
  return fetchFuelPrices.pending;
}

// === DOM WIRING ===
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function fmtInput(value) {
  return value === "" || value === null ? "" : String(value).replace(".", ",");
}

const SLIDER_CONFIG = {
  consumption: { min: 1, max: 30, step: 0.1 },
  "consumption-speed": { min: 50, max: 160, step: 5 },
  "fuel-price": { min: 100, max: 2000, step: 1 },
  "work-hours": { min: 100, max: 250, step: 5 },
  "free-time": { min: 0, max: 5, step: 0.1 },
  distance: { min: 0, max: 1000, step: 10 },
  cw: { min: 0.15, max: 0.8, step: 0.01 },
};

function consumptionSliderBounds(unitKey) {
  const u = CONSUMPTION_UNITS[unitKey] || CONSUMPTION_UNITS.l100;
  const a = u.fromL100(1);
  const b = u.fromL100(30);
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  const step = unitKey === "mpgUS" || unitKey === "mpgUK" ? 0.5 : 0.1;
  return { min, max, step };
}

function createFieldFeedback(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const row = el.closest(".field-row");
  if (!row) return;
  const error = document.createElement("p");
  error.className = "field-error";
  error.id = `${id}-error`;
  error.hidden = true;
  row.insertAdjacentElement("afterend", error);
}

function showFieldError(id, message) {
  const error = document.getElementById(`${id}-error`);
  if (!error) return;
  error.textContent = message;
  error.hidden = false;
}

function clearFieldError(id) {
  const error = document.getElementById(`${id}-error`);
  if (error) error.hidden = true;
}

function sliderAriaLabel(el) {
  const explicit = el.getAttribute("aria-label");
  if (explicit) return explicit;
  if (el.labels && el.labels[0]) return el.labels[0].textContent.trim();
  return "";
}

function sliderVisibleLabel(el) {
  const override = el.getAttribute("data-slider-label");
  return override !== null ? override : sliderAriaLabel(el);
}

function createSlider(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const row = el.closest(".field-row");
  if (!row) return null;
  const sliderRow = document.createElement("div");
  sliderRow.className = "slider-row";
  const header = document.createElement("div");
  header.className = "slider-header";
  const label = document.createElement("span");
  label.className = "slider-label";
  label.id = `${id}-slider-label`;
  label.textContent = sliderVisibleLabel(el);
  label.hidden = label.textContent === "";
  const value = document.createElement("span");
  value.className = "slider-value";
  value.id = `${id}-slider-value`;
  header.append(label, value);
  const slider = document.createElement("input");
  slider.type = "range";
  slider.id = `${id}-slider`;
  const aria = sliderAriaLabel(el);
  if (aria) slider.setAttribute("aria-label", aria);
  const bounds = document.createElement("div");
  bounds.className = "slider-bounds";
  const min = document.createElement("span");
  min.className = "slider-min";
  min.id = `${id}-slider-min`;
  const max = document.createElement("span");
  max.className = "slider-max";
  max.id = `${id}-slider-max`;
  bounds.append(min, max);
  sliderRow.append(header, slider, bounds);
  row.insertAdjacentElement("afterend", sliderRow);
  return slider;
}

function updateSliderLabels() {
  for (const id of Object.keys(SLIDER_CONFIG)) {
    const slider = document.getElementById(`${id}-slider`);
    const el = document.getElementById(id);
    const aria = el ? sliderAriaLabel(el) : "";
    if (slider && aria) slider.setAttribute("aria-label", aria);
    const label = document.getElementById(`${id}-slider-label`);
    if (label && el) {
      label.textContent = sliderVisibleLabel(el);
      label.hidden = label.textContent === "";
    }
  }
}

function fmtSliderDisplay(value) {
  return fmtInput(Math.round(value * 10) / 10);
}

function setSliderValue(id, value) {
  const slider = document.getElementById(`${id}-slider`);
  if (!slider) return;
  slider.value = String(value);
  const display = document.getElementById(`${id}-slider-value`);
  if (display) display.textContent = fmtSliderDisplay(value);
}

function setSliderBounds(id, bounds) {
  const slider = document.getElementById(`${id}-slider`);
  if (!slider) return;
  slider.min = String(bounds.min);
  slider.max = String(bounds.max);
  slider.step = String(bounds.step);
  const minEl = document.getElementById(`${id}-slider-min`);
  const maxEl = document.getElementById(`${id}-slider-max`);
  if (minEl) minEl.textContent = fmtSliderDisplay(bounds.min);
  if (maxEl) maxEl.textContent = fmtSliderDisplay(bounds.max);
}

function setSliderEnabled(id, enabled) {
  const slider = document.getElementById(`${id}-slider`);
  if (slider) slider.disabled = !enabled;
  const sliderRow = slider?.closest(".slider-row");
  if (sliderRow) sliderRow.hidden = !enabled;
}

function updateTripLabel() {
  const label = document.getElementById("trip-toggle-label");
  const toggle = document.getElementById("trip-toggle");
  if (label && toggle) {
    label.textContent = toggle.checked ? t("on") : t("off");
  }
}

function populateFields(state) {
  const unit =
    CONSUMPTION_UNITS[state.consumptionUnit] || CONSUMPTION_UNITS.l100;
  const sys = unitSystemOf(state);
  const fields = {
    consumption: unit.fromL100(state.consumption),
    "consumption-speed": sys.speedToDisplay(state.consumptionSpeed),
    "fuel-price": sys.fuelPriceToDisplay(state.fuelPrice),
    salary: state.salary,
    "work-hours": state.workHours,
    "free-time": state.freeTime,
    distance:
      state.distance === null ? "" : fmtInput(sys.distanceToDisplay(state.distance)),
    cw: state.cw,
  };
  for (const [id, value] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (el) el.value = fmtInput(value);
  }
  updateUnitLabels(state);
  setSegActive("fuel-type", state.fuelType);
  setSegActive("vehicle-type", state.vehicleType);
  setSegActive("car-advanced-mode", state.carAdvancedMode);
  setTab("car", state.autoMode ? "simple" : "advanced");
  setTab("time", "simple");
  document.getElementById("fuel-price").disabled = state.fuelType !== "manual";
  setSliderEnabled("fuel-price", state.fuelType === "manual");
  document.getElementById("trip-toggle").checked = state.tripEnabled;
  updateTripLabel();
  document.getElementById("trip-content").hidden = !state.tripEnabled;
  document.getElementById("cw-panel").hidden = state.carAdvancedMode !== "cw";
  document.getElementById("measurements-panel").hidden =
    state.carAdvancedMode !== "measurements";
  renderPassengers(state);
  renderMeasurements(state);
  updateFuelNote(state);
}

function updateUnitLabels(state) {
  const sym = currencySymbol(state.currency);
  const sys = unitSystemOf(state);
  const fuelUnit = document.getElementById("fuel-price-unit");
  if (fuelUnit) fuelUnit.textContent = `${sym}${sys.fuelPriceLabel}`;
  const salaryUnit = document.getElementById("salary-unit");
  if (salaryUnit) salaryUnit.textContent = `${sym}/${t("salaryUnitSuffix")}`;
const consUnit = document.getElementById("consumption-unit-label");
  if (consUnit)
    consUnit.textContent = consumptionUnitLabel(state.consumptionUnit);
  const speedUnit = document.getElementById("consumption-speed-unit");
  if (speedUnit) speedUnit.textContent = sys.speedLabel;
}

function setTab(section, view) {
  const simpleBtn = document.getElementById(`${section}-tab-simple`);
  const advancedBtn = document.getElementById(`${section}-tab-advanced`);
  const simplePanel = document.getElementById(`${section}-simple`);
  const advancedPanel = document.getElementById(`${section}-advanced`);
  if (!simpleBtn || !advancedBtn || !simplePanel || !advancedPanel) return;
  const isSimple = view === "simple";
  simpleBtn.classList.toggle("active", isSimple);
  advancedBtn.classList.toggle("active", !isSimple);
  simpleBtn.setAttribute("aria-selected", isSimple ? "true" : "false");
  advancedBtn.setAttribute("aria-selected", !isSimple ? "true" : "false");
  simplePanel.hidden = !isSimple;
  advancedPanel.hidden = isSimple;
}

function setSegActive(groupId, value) {
  document.querySelectorAll(`#${groupId} .seg-btn`).forEach((btn) => {
    const active = btn.dataset.value === value;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function updateFuelNote(state) {
  const note = document.getElementById("fuel-price-note");
  if (state.fuelType === "manual") {
    note.textContent = "";
  } else if (state.fuelPriceUpdated) {
    const d = new Date(state.fuelPriceUpdated);
    const locale = currentLang === "hu" ? "hu-HU" : "en-GB";
    note.textContent = `${t("fuelFetchFrom")} ${d.toLocaleDateString(locale)}`;
  } else if (fuelFetchInFlight) {
    note.textContent = t("fuelFetchPending");
  } else {
    note.textContent = t("fuelFetchFallback");
  }
}

function renderPassengers(state) {
  const container = document.getElementById("passengers");
  if (!container) return;
  container.innerHTML = "";
  const sym = currencySymbol(state.currency);
  state.passengers.forEach((salary, i) => {
    const row = document.createElement("div");
    row.className = "field-row passenger-row";
    const label = document.createElement("span");
    label.className = "unit";
    label.textContent = `${t("passenger")} ${i + 1}:`;
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.value = fmtInput(salary);
    input.dataset.index = i;
    input.setAttribute(
      "aria-label",
      `${t("passenger")} ${i + 1} ${t("passengerSalary")}`,
    );
    const unit = document.createElement("span");
    unit.className = "unit";
    unit.textContent = `${sym}/${t("salaryUnitSuffix")}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost-btn remove-passenger";
    remove.textContent = "×";
    remove.dataset.index = i;
    remove.setAttribute(
      "aria-label",
      `${t("passenger")} ${i + 1} ${t("removePassenger")}`,
    );
    row.append(label, input, unit, remove);
    container.appendChild(row);
  });
}

function renderMeasurements(state) {
  const container = document.getElementById("measurements");
  if (!container) return;
  container.innerHTML = "";
  const unit =
    CONSUMPTION_UNITS[state.consumptionUnit] || CONSUMPTION_UNITS.l100;
  const sys = unitSystemOf(state);
  state.measurements.forEach((m, i) => {
    const row = document.createElement("div");
    row.className = "field-row measurement-row";
    const speedInput = document.createElement("input");
    speedInput.type = "text";
    speedInput.inputMode = "decimal";
    speedInput.value = fmtInput(sys.speedToDisplay(m.speed));
    speedInput.dataset.index = i;
    speedInput.dataset.field = "speed";
    speedInput.className = "narrow";
    speedInput.setAttribute(
      "aria-label",
      `${t("measurement")} ${i + 1} ${t("measurementSpeed")} (${sys.speedLabel})`,
    );
    const speedUnit = document.createElement("span");
    speedUnit.className = "unit";
    speedUnit.textContent = sys.speedLabel;
    const litersInput = document.createElement("input");
    litersInput.type = "text";
    litersInput.inputMode = "decimal";
    litersInput.value = fmtInput(unit.fromL100(m.liters));
    litersInput.dataset.index = i;
    litersInput.dataset.field = "liters";
    litersInput.className = "narrow";
    litersInput.setAttribute(
      "aria-label",
      `${t("measurement")} ${i + 1} ${t("measurementConsumption")} (${unit.label})`,
    );
    const litersUnit = document.createElement("span");
    litersUnit.className = "unit";
    litersUnit.textContent = unit.label;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost-btn remove-measurement";
    remove.textContent = "×";
    remove.dataset.index = i;
    remove.setAttribute(
      "aria-label",
      `${t("measurement")} ${i + 1} ${t("removeMeasurement")}`,
    );
    row.append(speedInput, speedUnit, litersInput, litersUnit, remove);
    container.appendChild(row);
  });
}

function renderResults(state) {
  const curve = effectiveCurve(state);
  const hr = totalHourlyRate(state) * state.freeTime;
  const opt = findOptimalSpeed(
    curve.c0,
    curve.alpha,
    curve.vRef,
    state.fuelPrice,
    hr,
  );
  const legalLimit = countryInfo(state.country).speedLimit;
  const recommended = Math.min(opt.speed, legalLimit);
  const sys = unitSystemOf(state);
  const speedEl = document.getElementById("optimal-speed");
  speedEl.textContent = formatSpeed(recommended, state.unitSystem);
  animateResult(speedEl);

  renderTrip(state, curve, hr, recommended);

  const note = document.getElementById("range-limit-note");
  const legalNote = document.getElementById("legal-limit-note");
  const theoNote = document.getElementById("theoretical-optimum");
  if (opt.speed <= 60.25 || opt.speed >= 199.75) {
    note.textContent = t("rangeLimit");
    note.style.display = "block";
  } else {
    note.style.display = "none";
  }
  if (legalNote) {
    if (opt.speed > legalLimit) {
      legalNote.textContent = t("legalLimit").replaceAll(
        "{limit}",
        formatSpeed(legalLimit, state.unitSystem),
      );
      legalNote.style.display = "block";
    } else {
      legalNote.style.display = "none";
    }
  }
  if (theoNote) {
    if (opt.speed > legalLimit) {
      theoNote.textContent = t("theoreticalOptimum").replace(
        "{speed}",
        formatSpeed(opt.speed, state.unitSystem),
      );
      theoNote.hidden = false;
    } else {
      theoNote.hidden = true;
    }
  }
  const defaultsNote = document.getElementById("defaults-note");
  if (defaultsNote) {
    defaultsNote.hidden = !isDefaultState(state);
    defaultsNote.textContent = t("defaultsNote");
  }
}

function animateResult(el) {
  const prev = el.dataset.prev;
  const curr = el.textContent;
  if (prev && prev !== curr) {
    el.classList.remove("result-flash");
    void el.offsetWidth;
    el.classList.add("result-flash");
  }
  el.dataset.prev = curr;
}

function isDefaultState(state) {
  const keys = [
    "consumption",
    "consumptionSpeed",
    "vehicleType",
    "fuelType",
    "fuelPrice",
    "salary",
    "passengers",
    "workHours",
    "freeTime",
    "distance",
    "tripEnabled",
    "cw",
    "autoMode",
    "carAdvancedMode",
    "measurements",
    "currency",
    "unitSystem",
    "consumptionUnit",
  ];
  return keys.every((k) => {
    const a = state[k];
    const b = DEFAULTS[k];
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((v, i) => v === b[i]);
    }
    return a === b;
  });
}

function renderTrip(state, curve, hr, recommended) {
  const content = document.getElementById("trip-content");
  if (!content) return;
  if (!state.tripEnabled) {
    content.hidden = true;
    return;
  }
  content.hidden = false;

  const header = document.getElementById("trip-optimal-header");
  if (header)
    header.textContent = `${t("tripOptimal")} (${formatSpeed(
      recommended,
      state.unitSystem,
    )})`;

  const refSpeed = countryInfo(state.country).speedLimit;
  const refHeader = document.getElementById("trip-ref-header");
  if (refHeader)
    refHeader.textContent = `${Math.round(
      unitSystemOf(state).speedToDisplay(refSpeed),
    )} ${unitSystemOf(state).speedLabel}`;

  const refFuelCost = computeFuelCostPerKm(
    computeConsumption(curve.c0, curve.alpha, curve.vRef, refSpeed),
    state.fuelPrice,
  );
  const refTime = state.distance / refSpeed;

  const tripFuelCost =
    computeFuelCostPerKm(
      computeConsumption(curve.c0, curve.alpha, curve.vRef, recommended),
      state.fuelPrice,
    ) * state.distance;
  const tripHours = state.distance / recommended;
  const fmtDuration = (hours) => {
    const totalMinutes = Math.round(hours * 60);
    const hh = Math.floor(totalMinutes / 60);
    const mm = totalMinutes % 60;
    return hh > 0
      ? `${hh} ${t("hour")} ${mm} ${t("minute")}`
      : `${mm} ${t("minute")}`;
  };

  document.getElementById("trip-cost").textContent = formatFt(
    tripFuelCost,
    state.currency,
  );
  document.getElementById("trip-time").textContent = fmtDuration(tripHours);
  document.getElementById("trip-cost-130").textContent = formatFt(
    refFuelCost * state.distance,
    state.currency,
  );
  document.getElementById("trip-time-130").textContent = fmtDuration(refTime);

  const fuelDiff = tripFuelCost - refFuelCost * state.distance;
  const timeDiff = tripHours - refTime;
  const timeDiffMin = Math.round(timeDiff * 60);

  const diffEl = document.getElementById("trip-diff");
  const parts = [];
  if (fuelDiff < 0) {
    parts.push(
      `${formatFt(Math.abs(fuelDiff), state.currency)} ${t("fuelSavings")}`,
    );
    diffEl.className = "diff-positive";
  } else {
    parts.push(`+${formatFt(fuelDiff, state.currency)} ${t("fuelExtra")}`);
    diffEl.className = "diff-negative";
  }
  if (timeDiffMin > 0) {
    parts.push(`+${timeDiffMin} ${t("timeSlower")}`);
  } else if (timeDiffMin < 0) {
    parts.push(`${Math.abs(timeDiffMin)} ${t("timeFaster")}`);
  } else {
    parts.push(t("timeSame"));
  }
  diffEl.textContent = parts.join(" · ");
}

function updateChart(state) {
  if (
    typeof Chart === "undefined" ||
    typeof window["chartjs-plugin-annotation"] === "undefined"
  ) {
    const fallback = document.getElementById("chart-fallback");
    if (fallback) fallback.style.display = "block";
    const canvas = document.getElementById("chart");
    if (canvas) canvas.style.display = "none";
    return;
  }

  const theme =
    document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const curve = effectiveCurve(state);
  const config = buildChartConfig({
    c0: curve.c0,
    alpha: curve.alpha,
    vRef: curve.vRef,
    price: state.fuelPrice,
    hourlyRate: totalHourlyRate(state) * state.freeTime,
    theme,
    currency: state.currency,
    unitSystem: state.unitSystem,
  });

  if (window.chart) {
    window.chart.data = config.data;
    window.chart.options = config.options;
    window.chart.update();
  } else {
    const canvas = document.getElementById("chart");
    if (!canvas) return;
    window.chart = new Chart(canvas, {
      type: "line",
      data: config.data,
      options: config.options,
    });
  }

  const consumptionConfig = buildConsumptionChartConfig({
    c0: curve.c0,
    alpha: curve.alpha,
    vRef: curve.vRef,
    theme,
    measurements: state.measurements,
    consumptionUnit: state.consumptionUnit,
    unitSystem: state.unitSystem,
  });

  if (window.consumptionChart) {
    window.consumptionChart.data = consumptionConfig.data;
    window.consumptionChart.options = consumptionConfig.options;
    window.consumptionChart.update();
  } else {
    const consumptionCanvas = document.getElementById("consumption-chart");
    if (consumptionCanvas) {
      window.consumptionChart = new Chart(consumptionCanvas, {
        type: "line",
        data: consumptionConfig.data,
        options: consumptionConfig.options,
      });
    }
  }
}

function recalculate(state) {
  renderResults(state);
  updateChart(state);
}

function init() {
  let state = loadState();
  window.chart = null;

  state = {
    ...state,
    lang: "hu",
    country: "HU",
    currency: "Ft",
    unitSystem: "metric",
    consumptionUnit: "l100",
  };

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  if (state.theme) {
    document.documentElement.dataset.theme = state.theme;
  } else if (mediaQuery.matches) {
    document.documentElement.dataset.theme = "dark";
  }
  updateThemeIcon(document.documentElement.dataset.theme);

  applyLanguage("hu");

  function syncFuelState() {
    fuelPriceCache = loadFuelCache();
    const cachedPrice =
      state.fuelType !== "manual" ? fuelPriceCache?.[state.fuelType] : undefined;
    if (Number.isFinite(cachedPrice)) {
      state = validate({
        ...state,
        fuelPrice: cachedPrice,
        fuelPriceUpdated: fuelPriceCache.fetchedAt,
      });
    }
    if (state.fuelType !== "manual" && fuelCacheIsStale(fuelPriceCache)) {
      triggerFuelFetch();
    }
  }

  syncFuelState();
  populateFields(state);
  recalculate(state);

  const debouncedChart = debounce((s) => updateChart(s), 150);

  function applyState(next) {
    state = validate(next);
    saveState(state);
    renderResults(state);
    debouncedChart(state);
    inputIds.forEach((id) => syncSliderFromState(id));
  }

  const inputIds = [
    "consumption",
    "consumption-speed",
    "fuel-price",
    "salary",
    "work-hours",
    "free-time",
    "distance",
    "cw",
  ];
  const keyMap = {
    consumption: "consumption",
    "consumption-speed": "consumptionSpeed",
    "fuel-price": "fuelPrice",
    salary: "salary",
    "work-hours": "workHours",
    "free-time": "freeTime",
    distance: "distance",
    cw: "cw",
  };

  function sliderConfigFor(id) {
    if (id === "consumption") {
      return consumptionSliderBounds(state.consumptionUnit);
    }
    const cfg = SLIDER_CONFIG[id];
    if (!cfg) return null;
    const sys = unitSystemOf(state);
    if (id === "distance") {
      return {
        min: sys.distanceToDisplay(cfg.min),
        max: sys.distanceToDisplay(cfg.max),
        step: sys.distanceToDisplay(cfg.step),
      };
    }
    if (id === "fuel-price") {
      return {
        min: sys.fuelPriceToDisplay(cfg.min),
        max: sys.fuelPriceToDisplay(cfg.max),
        step: sys.fuelPriceToDisplay(cfg.step),
      };
    }
    if (id === "consumption-speed") {
      return {
        min: sys.speedToDisplay(cfg.min),
        max: sys.speedToDisplay(cfg.max),
        step: sys.speedToDisplay(cfg.step),
      };
    }
    return cfg;
  }

  function syncSliderFromState(id) {
    const key = keyMap[id];
    const cfg = sliderConfigFor(id);
    if (!cfg) return;
    const sys = unitSystemOf(state);
    let value;
    if (key === "consumption") {
      const unit =
        CONSUMPTION_UNITS[state.consumptionUnit] || CONSUMPTION_UNITS.l100;
      value = unit.fromL100(state.consumption);
    } else if (key === "distance") {
      value =
        state.distance === null
          ? cfg.min
          : sys.distanceToDisplay(state.distance);
    } else if (key === "fuel-price") {
      value = sys.fuelPriceToDisplay(state.fuelPrice);
    } else if (key === "consumption-speed") {
      value = sys.speedToDisplay(state.consumptionSpeed);
    } else {
      value = state[key] ?? cfg.min;
    }
    setSliderBounds(id, cfg);
    setSliderValue(id, value);
  }

  function handleInput(id, el) {
    const key = keyMap[id];
    const raw = parseDecimal(el.value);
    if (raw === null) {
      if (key === "distance") {
        el.removeAttribute("aria-invalid");
        clearFieldError(id);
        applyState({ ...state, [key]: null });
        return;
      }
      el.setAttribute("aria-invalid", "true");
      showFieldError(id, t("invalidNumber"));
      return;
    }
    let canonical = raw;
    const sys = unitSystemOf(state);
    if (key === "consumption") {
      const unit =
        CONSUMPTION_UNITS[state.consumptionUnit] || CONSUMPTION_UNITS.l100;
      canonical = unit.toL100(raw);
      if (!Number.isFinite(canonical) || canonical <= 0) {
        el.setAttribute("aria-invalid", "true");
        showFieldError(id, t("invalidNumber"));
        return;
      }
    } else if (key === "distance") {
      canonical = sys.distanceFromDisplay(raw);
    } else if (key === "fuel-price") {
      canonical = sys.fuelPriceFromDisplay(raw);
    } else if (key === "consumption-speed") {
      canonical = sys.speedFromDisplay(raw);
    }
    el.removeAttribute("aria-invalid");
    clearFieldError(id);
    applyState({ ...state, [key]: canonical });
  }

  inputIds.forEach((id) => createFieldFeedback(id));

  for (const id of Object.keys(SLIDER_CONFIG)) {
    const slider = createSlider(id);
    if (!slider) continue;
    const el = document.getElementById(id);
    slider.addEventListener("input", () => {
      const value = Number(slider.value);
      el.value = fmtInput(value);
      handleInput(id, el);
    });
  }
  inputIds.forEach((id) => syncSliderFromState(id));
  setSliderEnabled("fuel-price", state.fuelType === "manual");

  for (const id of inputIds) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener("input", () => handleInput(id, el));
    el.addEventListener("blur", () => {
      const key = keyMap[id];
      const sys = unitSystemOf(state);
      if (key === "consumption") {
        const unit =
          CONSUMPTION_UNITS[state.consumptionUnit] || CONSUMPTION_UNITS.l100;
        el.value = fmtInput(unit.fromL100(state.consumption));
      } else if (key === "distance") {
        el.value =
          state.distance === null
            ? ""
            : fmtInput(sys.distanceToDisplay(state.distance));
      } else if (key === "fuel-price") {
        el.value = fmtInput(sys.fuelPriceToDisplay(state.fuelPrice));
      } else if (key === "consumption-speed") {
        el.value = fmtInput(sys.speedToDisplay(state.consumptionSpeed));
      } else {
        el.value = fmtInput(state[key]);
      }
      el.removeAttribute("aria-invalid");
      clearFieldError(id);
      syncSliderFromState(id);
    });
  }

  function triggerFuelFetch() {
    fetchFuelPrices()
      .then(() => {
        if (state.fuelType !== "manual") handleFuelType(state.fuelType);
      })
      .catch(() => {
        if (state.fuelType === "manual") return;
        if (fuelPriceCache) return; // stale cache price already applied
        // no cache: keep default price, show fallback note
        updateFuelNote(state);
      });
  }

  function handleFuelType(value) {
    state = validate({ ...state, fuelType: value });
    saveState(state);
    setSegActive("fuel-type", value);
    document.getElementById("fuel-price").disabled = value !== "manual";
    setSliderEnabled("fuel-price", value === "manual");
    if (value === "manual") {
      updateFuelNote(state);
      recalculate(state);
      return;
    }
    const price = fuelPriceCache ? fuelPriceCache[value] : undefined;
    if (Number.isFinite(price)) {
      state = validate({
        ...state,
        fuelPrice: price,
        fuelPriceUpdated: fuelPriceCache.fetchedAt,
      });
      saveState(state);
      document.getElementById("fuel-price").value = fmtInput(price);
      updateFuelNote(state);
      recalculate(state);
    } else {
      state = validate({
        ...state,
        fuelPrice: DEFAULTS.fuelPrice,
        fuelPriceUpdated: null,
      });
      saveState(state);
      document.getElementById("fuel-price").value = fmtInput(
        DEFAULTS.fuelPrice,
      );
      updateFuelNote(state);
      recalculate(state);
    }
    if (fuelCacheIsStale(fuelPriceCache)) {
      triggerFuelFetch();
    }
  }

  document.querySelectorAll("#fuel-type .seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleFuelType(btn.dataset.value));
  });

  document.querySelectorAll("#vehicle-type .seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      setSegActive("vehicle-type", btn.dataset.value);
      applyState({ ...state, vehicleType: btn.dataset.value });
    });
  });

  document.getElementById("add-passenger")?.addEventListener("click", () => {
    applyState({ ...state, passengers: [...state.passengers, 0] });
    renderPassengers(state);
  });

  document.getElementById("add-measurement")?.addEventListener("click", () => {
    applyState({
      ...state,
      measurements: [...state.measurements, { speed: 90, liters: 5.0 }],
    });
    renderMeasurements(state);
  });

  document.getElementById("measurements")?.addEventListener("input", (e) => {
    if (e.target.matches("input[data-index]")) {
      const i = Number(e.target.dataset.index);
      const field = e.target.dataset.field;
      const parsed = parseDecimal(e.target.value);
      if (parsed === null) {
        e.target.setAttribute("aria-invalid", "true");
        return;
      }
      e.target.removeAttribute("aria-invalid");
      let value = parsed;
      const sys = unitSystemOf(state);
      if (field === "speed") {
        value = sys.speedFromDisplay(parsed);
        if (!Number.isFinite(value) || value <= 0) {
          e.target.setAttribute("aria-invalid", "true");
          return;
        }
      } else if (field === "liters") {
        const unit =
          CONSUMPTION_UNITS[state.consumptionUnit] || CONSUMPTION_UNITS.l100;
        value = unit.toL100(parsed);
        if (!Number.isFinite(value) || value <= 0) {
          e.target.setAttribute("aria-invalid", "true");
          return;
        }
      }
      const measurements = state.measurements.map((m, idx) =>
        idx === i ? { ...m, [field]: value } : m,
      );
      applyState({ ...state, measurements });
    }
  });

  document.getElementById("measurements")?.addEventListener("click", (e) => {
    if (e.target.matches(".remove-measurement")) {
      const i = Number(e.target.dataset.index);
      const measurements = state.measurements.filter((_, idx) => idx !== i);
      applyState({ ...state, measurements });
      renderMeasurements(state);
    }
  });

  document.getElementById("passengers")?.addEventListener("input", (e) => {
    if (e.target.matches("input[data-index]")) {
      const i = Number(e.target.dataset.index);
      const parsed = parseDecimal(e.target.value);
      if (parsed === null) {
        e.target.setAttribute("aria-invalid", "true");
        return;
      }
      e.target.removeAttribute("aria-invalid");
      const passengers = [...state.passengers];
      passengers[i] = parsed;
      applyState({ ...state, passengers });
    }
  });

  document.getElementById("passengers")?.addEventListener("click", (e) => {
    if (e.target.matches(".remove-passenger")) {
      const i = Number(e.target.dataset.index);
      const passengers = state.passengers.filter((_, idx) => idx !== i);
      applyState({ ...state, passengers });
      renderPassengers(state);
    }
  });

  document.getElementById("car-tab-simple")?.addEventListener("click", () => {
    setTab("car", "simple");
    applyState({ ...state, autoMode: true });
  });

  document.getElementById("car-tab-advanced")?.addEventListener("click", () => {
    setTab("car", "advanced");
    applyState({ ...state, autoMode: false });
  });

  document.querySelectorAll("#car-advanced-mode .seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.value;
      setSegActive("car-advanced-mode", mode);
      document.getElementById("cw-panel").hidden = mode !== "cw";
      document.getElementById("measurements-panel").hidden =
        mode !== "measurements";
      applyState({ ...state, carAdvancedMode: mode });
    });
  });

  document.getElementById("time-tab-simple")?.addEventListener("click", () => {
    setTab("time", "simple");
  });

  document
    .getElementById("time-tab-advanced")
    ?.addEventListener("click", () => {
      setTab("time", "advanced");
    });

  document.getElementById("trip-toggle")?.addEventListener("change", (e) => {
    document.getElementById("trip-content").hidden = !e.target.checked;
    updateTripLabel();
    applyState({ ...state, tripEnabled: e.target.checked });
  });

  document.getElementById("reset")?.addEventListener("click", () => {
    state = resetState();
    syncFuelState();
    populateFields(state);
    recalculate(state);
  });

  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme;
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    state = { ...state, theme: next };
    saveState(state);
    updateChart(state);
    updateThemeIcon(next);
  });

  let activeTooltip = null;
  let tooltipBtn = null;
  let tooltipTimer = null;
  let tooltipSource = null;

  function showTooltip(btn, source) {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
    const key = btn.dataset.info;
    const text = t(key);
    if (!text) return;
    const tooltip = document.createElement("div");
    tooltip.className = "info-tooltip";
    tooltip.textContent = text;
    const rect = btn.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + window.scrollY + 6}px`;
    tooltip.style.left = `${Math.max(8, rect.left + window.scrollX - 240)}px`;
    document.body.appendChild(tooltip);
    activeTooltip = tooltip;
    tooltipBtn = btn;
    tooltipSource = source;
  }

  function hideTooltip() {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
    tooltipBtn = null;
    tooltipSource = null;
  }

  const canHover = window.matchMedia("(hover: hover)").matches;

  document.querySelectorAll(".info-btn").forEach((btn) => {
    if (canHover) {
      btn.addEventListener("mouseenter", () => {
        clearTimeout(tooltipTimer);
        showTooltip(btn, "hover");
      });
      btn.addEventListener("mouseleave", () => {
        tooltipTimer = setTimeout(hideTooltip, 150);
      });
    }
    btn.addEventListener("focus", () => {
      if (!(activeTooltip && tooltipBtn === btn && tooltipSource === "click")) {
        showTooltip(btn, "focus");
      }
    });
    btn.addEventListener("blur", hideTooltip);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (activeTooltip && tooltipBtn === btn && tooltipSource === "click") {
        hideTooltip();
      } else {
        showTooltip(btn, "click");
      }
    });
  });

  document.addEventListener("click", () => hideTooltip());

  function updateThemeIcon(theme) {
    const lightIcon = document.getElementById("theme-icon-light");
    const darkIcon = document.getElementById("theme-icon-dark");
    if (lightIcon && darkIcon) {
      lightIcon.style.display = theme === "dark" ? "none" : "";
      darkIcon.style.display = theme === "dark" ? "" : "none";
    }
  }

  mediaQuery.addEventListener("change", (e) => {
    if (state.theme === null) {
      document.documentElement.dataset.theme = e.matches ? "dark" : "light";
      updateChart(state);
      updateThemeIcon(e.matches ? "dark" : "light");
    }
  });

}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", init);
}
