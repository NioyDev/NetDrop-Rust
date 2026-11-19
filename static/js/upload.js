/**
 * @fileoverview Lógica de la Página de Subida de Archivos (SkillNexthezia / Mobile-First)
 * Manejo de Drag & Drop, selección táctil de archivos y subida por fragmentos (chunked upload).
 */

(function () {
    'use strict';

    /**
     * Formatea un tamaño numérico en bytes a cadena legible.
     * @param {number} bytes 
     * @returns {string}
     */
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }

    /**
     * Inicializa los componentes de la vista de subida.
     */
    function initUpload() {
        const fileInput = document.getElementById('UPFile');
        const dropZone = document.getElementById('DropZone');
        const form = document.getElementById('UploadForm');
        if (!fileInput || !dropZone || !form) return;

        setupDropZoneEvents(dropZone, fileInput);
        form.addEventListener('submit', handleFormSubmit);
    }

    /**
     * Configura los eventos táctiles y de arrastre para la zona de archivo.
     * @param {HTMLElement} dropZone 
     * @param {HTMLInputElement} fileInput 
     */
    function setupDropZoneEvents(dropZone, fileInput) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => {
            dropZone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(name => {
            dropZone.addEventListener(name, () => dropZone.classList.add('drag-active'));
        });

        ['dragleave', 'drop'].forEach(name => {
            dropZone.addEventListener(name, () => dropZone.classList.remove('drag-active'));
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer ? e.dataTransfer.files : null;
            if (files && files.length > 0) {
                fileInput.files = files;
                updateFileBadge(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                updateFileBadge(e.target.files[0]);
            }
        });
    }

    /**
     * Actualiza la interfaz tras seleccionar un archivo válido.
     * @param {File} file 
     */
    function updateFileBadge(file) {
        const dropZone = document.getElementById('DropZone');
        const dropTitle = document.getElementById('DropTitle');
        const dropSubtitle = document.getElementById('DropSubtitle');
        const badge = document.getElementById('FileInfoBadge');
        const submitBtn = document.getElementById('SubmitBtn');

        if (dropTitle) dropTitle.textContent = file.name;
        if (dropSubtitle) dropSubtitle.textContent = 'Pulsa o arrastra otro archivo para cambiarlo';
        if (badge) {
            badge.textContent = formatFileSize(file.size);
            badge.style.display = 'inline-block';
        }
        if (dropZone) dropZone.classList.add('has-file');
        if (submitBtn) submitBtn.disabled = false;
    }

    /**
     * Intercepta el envío del formulario para realizar la subida por fragmentos.
     * @param {Event} event 
     */
    async function handleFormSubmit(event) {
        const fileInput = document.getElementById('UPFile');
        const submitBtn = document.getElementById('SubmitBtn');
        const file = fileInput ? fileInput.files[0] : null;

        if (!file || !window.fetch || !file.slice) return;
        event.preventDefault();

        const progressSection = document.getElementById('ProgressSection');
        const progressFill = document.getElementById('ProgressBarFill');
        const statusText = document.getElementById('UploadStatus');
        const percentText = document.getElementById('UploadPercentage');

        const chunkSize = 2 * 1024 * 1024; // 2MB por chunk
        const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
        const uploadId = window.crypto && window.crypto.randomUUID
            ? window.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        if (submitBtn) submitBtn.disabled = true;
        if (progressSection) progressSection.style.display = 'block';
        if (progressFill) progressFill.style.transform = 'scaleX(0)';
        if (statusText) statusText.textContent = 'Subiendo...';
        if (percentText) percentText.textContent = '0%';

        try {
            await uploadFileChunks(file, uploadId, chunkSize, totalChunks, {
                progressFill,
                statusText,
                percentText
            });

            if (statusText) statusText.textContent = '✓ Archivo subido con éxito';
            if (window.showToast) window.showToast('✓ Subida completada');
            setTimeout(() => {
                window.location.href = '/';
            }, 350);
        } catch (error) {
            handleUploadError(error, statusText, submitBtn);
        }
    }

    /**
     * Itera los fragmentos secuencialmente y los envía al backend.
     * @param {File} file 
     * @param {string} uploadId 
     * @param {number} chunkSize 
     * @param {number} totalChunks 
     * @param {object} uiElements 
     */
    async function uploadFileChunks(file, uploadId, chunkSize, totalChunks, uiElements) {
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            let chunkBlob = file.slice(start, end);
            const formData = new FormData();

            formData.append('file_chunk', chunkBlob, file.name);
            formData.append('filename', file.name);
            formData.append('upload_id', uploadId);
            formData.append('chunk_index', String(chunkIndex));
            formData.append('total_chunks', String(totalChunks));
            formData.append('total_size', String(file.size));

            const response = await fetch('/upload-chunk', {
                method: 'POST',
                body: formData
            });

            chunkBlob = null; // Liberación de memoria para teléfonos
            const text = await response.text();
            const result = text ? JSON.parse(text) : {};
            if (!response.ok || !result.ok) {
                throw new Error(result.error || 'Error al enviar fragmento');
            }

            const percent = Math.round(((chunkIndex + 1) / totalChunks) * 100);
            if (uiElements.progressFill) uiElements.progressFill.style.transform = `scaleX(${percent / 100})`;
            if (uiElements.percentText) uiElements.percentText.textContent = percent + '%';
            if (uiElements.statusText) uiElements.statusText.textContent = `Enviando (${chunkIndex + 1}/${totalChunks})...`;

            await new Promise(resolve => setTimeout(resolve, 20));
        }
    }

    /**
     * Gestiona y presenta errores durante la subida.
     * @param {Error} error 
     * @param {HTMLElement} statusText 
     * @param {HTMLElement} submitBtn 
     */
    function handleUploadError(error, statusText, submitBtn) {
        const msg = error.message.includes('Quota') || error.message.includes('Memory')
            ? 'Memoria del navegador llena. Cierra otras pestañas e intenta de nuevo.'
            : error.message;

        if (statusText) statusText.textContent = msg;
        if (submitBtn) submitBtn.disabled = false;
        if (window.showToast) window.showToast('Error: ' + msg);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUpload);
    } else {
        initUpload();
    }
})();
