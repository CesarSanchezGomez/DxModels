// static/js/app.js
// Toast Notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Loader
function showLoader() {
    document.getElementById('loader').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}

// Api Helpers
async function fetchAPI(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error en la petición');
        }

        return await response.json();
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    }
}

// File Utilities
/**
 * Descarga un archivo con el contenido y nombre especificados
 */
function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Lee un archivo de forma asíncrona por chunks
 * Evita bloquear la UI con archivos grandes
 */
function readFile(file) {
    return new Promise((resolve, reject) => {
        const chunkSize = 1024 * 1024; // 1MB por chunk
        const chunks = [];
        let offset = 0;

        const reader = new FileReader();

        reader.onload = (e) => {
            chunks.push(e.target.result);
            offset += chunkSize;

            if (offset < file.size) {
                // Leer siguiente chunk de forma asíncrona
                setTimeout(() => readNextChunk(), 0);
            } else {
                // Archivo completo leído
                resolve(chunks.join(''));
            }
        };

        reader.onerror = () => reject(reader.error);

        const readNextChunk = () => {
            const slice = file.slice(offset, offset + chunkSize);
            reader.readAsText(slice);
        };

        // Iniciar lectura del primer chunk
        readNextChunk();
    });
}

// Clipboard Utility
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copiado al portapapeles', 'success');
    } catch (err) {
        showToast('Error al copiar', 'error');
    }
}

/**
 * Menú hamburguesa para vista móvil
 */
(function () {
    const btn = document.getElementById('hamburger-btn');
    const menu = document.getElementById('header-quicklinks');
    if (!btn || !menu) return;

    const MOBILE_BREAKPOINT = 980;

    function getFirstLink() {
        return menu.querySelector('a');
    }

    function positionMenuBelowButton() {
        try {
            const btnRect = btn.getBoundingClientRect();
            const headerEl = document.querySelector('.header');
            const headerRect = headerEl ? headerEl.getBoundingClientRect() : btnRect;

            let menuWidth = menu.offsetWidth || 220;
            const margin = 8;

            let left = Math.round(headerRect.right - menuWidth - margin);

            if (menuWidth + margin * 2 > window.innerWidth) {
                menuWidth = Math.max(120, window.innerWidth - margin * 2);
                menu.style.width = `${menuWidth}px`;
                left = margin;
            }

            if (left < margin) left = margin;
            if (left + menuWidth > window.innerWidth - margin) {
                left = Math.max(margin, window.innerWidth - menuWidth - margin);
            }

            const top = Math.round(headerRect.bottom + 6);
            menu.style.left = `${left}px`;
            menu.style.top = `${top}px`;
        } catch (e) {
        }
    }

    function clearMenuPosition() {
        menu.style.left = '';
        menu.style.top = '';
        menu.style.width = '';
    }

    function closeMenu() {
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        menu.classList.remove('open');

        const onTransitionEnd = (e) => {
            if (e.target !== menu) return;
            if (e.propertyName && (e.propertyName !== 'opacity' && e.propertyName !== 'transform')) return;
            clearMenuPosition();
            menu.removeEventListener('transitionend', onTransitionEnd);
        };

        menu.addEventListener('transitionend', onTransitionEnd);
        setTimeout(() => {
            if (!menu.classList.contains('open')) {
                try { clearMenuPosition(); } catch (e) { }
                menu.removeEventListener('transitionend', onTransitionEnd);
            }
        }, 300);

        try { btn.focus(); } catch (e) { /* noop */ }
    }

    function openMenu() {
        positionMenuBelowButton();
        menu.getBoundingClientRect();

        btn.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        menu.classList.add('open');

        const first = getFirstLink();
        if (first) {
            try { first.focus(); } catch (e) { /* noop */ }
        }
    }

    function toggleMenu() {
        if (menu.classList.contains('open')) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    document.addEventListener('click', (e) => {
        const target = e.target;
        if (!menu.contains(target) && !btn.contains(target)) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > MOBILE_BREAKPOINT) {
            menu.classList.remove('open');
            btn.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
            menu.style.maxHeight = '';
            menu.style.opacity = '';
            clearMenuPosition();
        } else {
            if (menu.classList.contains('open')) positionMenuBelowButton();
        }
    });

    window.addEventListener('scroll', () => {
        if (menu.classList.contains('open')) positionMenuBelowButton();
    }, { passive: true });
})();
