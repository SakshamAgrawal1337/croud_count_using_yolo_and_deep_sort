// Globals
let feeds = [];
let selectedFeedId = null;
let selectedFeed = null;
let zones = [];
let drawing = false;
let rectStart = null;
let rectEnd = null;
let currentPoints = [];
let modifyingZoneIndex = null;
let canvas, ctx;
let previewCanvas, previewCtx;
let video, previewVideo;
let analysisCanvas, analysisCtx;
let cameraStream = null; // Track camera stream
let cameraPreviewActive = false; // Track preview state


window.onload = () => {
  // Elements
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');

  previewCanvas = document.getElementById('previewCanvas');
  previewCtx = previewCanvas.getContext('2d');

  video = document.getElementById('video');
  previewVideo = document.getElementById('previewVideo');

  analysisCanvas = document.getElementById('analysisCanvas');
  analysisCtx = analysisCanvas.getContext('2d');

  setupUI();
};

function setupUI() {
  // Sidebar elements
  const feedList = document.getElementById('feedList');
  const addFeedBtn = document.getElementById('addFeedBtn');
  const feedTypeSelector = document.getElementById('feedTypeSelector');
  const newFeedNameInput = document.getElementById('newFeedName');
  const newFeedTypeSelect = document.getElementById('newFeedType');
  const videoUploadContainer = document.getElementById('videoUploadContainer');
  const videoUploadInput = document.getElementById('videoUploadInput');
  const saveFeedBtn = document.getElementById('saveFeedBtn');
  const cancelFeedBtn = document.getElementById('cancelFeedBtn');

  const currentFeedTitle = document.getElementById('currentFeedTitle');
  const feedTabs = document.getElementById('feedTabs');
  const tabDraw = document.getElementById('tab-draw');
  const tabPreview = document.getElementById('tab-preview');
  const tabUpdate = document.getElementById('tab-update');

  const startDrawingBtn = document.getElementById('startDrawingBtn');
  const cancelDrawingBtn = document.getElementById('cancelDrawingBtn');
  const saveZonesBtn = document.getElementById('saveZonesBtn');
  const zoneLabelInput = document.getElementById('zoneLabel');

  const zonesDropdown = document.getElementById('zonesDropdown');
  const deleteZoneBtn = document.getElementById('deleteZoneBtn');
  const modifyZoneBtn = document.getElementById('modifyZoneBtn');

  // Show/hide upload input based on feed type
  newFeedTypeSelect.onchange = () => {
    if (newFeedTypeSelect.value === 'video') {
      videoUploadContainer.style.display = 'block';
    } else {
      videoUploadContainer.style.display = 'none';
    }
  };

  addFeedBtn.onclick = () => {
    feedTypeSelector.style.display = 'block';
    addFeedBtn.disabled = true;
  };

  cancelFeedBtn.onclick = () => {
    feedTypeSelector.style.display = 'none';
    addFeedBtn.disabled = false;
    newFeedNameInput.value = '';
    videoUploadInput.value = '';
  };

  saveFeedBtn.onclick = async () => {
    const name = newFeedNameInput.value.trim();
    const type = newFeedTypeSelect.value;

    if (!name) {
      if (window.toast) window.toast.error('Feed name required'); else alert('Feed name required');
      return;
    }

    // Check for duplicate feed name
    if (feeds.some(f => f.name.toLowerCase() === name.toLowerCase())) {
      if (window.toast) window.toast.error('Feed name must be unique'); else alert('Feed name must be unique');
      return;
    }

    // Validate video file before creating feed
    if (type === 'video') {
      const file = videoUploadInput.files[0];
      if (!file) {
        if (window.toast) window.toast.error('Please select a video file'); else alert('Please select a video file');
        return;
      }
      if (!file.type.startsWith('video/')) {
        if (window.toast) window.toast.error('Please upload a valid video file.'); else alert('Please upload a valid video file.');
        videoUploadInput.value = ''; // Clear the input
        return;
      }
    }

    // Create feed in backend
    const res = await fetch('/api/feeds', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name, type})
    });
    const data = await res.json();
    if (data.status !== 'success') {
      if (window.toast) window.toast.error('Failed to add feed'); else alert('Failed to add feed');
      return;
    }

    const feed = data.feed;

    // Upload video if video feed
    if (type === 'video') {
      const file = videoUploadInput.files[0];
      const formData = new FormData();
      formData.append('video', file);
      const upRes = await fetch(`/api/feeds/${feed.id}/upload_video`, {
        method: 'POST',
        body: formData
      });
      const upData = await upRes.json();
      if (upData.status !== 'success') {
        // Delete the feed since upload failed
        await fetch(`/api/feeds/${feed.id}`, { method: 'DELETE' });
        if (window.toast) window.toast.error('Failed to upload video'); else alert('Failed to upload video');
        return;
      }
      feed.video_filename = upData.filename;
    }

    feeds.push(feed);
    feedTypeSelector.style.display = 'none';
    addFeedBtn.disabled = false;
    newFeedNameInput.value = '';
    videoUploadInput.value = '';

    if (window.toast) window.toast.success('Feed added successfully!'); else alert('Feed added successfully!');

    renderFeedList();
    selectFeed(feed.id);
  };

  function renderFeedList() {
    feedList.innerHTML = '';
    feeds.forEach(feed => {
      const li = document.createElement('li');
      li.textContent = feed.name + (feed.type === 'camera' ? '  📸' : '  📹');
      if (feed.id === selectedFeedId) li.classList.add('selected');
      li.onclick = () => selectFeed(feed.id);

      const deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can" style="color: #c23546;"></i>';
      deleteBtn.className = ' btn-sm d-flex justify-content-center align-items-center';
      deleteBtn.style.marginLeft = '10px';
      deleteBtn.style.backgroundColor = 'transparent';
      deleteBtn.style.borderColor = 'transparent';
      deleteBtn.style.borderWidth = '0';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        // Add bounce animation class
        const icon = deleteBtn.querySelector('i');
        if (icon) {
          icon.classList.add('fa-bounce');
          setTimeout(() => {
            icon.classList.remove('fa-bounce');
            deleteFeed(feed.id);
          }, 1000); // animation duration 1 second
        } else {
          deleteFeed(feed.id);
        }
      };
      li.appendChild(deleteBtn);

      feedList.appendChild(li);
    });
  }

  async function loadFeeds() {
    console.log('Loading feeds...');
    const res = await fetch('/api/feeds');
    console.log('Fetch response:', res);
    feeds = await res.json();
    console.log('Feeds data:', feeds);
    renderFeedList();
  }

  async function deleteFeed(feedId) {
    if (!confirm('Are you sure you want to delete this feed?')) return;
    const res = await fetch(`/api/feeds/${feedId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.status === 'success') {
      feeds = feeds.filter(f => f.id !== feedId);
      if (selectedFeedId === feedId) {
        selectedFeedId = null;
        selectedFeed = null;
        zones = [];
        currentFeedTitle.textContent = '';
        feedTabs.style.display = 'none';
        redraw();
      }
      renderFeedList();
      if (window.toast) window.toast.success('Successfully, Feed deleted!'); else alert('Successfully, Feed deleted!');
    } else {
      if (window.toast) window.toast.error('Failed to delete feed'); else alert('Failed to delete feed');
    }
  }

  window.selectFeed = async (feedId) => {
    // Stop any existing camera stream
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }

    selectedFeedId = feedId;
    selectedFeed = feeds.find(f => f.id === feedId);
    zones = [];

    renderFeedList();

    currentFeedTitle.textContent = `Feed: ${selectedFeed.name} (${selectedFeed.type})`;
    // Show camera preview button for camera feeds
    const eyeBtn = document.getElementById('eyeBtn');
    if (selectedFeed.type === "camera") {
      if (eyeBtn) {
        eyeBtn.style.display = "block";
      }
    } else {
      if (eyeBtn) {
        eyeBtn.style.display = "none";
      }
    }
    feedTabs.style.display = 'block';
////////////////////////////////////////////////
    // Load zones
    console.log("Loading zones for feed:", feedId);
    const res = await fetch(`/api/feeds/${feedId}/zones`);
    zones = await res.json();
    console.log("Zones loaded:", zones);

    // Setup video or camera stream
    if (selectedFeed.type === 'video') {
      if (!selectedFeed.video_filename) {
        if (window.toast) window.toast.error('No video uploaded for this feed.'); else alert('No video uploaded for this feed.');
        clearVideo();
      } else {
        setVideoSource(`/static/videos/${selectedFeed.video_filename}`);
        // Remove placeholder if switching from camera
        removeCameraDisabledPlaceholder();
        removePreviewDisabledMessage();
        canvas.style.display = 'block';
      }
    } else if (selectedFeed.type === 'camera') {
      canvas.style.display = 'block';
      if (cameraPreviewActive) {
        startCameraStream();
      } else {
        clearVideo();
        showPreviewDisabledMessage();
      }
    }

    resetDrawing();
    updateZonesDropdown();
    switchTab('draw');
  };

  function clearVideo() {
    video.pause();
    video.srcObject = null;
    video.src = '';
  }

  function setVideoSource(src) {
    video.pause();
    video.srcObject = null;
    video.src = src;
    video.play();
  }

async function startCameraStream() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({video: true});
    video.srcObject = cameraStream;
    video.play();
    // Remove placeholder if it exists
    removeCameraDisabledPlaceholder();
  } catch (e) {
    if (window.toast) window.toast.error('Cannot access camera: ' + e.message); else alert('Cannot access camera: ' + e.message);
    // Handle camera disabled or error by showing placeholder or message
    showCameraDisabledPlaceholder();
  }
}



  // Tabs logic
  const tabButtons = document.querySelectorAll('.tabBtn');
  tabButtons.forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });

  function switchTab(tab) {
    tabButtons.forEach(b => b.classList.remove('active'));
    document.querySelector(`.tabBtn[data-tab=${tab}]`).classList.add('active');

    document.querySelectorAll('.tab-content').forEach(tc => {
      tc.style.display = 'none';
    });

    document.getElementById(`tab-${tab}`).style.display = 'block';

    if (tab === 'preview') {
      setupPreview();
    } else if (tab === 'analysis') {
      initAnalysisTab();
    } else if (tab === 'analysis-preview') {
      if (selectedFeedId) {
        window.initTabAnalysisPreview(selectedFeedId);
      }
    }
  }

  // Drawing logic
  function resetDrawing() {
    drawing = false;
    rectStart = null;
    rectEnd = null;
    currentPoints = [];
    zoneLabelInput.value = '';
    cancelDrawingBtn.disabled = true;
    canvas.style.pointerEvents = 'none';
    redraw();
  }

  startDrawingBtn.onclick = () => {
    if (drawing) return;
    drawing = true;
    currentPoints = [];
    zoneLabelInput.value = '';
    cancelDrawingBtn.disabled = false;
    canvas.style.pointerEvents = 'auto';
  };

  cancelDrawingBtn.onclick = () => {
    drawing = false;
    currentPoints = [];
    cancelDrawingBtn.disabled = true;
    canvas.style.pointerEvents = 'none';
    redraw();
  };


  // Drawing with rectangle
  canvas.addEventListener('mousedown', (e) => {
  if (!drawing) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  rectStart = { x, y };
  rectEnd = null;

  canvas.onmousemove = (ev) => {
    const moveX = ev.clientX - rect.left;
    const moveY = ev.clientY - rect.top;
    rectEnd = { x: moveX, y: moveY };
    drawTempRectangle();
  };
});

canvas.addEventListener('mouseup', () => {
  if (!drawing || !rectStart || !rectEnd) return;

  drawing = false;
  canvas.onmousemove = null;
  cancelDrawingBtn.disabled = true;
  canvas.style.pointerEvents = 'none';

  const label = zoneLabelInput.value.trim();
  if (!label) {
    if (window.toast) window.toast.error('Please enter a zone label before drawing.'); else alert('Please enter a zone label before drawing.');
    rectStart = null;
    rectEnd = null;
    redraw();
    return;
  }

  const zone = {
    label,
    coordinates: {
      topleft: [Math.min(rectStart.x, rectEnd.x), Math.min(rectStart.y, rectEnd.y)],
      topright: [Math.max(rectStart.x, rectEnd.x), Math.min(rectStart.y, rectEnd.y)],
      bottomright: [Math.max(rectStart.x, rectEnd.x), Math.max(rectStart.y, rectEnd.y)],
      bottomleft: [Math.min(rectStart.x, rectEnd.x), Math.max(rectStart.y, rectEnd.y)]
    }
  };

  const existingIndex = zones.findIndex(z => z.label === label);
  if (existingIndex !== -1) {
    zones[existingIndex] = zone;
  } else {
    zones.push(zone);
  }
  rectStart = null;
  rectEnd = null;
  redraw();
  updateZonesDropdown();
});

function drawTempRectangle() {
  if (!rectStart || !rectEnd) return;

  redraw(); // clear canvas and redraw all saved zones

  const x = Math.min(rectStart.x, rectEnd.x);
  const y = Math.min(rectStart.y, rectEnd.y);
  const width = Math.abs(rectStart.x - rectEnd.x);
  const height = Math.abs(rectStart.y - rectEnd.y);

  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
}
  // Helper function to draw zones on canvas
  function drawZones(context, color = 'lime', showCount = false) {
    zones.forEach(zone => {
      const coords = zone.coordinates;
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(coords.topleft[0], coords.topleft[1]);
      context.lineTo(coords.topright[0], coords.topright[1]);
      context.lineTo(coords.bottomright[0], coords.bottomright[1]);
      context.lineTo(coords.bottomleft[0], coords.bottomleft[1]);
      context.closePath();
      context.stroke();

      // Label
      context.fillStyle = color;
      context.font = '16px Arial';
      context.fillText(zone.label, coords.topleft[0], coords.topleft[1] - 5);

      // Count (if requested and available)
      if (showCount && crowdCounts[zone.label] !== undefined) {
        context.fillStyle = 'red';
        context.font = '20px Arial';
        context.fillText(`${crowdCounts[zone.label]}`, coords.topleft[0], coords.topleft[1] - 30);
      }
    });
  }

  // Make redraw function globally accessible
  window.redraw = function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!selectedFeedId) {
      // Draw a semi-transparent background box with rounded corners and shadow
      const boxWidth = 500;
      const boxHeight = 110;
      const boxX = (canvas.width - boxWidth) / 2;
      const boxY = (canvas.height - boxHeight) / 2;
      const radius = 20;

      // Shadow
      ctx.shadowColor = 'rgba(124, 131, 132, 0.5)';
      ctx.shadowBlur = 22;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;

      // Draw rounded rectangle
      ctx.fillStyle = 'rgba(16, 16, 16, 0.9)';
      ctx.beginPath();
      ctx.moveTo(boxX + radius, boxY);
      ctx.lineTo(boxX + boxWidth - radius, boxY);
      ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
      ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
      ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
      ctx.lineTo(boxX + radius, boxY + boxHeight);
      ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
      ctx.lineTo(boxX, boxY + radius);
      ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
      ctx.closePath();
      ctx.fill();

      // Border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Draw the text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Please select a feed to start drawing zones.', canvas.width / 2, canvas.height / 2 + 5);

      // Add an icon or emoji
      ctx.font = '35px Arial';
      ctx.fillText('📹', canvas.width / 2, canvas.height / 2 - 25);
    } else {
      drawZones(ctx);
    }
  }

  saveZonesBtn.onclick = async () => {
    if (!selectedFeedId) {
      if (window.toast) window.toast.error('Select a feed first'); else alert('Select a feed first');
      return;
    }
    const res = await fetch(`/api/feeds/${selectedFeedId}/zones`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({zones})
    });
    const data = await res.json();
    if (data.status === 'success') {
      if (window.toast) window.toast.success('Zones saved!'); else alert('Zones saved!');
      // Reload zones to get updated IDs
      const reloadRes = await fetch(`/api/feeds/${selectedFeedId}/zones`);
      zones = await reloadRes.json();
      updateZonesDropdown();
      redraw();
    } else {
      if (window.toast) window.toast.error('Failed to save zones'); else alert('Failed to save zones');
    }
  };

  // Preview tab zones drawing
  function setupPreview() {
    // Set preview video same as main video
    if (selectedFeed.type === 'video' && selectedFeed.video_filename) {
      previewVideo.srcObject = null;
      previewVideo.src = `/static/videos/${selectedFeed.video_filename}`;
      previewVideo.play();
    } else if (selectedFeed.type === 'camera') {
      previewVideo.srcObject = video.srcObject;
      previewVideo.play();
    }
    drawPreviewZones();
  }

  function drawPreviewZones() {
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    drawZones(previewCtx, 'yellow');
    requestAnimationFrame(drawPreviewZones);
  }

  // Update/Delete zones
  function updateZonesDropdown() {
    zonesDropdown.innerHTML = '';
    zones.forEach((z, i) => {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = z.label;
      zonesDropdown.appendChild(option);
    });
  }

  deleteZoneBtn.onclick = async () => {
    const idx = zonesDropdown.selectedIndex;
    if (idx === -1) {
      if (window.toast) window.toast.error('Select a zone to delete'); else alert('Select a zone to delete');
      return;
    }
    if (!confirm(`Delete zone "${zones[idx].label}"?`)) return;

    const zone = zones[idx];
    if (!zone.id) {
      // Local zone not saved yet, just remove from array
      zones.splice(idx, 1);
      updateZonesDropdown();
      redraw();
      if (window.toast) window.toast.success('Zone deleted successfully.'); else alert('Zone deleted successfully.');
      return;
    }

    try {
      const res = await fetch(`/api/feeds/${selectedFeedId}/zones/${zone.id}`, {
        method: 'DELETE'
      });
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        zones.splice(idx, 1);
        updateZonesDropdown();
        redraw();
        if (window.toast) window.toast.success('Zone deleted successfully.'); else alert('Zone deleted successfully.');
      } else {
        const errorMsg = data.error || 'Failed to delete zone';
        if (window.toast) window.toast.error(errorMsg); else alert(errorMsg);
      }
    } catch (error) {
      if (window.toast) window.toast.error('Error deleting zone: ' + error.message); else alert('Error deleting zone: ' + error.message);
    }
  };

  modifyZoneBtn.onclick = async () => {
    const idx = zonesDropdown.selectedIndex;
    if (idx === -1) {
      if (window.toast) window.toast.error('Select a zone to modify'); else alert('Select a zone to modify');
      return;
    }
    const zone = zones[idx];
    // Fetch latest zone data from backend to ensure sync
    try {
      const res = await fetch(`/api/feeds/${selectedFeedId}/zones`);
      const allZones = await res.json();
      const currentZone = allZones.find(z => z.id === zone.id);
      if (!currentZone) {
        if (window.toast) window.toast.error('Zone not found on server'); else alert('Zone not found on server');
        return;
      }
      // Update local zones array with latest data
      zones[idx] = currentZone;
      modifyingZoneIndex = idx;
    // Switch to draw tab
    switchTab('draw');
    // Start drawing mode
    startDrawingBtn.click();
    // Set the label after starting drawing to avoid it being cleared
    zoneLabelInput.value = currentZone.label;
    } catch (error) {
      if (window.toast) window.toast.error('Error fetching zone data: ' + error.message); else alert('Error fetching zone data: ' + error.message);
    }
  };

  // Override saveZonesBtn to handle modifying existing zone label and coordinates
  const originalSaveZonesOnClick = saveZonesBtn.onclick;
  saveZonesBtn.onclick = async () => {
    if (modifyingZoneIndex !== null) {
      // Update the zone at modifyingZoneIndex with current label and coordinates
      const label = zoneLabelInput.value.trim();
      if (!label) {
        if (window.toast) window.toast.error('Zone label cannot be empty'); else alert('Zone label cannot be empty');
        return;
      }
      const zone = zones[modifyingZoneIndex];
      zone.label = label;
      // The coordinates are updated on mouseup event when drawing finishes
      modifyingZoneIndex = null;
    }
    await originalSaveZonesOnClick();
  };

  // Analysis tab handlers
  let startAnalysisBtn, stopAnalysisBtn, videoCountP, zoneCountsDiv, analysisVideo;

  // Initialize analysis elements when switching to analysis tab
  function initAnalysisTab() {
    startAnalysisBtn = document.getElementById('startAnalysisBtn');
    stopAnalysisBtn = document.getElementById('stopAnalysisBtn');
    videoCountP = document.getElementById('videoCount');
    zoneCountsDiv = document.getElementById('zoneCounts');
    analysisVideo = document.getElementById('analysisVideo');

    const toggleHeatmapBtn = document.getElementById('toggleHeatmapBtn');
    if (toggleHeatmapBtn) {
      toggleHeatmapBtn.onclick = () => {
        heatmapEnabled = !heatmapEnabled;
        if (heatmapEnabled) {
          drawHeatmap();
        } else {
          clearHeatmap();
        }
      };
    }

    if (startAnalysisBtn && stopAnalysisBtn) {
      // const toggleDeepsortBtn = document.getElementById('toggleDeepsortBtn');
      // if (toggleDeepsortBtn) {
      //   toggleDeepsortBtn.onclick = async () => {
      //     if (!selectedFeedId) {
      //       if (window.toast) window.toast.error('Select a feed first'); else alert('Select a feed first');
      //       return;
      //     }
      //     const enabled = toggleDeepsortBtn.classList.toggle('active');
      //     try {
      //       const res = await fetch(`/api/feeds/${selectedFeedId}/toggle_deepsort`, {
      //         method: 'POST',
      //         headers: {'Content-Type': 'application/json'},
      //         body: JSON.stringify({enabled})
      //       });
      //       const data = await res.json();
      //       if (data.status !== 'success') {
      //         if (window.toast) window.toast.error('Failed to toggle DeepSort'); else alert('Failed to toggle DeepSort');
      //         toggleDeepsortBtn.classList.toggle('active'); // revert toggle
      //       }
      //     } catch (error) {
      //       if (window.toast) window.toast.error('Error toggling DeepSort: ' + error.message); else alert('Error toggling DeepSort: ' + error.message);
      //       toggleDeepsortBtn.classList.toggle('active'); // revert toggle
      //     }
      //   };
      // }

      startAnalysisBtn.onclick = async () => {
        if (!selectedFeedId) {
          if (window.toast) window.toast.error('Select a feed first'); else alert('Select a feed first');
          return;
        }

        // Ensure camera preview is active for camera feeds before starting analysis
        if (selectedFeed.type === 'camera' && cameraPreviewActive) {
           stopCameraPreview();
        }

        window.isAnalysisRunning = true;
        startYoloAnalysis(selectedFeedId);
        startAnalysisBtn.style.display = 'none';
        stopAnalysisBtn.style.display = 'inline-block';
        toggleHeatmapBtn.style.display = 'inline-block';
        if (toggleDeepsortBtn) toggleDeepsortBtn.style.display = 'inline-block';

        // Set analysis video source to MJPEG stream from backend to show DeepSort IDs
        analysisVideo.srcObject = null;
        analysisVideo.src = `/api/feeds/${selectedFeedId}/stream`;

        // Draw zones on analysis canvas
        drawAnalysisZones();

        // Start line chart in analysis preview if tab is active
        if (document.getElementById('tab-analysis-preview').style.display === 'block') {
          window.startLineChart();
        }
      };

      stopAnalysisBtn.onclick = () => {
        if (!selectedFeedId) return;
        stopYoloAnalysis(selectedFeedId);
        startAnalysisBtn.style.display = 'inline-block';
        stopAnalysisBtn.style.display = 'none';
        toggleHeatmapBtn.style.display = 'none';
        if (toggleDeepsortBtn) toggleDeepsortBtn.style.display = 'none';
        if (videoCountP) videoCountP.textContent = 'Video Count: 0';
        if (zoneCountsDiv) zoneCountsDiv.innerHTML = '';
        if (analysisVideo) {
          analysisVideo.src = '';
          analysisVideo.srcObject = null;
        }
        // Clear analysis canvas
        analysisCtx.clearRect(0, 0, analysisCanvas.width, analysisCanvas.height);


      };
    }
  }



  // Also handle the stop button in the Draw tab if needed
  const stopAnalysisBtnDraw = document.getElementById('stopAnalysisBtnDraw');
  if (stopAnalysisBtnDraw) {
    stopAnalysisBtnDraw.onclick = () => {
      if (!selectedFeedId) return;
      stopYoloAnalysis(selectedFeedId);
      stopAnalysisBtnDraw.style.display = 'none';
      // Optionally, update UI in Draw tab if needed
    };
  }

  // Load feeds on startup
  loadFeeds();

  // Camera preview toggle functionality
  const eyeBtn = document.getElementById('eyeBtn');
  if (eyeBtn) {
    eyeBtn.onclick = () => {
      toggleCameraPreview();
    };
  }

  // Sign out functionality
  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) {
    signOutBtn.onclick = () => {
      // Stop any running analysis
      if (selectedFeedId) {
        stopYoloAnalysis(selectedFeedId);
      }
      // Show sign out toast
      if (window.toast) window.toast.success('Signing out successfully');
      // Clear session and redirect to login after a short delay
      setTimeout(() => {
        fetch('/logout', { method: 'POST' })
          .then(() => {
            window.location.href = '/login';
          })
          .catch(() => {
            window.location.href = '/login';
          });
      }, 100);
    };
  }

  redraw();
}

// Placeholder functions
function showCameraDisabledPlaceholder() {
  // Pause and clear video element
  video.pause();
  video.srcObject = null;
  video.src = '';

  // Optionally, show a placeholder image or message overlay on video container
  const videoContainer = document.getElementById('videoContainer');
  if (!videoContainer) return;

  // Check if placeholder already exists
  let placeholder = document.getElementById('cameraDisabledPlaceholder');
  if (!placeholder) {
    placeholder = document.createElement('div');
    placeholder.id = 'cameraDisabledPlaceholder';

    // Styling for the overlay box
    placeholder.style.position = 'absolute';
    placeholder.style.top = '50%';
    placeholder.style.left = '50%';
    placeholder.style.transform = 'translate(-50%, -50%)';
    placeholder.style.width = '60%';
    placeholder.style.maxWidth = '500px';
    placeholder.style.padding = '20px 30px';
    placeholder.style.backgroundColor = 'rgba(15, 14, 14, 0.7)';
    placeholder.style.color = '#fff';
    placeholder.style.borderRadius = '16px';
    placeholder.style.boxShadow = '0 0 8px #858888ff, 0 0 20px rgba(124, 131, 132, 0.5)';
    placeholder.style.display = 'flex';
    placeholder.style.flexDirection = 'column';
    placeholder.style.alignItems = 'center';
    placeholder.style.fontSize = '16px';
    placeholder.style.textAlign = 'center';
    placeholder.style.zIndex = '10';
    placeholder.style.backdropFilter = 'blur(4px)';

    // 📷🚫 icon
    const icon = document.createElement('div');
    icon.innerHTML = '📷🚫';
    icon.style.fontSize = '36px';
    icon.style.marginBottom = '12px';

    // Message
    const message = document.createElement('div');
    message.textContent = 'Camera not accessible. Please check that it is connected, turned on, and permissions are granted.';
    message.style.marginBottom = '16px';

    // Retry button
    const retryBtn = document.createElement('button');
    retryBtn.textContent = 'Retry';
    retryBtn.style.padding = '8px 16px';
    retryBtn.style.fontSize = '14px';
    retryBtn.style.backgroundColor = '#3498db'; // Bootstrap info color
    retryBtn.style.color = '#fff';
    retryBtn.style.border = 'none';
    retryBtn.style.borderRadius = '6px';
    retryBtn.style.cursor = 'pointer';

    retryBtn.addEventListener('click', async () => {
      // Remove placeholder
      placeholder.remove();

      // Re-attempt to load camera
      if (selectedFeed && selectedFeed.type === 'camera') {
        try {
          await startCameraStream();
        } catch (e) {
          // If error again, show placeholder again
          showCameraDisabledPlaceholder();
          if (window.toast) window.toast.error('Retry failed: Camera not accessible.');
        }
      }
    });

    // Append to placeholder
    placeholder.appendChild(icon);
    placeholder.appendChild(message);
    placeholder.appendChild(retryBtn);

    // Append to video container
    videoContainer.style.position = 'relative';
    videoContainer.appendChild(placeholder);
  }
}

function removeCameraDisabledPlaceholder() {
  const placeholder = document.getElementById('cameraDisabledPlaceholder');
  if (placeholder) {
    placeholder.remove();
  }
}

function showPreviewDisabledMessage() {
  const videoContainer = document.getElementById('videoContainer');
  if (!videoContainer) return;
  
  // Check if message already exists
  let messageDiv = document.getElementById('previewDisabledMessage');
  if (!messageDiv) {
    messageDiv = document.createElement('div');
    messageDiv.id = 'previewDisabledMessage';

    // Styling for the overlay box
    messageDiv.style.position = 'absolute';
    messageDiv.style.top = '50%';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translate(-50%, -50%)';
    messageDiv.style.width = '60%';
    messageDiv.style.maxWidth = '500px';
    messageDiv.style.padding = '20px 30px';
    messageDiv.style.backgroundColor = 'rgba(15, 14, 14, 0.7)';
    messageDiv.style.color = '#fff';
    messageDiv.style.borderRadius = '16px';
    messageDiv.style.boxShadow = '0 0 8px #858888ff, 0 0 20px rgba(124, 131, 132, 0.5)';
    messageDiv.style.display = 'flex';
    messageDiv.style.flexDirection = 'column';
    messageDiv.style.alignItems = 'center';
    messageDiv.style.fontSize = '16px';
    messageDiv.style.textAlign = 'center';
    messageDiv.style.zIndex = '10';
    messageDiv.style.backdropFilter = 'blur(4px)';
    // messageDiv.style.cursor = 'pointer';

    // 👁️ icon
    const icon = document.createElement('div');
    icon.innerHTML = '👁️';
    icon.style.fontSize = '36px';
    icon.style.marginBottom = '12px';

    // Message
    const message = document.createElement('div');
    message.textContent = 'Preview Disabled';
    message.style.marginBottom = '16px';

    // Append to messageDiv
    messageDiv.appendChild(icon);
    messageDiv.appendChild(message);

    // Click to toggle preview
    // messageDiv.addEventListener('click', () => {
    //   toggleCameraPreview();
    // });

    // Append to video container
    videoContainer.style.position = 'none';
    videoContainer.appendChild(messageDiv);
  }
}

function removePreviewDisabledMessage() {
  const messageDiv = document.getElementById('previewDisabledMessage');
  if (messageDiv) {
    messageDiv.remove();
  }
}

// Camera preview toggle functions
function toggleCameraPreview() {
  if (!selectedFeed || selectedFeed.type !== 'camera') {
    return;
  }

  if (cameraPreviewActive) {
    stopCameraPreview();
  } else {
    startCameraPreview();
  }
}

async function startCameraPreview() {
  try {
    if (!cameraStream) {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 360 }
      });
    }

    video.srcObject = cameraStream;
    video.play();

    // Remove placeholder if it exists
    removeCameraDisabledPlaceholder();
    removePreviewDisabledMessage();

    video.style.display = 'block';

    cameraPreviewActive = true;
    updateEyeButton();
  } catch (error) {
    if (window.toast) window.toast.error('Cannot access camera: ' + error.message); else alert('Cannot access camera: ' + error.message);
    // Handle camera disabled or error by showing placeholder or message
    showCameraDisabledPlaceholder();
  }
}

function stopCameraPreview() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }

  video.pause();
  video.srcObject = null;

  cameraPreviewActive = false;
  updateEyeButton();
  showPreviewDisabledMessage();
  video.style.display = 'none';
  // Keep screen blank
}

function updateEyeButton() {
  const eyeBtn = document.getElementById('eyeBtn');
  if (eyeBtn) {
    if (cameraPreviewActive) {
      eyeBtn.textContent = '👁️ Camera Preview: ON';
      eyeBtn.className = 'btn btn-outline-success btn-sm';
    } else {
      eyeBtn.textContent = '👁️ Camera Preview: OFF';
      eyeBtn.className = 'btn btn-outline-danger btn-sm';
    }
  }
}
