// Globals for YOLO analysis
let countInterval = null;
let crowdCounts = {};
let analysisStarted = false;
let deepsortEnabled = false; // Track deepsort toggle state

// Modified startYoloAnalysis to include chart updates and alerts
async function startYoloAnalysis(feedId) {
  console.log("Starting YOLO analysis for feed:", feedId);

  // Disable start button and show loading
  const startBtn = document.getElementById("startAnalysisBtn");
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.textContent = "Stopping...";
  }

  // Show loading indicator
  const loadingDiv = document.getElementById("analysisLoading");
  if (loadingDiv) loadingDiv.style.display = "flex";

  // Show toast
  if (window.toast) {
    window.toast.info("Starting analysis, please wait...");
  } else {
    alert("Starting analysis, please wait...");
  }

  analysisStarted = false;

  // Ask backend to start YOLO
  const res = await fetch(`/api/feeds/${feedId}/start_analysis`, { method: "POST" });
  const data = await res.json();
  if (data.status !== "started") {
    if (window.toast) window.toast.error("Failed to start analysis"); else alert("Failed to start analysis");
    if (loadingDiv) loadingDiv.style.display = "none";
    return;
  }

  // Show the deepsort toggle button when analysis starts
  const toggleDeepsortBtn = document.getElementById("toggleDeepsortBtn");
  if (toggleDeepsortBtn) {
    toggleDeepsortBtn.style.display = "inline-block";
    toggleDeepsortBtn.textContent = "Deepsort: OFF";
  }
  // Show the Generate Report toggle button when analysis starts

const generateReportBtn = document.getElementById("generateReportBtn");
if (generateReportBtn) {
  generateReportBtn.style.display = "inline-block";
}
  // Ensure deepsort is off initially
  deepsortEnabled = false;
  try {
    await fetch(`/api/feeds/${feedId}/toggle_deepsort`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false })
    });
  } catch (error) {
    console.error("Error ensuring deepsort off:", error);
  }

  

  // Start polling backend for counts and detections
  countInterval = setInterval(async () => {
    const resp = await fetch(`/api/feeds/${feedId}/counts`);
    const counts = await resp.json();
    crowdCounts = counts.zones || {};

    const detResp = await fetch(`/api/feeds/${feedId}/detections`);
    const detections = await detResp.json();

    console.log("Counts received:", counts);
    console.log("Crowd counts:", crowdCounts);
    console.log("Current zones:", zones.map(z => z.label));

    // Update counts in DOM
    const videoCountP = document.getElementById("videoCount");
    const zoneCountsDiv = document.getElementById("zoneCounts");
    if (videoCountP) videoCountP.textContent = `Video Count: ${counts.total || 0}`;

    if (zoneCountsDiv) {
      zoneCountsDiv.innerHTML = "";
      Object.entries(crowdCounts).forEach(([label, cnt]) => {
        const p = document.createElement("p");
        p.textContent = `${label}: ${cnt}`;
        zoneCountsDiv.appendChild(p);
      });
    }

    // Draw detections on analysis canvas

    // Draw detections with track IDs if deepsort enabled
    // if (deepsortEnabled) {
    //   drawDetectionsWithTrackIDs(detections);
    // } else {
    //   drawDetections(detections);
    // }

    // Draw heatmap if enabled
    if (heatmapEnabled) {
      drawHeatmap();
    }

    // Update alerts for analysis tab
    updateAlerts(counts.total || 0, crowdCounts, 'alertContainer', 'alertMessage');

        // Hide loading if analysis has started producing data
    if (!analysisStarted && (counts.total > 0 || Object.keys(crowdCounts).some(key => crowdCounts[key] > 0))) {
      analysisStarted = true;
      const loadingDiv = document.getElementById("analysisLoading");
      if (loadingDiv) loadingDiv.style.display = "none";
    }
  }, 1000);

  // Start tab analysis preview if available
  if (window.initTabAnalysisPreview) {
    window.initTabAnalysisPreview(feedId);
  }
}

async function stopYoloAnalysis(feedId) {
  console.log("Stopping YOLO analysis for feed:", feedId);



  clearInterval(countInterval);
  countInterval = null;

  await fetch(`/api/feeds/${feedId}/stop_analysis`, { method: "POST" });

  crowdCounts = {};
  drawAnalysisZones();

  // Re-enable start button
  const startBtn = document.getElementById("startAnalysisBtn");
  if (startBtn) {
    startBtn.disabled = false;
    startBtn.textContent = "Start Analysis";
  }

  // Hide loading if visible
  const loadingDiv = document.getElementById("analysisLoading");
  if (loadingDiv) loadingDiv.style.display = "none";

  // Hide the deepsort toggle button when analysis stops
  const toggleDeepsortBtn = document.getElementById("toggleDeepsortBtn");
  if (toggleDeepsortBtn) {
    toggleDeepsortBtn.style.display = "none";
  }

  // Hide the Generate Report button when analysis stops
  const generateReportBtn = document.getElementById("generateReportBtn");
  if (generateReportBtn) {
    generateReportBtn.style.display = "none";
  }

  // Stop tab analysis preview if available
  if (window.stopTabAnalysisPreview) {
    window.stopTabAnalysisPreview();
  }
}



// Add event listener for deepsort toggle button
document.addEventListener('DOMContentLoaded', () => {
  const toggleDeepsortBtn = document.getElementById("toggleDeepsortBtn");
  if (toggleDeepsortBtn) {
    toggleDeepsortBtn.addEventListener("click", async () => {
      deepsortEnabled = !deepsortEnabled;
      toggleDeepsortBtn.textContent = deepsortEnabled ? "Deepsort: ON" : "Deepsort: OFF";

      // Show note
      if (window.toast) {
        window.toast.info(deepsortEnabled ? "Deepsort enabled: Tracking people across frames." : "Deepsort disabled: Basic detection only.");
      } else {
        alert(deepsortEnabled ? "Deepsort enabled: Tracking people across frames." : "Deepsort disabled: Basic detection only.");
      }

      // Send toggle state to backend
      if (!selectedFeedId) {
        if (window.toast) window.toast.error("Select a feed first"); else alert("Select a feed first");
        return;
      }
      try {
        const res = await fetch(`/api/feeds/${selectedFeedId}/toggle_deepsort`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: deepsortEnabled })
        });
        const data = await res.json();
        if (data.status !== "success") {
          if (window.toast) window.toast.error("Failed to toggle deepsort"); else alert("Failed to toggle deepsort");
        }
      } catch (error) {
        if (window.toast) window.toast.error("Error toggling deepsort: " + error.message); else alert("Error toggling deepsort: " + error.message);
      }
    });
  }
   const generateReportBtn = document.getElementById("generateReportBtn");
  if (generateReportBtn) {
    generateReportBtn.addEventListener("click", () => {
      if (!selectedFeedId) {
        if (window.toast) window.toast.error("Select a feed first");
        else alert("Select a feed first");
        return;
      }
      window.open(`/api/feeds/${selectedFeedId}/report`, '_blank');
    });
  }

});
