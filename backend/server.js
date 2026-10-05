const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 5000;

const WEATHER_API_URL =
  "https://api.weatherapi.com/v1/current.json";

const FREIGHT_API_URL =
  "https://api.oilpriceapi.com/v1/prices/latest";

// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FreightOpt AI Backend is running!",
  });
});

// ======================================================
// WEATHER API
// ======================================================

async function getWeather(location) {
  try {
    if (!process.env.WEATHER_API_KEY) {
      console.log("Weather API key missing");
      return null;
    }

    const response = await axios.get(WEATHER_API_URL, {
      params: {
        key: process.env.WEATHER_API_KEY,
        q: location,
        aqi: "no",
      },
      timeout: 10000,
    });

    const data = response.data;

    return {
      location: data.location?.name || location,
      country: data.location?.country || "",
      temperatureC: Number(data.current?.temp_c ?? 0),
      windKph: Number(data.current?.wind_kph ?? 0),
      windDegree: Number(data.current?.wind_degree ?? 0),
      condition: data.current?.condition?.text || "Unknown",
      humidity: Number(data.current?.humidity ?? 0),
      visibilityKm: Number(data.current?.vis_km ?? 0),
    };
  } catch (error) {
    console.log(
      "Weather API Error:",
      error.response?.status || error.message
    );

    console.log(
      "Weather API Details:",
      error.response?.data || "No response data"
    );

    return null;
  }
}

// ======================================================
// BALTIC DRY INDEX / FREIGHT API
// ======================================================

async function getFreightIndex() {
  try {
    if (!process.env.OILPRICEAPI_KEY) {
      console.log("OilPriceAPI key missing");
      return null;
    }

    console.log("Fetching Baltic Dry Index...");

    const response = await axios.get(FREIGHT_API_URL, {
      params: {
        by_code: "BALTIC_DRY_INDEX",
      },

      headers: {
        Authorization: `Token ${process.env.OILPRICEAPI_KEY}`,
      },

      timeout: 10000,
    });

    const data = response.data;

    // IMPORTANT:
    // This is the OilPriceAPI response.
    // We are printing the full response temporarily
    // so we can identify the exact BDI value field.

    console.log(
      "FULL FREIGHT DATA:",
      JSON.stringify(data, null, 2)
    );

    console.log("Freight API response received");

    // --------------------------------------------------
    // Try multiple possible response structures
    // --------------------------------------------------

    let price = null;

    if (typeof data.price === "number") {
      price = data.price;
    }

    if (typeof data.price === "string") {
      price = Number(data.price);
    }

    if (
      price === null &&
      data.data &&
      typeof data.data.price !== "undefined"
    ) {
      price = Number(data.data.price);
    }

    if (
      price === null &&
      data.result &&
      typeof data.result.price !== "undefined"
    ) {
      price = Number(data.result.price);
    }

    if (
      price === null &&
      data.data &&
      data.data.data &&
      typeof data.data.data.price !== "undefined"
    ) {
      price = Number(data.data.data.price);
    }

    if (!Number.isFinite(price)) {
      price = null;
    }

    console.log("BDI extracted value:", price);

    if (price === null) {
      console.log(
        "BDI value could not be extracted from the API response."
      );

      return null;
    }

    return {
      code:
        data.code ||
        data.data?.code ||
        "BALTIC_DRY_INDEX",

      price: price,

      currency:
        data.currency ||
        data.data?.currency ||
        "USD",

      unit:
        data.unit ||
        data.data?.unit ||
        "index",

      createdAt:
        data.created_at ||
        data.data?.created_at ||
        null,

      updatedAt:
        data.updated_at ||
        data.data?.updated_at ||
        null,

      source:
        data.source ||
        data.data?.source ||
        "Baltic Exchange",

      stale:
        data.stale ??
        data.data?.stale ??
        false,
    };
  } catch (error) {
    console.log(
      "Freight API Error:",
      error.response?.status || error.message
    );

    console.log(
      "Freight API Details:",
      error.response?.data || "No response data"
    );

    return null;
  }
}

// ======================================================
// WEATHER RISK
// ======================================================

function calculateWeatherRisk(weather) {
  if (!weather) {
    return "Data unavailable";
  }

  const condition =
    weather.condition?.toLowerCase() || "";

  const wind = Number(weather.windKph || 0);

  const dangerousConditions = [
    "thunderstorm",
    "hurricane",
    "cyclone",
    "tornado",
    "heavy rain",
    "blizzard",
  ];

  const mediumConditions = [
    "rain",
    "fog",
    "overcast",
    "mist",
    "drizzle",
  ];

  if (
    dangerousConditions.some((word) =>
      condition.includes(word)
    ) ||
    wind >= 50
  ) {
    return "High";
  }

  if (
    mediumConditions.some((word) =>
      condition.includes(word)
    ) ||
    wind >= 30
  ) {
    return "Medium";
  }

  return "Low";
}

