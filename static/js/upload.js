/**
 * @fileoverview Lógica de la Página de Subida de Archivos (SkillNexthezia / Mobile-First)
 * Manejo de Drag & Drop, cola de subida múltiple en lote y subida por fragmentos (chunked upload).
 */

(function () {
    'use strict';

    let selectedFiles = [];

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

        const queueList = document.getElementById('UploadQueueList');
        if (queueList) {
            queueList.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action="remove-queued-file"]');
                if (!btn) return;
                const idx = parseInt(btn.getAttribute('data-idx'), 10);
                if (!isNaN(idx) && idx >= 0 && idx < selectedFiles.length) {
                    selectedFiles.splice(idx, 1);
                    handleFilesSelected(selectedFiles);
                }
            });
        }

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
            const files = e.dataTransfer ? Array.from(e.dataTransfer.files) : [];
            if (files.length > 0) {
                handleFilesSelected(files);
            }
        });

        fileInput.addEventListener('change', (e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            if (files.length > 0) {
                handleFilesSelected(files);
            }
        });
    }

    /**
     * Actualiza la interfaz y la cola tras seleccionar uno o varios archivos.
     * @param {File[]} files 
     */
    function handleFilesSelected(files) {
        selectedFiles = files;
        const dropZone = document.getElementById('DropZone');
        const dropTitle = document.getElementById('DropTitle');
        const dropSubtitle = document.getElementById('DropSubtitle');
        const badge = document.getElementById('FileInfoBadge');
        const submitBtn = document.getElementById('SubmitBtn');
        const queueContainer = document.getElementById('UploadQueueContainer');
        const queueList = document.getElementById('UploadQueueList');
        const queueTitle = document.getElementById('UploadQueueTitle');
        const queueTotal = document.getElementById('UploadQueueTotalSize');

        if (files.length === 0) {
            if (dropTitle) dropTitle.textContent = 'Arrastra archivos aquí';
            if (dropSubtitle) dropSubtitle.textContent = 'o pulsa para seleccionar fotos o documentos de tu dispositivo';
            if (badge) badge.style.display = 'none';
            if (queueContainer) queueContainer.style.display = 'none';
            if (submitBtn) {
                submitBtn.textContent = 'Enviar archivos';
                submitBtn.disabled = true;
            }
            if (dropZone) dropZone.classList.remove('has-file');
            return;
        }

        if (files.length === 1) {
            const f = files[0];
            if (dropTitle) dropTitle.textContent = f.name;
            if (dropSubtitle) dropSubtitle.textContent = 'Pulsa para cambiar de archivo';
            if (badge) {
                badge.textContent = formatFileSize(f.size);
                badge.style.display = 'inline-block';
            }
            if (queueContainer) queueContainer.style.display = 'none';
            if (submitBtn) {
                submitBtn.textContent = 'Enviar archivo';
                submitBtn.disabled = false;
            }
        } else {
            const totalBytes = files.reduce((acc, cur) => acc + cur.size, 0);
            if (dropTitle) dropTitle.textContent = `${files.length} archivos seleccionados`;
            if (dropSubtitle) dropSubtitle.textContent = 'Pulsa para seleccionar otros archivos';
            if (badge) badge.style.display = 'none';

            if (queueTitle) queueTitle.textContent = `Archivos seleccionados (${files.length})`;
            if (queueTotal) queueTotal.textContent = formatFileSize(totalBytes);
            if (queueList) {
                queueList.innerHTML = '';
                files.forEach((f, idx) => {
                    const row = document.createElement('div');
                    row.className = 'upload-queue-item';
                    row.id = `QueueItem_${idx}`;
                    row.innerHTML = `
                        <div class="upload-queue-item-info">
                            <span class="upload-queue-item-name" title="${f.name}">${f.name}</span>
                            <span class="upload-queue-item-meta">${formatFileSize(f.size)}</span>
                        </div>
                        <div class="upload-queue-actions">
                            <span class="upload-queue-item-status" id="QueueStatus_${idx}">En espera</span>
                            <button type="button" class="btn-remove-queue-item" data-action="remove-queued-file" data-idx="${idx}" aria-label="Quitar archivo">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    `;
                    queueList.appendChild(row);
                });
            }

            if (queueContainer) queueContainer.style.display = 'block';
            if (submitBtn) {
                submitBtn.textContent = `Enviar ${files.length} archivos`;
                submitBtn.disabled = false;
            }
        }

        if (dropZone) dropZone.classList.add('has-file');
    }

    /**
     * Intercepta el envío del formulario para realizar la subida por fragmentos.
     * @param {Event} event 
     */
    async function handleFormSubmit(event) {
        if (!selectedFiles || selectedFiles.length === 0) return;
        event.preventDefault();

        const submitBtn = document.getElementById('SubmitBtn');
        const progressSection = document.getElementById('ProgressSection');
        const progressFill = document.getElementById('ProgressBarFill');
        const statusText = document.getElementById('UploadStatus');
        const percentText = document.getElementById('UploadPercentage');

        if (submitBtn) submitBtn.disabled = true;
        if (progressSection) progressSection.style.display = 'block';

        const totalFiles = selectedFiles.length;

        try {
            for (let i = 0; i < totalFiles; i++) {
                const file = selectedFiles[i];
                const itemStatus = document.getElementById(`QueueStatus_${i}`);
                if (itemStatus) itemStatus.textContent = 'Subiendo...';

                await uploadSingleFile(file, {
                    fileIndex: i,
                    totalFiles: totalFiles,
                    progressFill,
                    statusText,
                    percentText,
                    itemStatus
                });

                if (itemStatus) {
                    itemStatus.textContent = '✓ Listo';
                    itemStatus.classList.add('done');
                }
            }

            if (statusText) statusText.textContent = '✓ Subida completada con éxito';
            if (window.showToast) window.showToast('✓ Todos los archivos subidos exitosamente');
            setTimeout(() => {
                window.location.href = '/';
            }, 450);
        } catch (error) {
            handleUploadError(error, statusText, submitBtn);
        }
    }

    /**
     * Sube un archivo por fragmentos de 2MB.
     * @param {File} file 
     * @param {object} ui 
     */
    async function uploadSingleFile(file, ui) {
        const chunkSize = 2 * 1024 * 1024;
        const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
        const uploadId = window.crypto && window.crypto.randomUUID
            ? window.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

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

            chunkBlob = null;
            const text = await response.text();
            const result = text ? JSON.parse(text) : {};
            if (!response.ok || !result.ok) {
                throw new Error(result.error || 'Error al enviar fragmento');
            }

            const chunkPercent = Math.round(((chunkIndex + 1) / totalChunks) * 100);
            const overallPercent = Math.round(
                ((ui.fileIndex + (chunkIndex + 1) / totalChunks) / ui.totalFiles) * 100
            );

            if (ui.progressFill) ui.progressFill.style.transform = `scaleX(${overallPercent / 100})`;
            if (ui.percentText) ui.percentText.textContent = overallPercent + '%';
            if (ui.statusText) {
                ui.statusText.textContent = ui.totalFiles > 1
                    ? `Subiendo ${ui.fileIndex + 1}/${ui.totalFiles}: ${file.name}`
                    : `Subiendo ${file.name} (${chunkPercent}%)...`;
            }
            if (ui.itemStatus) {
                ui.itemStatus.textContent = `${chunkPercent}%`;
            }

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
