// Toast notification system
class ToastManager {
    constructor() {
        this.container = null;
        // Init on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container position-fixed top-0 end-0 p-3';
            this.container.style.zIndex = '9999';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    show(message, type = 'info', duration = 4000) {
        const toastElement = document.createElement('div');
        toastElement.className = `toast align-items-center text-white bg-${type} border-2 custom-toast`;
        toastElement.setAttribute('role', 'alert');
        toastElement.setAttribute('aria-live', 'assertive');
        toastElement.setAttribute('aria-atomic', 'true');

        toastElement.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        this.container.appendChild(toastElement);

        const bsToast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: duration
        });
        bsToast.show();

        // Remove from DOM after hide
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    success(message, duration = 4000) {
        this.show(message, 'success', duration);
    }

    error(message, duration = 4000) {
        this.show(message, 'danger', duration);
    }

    warning(message, duration = 4000) {
        this.show(message, 'warning', duration);
    }

    info(message, duration = 4000) {
        this.show(message, 'info', duration);
    }
}

// Global toast manager instance
const toast = new ToastManager();
window.toast = toast;

// Function to show toast based on category
function showToast(category, message) {
    const type = category === 'success' ? 'success' :
                 category === 'error' || category === 'danger' ? 'error' :
                 category === 'warning' ? 'warning' : 'info';
    if (toast) {
        toast[type](message);
    }
}

// Function to show flashed messages as toasts
function showFlashedMessages(messages) {
    messages.forEach(([category, message]) => {
        const type = category === 'success' ? 'success' :
                     category === 'error' || category === 'danger' ? 'error' :
                     category === 'warning' ? 'warning' : 'info';
        toast[type](message);
    });
}
