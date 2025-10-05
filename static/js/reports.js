// Reports tab logic

function loadReports() {
  fetch('/api/feeds', { credentials: 'include' })
    .then(response => response.json())
    .then(feeds => {
      const reportsList = document.getElementById('reportsList');
      reportsList.innerHTML = '';
      if (feeds.length === 0) {
        reportsList.innerHTML = '<li class="list-group-item">No feeds available.</li>';
        return;
      }
      feeds.forEach(feed => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `
          <span>${feed.name} (${feed.type})</span>
          <div>
            <a href="/api/${feed.id}/report" class="btn btn-sm btn-outline-primary me-2" target="_blank">View Report</a>
            <a href="/api/${feed.id}/download_report" class="btn btn-sm btn-outline-success">Download PDF</a>
          </div>
        `;
        reportsList.appendChild(li);
      });
    })
    .catch(error => {
      console.error('Error loading reports:', error);
      const reportsList = document.getElementById('reportsList');
      reportsList.innerHTML = '<li class="list-group-item text-danger">Error loading feeds.</li>';
    });
}

// Load reports on page load
document.addEventListener('DOMContentLoaded', loadReports);

// Also reload when reports tab is activated (in case feeds change)
document.addEventListener('DOMContentLoaded', () => {
  const reportsTab = document.querySelector('[data-tab="reports"]');
  if (reportsTab) {
    reportsTab.addEventListener('click', loadReports);
  }
});
