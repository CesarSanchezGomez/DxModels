// =======================================================
// INDIVIDUAL.JS – Selección unificada con modal (FINAL)
// =======================================================

// ===============================
// STATE
// ===============================
let paisesData = {};
let idiomasData = {};
let selectedPaises = [];
let selectedIdiomas = [];
let xmlContent = '';
let currentModalType = '';

// CodeMirror
let inputEditor = null;
let outputEditor = null;

// ===============================
// VALIDATORS
// ===============================
const XML_VALIDATORS = {
    cdm: (c) => c.includes('<corporate-data-model'),
    sdm: (c) => c.includes('<succession-data-model'),
    csf_cdm: (c) =>
        c.includes('<country-specific-fields') &&
        c.includes('<hris-element') &&
        !c.includes('<format-group'),
    csf_sdm: (c) =>
        c.includes('<country-specific-fields') &&
        c.includes('<format-group')
};

const XML_NAMES = {
    cdm: 'Corporate Data Model',
    sdm: 'Succession Data Model',
    csf_cdm: 'CSF Corporate Data Model',
    csf_sdm: 'CSF Succession Data Model'
};

// ===============================
// INIT
// ===============================
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    initializeEditors();
    setupEventListeners();
});

// ===============================
// DATA
// ===============================
async function loadData() {
    try {
        if (requireCountries) {
            const p = await fetchAPI('/api/paises');
            paisesData = p.data;
        }

        const i = await fetchAPI('/api/idiomas');
        idiomasData = i.data;

    } catch (e) {
        console.error('Error cargando datos:', e);
    }
}

// ===============================
// EDITORS
// ===============================
function initializeEditors() {
    const baseConfig = {
        mode: 'xml',
        theme: 'monokai',
        lineNumbers: true,
        readOnly: true,
        lineWrapping: true,
        viewportMargin: 50
    };

    inputEditor = CodeMirror.fromTextArea(
        document.getElementById('xml-input'),
        baseConfig
    );

    outputEditor = CodeMirror.fromTextArea(
        document.getElementById('xml-output'),
        baseConfig
    );
}

// ===============================
// EVENT LISTENERS
// ===============================
function setupEventListeners() {

    // Países
    if (requireCountries) {
        document.getElementById('btn-select-paises')
            .addEventListener('click', () =>
                openModal('paises', 'Seleccionar Países', paisesData)
            );
    }

    // Idiomas
    document.getElementById('btn-select-idiomas')
        .addEventListener('click', () =>
            openModal('idiomas', 'Seleccionar Idiomas', idiomasData)
        );

    // Modal
    document.getElementById('modal-close').onclick = closeModal;
    document.getElementById('modal-cancel').onclick = closeModal;
    document.getElementById('modal-confirm').onclick = confirmModal;

    // Archivo
    setupFileInput();

    // Botones
    document.getElementById('btn-procesar').onclick = procesarXML;
    document.getElementById('btn-limpiar').onclick = limpiar;

    document.getElementById('btn-copy-input').onclick = () =>
        xmlContent && copyToClipboard(xmlContent);

    document.getElementById('btn-copy-output').onclick = () =>
        outputEditor.getValue() && copyToClipboard(outputEditor.getValue());

    document.getElementById('btn-download').onclick = () =>
        outputEditor.getValue() &&
        downloadFile(outputEditor.getValue(), `${dataModel}_depurado.xml`);
}

// ===============================
// FILE INPUT
// ===============================
function setupFileInput() {
    const input = document.getElementById('xml-file');
    const label = document.getElementById('file-name');

    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        label.textContent = 'Cargando archivo...';
        showLoader();

        try {
            const content = await readFile(file);

            if (!validateXML(content)) {
                throw new Error(`El archivo no corresponde a ${XML_NAMES[dataModel]}`);
            }

            xmlContent = content;
            label.textContent = `✓ ${file.name}`;
            label.style.color = 'var(--color-success)';

            document.getElementById('editor-section').style.display = 'block';
            inputEditor.setValue(content);

            showToast('Archivo cargado correctamente', 'success');

        } catch (err) {
            resetFileInput(label, input, err.message);
        } finally {
            hideLoader();
        }
    });
}

