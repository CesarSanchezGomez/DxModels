// app/static/js/app.js
// Utilidades comunes para toda la aplicación

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
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

// ==========================================
// LOADER
// ==========================================
function showLoader() {
    document.getElementById('loader').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}

// ==========================================
// API HELPERS
// ==========================================
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

// ==========================================
// FILE UTILITIES
// ==========================================

/**
 * Descarga un archivo con el contenido proporcionado
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

// ==========================================
// CLIPBOARD UTILITIES
// ==========================================
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copiado al portapapeles', 'success');
    } catch (err) {
        showToast('Error al copiar', 'error');
    }
}

