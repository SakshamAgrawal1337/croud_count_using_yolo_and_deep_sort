// Tab Analysis Preview JS - Uses Plotly.js for visualizations
// This script handles real-time updates for the analysis preview tab

let tabAnalysisInterval = null;
let tabCrowdCounts = {};
let tabTotalCounts = [];
let tabZoneCountsHistory = {};
let tabTimeStamps = [];

// Initialize charts when the tab is loaded
function initTabAnalysisPreview(feedId) {
  console.log("Initializing tab analysis preview for feed:", feedId);
  console.log("Feed ID:", feedId);

  // Clear any existing interval
  if (tabAnalysisInterval) {
    clearInterval(tabAnalysisInterval);
  }

  // Initialize data structures
  tabCrowdCounts = {};
  tabTotalCounts = [];
  tabZoneCountsHistory = {};
  tabTimeStamps = [];

  // Initialize empty charts
  // initGaugeChart();
  // initPieChart();
  initBarChart();
  initLineChart();
  // initHeatmap();
  initCurveChart();
  // initTrendChart();

  // Start polling for live data
  tabAnalysisInterval = setInterval(() => {
    updateTabAnalysisData(feedId);
  }, 1000);
}

// Stop updates when leaving the tab
function stopTabAnalysisPreview() {
  if (tabAnalysisInterval) {
    clearInterval(tabAnalysisInterval);
    tabAnalysisInterval = null;
  }
}

// Fetch and update data
async function updateTabAnalysisData(feedId) {
  try {
    // Fetch counts
    const countsResp = await fetch(`/api/feeds/${feedId}/counts`);
    const counts = await countsResp.json();

    tabCrowdCounts = counts.zones || {};
    const total = counts.total || 0;

    // Update timestamps and history
    const now = new Date().toLocaleTimeString();
    tabTimeStamps.push(now);
    tabTotalCounts.push(total);

    // Keep only last 20 points for performance
    if (tabTimeStamps.length > 20) {
      tabTimeStamps.shift();
      tabTotalCounts.shift();
    }

    // Update zone history
    Object.keys(tabCrowdCounts).forEach(zone => {
      if (!tabZoneCountsHistory[zone]) {
        tabZoneCountsHistory[zone] = [];
      }
      tabZoneCountsHistory[zone].push(tabCrowdCounts[zone]);
      if (tabZoneCountsHistory[zone].length > 20) {
        tabZoneCountsHistory[zone].shift();
      }
    });

    // Update charts
    // updateGaugeChart(total);
    // updatePieChart(tabCrowdCounts, total);
    updateBarChart(tabCrowdCounts);
    updateLineChart(tabTimeStamps, tabTotalCounts);
    // updateHeatmap(tabCrowdCounts);
    updateCurveChart(tabTimeStamps, tabZoneCountsHistory);
    // updateTrendChart(tabTimeStamps, tabZoneCountsHistory);

    // Update alerts for preview tab
    updateAlerts(total, tabCrowdCounts, 'alertContainer', 'alertMessage');

  } catch (error) {
    console.error("Error updating tab analysis data:", error);
  }
}

// Initialize Gauge Chart
// function initGaugeChart() {
//   const data = [{
//     type: "indicator",
//     mode: "gauge+number",
//     value: 0,
//     title: { text: "Total Occupancy" },
//     gauge: {
//       axis: { range: [0, 100] },
//       bar: { color: "darkblue" },
//       bgcolor: "white",
//       borderwidth: 2,
//       bordercolor: "gray",
//       steps: [
//         { range: [0, 50], color: "lightgreen" },
//         { range: [50, 80], color: "yellow" },
//         { range: [80, 100], color: "red" }
//       ]
//     }
//   }];

//   const layout = {
//     width: 300,
//     height: 250,
//     margin: { t: 25, r: 25, l: 25, b: 25 }
//   };

//   Plotly.newPlot('gaugeChart', data, layout);
// }

// Update Gauge Chart
// function updateGaugeChart(total) {
//   const update = {
//     value: [total]
//   };
//   Plotly.update('gaugeChart', update);
// }

// Initialize Pie Chart
// function initPieChart() {
//   const data = [{
//     type: "pie",
//     values: [1],
//     labels: ["No Data"],
//     textinfo: "label+percent",
//     insidetextorientation: "radial"
//   }];

//   const layout = {
//     height: 300,
//     margin: { t: 0, r: 0, l: 0, b: 0 }
//   };

//   Plotly.newPlot('pieChart', data, layout);
// }

// Update Pie Chart
// function updatePieChart(zones, total) {
//   const labels = Object.keys(zones);
//   const values = Object.values(zones);

