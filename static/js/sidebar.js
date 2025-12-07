let sidebarVisible = true;

function toggleSidebar() {
  const sidebar = document.querySelector('aside');
  const toggleBtn = document.getElementById('toggleSidebarBtn');

  if (sidebarVisible) {
    // Collapse sidebar
    sidebar.classList.add('collapsed');
    toggleBtn.className = 'btn btn-outline-light btn-sm';
  } else {
    // Expand sidebar
    sidebar.classList.remove('collapsed');
    toggleBtn.className = 'btn btn-outline-secondary btn-sm';
  }

  sidebarVisible = !sidebarVisible;

  // Update button title and icon accordingly
  if (toggleBtn) {
    toggleBtn.title = sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar';

  }
}

document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.getElementById('toggleSidebarBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleSidebar);
    toggleBtn.innerHTML = '◁';
    toggleBtn.title = 'Hide Sidebar';
  }

  // Function to update sidebar based on screen size
  const updateSidebar = () => {
    if (window.innerWidth < 981) {
      if (sidebarVisible) {
        toggleSidebar();
      }
    } else {
      if (!sidebarVisible) {
        toggleSidebar();
      }
    }
  };

  // Check on load
  updateSidebar();

  // Check on resize
  window.addEventListener('resize', updateSidebar, { passive: true });
});

// Expose globally if needed
window.toggleSidebar = toggleSidebar;