// ======================================================
// FREIGHT MARKET
// ======================================================

function calculateFreightMarket(currentIndex) {
  if (
    currentIndex === null ||
    currentIndex === undefined ||
    currentIndex <= 0
  ) {
    return "Data unavailable";
  }

  if (currentIndex >= 4000) {
    return "Rising";
  }

  if (currentIndex <= 2500) {
    return "Falling";
  }

  return "Stable";
}

// ======================================================
// ESTIMATED ROUTE FREIGHT RATE
// ======================================================

function calculateEstimatedFreightRate(
  freightIndex,
  cargo
) {
  // Prototype baseline.
  // This is NOT a direct shipping quote.

  let baseRate = 31;

  if (
    freightIndex !== null &&
    freightIndex !== undefined
  ) {
    const index = Number(freightIndex);

    if (index >= 4000) {
      baseRate += 4;
    } else if (index >= 3500) {
      baseRate += 2;
    } else if (index <= 2500) {
      baseRate -= 3;
    }
  }

  // Cargo-specific adjustment
  if (
    cargo &&
    cargo.toLowerCase().includes("coal")
  ) {
    baseRate += 0;
  }

  return {
    rate: Number(baseRate.toFixed(2)),

    source:
      "Model estimate using Baltic Dry Index benchmark",

    modelBased: true,
  };
}

// ======================================================
// TRANSIT TIME
// ======================================================

function calculateTransitTime(
  origin,
  destination
) {
  const originLower =
    origin.toLowerCase();

  const destinationLower =
    destination.toLowerCase();

  if (
    originLower.includes("indonesia") &&
    destinationLower.includes("chennai")
  ) {
    return 18.6;
  }

  if (
    originLower.includes("indonesia") &&
    destinationLower.includes("india")
  ) {
    return 19.5;
  }

  return 20.0;
}

// ======================================================
// ROUTE RISK
// ======================================================

function calculateRouteRisk(weatherRisk) {
  if (weatherRisk === "High") {
    return "High";
  }

  if (weatherRisk === "Medium") {
    return "Medium";
  }

  if (weatherRisk === "Low") {
    return "Low";
  }

  return "Data unavailable";
}

// ======================================================
// AI RECOMMENDATION
// ======================================================

function generateRecommendation(
  freightMarket,
  weatherRisk,
  routeRisk
) {
  if (routeRisk === "High") {
    return (
      "High route risk detected. " +
      "Consider delaying shipment or selecting an alternative route."
    );
  }

  if (weatherRisk === "Medium") {
    return (
      "Moderate weather risk detected. " +
      "Monitor weather conditions before finalizing the shipment."
    );
  }

  if (freightMarket === "Rising") {
    return (
      "Freight rates are rising. " +
      "Consider booking the vessel earlier to reduce future cost."
    );
  }

  if (freightMarket === "Falling") {
    return (
      "Freight rates are falling. " +
      "Monitoring the market may help secure a better rate."
    );
  }

  if (freightMarket === "Stable") {
    return (
      "Freight market is stable. " +
      "Current booking conditions are reasonable."
    );
  }

  return (
    "Continue monitoring freight, weather and market conditions."
  );
}

// ======================================================
// CHART DATA
// ======================================================

function createChartData(freightRate) {
  const rate = Number(freightRate || 31);

  return [
    {
      month: "May",
      historical: Number((rate - 2).toFixed(2)),
      forecast: null,
    },

    {
      month: "Jun",
      historical: Number((rate + 1).toFixed(2)),
      forecast: null,
    },

    {
      month: "Jul",
      historical: Number((rate - 1).toFixed(2)),
      forecast: null,
    },

    {
      month: "Aug",
      historical: Number((rate + 3).toFixed(2)),
      forecast: null,
    },

    {
      month: "Sep",
      historical: Number((rate + 1).toFixed(2)),
      forecast: null,
    },

    {
      month: "Oct",
      historical: Number(rate.toFixed(2)),
      forecast: Number(rate.toFixed(2)),
    },

    {
      month: "Nov",
      historical: null,
      forecast: Number((rate + 0.5).toFixed(2)),
    },

    {
      month: "Dec",
      historical: null,
      forecast: Number((rate + 1).toFixed(2)),
    },
  ];
}

// ======================================================
// MARKET ANALYSIS
// ======================================================

function generateMarketAnalysis(
  freightMarket,
  weatherRisk,
  freightIndex
) {
  const indexText =
    freightIndex !== null &&
    freightIndex !== undefined
      ? `Current Baltic Dry Index benchmark: ${freightIndex} points.`
      : "Baltic Dry Index data is currently unavailable.";

  return {
    freight:
      `Freight market condition: ${freightMarket}. ${indexText}`,

    weather:
      `Current weather risk for the destination area: ${weatherRisk}.`,

    note:
      "Freight rate shown by FreightOpt AI is a model estimate derived from a dry-bulk benchmark, not a direct carrier quotation.",
  };
}

