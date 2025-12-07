// Visualizations and Heatmap related functions

// Globals for visualizations
let heatmapEnabled = false;
let totalThreshold = 10; // Configurable threshold
let zoneThreshold = 6;

// Load thresholds from localStorage on page load
document.addEventListener('DOMContentLoaded', function() {
  const savedTotal = localStorage.getItem('totalThreshold');
  const savedZone = localStorage.getItem('zoneThreshold');
  if (savedTotal) totalThreshold = parseInt(savedTotal);
  if (savedZone) zoneThreshold = parseInt(savedZone);

  // Update modal inputs if they exist
  const totalInput = document.getElementById('totalThreshold');
  const zoneInput = document.getElementById('zoneThreshold');
  if (totalInput) totalInput.value = totalThreshold;
  if (zoneInput) zoneInput.value = zoneThreshold;
});

// Heatmap functions
function drawHeatmap() {
  if (!analysisCtx || !zones.length) return;

  // Create heatmap data based on crowd counts
  const heatmapData = zones.map(zone => ({
    zone: zone.label,
    count: crowdCounts[zone.label] || 0,
    coords: zone.coordinates
  }));

  // Draw heatmap overlay
  heatmapData.forEach(data => {
    if (data.count > 0) {
      const coords = data.coords;
      const intensity = Math.min(data.count / totalThreshold, 1); // Normalize to 0-1

      // Calculate zone center
      const centerX = (coords.topleft[0] + coords.bottomright[0]) / 2;
      const centerY = (coords.topleft[1] + coords.bottomright[1]) / 2;

      // Draw heatmap circle
      const radius = Math.min(analysisCanvas.width, analysisCanvas.height) * 0.1;

      const gradient = analysisCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, `rgba(255, 0, 0, ${intensity * 0.8})`);
      gradient.addColorStop(0.5, `rgba(255, 165, 0, ${intensity * 0.6})`);
      gradient.addColorStop(1, `rgba(255, 255, 0, ${intensity * 0.4})`);

      analysisCtx.fillStyle = gradient;
      analysisCtx.beginPath();
      analysisCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      analysisCtx.fill();
    }
  });
}

function clearHeatmap() {
  // Redraw zones to clear heatmap
  drawAnalysisZones();
}

function drawDetections(detections) {
  if (!analysisCtx || !detections || detections.length === 0) return;

  detections.forEach(det => {
    const [x1, y1, x2, y2] = det.bbox;

    // Scale coordinates if needed (assuming video is processed at different resolution)
    const scaleX = analysisCanvas.width / 640; // Assuming backend processes at 640 width
    const scaleY = analysisCanvas.height / 360; // Assuming backend processes at 360 height

    const scaledX1 = x1 * scaleX;
    const scaledY1 = y1 * scaleY;
    const scaledX2 = x2 * scaleX;
    const scaledY2 = y2 * scaleY;

    // Draw blue rectangle (matching backend color)
    analysisCtx.strokeStyle = 'blue';
    analysisCtx.lineWidth = 3;
    analysisCtx.strokeRect(scaledX1, scaledY1, scaledX2 - scaledX1, scaledY2 - scaledY2);

    // Draw label
    analysisCtx.fillStyle = 'blue';
    analysisCtx.font = '14px Arial';
    analysisCtx.fillText(det.label, scaledX1, scaledY1 - 8);
  });
}

// Function to draw zones on analysis canvas
function drawAnalysisZones(showLabels = true) {
  console.log("Drawing analysis zones, zones:", zones.length, "crowdCounts:", crowdCounts);
  analysisCtx.clearRect(0, 0, analysisCanvas.width, analysisCanvas.height);
  zones.forEach(zone => {
    const coords = zone.coordinates;
    analysisCtx.strokeStyle = 'lime';
    analysisCtx.lineWidth = 2;
    analysisCtx.beginPath();
    analysisCtx.moveTo(coords.topleft[0], coords.topleft[1]);
    analysisCtx.lineTo(coords.topright[0], coords.topright[1]);
    analysisCtx.lineTo(coords.bottomright[0], coords.bottomright[1]);
    analysisCtx.lineTo(coords.bottomleft[0], coords.bottomleft[1]);
    analysisCtx.closePath();
    analysisCtx.stroke();

    if (showLabels) {
      // Label
      analysisCtx.fillStyle = 'lime';
      analysisCtx.font = '16px Arial';
      analysisCtx.fillText(zone.label, coords.topleft[0], coords.topleft[1] - 5);
    }
    // Count (if available)
    console.log(`Checking count for zone "${zone.label}":`, crowdCounts[zone.label]);
    if (crowdCounts[zone.label] !== undefined && crowdCounts[zone.label] !== null) {
      analysisCtx.fillStyle = 'red';
      analysisCtx.font = '20px Arial';
      analysisCtx.fillText(`${crowdCounts[zone.label]}`, coords.topleft[0], coords.topleft[1] - 30);
      console.log(`Drew count ${crowdCounts[zone.label]} for zone "${zone.label}"`);
      
    } else {
      console.log(`No count found for zone "${zone.label}"`);
    }
  });
}
// Shared alert function for both analysis and preview tabs
function updateAlerts(total, zones, alertContainerId = 'alerts', alertMessageId = null) {
  const alertDiv = document.getElementById(alertContainerId);
  if (!alertDiv) return;

  let alertHtml = '';

  // Check for high occupancy
  if (total > totalThreshold) {
    alertHtml += '<div class="alert alert-warning mt-3" style="backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);">⚠️ High occupancy detected in frame!</div>';
  }

  // Check zone thresholds
  Object.entries(zones).forEach(([zone, count]) => {
    if (count > zoneThreshold) {
      alertHtml += `<div class="alert alert-danger mt-3" style="backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);">⚠️ Zone ${zone} exceeded threshold!</div>`;
    }
  });

  alertDiv.innerHTML = alertHtml;

  // Show/hide based on whether there are actual alerts
  if (alertHtml.includes('alert-warning') || alertHtml.includes('alert-danger')) {
    alertDiv.style.display = 'block';
  } else {
    alertDiv.style.display = 'none';
  }

  // For analysis tab, update the message div separately if provided
  if (alertMessageId) {
    const messageDiv = document.getElementById(alertMessageId);
    if (messageDiv) {
      messageDiv.innerHTML = alertHtml;
    }
  }
}

// Handle save thresholds
document.addEventListener('DOMContentLoaded', function() {
  const saveBtn = document.getElementById('saveThresholds');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      const totalInput = document.getElementById('totalThreshold');
      const zoneInput = document.getElementById('zoneThreshold');
      if (totalInput && zoneInput) {
        totalThreshold = parseInt(totalInput.value);
        zoneThreshold = parseInt(zoneInput.value);
        localStorage.setItem('totalThreshold', totalThreshold);
        localStorage.setItem('zoneThreshold', zoneThreshold);
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
        if (modal) modal.hide();
        // Show success message (optional)
        if (window.toast) window.toast.success('Thresholds updated successfully!'); else alert('Thresholds updated successfully!');
      }
    });
  }
});

// Make updateAlerts available globally
window.updateAlerts = updateAlerts;
