import { initCommonPage } from "./common.js";
import { formatDateKey, getChartData, getStateSnapshot } from "./storage.js";

const legendRoot = document.querySelector("#chart-legend");
const axisCanvas = document.querySelector("#chart-axis");
const chartCanvas = document.querySelector("#chart-canvas");
const scrollContainer = document.querySelector("#chart-scroll");

const AXIS_WIDTH = 74;
const TOP_PADDING = 24;
const RIGHT_PADDING = 24;
const BOTTOM_PADDING = 62;

initCommonPage();
renderChart();
window.addEventListener("resize", renderChart);

function renderChart() {
  const chartData = getChartData(getStateSnapshot());

  if (!chartData.dates.length || !chartData.series.some((item) => item.values.some((value) => value > 0))) {
    legendRoot.innerHTML = "";
    chartCanvas.width = 800;
    chartCanvas.height = 360;
    axisCanvas.width = AXIS_WIDTH;
    axisCanvas.height = 360;

    const chartContext = chartCanvas.getContext("2d");
    const axisContext = axisCanvas.getContext("2d");
    chartContext.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
    axisContext.clearRect(0, 0, axisCanvas.width, axisCanvas.height);

    chartContext.fillStyle = "#62697c";
    chartContext.font = "600 18px Manrope";
    chartContext.fillText("Поки що немає даних для графіка.", 32, 80);
    chartContext.font = "400 14px Manrope";
    chartContext.fillText("Додай записи на Daily, і тут з'явиться прогрес по вправах з Пвт.", 32, 112);
    return;
  }

  legendRoot.innerHTML = chartData.series.map((exercise) => `
    <div class="legend-chip">
      <span class="legend-chip__dot" style="background:${exercise.color}"></span>
      <span>${exercise.name}</span>
    </div>
  `).join("");

  drawChart(chartData);
}

function drawChart(chartData) {
  const isMobile = window.innerWidth <= 520;
  const chartHeight = isMobile ? Math.min(window.innerHeight * 0.62, 420) : 520;
  const stepX = isMobile ? 92 : 116;
  const baseWidth = scrollContainer.clientWidth || 820;
  const chartWidth = Math.max(baseWidth, chartData.dates.length * stepX + RIGHT_PADDING + 20);

  axisCanvas.width = AXIS_WIDTH;
  axisCanvas.height = chartHeight;
  chartCanvas.width = chartWidth;
  chartCanvas.height = chartHeight;

  const axisContext = axisCanvas.getContext("2d");
  const chartContext = chartCanvas.getContext("2d");
  const chartBottom = chartHeight - BOTTOM_PADDING;
  const chartTop = TOP_PADDING;
  const chartLeft = 22;
  const plotHeight = chartBottom - chartTop;
  const maxValue = Math.max(10, chartData.maxValue);
  const tickCount = 5;

  axisContext.clearRect(0, 0, axisCanvas.width, axisCanvas.height);
  chartContext.clearRect(0, 0, chartCanvas.width, chartCanvas.height);

  chartContext.fillStyle = "rgba(255,255,255,0.82)";
  chartContext.fillRect(0, 0, chartWidth, chartHeight);

  for (let tick = 0; tick <= tickCount; tick += 1) {
    const ratio = tick / tickCount;
    const y = chartBottom - plotHeight * ratio;
    const tickValue = Math.round(maxValue * ratio);

    axisContext.strokeStyle = "rgba(31, 36, 50, 0.12)";
    axisContext.beginPath();
    axisContext.moveTo(axisCanvas.width - 10, y);
    axisContext.lineTo(axisCanvas.width, y);
    axisContext.stroke();

    axisContext.fillStyle = "#62697c";
    axisContext.font = isMobile ? "600 11px Manrope" : "700 12px Manrope";
    axisContext.textAlign = "right";
    axisContext.fillText(String(tickValue), axisCanvas.width - 14, y + 4);

    chartContext.strokeStyle = "rgba(31, 36, 50, 0.08)";
    chartContext.beginPath();
    chartContext.moveTo(0, y);
    chartContext.lineTo(chartWidth, y);
    chartContext.stroke();
  }

  const pointsX = chartData.dates.map((_, index) => chartLeft + index * stepX);

  chartData.dates.forEach((dateKey, index) => {
    const x = pointsX[index];

    chartContext.strokeStyle = "rgba(31, 36, 50, 0.06)";
    chartContext.beginPath();
    chartContext.moveTo(x, chartTop);
    chartContext.lineTo(x, chartBottom);
    chartContext.stroke();

    chartContext.fillStyle = "#62697c";
    chartContext.font = isMobile ? "600 10px Manrope" : "700 11px Manrope";
    chartContext.textAlign = "center";
    chartContext.fillText(formatDateKey(dateKey, "short"), x, chartHeight - 24);
  });

  chartData.series.forEach((exercise, seriesIndex) => {
    const points = exercise.values.map((value, index) => {
      const x = pointsX[index];
      const y = chartBottom - (value / maxValue) * plotHeight;

      return { x, y, value };
    });

    chartContext.strokeStyle = exercise.color;
    chartContext.lineWidth = 2.5;
    chartContext.beginPath();

    points.forEach((point, pointIndex) => {
      if (pointIndex === 0) {
        chartContext.moveTo(point.x, point.y);
      } else {
        chartContext.lineTo(point.x, point.y);
      }
    });

    chartContext.stroke();

    points.forEach((point) => {
      chartContext.beginPath();
      chartContext.fillStyle = exercise.color;
      chartContext.arc(point.x, point.y, 4, 0, Math.PI * 2);
      chartContext.fill();

      if (point.value > 0) {
        chartContext.font = isMobile ? "700 9px Manrope" : "700 10px Manrope";
        chartContext.textAlign = "center";
        chartContext.fillStyle = exercise.color;
        chartContext.fillText(
          String(point.value),
          point.x,
          point.y - 8 - (seriesIndex % 2 === 0 ? 0 : 8),
        );
      }
    });
  });

  scrollContainer.scrollLeft = Math.max(0, chartCanvas.width - scrollContainer.clientWidth);
}