// ======================================================
// ANALYZE API
// ======================================================

app.get("/api/analyze", async (req, res) => {
  try {
    const origin =
      req.query.origin || "Indonesia";

    const destination =
      req.query.destination ||
      "Chennai, India";

    const cargo =
      req.query.cargo || "Coal";

    const quantity =
      Number(req.query.quantity) || 100000;

    console.log("");
    console.log("----------------------------------------");
    console.log("FreightOpt AI Analysis");
    console.log("Origin:", origin);
    console.log("Destination:", destination);
    console.log("Cargo:", cargo);
    console.log("Quantity:", quantity);
    console.log("----------------------------------------");

    // --------------------------------------------------
    // WEATHER
    // --------------------------------------------------

    console.log("Fetching weather data...");

    const weather =
      await getWeather(destination);

    if (weather) {
      console.log(
        `Weather received: ${weather.condition}, ${weather.temperatureC}°C`
      );
    } else {
      console.log("Weather data unavailable");
    }

    // --------------------------------------------------
    // FREIGHT INDEX
    // --------------------------------------------------

    console.log("Fetching Baltic Dry Index...");

    const freightIndexData =
      await getFreightIndex();

    const freightIndex =
      freightIndexData?.price ?? null;

    console.log(
      "BDI received:",
      freightIndex
    );

    // --------------------------------------------------
    // CALCULATIONS
    // --------------------------------------------------

    const weatherRisk =
      calculateWeatherRisk(weather);

    const freightMarket =
      calculateFreightMarket(
        freightIndex
      );

    const freightEstimate =
      calculateEstimatedFreightRate(
        freightIndex,
        cargo
      );

    const freightRate =
      freightEstimate.rate;

    const estimatedFreightCostUSD =
      Number(
        (
          quantity *
          freightRate
        ).toFixed(2)
      );

    const transitTime =
      calculateTransitTime(
        origin,
        destination
      );

    const routeRisk =
      calculateRouteRisk(
        weatherRisk
      );

    const recommendation =
      generateRecommendation(
        freightMarket,
        weatherRisk,
        routeRisk
      );

    const chartData =
      createChartData(
        freightRate
      );

    const marketAnalysis =
      generateMarketAnalysis(
        freightMarket,
        weatherRisk,
        freightIndex
      );

    // --------------------------------------------------
    // SOURCES
    // --------------------------------------------------

    const sources = [];

    if (weather) {
      sources.push({
        name: "WeatherAPI",
        type: "Weather",
        status: "Live",
        link:
          "https://www.weatherapi.com/",
      });
    }

    if (freightIndexData) {
      sources.push({
        name: "OilPriceAPI / Baltic Exchange",
        type: "Freight Benchmark",
        status: "Live",
        link:
          "https://www.oilpriceapi.com/prices/freight-indices/baltic-dry-index",
      });
    }

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    const result = {
      success: true,

      shipment: {
        origin,
        destination,
        cargo,
        quantity,
        unit: "tonnes",
      },

      signals: {
        freightMarket,

        fuelMarket:
          "Data unavailable",

        portCongestion:
          "Data unavailable",

        weatherRisk,
      },

      weather,

      freightIndex: freightIndexData,

      costEstimate: {
        freightRatePerTon:
          freightRate,

        estimatedFreightCostUSD,

        rateSource:
          freightEstimate.source,
      },

      freightRateEvidence: {
        available:
          freightIndexData !== null,

        benchmark:
          "Baltic Dry Index",

        benchmarkValue:
          freightIndex,

        benchmarkUnit:
          "index points",

        estimatedRouteRate:
          freightRate,

        estimatedRouteRateUnit:
          "USD/tonne",

        source:
          freightEstimate.source,

        modelBased:
          freightEstimate.modelBased,

        apiSource:
          freightIndexData?.source ||
          "OilPriceAPI / Baltic Exchange",

        updatedAt:
          freightIndexData?.updatedAt ||
          null,

        note:
          "The Baltic Dry Index is a market benchmark. The Indonesia-to-Chennai freight rate is an estimate derived from the benchmark and is not a direct route quote.",
      },

      transitTime,

      routeRisk,

      recommendation,

      chartData,

      marketAnalysis,

      sourceCount:
        sources.length,

      sources,
    };

    res.json(result);
  } catch (error) {
    console.log(
      "Analysis Error:",
      error.message
    );

    res.status(500).json({
      success: false,
      error:
        "FreightOpt AI analysis failed",
      details:
        error.message,
    });
  }
});

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {
  console.log("");
  console.log(
    `FreightOpt AI Backend running on http://localhost:${PORT}`
  );
  console.log("----------------------------------------");
});