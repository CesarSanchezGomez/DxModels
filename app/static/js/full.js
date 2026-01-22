// static/js/full.js
let paisesData = {};
let idiomasData = {};
let selectedPaises = [];
let selectedIdiomas = [];
let files = {
    cdm: null,
    csf_cdm: null,
    sdm: null,
    csf_sdm: null
};

// Validadores de tipo de XML
const XML_VALIDATORS = {
    cdm: (content) =>
        content.includes('<corporate-data-model'),

    sdm: (content) =>
        content.includes('<succession-data-model'),

    csf_cdm: (content) =>
        content.includes('<country-specific-fields')
        && content.includes('<hris-element')
        && !content.includes('<format-group'),

    csf_sdm: (content) =>
        content.includes('<country-specific-fields')
        && content.includes('<format-group')
};

const XML_NAMES = {
    cdm: 'Corporate Data Model',
    csf_cdm: 'CSF Corporate Data Model',
    sdm: 'Succession Data Model',
    csf_sdm: 'CSF Succession Data Model'
};

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupEventListeners();
});

async function loadData() {
    try {
        const [paisesRes, idiomasRes] = await Promise.all([
            fetchAPI('/api/countries'),
            fetchAPI('/api/languages')
        ]);

        paisesData = paisesRes.data;
        idiomasData = idiomasRes.data;
    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

function setupEventListeners() {
    // Botones de selección
    document.getElementById('btn-select-paises').addEventListener('click', () => {
        openModal('paises', 'Seleccionar Países', paisesData);
    });

    document.getElementById('btn-select-idiomas').addEventListener('click', () => {
        openModal('idiomas', 'Seleccionar Idiomas', idiomasData);
    });

    // Archivos con validación optimizada
    ['cdm', 'csf-cdm', 'sdm', 'csf-sdm'].forEach(type => {
        const fileInput = document.getElementById(`file-${type}`);
        const status = document.getElementById(`status-${type}`);
        const key = type.replace('-', '_');

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

                // Mostrar feedback inmediato
                status.textContent = `Cargando... (${sizeMB} MB)`;
                status.classList.remove('loaded', 'error');

                try {
                    // Mostrar loader global para archivos grandes
                    if (file.size > 3 * 1024 * 1024) { // > 3MB
                        showLoader();
                    }

                    const content = await readFile(file);

                    if (file.size > 3 * 1024 * 1024) {
                        hideLoader();
                    }

                    // Validar solo primeros 50KB para performance
                    const preview = content.substring(0, 50000);
                    if (!validateXMLType(preview, key)) {
                        // XML incorrecto
                        fileInput.value = '';
                        files[key] = null;
                        status.textContent = '✗ Tipo incorrecto';
                        status.classList.add('error');

                        showToast(
                            `El archivo no corresponde a ${XML_NAMES[key]}`,
                            'error'
                        );
                        addLog(`✗ Error: ${file.name} no es un ${XML_NAMES[key]}`);
                        return;
                    }

                    // XML correcto
                    files[key] = content;
                    status.textContent = `✓ ${file.name} (${sizeMB} MB)`;
                    status.classList.add('loaded');
                    addLog(`✓ Archivo ${type.toUpperCase()} cargado: ${file.name} (${sizeMB} MB)`);
                    showToast('Archivo cargado correctamente', 'success');

                } catch (error) {
                    if (file.size > 3 * 1024 * 1024) {
                        hideLoader();
                    }

                    fileInput.value = '';
                    files[key] = null;
                    status.textContent = '✗ Error al leer';
                    status.classList.add('error');
                    showToast('Error al leer el archivo', 'error');
                    addLog(`✗ Error leyendo archivo: ${error.message}`);
                }
            }
        });
    });

    // Procesar
    document.getElementById('btn-procesar-completo').addEventListener('click', procesarCompleto);

    // Limpiar
    document.getElementById('btn-limpiar-completo').addEventListener('click', limpiarTodo);

    // Modal
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-confirm').addEventListener('click', confirmModal);

    // Click fuera del modal
    document.getElementById('modal-selector').addEventListener('click', (e) => {
        if (e.target.id === 'modal-selector') {
            closeModal();
        }
    });
}

// Validar tipo de XML
function validateXMLType(content, type) {
    const validator = XML_VALIDATORS[type];
    if (!validator) return false;
    return validator(content);
}

// Modal
let currentModalType = '';