//   // Calculate "other" as total minus sum of zone counts
//   const zoneSum = values.reduce((sum, val) => sum + val, 0);
//   const other = total - zoneSum;

//   if (other > 0) {
//     labels.push("Other");
//     values.push(other);
//   }

//   if (labels.length === 0) {
//     labels.push("No Data");
//     values.push(1);
//   }

//   const update = {
//     labels: [labels],
//     values: [values]
//   };

//   Plotly.update('pieChart', update);
// }

// Initialize Bar Chart
function initBarChart() {
  const data = [{
    type: 'bar',
    x: ['No Data'],
    y: [0],
    marker: { color: 'blue' }
  }];

  const layout = {
    title: 'Zone-wise Population',
    xaxis: { title: 'Zones' },
    yaxis: { title: 'Count' },
    height: 300
  };

  Plotly.newPlot('barChart', data, layout);
}

// Update Bar Chart
function updateBarChart(zones) {
  const x = Object.keys(zones);
  const y = Object.values(zones);

  if (x.length === 0) {
    x.push("No Data");
    y.push(0);
  }

  const update = {
    x: [x],
    y: [y]
  };

  Plotly.update('barChart', update);
}

// Initialize Line Chart
function initLineChart() {
  const data = [{
    type: 'scatter',
    mode: 'lines+markers',
    x: [],
    y: [],
    line: { color: 'red' }
  }];

  const layout = {
    title: 'Total Occupancy Over Time',
    xaxis: { title: 'Time' },
    yaxis: { title: 'Total Count' },
    height: 300
  };

  Plotly.newPlot('lineChart', data, layout);
}

// Update Line Chart
function updateLineChart(times, totals) {
  const update = {
    x: [times],
    y: [totals]
  };

  Plotly.update('lineChart', update);
}

// Initialize Heatmap
// function initHeatmap() {
//   const data = [{
//     z: [[0]],
//     x: ['Zone 1'],
//     y: ['Intensity'],
//     type: 'heatmap',
//     colorscale: 'Viridis'
//   }];

//   const layout = {
//     title: 'Zone Intensity Heatmap',
//     height: 400
//   };

//   Plotly.newPlot('heatmap', data, layout);
// }

// // Update Heatmap
// function updateHeatmap(zones) {
//   const zonesList = Object.keys(zones);
//   const values = Object.values(zones);

//   if (zonesList.length === 0) {
//     zonesList.push("No Data");
//     values.push(0);
//   }

//   const update = {
//     z: [values.map(v => [v])],
//     x: [zonesList],
//     y: [['Intensity']]
//   };

//   Plotly.update('heatmap', update);
// }

// Initialize Curve Chart
function initCurveChart() {
  const data = [{
    type: 'scatter',
    mode: 'lines',
    x: [],
    y: [],
    name: 'No Data'
  }];

  const layout = {
    title: 'Zone-wise Population Over Time',
    xaxis: { title: 'Time' },
    yaxis: { title: 'Count' },
    height: 600
  };

  Plotly.newPlot('curveChart', data, layout);
}

// Update Curve Chart
function updateCurveChart(times, history) {
  const data = Object.keys(history).map(zone => ({
    type: 'scatter',
    mode: 'lines',
    x: times.slice(-history[zone].length),
    y: history[zone],
    name: zone
  }));

  if (data.length === 0) {
    data.push({
      type: 'scatter',
      mode: 'lines',
      x: [],
      y: [],
      name: 'No Data'
    });
  }

  Plotly.newPlot('curveChart', data);
}

// Initialize Trend Chart
function initTrendChart() {
  const data = [{
    type: 'scatter',
    mode: 'lines+markers',
    x: [],
    y: [],
    line: { color: 'green' }
  }];

  const layout = {
    title: 'Zone Population Trend',
    xaxis: { title: 'Time' },
    yaxis: { title: 'Count' },
    height: 300
  };

  Plotly.newPlot('trendChart', data, layout);
}

// Update Trend Chart
function updateTrendChart(times, history) {
  // For simplicity, show trend of first zone or total
  let x = times;
  let y = [];

  if (Object.keys(history).length > 0) {
    const firstZone = Object.keys(history)[0];
    y = history[firstZone];
    x = times.slice(-y.length);
  }

  const data = [{
    type: 'scatter',
    mode: 'lines+markers',
    x: x,
    y: y,
    line: { color: 'green' }
  }];

  const layout = {
    title: 'Zone Population Trend',
    xaxis: { title: 'Time' },
    yaxis: { title: 'Count' },
    height: 300
  };

  Plotly.newPlot('trendChart', data, layout);
}



// Expose functions globally if needed
window.initTabAnalysisPreview = initTabAnalysisPreview;
window.stopTabAnalysisPreview = stopTabAnalysisPreview;