function validateXML(content) {
    const validator = XML_VALIDATORS[dataModel];
    return validator ? validator(content.substring(0, 50000)) : true;
}

function resetFileInput(label, input, message) {
    xmlContent = '';
    input.value = '';
    label.textContent = message;
    label.style.color = 'var(--color-error)';
    inputEditor.setValue('');
    document.getElementById('editor-section').style.display = 'none';
    showToast(message, 'error');
}

// ===============================
// MODAL
// ===============================
function openModal(type, title, data) {
    currentModalType = type;

    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-search').value = '';

    renderModalOptions(data, type);
    document.getElementById('modal-selector').classList.add('active');
}

function renderModalOptions(data, type) {
    const container = document.getElementById('modal-options');
    const selected = type === 'paises' ? selectedPaises : selectedIdiomas;

    container.innerHTML = '';

    Object.entries(data)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([name, code]) => {

            const row = document.createElement('div');
            row.className = 'checkbox-item';
            row.dataset.name = name.toLowerCase();

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = code;
            cb.checked = selected.includes(code);

            const label = document.createElement('label');
            label.textContent = name;

            row.append(cb, label);
            container.appendChild(row);
        });

    // Search
    document.getElementById('modal-search').oninput = (e) => {
        const q = e.target.value.toLowerCase();
        container.querySelectorAll('.checkbox-item').forEach(item => {
            item.style.display = item.dataset.name.includes(q) ? 'flex' : 'none';
        });
    };
}

function confirmModal() {
    const values = [...document.querySelectorAll('#modal-options input:checked')]
        .map(cb => cb.value);

    if (!values.length) {
        showToast('Selecciona al menos un elemento', 'error');
        return;
    }

    if (currentModalType === 'paises') {
        selectedPaises = values;
        document.getElementById('paises-count').textContent =
            `${values.length} seleccionados`;
    } else {
        selectedIdiomas = values;
        document.getElementById('idiomas-count').textContent =
            `${values.length} seleccionados`;
    }

    closeModal();
    showToast(`${values.length} elementos seleccionados`, 'success');
}

function closeModal() {
    document.getElementById('modal-selector').classList.remove('active');
}

// ===============================
// PROCESSING
// ===============================
async function procesarXML() {

    if (!selectedIdiomas.length) {
        showToast('Selecciona al menos un idioma', 'error');
        return;
    }

    if (requireCountries && !selectedPaises.length) {
        showToast('Selecciona al menos un país', 'error');
        return;
    }

    if (!xmlContent) {
        showToast('Carga un archivo XML primero', 'error');
        return;
    }

    const endpoint =
        dataModel === 'cdm' || dataModel === 'sdm'
            ? `/api/procesar/${dataModel}`
            : '/api/procesar/csf';

    showLoader();

    try {
        const res = await fetchAPI(endpoint, {
            method: 'POST',
            body: JSON.stringify({
                xml_content: xmlContent,
                paises: selectedPaises,
                idiomas: selectedIdiomas
            })
        });

        outputEditor.setValue(res.resultado);
        showToast('Procesamiento completado', 'success');

    } catch (e) {
        showToast('Error al procesar XML', 'error');
        console.error(e);
    } finally {
        hideLoader();
    }
}

// ===============================
// CLEAN
// ===============================
function limpiar() {
    // Verificar si hay algo que limpiar
    const hasFile = xmlContent !== '';
    const hasSelection = selectedPaises.length > 0 || selectedIdiomas.length > 0;
    const hasOutput = outputEditor.getValue() !== '';

    if (!hasFile && !hasSelection && !hasOutput) {
        showToast('No hay nada que limpiar', 'error');
        return;
    }

    xmlContent = '';
    selectedPaises = [];
    selectedIdiomas = [];

    document.getElementById('xml-file').value = '';
    document.getElementById('file-name').textContent = 'Ningún archivo seleccionado';
    document.getElementById('file-name').style.color = '';

    document.getElementById('editor-section').style.display = 'none';
    inputEditor.setValue('');
    outputEditor.setValue('');

    if (requireCountries)
        document.getElementById('paises-count').textContent = '0 seleccionados';

    document.getElementById('idiomas-count').textContent = '0 seleccionados';

    showToast('Formulario limpiado', 'success');
}