function openModal(type, title, data) {
    currentModalType = type;
    const modal = document.getElementById('modal-selector');
    const modalTitle = document.getElementById('modal-title');
    const modalOptions = document.getElementById('modal-options');
    const searchInput = document.getElementById('modal-search');

    modalTitle.textContent = title;
    searchInput.value = '';

    renderModalOptions(data, type);

    // Setup search
    searchInput.oninput = (e) => {
        const query = e.target.value.toLowerCase();
        const items = modalOptions.querySelectorAll('.checkbox-item');

        items.forEach(item => {
            const name = item.dataset.name;
            item.style.display = name.includes(query) ? 'flex' : 'none';
        });
    };

    modal.classList.add('active');
}

function renderModalOptions(data, type) {
    const container = document.getElementById('modal-options');
    const items = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));
    const selected = type === 'paises' ? selectedPaises : selectedIdiomas;

    container.innerHTML = '';

    items.forEach(([name, code]) => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        div.dataset.name = name.toLowerCase();

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `modal-${code}`;
        checkbox.value = code;
        checkbox.checked = selected.includes(code);

        const label = document.createElement('label');
        label.htmlFor = `modal-${code}`;
        label.textContent = name;

        div.appendChild(checkbox);
        div.appendChild(label);
        container.appendChild(div);
    });
}

function closeModal() {
    document.getElementById('modal-selector').classList.remove('active');
}

function confirmModal() {
    const checkboxes = document.querySelectorAll('#modal-options input:checked');
    const values = Array.from(checkboxes).map(cb => cb.value);

    if (values.length === 0) {
        showToast('Selecciona al menos un elemento', 'error');
        return;
    }

    if (currentModalType === 'paises') {
        selectedPaises = values;
        document.getElementById('paises-count').textContent = `${values.length} seleccionados`;
    } else {
        selectedIdiomas = values;
        document.getElementById('idiomas-count').textContent = `${values.length} seleccionados`;
    }

    closeModal();
    showToast(`${values.length} elementos seleccionados`, 'success');
}

// Procesar completo - UPDATED FOR ENGLISH API
async function procesarCompleto() {
    if (selectedIdiomas.length === 0) {
        showToast('Selecciona al menos un idioma', 'error');
        return;
    }

    const hasCSF = files.csf_cdm || files.csf_sdm;
    if (hasCSF && selectedPaises.length === 0) {
        showToast('Selecciona al menos un país para archivos CSF', 'error');
        return;
    }

    const hasAnyFile = Object.values(files).some(f => f !== null);
    if (!hasAnyFile) {
        showToast('Carga al menos un archivo XML', 'error');
        return;
    }

    showLoader();
    addLog('Iniciando procesamiento...');

    try {
        const formData = {
            cdm_xml: files.cdm,
            csf_cdm_xml: files.csf_cdm,
            sdm_xml: files.sdm,
            csf_sdm_xml: files.csf_sdm,
            paises: selectedPaises,
            idiomas: selectedIdiomas
        };

        addLog('Enviando datos al servidor...');

        const response = await fetch('/api/process/full', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error en el procesamiento');
        }

        addLog('Generando archivo ZIP...');

        // Descargar ZIP
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data_models_depurados.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addLog('✓ Procesamiento completado');
        addLog('✓ Archivo ZIP descargado');
        showToast('Procesamiento completado', 'success');

    } catch (error) {
        addLog(`✗ Error: ${error.message}`);
        showToast('Error al procesar XML', 'error');
    } finally {
        hideLoader();
    }
}

// Limpiar todo
function limpiarTodo() {
    // Verificar si hay algo que limpiar
    const hasFiles = Object.values(files).some(f => f !== null);
    const hasSelection = selectedPaises.length > 0 || selectedIdiomas.length > 0;
    const hasLog = document.getElementById('log-output').innerHTML.trim() !== '';

    if (!hasFiles && !hasSelection && !hasLog) {
        showToast('No hay nada que limpiar', 'error');
        return;
    }

    files = {
        cdm: null,
        csf_cdm: null,
        sdm: null,
        csf_sdm: null
    };

    selectedPaises = [];
    selectedIdiomas = [];

    document.getElementById('paises-count').textContent = '0 seleccionados';
    document.getElementById('idiomas-count').textContent = '0 seleccionados';

    ['cdm', 'csf-cdm', 'sdm', 'csf-sdm'].forEach(type => {
        const fileInput = document.getElementById(`file-${type}`);
        const status = document.getElementById(`status-${type}`);

        fileInput.value = '';
        status.textContent = 'No cargado';
        status.classList.remove('loaded');
        status.classList.remove('error');
    });

    document.getElementById('log-output').innerHTML = '';

    showToast('Formulario limpiado', 'success');
}

// Log
function addLog(message) {
    const log = document.getElementById('log-output');
    const timestamp = new Date().toLocaleTimeString();
    log.innerHTML += `[${timestamp}] ${message}\n`;
    log.scrollTop = log.scrollHeight;
}