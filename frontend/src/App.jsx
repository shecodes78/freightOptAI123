import React, { useMemo, useState } from "react";
import "./App.css";

function App() {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [origin, setOrigin] = useState("Indonesia");
  const [destination, setDestination] = useState("Chennai, India");
  const [cargo, setCargo] = useState("Coal");
  const [quantity, setQuantity] = useState("100000");

  const [activeSection, setActiveSection] = useState("Dashboard");
  const [showDetails, setShowDetails] = useState(false);

  const analyzeShipment = async () => {
    try {
      if (!origin.trim() || !destination.trim() || !cargo.trim()) {
        alert("Please fill all shipment details.");
        return;
      }

      if (!quantity || Number(quantity) <= 0) {
        alert("Please enter a valid quantity greater than 0.");
        return;
      }

      setLoading(true);

      const params = new URLSearchParams({
        origin,
        destination,
        cargo,
        quantity,
      });

      const response = await fetch(
        `http://localhost:5000/api/analyze?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to analyze shipment");
      }

      const data = await response.json();

      console.log("FREIGHTOPT RESPONSE:", data);

      setAnalysisData(data);
      setShowDetails(false);
    } catch (error) {
      console.error("Analysis error:", error);

      alert(
        "Unable to connect to FreightOpt AI backend. Please make sure the backend is running on port 5000."
      );
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (section, elementId) => {
    setActiveSection(section);

    const element = document.getElementById(elementId);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const openSource = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const freightRate =
    analysisData?.costEstimate?.freightRatePerTon ??
    analysisData?.freightRate ??
    31;

  const totalCost =
    analysisData?.costEstimate?.estimatedFreightCostUSD ??
    Number(quantity || 0) * freightRate;

  const totalCostMillion = (totalCost / 1000000).toFixed(2);

  const transitTime =
    Number(analysisData?.transitTime) || 18.6;

  const routeRisk =
    analysisData?.routeRisk || "Low";

  const marketConditions =
    analysisData?.signals?.freightMarket ||
    "Stable";

  const weatherRisk =
    analysisData?.signals?.weatherRisk ||
    analysisData?.weather?.risk ||
    "Low";

  const weather = analysisData?.weather || {};

  const weatherCondition =
    weather?.condition ||
    weather?.current?.condition?.text ||
    "Unavailable";

  const temperature =
    weather?.temperatureC ??
    weather?.temperature ??
    weather?.temp_c ??
    weather?.current?.temp_c;

  const wind =
    weather?.wind ??
    weather?.windKph ??
    weather?.wind_kph ??
    weather?.current?.wind_kph;

  const humidity =
    weather?.humidity ??
    weather?.current?.humidity;

  const visibility =
    weather?.visibilityKm ??
    weather?.visibility ??
    weather?.vis_km ??
    weather?.current?.vis_km;

  const recommendation =
    analysisData?.recommendation ||
    "Current booking conditions are reasonable.";

  const freightIndex =
    analysisData?.freightIndex ||
    analysisData?.data?.freightIndex ||
    {};

  const bdiValue =
    freightIndex?.price ??
    freightIndex?.data?.price ??
    analysisData?.freightRateEvidence?.benchmarkValue ??
    null;

  const bdiChange =
    freightIndex?.changes?.["24h"]?.percent ??
    freightIndex?.data?.changes?.["24h"]?.percent ??
    analysisData?.freightRateEvidence?.change24h ??
    null;

  const portCongestion =
    analysisData?.signals?.portCongestion ||
    "Data unavailable";

  const geopoliticalRisk =
    analysisData?.signals?.geopoliticalRisk ||
    analysisData?.geopoliticalRisk ||
    "Medium";

  const fuelMarket =
    analysisData?.signals?.fuelMarket ||
    "Data unavailable";

  const chartData =
    Array.isArray(analysisData?.chartData)
      ? analysisData.chartData
      : [
          {
            month: "May",
            historical: freightRate - 2,
            forecast: null,
          },
          {
            month: "Jun",
            historical: freightRate + 1,
            forecast: null,
          },
          {
            month: "Jul",
            historical: freightRate - 1,
            forecast: null,
          },
          {
            month: "Aug",
            historical: freightRate + 3,
            forecast: null,
          },
          {
            month: "Sep",
            historical: freightRate + 1,
            forecast: null,
          },
          {
            month: "Oct",
            historical: freightRate,
            forecast: freightRate,
          },
          {
            month: "Nov",
            historical: null,
            forecast: freightRate + 0.5,
          },
          {
            month: "Dec",
            historical: null,
            forecast: freightRate + 1,
          },
        ];

  const getRiskClass = (risk) => {
    const value = String(risk).toLowerCase();

    if (value.includes("medium")) {
      return "risk-medium";
    }

    if (value.includes("high")) {
      return "orange-text";
    }

    return "risk-low";
  };

  const getMarketClass = (market) => {
    const value = String(market).toLowerCase();

    if (value.includes("rising")) {
      return "orange-text";
    }

    if (value.includes("falling")) {
      return "risk-low";
    }

    return "risk-low";
  };

  const graphValues = chartData.flatMap((item) =>
    [item.historical, item.forecast].filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        Number.isFinite(Number(value))
    )
  );

  const graphMin =
    graphValues.length > 0
      ? Math.min(...graphValues) - 2
      : freightRate - 5;

  const graphMax =
    graphValues.length > 0
      ? Math.max(...graphValues) + 2
      : freightRate + 5;

  const graphRange =
    graphMax - graphMin || 1;

  const getGraphX = (index) => {
    if (chartData.length <= 1) {
      return 50;
    }

    return (
      (index / (chartData.length - 1)) * 100
    );
  };

  const getGraphY = (value) => {
    return (
      100 -
      ((Number(value) - graphMin) /
        graphRange) *
        100
    );
  };

  const historicalPoints = chartData
    .map((item, index) => {
      if (
        item.historical === null ||
        item.historical === undefined
      ) {
        return null;
      }

      return `${getGraphX(index)},${getGraphY(
        item.historical
      )}`;
    })
    .filter(Boolean)
    .join(" ");

  const forecastPoints = chartData
    .map((item, index) => {
      if (
        item.forecast === null ||
        item.forecast === undefined
      ) {
        return null;
      }

      return `${getGraphX(index)},${getGraphY(
        item.forecast
      )}`;
    })
    .filter(Boolean)
    .join(" ");

  const vesselData = [
    {
      name: "Panamax",
      capacity: "60,000–80,000 t",
      rate: freightRate * 0.98,
      transit: transitTime + 1.2,
      risk: "Low",
    },
    {
      name: "Supramax",
      capacity: "50,000–60,000 t",
      rate: freightRate * 1.04,
      transit: transitTime + 0.7,
      risk: "Medium",
    },
    {
      name: "Capesize",
      capacity: "100,000–180,000 t",
      rate: freightRate * 0.94,
      transit: transitTime,
      risk: routeRisk,
    },
  ];

  const routeData = useMemo(
    () => ({
      origin,
      destination,
      distance: destination
        .toLowerCase()
        .includes("chennai")
        ? "Approx. 3,200 nm"
        : "Route estimate",
      transit: `${transitTime.toFixed(1)} days`,
      risk: routeRisk,
    }),
    [
      origin,
      destination,
      transitTime,
      routeRisk,
    ]
  );

  return (
    <div className="app">

      {/* HEADER */}
      <header className="header">
        <div className="brand">
          <div className="brand-logo">
            F
          </div>

          <div>
            <h2>
              FreightOpt <span>AI</span>
            </h2>

            <p>
              AI-Powered Smart Freight Optimization
            </p>
          </div>
        </div>

        <nav>
          <a
            className={
              activeSection === "Dashboard"
                ? "active"
                : ""
            }
            onClick={() =>
              scrollToSection(
                "Dashboard",
                "dashboard"
              )
            }
          >
            Dashboard
          </a>

          <a
            className={
              activeSection === "Forecast"
                ? "active"
                : ""
            }
            onClick={() =>
              scrollToSection(
                "Forecast",
                "forecast"
              )
            }
          >
            Forecast
          </a>

          <a
            className={
              activeSection === "Routes"
                ? "active"
                : ""
            }
            onClick={() =>
              scrollToSection(
                "Routes",
                "route"
              )
            }
          >
            Routes
          </a>

          <a
            className={
              activeSection === "Vessels"
                ? "active"
                : ""
            }
            onClick={() =>
              scrollToSection(
                "Vessels",
                "vessels"
              )
            }
          >
            Vessels
          </a>
        </nav>

        <div className="user">
          RL
        </div>
      </header>

      {/* MAIN */}
      <main>

        {/* PAGE HEADING */}
        <section id="dashboard">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                MARITIME FREIGHT OPTIMIZATION
              </p>

              <h1>
                Plan smarter. Ship better.
              </h1>

              <p>
                AI-powered freight forecasting and
                route intelligence for smarter
                maritime shipping decisions.
              </p>
            </div>

            <div className="planning-date">
              <small>
                PLANNING WINDOW
              </small>

              <b>
                October 2026
              </b>
            </div>
          </div>

          {/* SEARCH */}
          <div className="search-box">

            <div className="field">
              <label>
                ORIGIN
              </label>

              <input
                value={origin}
                onChange={(e) =>
                  setOrigin(e.target.value)
                }
                placeholder="Indonesia"
              />
            </div>

            <div className="direction">
              →
            </div>

            <div className="field">
              <label>
                DESTINATION
              </label>

              <input
                value={destination}
                onChange={(e) =>
                  setDestination(e.target.value)
                }
                placeholder="Chennai, India"
              />
            </div>

            <div className="field">
              <label>
                CARGO
              </label>

              <select
                value={cargo}
                onChange={(e) =>
                  setCargo(e.target.value)
                }
              >
                <option value="Coal">
                  Coal
                </option>

                <option value="Steel">
                  Steel
                </option>

                <option value="Iron Ore">
                  Iron Ore
                </option>

                <option value="Grain">
                  Grain
                </option>

                <option value="Cement">
                  Cement
                </option>
              </select>
            </div>

            <div className="field">
              <label>
                QUANTITY
              </label>

              <input
                type="number"
                value={quantity}
                onChange={(e) =>
                  setQuantity(e.target.value)
                }
              />
            </div>

            <button
              className="analyze-button"
              onClick={analyzeShipment}
              disabled={loading}
            >
              {loading
                ? "Analyzing..."
                : "Analyze Shipment"}
            </button>
          </div>

          {/* SUMMARY */}
          <div className="summary">

            <div className="summary-card">
              <div className="card-icon blue">
                $
              </div>

              <div>
                <small>
                  EST. FREIGHT COST
                </small>

                <h2>
                  ${totalCostMillion}M
                </h2>

                <span>
                  ${freightRate.toFixed(2)} / tonne
                </span>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon purple">
                ◷
              </div>

              <div>
                <small>
                  TRANSIT TIME
                </small>

                <h2>
                  {transitTime.toFixed(1)}d
                </h2>

                <span>
                  Estimated duration
                </span>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon orange">
                ↗
              </div>

              <div>
                <small>
                  FREIGHT MARKET
                </small>

                <h2
                  className={getMarketClass(
                    marketConditions
                  )}
                >
                  {marketConditions}
                </h2>

                <span>
                  Baltic Dry Index
                </span>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon green">
                ✓
              </div>

              <div>
                <small>
                  ROUTE RISK
                </small>

                <h2
                  className={getRiskClass(
                    routeRisk
                  )}
                >
                  {routeRisk}
                </h2>

                <span>
                  AI risk assessment
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* CURRENT MARKET DETAILS */}
        <section
          className="dark-panel"
          style={{
            marginTop: "18px",
          }}
        >
          <div className="panel-heading">
            <div>
              <p className="panel-label">
                CURRENT MARKET DETAILS
              </p>

              <h2>
                Live Market Intelligence
              </h2>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, 1fr)",
              gap: "15px",
              marginTop: "18px",
            }}
          >

            <div>
              <small>
                FREIGHT MARKET
              </small>

              <br />

              <b
                className={getMarketClass(
                  marketConditions
                )}
              >
                {marketConditions}
              </b>

              <br />

              <button
                className="view-all"
                onClick={() =>
                  openSource(
                    "https://www.oilpriceapi.com/"
                  )
                }
              >
                Live Source ↗
              </button>
            </div>

            <div>
              <small>
                BALTIC DRY INDEX
              </small>

              <br />

              <b>
                {bdiValue || "Unavailable"}
              </b>

              <br />

              <button
                className="view-all"
                onClick={() =>
                  openSource(
                    "https://www.oilpriceapi.com/"
                  )
                }
              >
                Live Source ↗
              </button>
            </div>

            <div>
              <small>
                WEATHER
              </small>

              <br />

              <b>
                {weatherCondition}
              </b>

              <br />

              <button
                className="view-all"
                onClick={() =>
                  openSource(
                    "https://www.weatherapi.com/"
                  )
                }
              >
                Live Source ↗
              </button>
            </div>

            <div>
              <small>
                FUEL MARKET
              </small>

              <br />

              <b>
                {fuelMarket}
              </b>

              <br />

              <button
                className="view-all"
                onClick={() =>
                  openSource(
                    "https://www.oilpriceapi.com/"
                  )
                }
              >
                Live Source ↗
              </button>
            </div>

          </div>
        </section>

        {/* MAIN DASHBOARD GRID */}
        <div className="dashboard-grid">

          {/* FREIGHT FORECAST */}
          <section
            id="forecast"
            className="dark-panel"
          >
            <div className="panel-heading">
              <div>
                <p className="panel-label">
                  FREIGHT FORECAST
                </p>

                <h2>
                  Freight Rate Prediction
                </h2>
              </div>

              <div className="graph-legends">
                <span>
                  <i className="legend-blue"></i>
                  Historical Rate
                </span>

                <span>
                  <i className="legend-green"></i>
                  Predicted Rate
                </span>
              </div>
            </div>

            <div className="graph-container">

              <div className="graph-y">
                <span>
                  ${graphMax.toFixed(0)}
                </span>

                <span>
                  ${(
                    graphMax -
                    graphRange * 0.25
                  ).toFixed(0)}
                </span>

                <span>
                  ${(
                    graphMax -
                    graphRange * 0.5
                  ).toFixed(0)}
                </span>

                <span>
                  ${(
                    graphMax -
                    graphRange * 0.75
                  ).toFixed(0)}
                </span>

                <span>
                  ${graphMin.toFixed(0)}
                </span>
              </div>

              <div className="chart-area">

                <div className="chart-grid g1"></div>
                <div className="chart-grid g2"></div>
                <div className="chart-grid g3"></div>
                <div className="chart-grid g4"></div>
                <div className="chart-grid g5"></div>

                <svg
                  className="rate-chart"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <polyline
                    points={historicalPoints}
                    fill="none"
                    stroke="#1687e8"
                    strokeWidth="1.8"
                    vectorEffect="non-scaling-stroke"
                  />

                  <polyline
                    points={forecastPoints}
                    fill="none"
                    stroke="#38d49a"
                    strokeWidth="1.8"
                    strokeDasharray="6 5"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>

                <div className="chart-months">
                  {chartData.map(
                    (item, index) => (
                      <span key={index}>
                        {item.month}
                      </span>
                    )
                  )}
                </div>

              </div>
            </div>
          </section>

          {/* ROUTE */}
          <section
            id="route"
            className="dark-panel"
          >
            <div className="panel-heading">

              <div>
                <p className="panel-label">
                  ROUTE INTELLIGENCE
                </p>

                <h2>
                  Recommended Route
                </h2>
              </div>

              <span className="optimal">
                OPTIMAL
              </span>
            </div>

            <div className="world-map">

              <div className="map-dots dot-indonesia"></div>
              <div className="map-dots dot-india"></div>
              <div className="map-line"></div>

              <div className="route-ship">
                🚢
              </div>

              <span className="map-label indonesia">
                {origin}
              </span>

              <span className="map-label india">
                {destination}
              </span>

            </div>

            <div className="route-bottom">

              <div>
                <small>
                  DISTANCE
                </small>

                <b>
                  {routeData.distance}
                </b>
              </div>

              <div>
                <small>
                  TRANSIT
                </small>

                <b>
                  {routeData.transit}
                </b>
              </div>

              <div>
                <small>
                  RISK
                </small>

                <b
                  className={getRiskClass(
                    routeRisk
                  )}
                >
                  {routeRisk}
                </b>
              </div>

            </div>
          </section>
        </div>

        {/* SECOND ROW */}
        <div className="second-grid">

          {/* VESSELS */}
          <section
            id="vessels"
            className="dark-panel"
          >
            <div className="panel-heading">

              <div>
                <p className="panel-label">
                  VESSEL INTELLIGENCE
                </p>

                <h2>
                  Vessel & Cost Comparison
                </h2>
              </div>

              <button className="view-all">
                VIEW ALL →
              </button>
            </div>

            <div className="vessel-header">
              <span>VESSEL</span>
              <span>CAPACITY</span>
              <span>FREIGHT</span>
              <span>TRANSIT</span>
              <span>RISK</span>
            </div>

            {vesselData.map(
              (vessel, index) => (
                <div
                  className="vessel-row"
                  key={index}
                >
                  <span>
                    <b>
                      {vessel.name}
                    </b>
                  </span>

                  <span>
                    {vessel.capacity}
                  </span>

                  <span>
                    ${vessel.rate.toFixed(2)}/t
                  </span>

                  <span>
                    {vessel.transit.toFixed(1)}d
                  </span>

                  <span
                    className={getRiskClass(
                      vessel.risk
                    )}
                  >
                    {vessel.risk}
                  </span>
                </div>
              )
            )}
          </section>

          {/* CONDITIONS */}
          <section className="dark-panel">

            <div className="panel-heading">
              <div>
                <p className="panel-label">
                  LIVE CONDITIONS
                </p>

                <h2>
                  Route Conditions
                </h2>
              </div>
            </div>

            <div className="condition-row">

              <div className="condition-icon weather">
                ☁
              </div>

              <div>
                <small>
                  WEATHER
                </small>

                <b>
                  {weatherCondition}
                </b>
              </div>

              <strong
                className={getRiskClass(
                  weatherRisk
                )}
              >
                {weatherRisk}
              </strong>
            </div>

            <div className="condition-row">

              <div className="condition-icon port">
                ⚓
              </div>

              <div>
                <small>
                  PORT CONGESTION
                </small>

                <b>
                  {portCongestion}
                </b>
              </div>

              <strong>
                —
              </strong>
            </div>

            <div className="condition-row">

              <div className="condition-icon market">
                $
              </div>

              <div>
                <small>
                  FREIGHT BENCHMARK
                </small>

                <b>
                  BDI{" "}
                  {bdiValue || "Unavailable"}
                </b>
              </div>

              <strong
                className={
                  bdiChange !== null &&
                  bdiChange > 0
                    ? "orange-text"
                    : "risk-low"
                }
              >
                {bdiChange !== null
                  ? `${
                      bdiChange > 0 ? "+" : ""
                    }${Number(
                      bdiChange
                    ).toFixed(2)}%`
                  : "—"}
              </strong>
            </div>

            <div className="condition-row">

              <div className="condition-icon market">
                ◈
              </div>

              <div>
                <small>
                  GEOPOLITICAL RISK
                </small>

                <b>
                  {geopoliticalRisk}
                </b>
              </div>

              <strong
                className={getRiskClass(
                  geopoliticalRisk
                )}
              >
                {geopoliticalRisk}
              </strong>
            </div>

          </section>
        </div>

        {/* AI INSIGHT */}
        <section className="insight">

          <div className="insight-icon">
            F
          </div>

          <div className="insight-content">

            <p>
              AI SHIPMENT RECOMMENDATION
            </p>

            <h2>
              {recommendation}
            </h2>

            <span>
              Based on freight market, route,
              weather and vessel conditions.
            </span>

          </div>

          <button
            onClick={() =>
              setShowDetails(!showDetails)
            }
          >
            {showDetails
              ? "HIDE DETAILS ↑"
              : "VIEW DETAILS →"}
          </button>

        </section>

        {/* DETAILS */}
        {showDetails && (
          <section
            className="dark-panel"
            style={{
              marginTop: "18px",
            }}
          >

            <div className="panel-heading">

              <div>
                <p className="panel-label">
                  DECISION BREAKDOWN
                </p>

                <h2>
                  FreightOpt AI Decision Details
                </h2>
              </div>

              <button
                className="view-all"
                onClick={() =>
                  setShowDetails(false)
                }
              >
                CLOSE ×
              </button>

            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, 1fr)",
                gap: "15px",
                marginTop: "18px",
              }}
            >

              <div>
                <small>
                  FREIGHT MARKET
                </small>

                <br />

                <b>
                  {marketConditions}
                </b>
              </div>

              <div>
                <small>
                  FREIGHT RATE
                </small>

                <br />

                <b>
                  ${freightRate.toFixed(2)}/t
                </b>
              </div>

              <div>
                <small>
                  SHIPMENT COST
                </small>

                <br />

                <b>
                  ${totalCostMillion}M
                </b>
              </div>

              <div>
                <small>
                  BALTIC DRY INDEX
                </small>

                <br />

                <b>
                  {bdiValue || "Unavailable"}
                </b>
              </div>

              <div>
                <small>
                  WEATHER
                </small>

                <br />

                <b>
                  {weatherCondition}
                </b>
              </div>

              <div>
                <small>
                  TEMPERATURE
                </small>

                <br />

                <b>
                  {temperature !== undefined
                    ? `${temperature}°C`
                    : "Unavailable"}
                </b>
              </div>

              <div>
                <small>
                  HUMIDITY
                </small>

                <br />

                <b>
                  {humidity !== undefined
                    ? `${humidity}%`
                    : "Unavailable"}
                </b>
              </div>

              <div>
                <small>
                  VISIBILITY
                </small>

                <br />

                <b>
                  {visibility !== undefined
                    ? `${visibility} km`
                    : "Unavailable"}
                </b>
              </div>

            </div>
          </section>
        )}

      </main>

      {/* FOOTER */}
      <footer>

        <div>
          <b>
            FreightOpt <span>AI</span>
          </b>
        </div>

        <div>
          AI-powered decision intelligence
          for smarter global shipping.
        </div>

        <div>
          © 2026 FreightOpt AI
        </div>

      </footer>
    </div>
  );
}

export default App;