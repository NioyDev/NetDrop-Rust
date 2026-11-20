/**
 * @fileoverview Lógica de la Página de Inicio (SkillNexthezia / Mobile-First)
 * Búsqueda reactiva con debounce, filtros por categoría, Bottom Sheet de eliminación,
 * previsualización de archivos, subida rápida por chunks, overlay global y gestos táctiles.
 */

(function () {
    'use strict';

    let currentDeleteFilename = '';
    let currentFilterType = 'all';
    let searchDebounceTimer = null;
    let isUploading = false;
    let dragCounter = 0;

    const PINNED_STORAGE_KEY = 'netdrop_pinned_files';

    /**
     * Obtiene la lista de nombres de archivos fijados desde localStorage.
     * @returns {string[]}
     */
    function getPinnedFiles() {
        try {
            const raw = localStorage.getItem(PINNED_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Guarda la lista de archivos fijados en localStorage.
     * @param {string[]} list 
     */
    function savePinnedFiles(list) {
        try {
            localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(list));
        } catch (e) {}
    }

    /**
     * Alterna el estado fijado de un archivo (Pin / Unpin).
     * @param {string} filename 
     * @param {HTMLElement} wrapper 
     */
    function togglePinFile(filename, wrapper) {
        let pinned = getPinnedFiles();
        const isPinned = pinned.includes(filename);

        if (isPinned) {
            pinned = pinned.filter(f => f !== filename);
            savePinnedFiles(pinned);
            wrapper.classList.remove('is-pinned');
            const pinLabel = wrapper.querySelector('.pin-label-text');
            if (pinLabel) pinLabel.textContent = 'Fijar';
            if (window.showToast) window.showToast(`Archivo "${filename}" desfijado`);
        } else {
            pinned.unshift(filename);
            savePinnedFiles(pinned);
            wrapper.classList.add('is-pinned');
            const pinLabel = wrapper.querySelector('.pin-label-text');
            if (pinLabel) pinLabel.textContent = 'Desfijar';
            if (window.showToast) window.showToast(`📌 Archivo "${filename}" fijado al inicio`);
        }

        reorderPinnedFiles();
    }

    /**
     * Reordena los elementos en el DOM para situar los archivos fijados al inicio.
     */
    function reorderPinnedFiles() {
        const listBody = document.getElementById('FileListBody');
        if (!listBody) return;
        const pinned = getPinnedFiles();
        const wrappers = Array.from(listBody.querySelectorAll('.file-item-wrapper'));

        wrappers.sort((a, b) => {
            const fileA = a.getAttribute('data-filename') || '';
            const fileB = b.getAttribute('data-filename') || '';
            const idxA = pinned.indexOf(fileA);
            const idxB = pinned.indexOf(fileB);

            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return 0;
        });

        wrappers.forEach(w => listBody.appendChild(w));
    }

    /**
     * Inicializa los estados visuales de los archivos fijados al arrancar la vista.
     */
    function initPinnedFiles() {
        const pinned = getPinnedFiles();
        const wrappers = document.querySelectorAll('.file-item-wrapper');
        wrappers.forEach(wrapper => {
            const filename = wrapper.getAttribute('data-filename');
            if (filename && pinned.includes(filename)) {
                wrapper.classList.add('is-pinned');
                const pinLabel = wrapper.querySelector('.pin-label-text');
                if (pinLabel) pinLabel.textContent = 'Desfijar';
            }
        });
        reorderPinnedFiles();
    }

    /**
     * Inicialización al cargar el DOM.
     */
    function initIndex() {
        setupSearchInput();
        setupQuickDropzone();
        setupGlobalDragOverlay();
        initPinnedFiles();
        setupTouchSwipeGestures();
        setupLiveSync();
        setupFab();
        document.addEventListener('click', handlePageClick);
        window.addEventListener('click', handleBackdropClick);
        window.addEventListener('keydown', handleKeydown);
    }

    /**
     * Configura el campo de búsqueda con debounce de 300ms.
     */
    function setupSearchInput() {
        const searchInput = document.getElementById('SearchInput');
        if (!searchInput) return;

        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(filterFiles, 300);
        });
    }

    /**
     * Filtra los archivos según el término de búsqueda y la categoría activa.
     */
    function filterFiles() {
        const searchInput = document.getElementById('SearchInput');
        const clearBtn = document.getElementById('ClearSearchBtn');
        const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const items = document.querySelectorAll('.file-item-wrapper, .file-item-card:not(.file-item-wrapper .file-item-card)');
        let visibleCount = 0;

        if (clearBtn) {
            clearBtn.style.display = query ? 'inline-flex' : 'none';
        }

        items.forEach(item => {
            const name = item.getAttribute('data-name') || '';
            const type = item.getAttribute('data-type') || '';
            const matchesQuery = !query || name.includes(query);
            const matchesCategory = checkCategoryMatch(type, currentFilterType);

            if (matchesQuery && matchesCategory) {
                item.style.display = 'block';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        const noResults = document.getElementById('NoSearchResults');
        if (noResults) {
            noResults.style.display = (visibleCount === 0 && items.length > 0) ? 'block' : 'none';
        }
    }

    /**
     * Comprueba si una extensión coincide con la categoría seleccionada.
     * @param {string} ext 
     * @param {string} category 
     * @returns {boolean}
     */
    function checkCategoryMatch(ext, category) {
        if (category === 'all') return true;
        if (category === 'image') return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'svg'].includes(ext);
        if (category === 'doc') return ['pdf', 'doc', 'docx', 'txt', 'md', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);
        if (category === 'media') return ['mp4', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'aac', 'opus', 'flac'].includes(ext);
        if (category === 'code') return ['py', 'js', 'html', 'css', 'json', 'java', 'c', 'cpp', 'sh', 'zip', 'rar'].includes(ext);
        return false;
    }

    /**
     * Limpia el buscador y restablece la lista.
     */
    function clearSearch() {
        const searchInput = document.getElementById('SearchInput');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        filterFiles();
    }

    /**
     * Cambia la categoría del filtro.
     * @param {string} category 
     * @param {HTMLElement} btn 
     */
    function setFilterCategory(category, btn) {
        currentFilterType = category;
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        if (btn) btn.classList.add('active');
        filterFiles();
    }

    /**
     * Abre el modal de vista previa según el tipo de archivo.
     * @param {string} filename 
     * @param {string} ext 
     */
    function openPreviewModal(filename, ext) {
        const modal = document.getElementById('previewModal');
        const title = document.getElementById('previewTitle');
        const body = document.getElementById('previewBody');
        const downloadBtn = document.getElementById('previewDownloadBtn');
        if (!modal || !body) return;

        title.textContent = filename;
        downloadBtn.href = `/descarga/${encodeURIComponent(filename)}`;
        body.innerHTML = '<div class="preview-loading">Cargando vista previa...</div>';
        modal.classList.add('active');
        document.body.classList.add('sheet-open');

        const fileUrl = `/archivo/${encodeURIComponent(filename)}`;
        renderPreviewContent(body, fileUrl, filename, ext);
    }

    /**
     * Genera el elemento de vista previa correspondiente al tipo MIME.
     * @param {HTMLElement} body 
     * @param {string} fileUrl 
     * @param {string} filename 
     * @param {string} ext 
     */
    function renderPreviewContent(body, fileUrl, filename, ext) {
        const imgExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'heif'];
        const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
        const audioExts = ['mp3', 'wav', 'aac', 'opus', 'flac', 'm4a'];
        const codeExts = ['txt', 'py', 'js', 'html', 'css', 'json', 'md', 'java', 'c', 'cpp', 'sh', 'sql', 'xml', 'yml', 'yaml', 'ini', 'log', 'env'];

        if (imgExts.includes(ext)) {
            body.innerHTML = `<div class="preview-media-container"><img src="${fileUrl}" alt="${filename}" class="preview-media-img" loading="lazy" /></div>`;
        } else if (videoExts.includes(ext)) {
            body.innerHTML = `<div class="preview-media-container"><video src="${fileUrl}" controls autoplay class="preview-media-video"></video></div>`;
        } else if (audioExts.includes(ext)) {
            body.innerHTML = `<div class="preview-audio-container"><audio src="${fileUrl}" controls autoplay class="preview-media-audio"></audio></div>`;
        } else if (codeExts.includes(ext) || ext === '') {
            loadCodePreview(body, fileUrl);
        } else {
            body.innerHTML = `
                <div class="preview-fallback">
                    <p>Vista previa en línea no disponible para archivos <strong>.${ext.toUpperCase()}</strong>.</p>
                    <p>Puedes descargarlo directamente a tu equipo o teléfono.</p>
                </div>
            `;
        }
    }

    /**
     * Carga y escapa el contenido de archivos de texto plano o código.
     * @param {HTMLElement} body 
     * @param {string} fileUrl 
     */
    function loadCodePreview(body, fileUrl) {
        fetch(fileUrl)
            .then(res => {
                if (!res.ok) throw new Error('No se pudo cargar el archivo');
                return res.text();
            })
            .then(text => {
                const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                body.innerHTML = `<pre class="preview-code-pre"><code class="preview-code-content">${escaped}</code></pre>`;
            })
            .catch(err => {
                body.innerHTML = `<p class="preview-error">Error al cargar contenido: ${err.message}</p>`;
            });
    }

    /**
     * Cierra el modal de vista previa.
     */
    function closePreviewModal() {
        const modal = document.getElementById('previewModal');
        const body = document.getElementById('previewBody');
        if (modal) modal.classList.remove('active');
        if (body) body.innerHTML = '';
        document.body.classList.remove('sheet-open');
    }

    /**
     * Abre el Bottom Sheet / Modal de confirmación de eliminación.
     * @param {string} filename 
     */
    function openDeleteSheet(filename) {
        currentDeleteFilename = filename;
        const modal = document.getElementById('deleteModal');
        const msg = document.getElementById('deleteModalMessage');
        if (msg) msg.textContent = `¿Deseas eliminar "${filename}" de la red local?`;
        if (modal) {
            modal.classList.add('active');
            document.body.classList.add('sheet-open');
        }
    }

    /**
     * Cierra el Bottom Sheet de eliminación.
     */
    function closeDeleteSheet() {
        currentDeleteFilename = '';
        const modal = document.getElementById('deleteModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.classList.remove('sheet-open');
        }
    }

    /**
     * Confirma la eliminación y redirige al endpoint seguro.
     */
    function confirmDeleteFile() {
        if (!currentDeleteFilename) return;
        window.location.href = '/eliminar/' + encodeURIComponent(currentDeleteFilename);
    }

    /**
     * Copia el enlace de descarga directa del archivo.
     * @param {string} filename 
     */
    function copyFileLink(filename) {
        const downloadUrl = `${window.location.origin}/descarga/${encodeURIComponent(filename)}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(downloadUrl).then(() => {
                if (window.showToast) window.showToast('✓ Enlace copiado al portapapeles');
            }).catch(() => {
                if (window.showToast) window.showToast('Enlace: ' + downloadUrl);
            });
            return;
        }
        if (window.showToast) window.showToast('Enlace: ' + downloadUrl);
    }

    /**
     * Configuración del Floating Action Button (FAB) para móviles.
     */
    function setupFab() {
        const fab = document.getElementById('FabUploadBtn');
        const fileInput = document.getElementById('QuickFileInput');
        if (!fab || !fileInput) return;

        fab.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.click();
        });
    }

    /**
     * Configura el overlay global para soltar archivos desde cualquier parte.
     */
    function setupGlobalDragOverlay() {
        const overlay = document.getElementById('GlobalDragOverlay');
        if (!overlay) return;

        window.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            overlay.classList.add('drag-active');
        });

        window.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter <= 0) {
                dragCounter = 0;
                overlay.classList.remove('drag-active');
            }
        });

        window.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        window.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            overlay.classList.remove('drag-active');
            const files = e.dataTransfer ? e.dataTransfer.files : null;
            if (files && files.length > 0) {
                handleQuickUpload(files[0]);
            }
        });
    }

    /**
     * Configura gestos táctiles y de arrastre horizontal en móviles (SkillNexthezia)
     * - Deslizar a la DERECHA: Eliminar archivo (Revela fondo rojo con icono de basura)
     * - Deslizar a la IZQUIERDA: Fijar archivo al inicio (Revela fondo ámbar con icono de pin)
     */
    function setupTouchSwipeGestures() {
        const wrappers = document.querySelectorAll('.file-item-wrapper[data-touch-swipe="true"]');

        wrappers.forEach(wrapper => {
            const card = wrapper.querySelector('.file-item-card');
            const deleteReveal = wrapper.querySelector('.swipe-reveal-delete');
            const pinReveal = wrapper.querySelector('.swipe-reveal-pin');
            if (!card || wrapper.dataset.swipeInitialized === 'true') return;
            wrapper.dataset.swipeInitialized = 'true';

            let startX = 0;
            let startY = 0;
            let deltaX = 0;
            let isSwiping = false;
            let pointerActive = false;

            const onStart = (clientX, clientY, target) => {
                if (target && target.closest('button, a, input, select, .file-actions-bar')) return false;
                startX = clientX;
                startY = clientY;
                deltaX = 0;
                isSwiping = false;
                pointerActive = true;
                return true;
            };

            const onMove = (clientX, clientY, cancelable, e) => {
                if (!pointerActive) return;
                const currentDeltaX = clientX - startX;
                const currentDeltaY = clientY - startY;

                if (!isSwiping) {
                    if (Math.abs(currentDeltaX) > 8 && Math.abs(currentDeltaX) > Math.abs(currentDeltaY)) {
                        isSwiping = true;
                    } else if (Math.abs(currentDeltaY) > 8) {
                        pointerActive = false;
                        return; // Scroll vertical natural
                    }
                }

                if (isSwiping) {
                    deltaX = currentDeltaX;
                    if (cancelable && e && e.cancelable) e.preventDefault();

                    card.style.transition = 'none';
                    card.style.transform = `translateX(${deltaX * 0.72}px)`;

                    if (deltaX > 0) {
                        // Deslizando a la DERECHA -> Revela acción BORRAR (a la izquierda)
                        if (deleteReveal) {
                            deleteReveal.style.opacity = String(Math.min(1, deltaX / 45));
                            deleteReveal.style.transform = deltaX >= 75 ? 'scale(1.08)' : 'scale(1)';
                        }
                        if (pinReveal) {
                            pinReveal.style.opacity = '0';
                        }
                    } else if (deltaX < 0) {
                        // Deslizando a la IZQUIERDA -> Revela acción FIJAR (a la derecha)
                        if (pinReveal) {
                            pinReveal.style.opacity = String(Math.min(1, Math.abs(deltaX) / 45));
                            pinReveal.style.transform = Math.abs(deltaX) >= 75 ? 'scale(1.08)' : 'scale(1)';
                        }
                        if (deleteReveal) {
                            deleteReveal.style.opacity = '0';
                        }
                    }
                }
            };

            const onEnd = () => {
                if (!pointerActive) return;
                pointerActive = false;

                if (!isSwiping) return;
                isSwiping = false;

                card.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
                card.style.transform = 'translateX(0)';

                setTimeout(() => {
                    if (deleteReveal) {
                        deleteReveal.style.opacity = '0';
                        deleteReveal.style.transform = 'scale(0.9)';
                    }
                    if (pinReveal) {
                        pinReveal.style.opacity = '0';
                        pinReveal.style.transform = 'scale(0.9)';
                    }
                }, 220);

                const filename = wrapper.getAttribute('data-filename') || card.getAttribute('data-filename');
                if (!filename) return;

                if (deltaX > 75) {
                    // Acción DERECHA: Borrar
                    openDeleteSheet(filename);
                } else if (deltaX < -75) {
                    // Acción IZQUIERDA: Fijar / Desfijar
                    togglePinFile(filename, wrapper);
                }
            };

            // Soporte Pointer Events (Touch, Mouse, Pen unificados)
            card.addEventListener('pointerdown', (e) => {
                if (onStart(e.clientX, e.clientY, e.target)) {
                    if (card.setPointerCapture) {
                        try { card.setPointerCapture(e.pointerId); } catch (_) {}
                    }
                }
            });

            card.addEventListener('pointermove', (e) => {
                onMove(e.clientX, e.clientY, true, e);
            });

            card.addEventListener('pointerup', (e) => {
                if (card.releasePointerCapture) {
                    try { card.releasePointerCapture(e.pointerId); } catch (_) {}
                }
                onEnd();
            });

            card.addEventListener('pointercancel', (e) => {
                if (card.releasePointerCapture) {
                    try { card.releasePointerCapture(e.pointerId); } catch (_) {}
                }
                onEnd();
            });

            // Fallback Touch Events
            card.addEventListener('touchstart', (e) => {
                const t = e.touches[0];
                if (t) onStart(t.clientX, t.clientY, e.target);
            }, { passive: true });

            card.addEventListener('touchmove', (e) => {
                const t = e.touches[0];
                if (t) onMove(t.clientX, t.clientY, true, e);
            }, { passive: false });

            card.addEventListener('touchend', onEnd);
            card.addEventListener('touchcancel', onEnd);
        });
    }

    /**
     * Configura la zona de arrastre y selección rápida.
     */
    function setupQuickDropzone() {
        const dropZone = document.getElementById('GlobalDropZone');
        const fileInput = document.getElementById('QuickFileInput');
        if (!dropZone || !fileInput) return;

        ['dragenter', 'dragover'].forEach(evt => {
            dropZone.addEventListener(evt, (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(evt => {
            dropZone.addEventListener(evt, (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
            });
        });

        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.click();
            }
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleQuickUpload(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleQuickUpload(e.target.files[0]);
            }
        });
    }

    /**
     * Sube un archivo en fragmentos (chunks) de 2MB para evitar saturar la memoria del teléfono.
     * @param {File} file 
     */
    async function handleQuickUpload(file) {
        if (!file || !window.fetch || !file.slice) return;

        isUploading = true;
        const progressSection = document.getElementById('QuickProgressSection');
        const progressBar = document.getElementById('QuickProgressBar');
        const progressLabel = document.getElementById('QuickProgressLabel');

        const chunkSize = 2 * 1024 * 1024;
        const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
        const uploadId = window.crypto && window.crypto.randomUUID
            ? window.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        if (progressSection) progressSection.style.display = 'block';
        if (progressBar) progressBar.style.transform = 'scaleX(0)';
        if (progressLabel) progressLabel.textContent = `Subiendo ${file.name}...`;

        try {
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

                chunkBlob = null; // Liberación de memoria inmediata
                const text = await response.text();
                const result = text ? JSON.parse(text) : {};
                if (!response.ok || !result.ok) {
                    throw new Error(result.error || 'Error al subir fragmento');
                }

                const percent = Math.round(((chunkIndex + 1) / totalChunks) * 100);
                if (progressBar) progressBar.style.transform = `scaleX(${percent / 100})`;
                if (progressLabel) progressLabel.textContent = `Subiendo ${file.name} (${percent}%)...`;

                // Pausa defensiva para permitir GC en dispositivos móviles
                await new Promise(resolve => setTimeout(resolve, 20));
            }

            if (progressLabel) progressLabel.textContent = '✓ Subida completada';
            if (window.showToast) window.showToast('✓ Archivo subido exitosamente');
            setTimeout(() => window.location.reload(), 400);
        } catch (error) {
            isUploading = false;
            const msg = error.message.includes('Memory') || error.message.includes('Quota')
                ? 'Memoria del móvil saturada. Cierra otras pestañas e intenta de nuevo.'
                : error.message;
            if (progressLabel) progressLabel.textContent = msg;
            if (window.showToast) window.showToast('Error: ' + msg);
        }
    }

    /**
     * Sincronización en vivo entre PC y móvil (Live Sync).
     */
    let lastSyncCount = null;
    let lastSyncMtime = null;

    function setupLiveSync() {
        setInterval(async () => {
            if (isUploading) return;
            try {
                const res = await fetch('/api/sync-status');
                if (!res.ok) return;
                const data = await res.json();

                if (lastSyncCount !== null && (data.count !== lastSyncCount || data.latest_mtime !== lastSyncMtime)) {
                    if (window.showToast) window.showToast('✓ Sincronizado: lista de archivos actualizada');
                    setTimeout(() => window.location.reload(), 450);
                }
                lastSyncCount = data.count;
                lastSyncMtime = data.latest_mtime;
            } catch (e) {}
        }, 2500);
    }

    /**
     * Delegador de clics en la página.
     * @param {MouseEvent} event 
     */
    function handlePageClick(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');
        if (action === 'preview') {
            event.preventDefault();
            const filename = target.getAttribute('data-filename') || '';
            const ext = target.getAttribute('data-type') || '';
            openPreviewModal(filename, ext);
        } else if (action === 'close-preview') {
            event.preventDefault();
            closePreviewModal();
        } else if (action === 'delete-file') {
            event.preventDefault();
            const filename = target.getAttribute('data-filename') || '';
            openDeleteSheet(filename);
        } else if (action === 'close-delete') {
            event.preventDefault();
            closeDeleteSheet();
        } else if (action === 'confirm-delete') {
            event.preventDefault();
            confirmDeleteFile();
        } else if (action === 'copy-link') {
            event.preventDefault();
            const filename = target.getAttribute('data-filename') || '';
            copyFileLink(filename);
        } else if (action === 'filter') {
            event.preventDefault();
            const category = target.getAttribute('data-category') || 'all';
            setFilterCategory(category, target);
        } else if (action === 'clear-search') {
            event.preventDefault();
            clearSearch();
        }
    }

    /**
     * Cierra modales al pulsar fuera del contenido.
     * @param {MouseEvent} event 
     */
    function handleBackdropClick(event) {
        const previewModal = document.getElementById('previewModal');
        const deleteModal = document.getElementById('deleteModal');
        if (event.target === previewModal) closePreviewModal();
        if (event.target === deleteModal) closeDeleteSheet();
    }

    /**
     * Cierra modales con tecla Escape.
     * @param {KeyboardEvent} event 
     */
    function handleKeydown(event) {
        if (event.key === 'Escape') {
            closePreviewModal();
            closeDeleteSheet();
        }
    }

    // Inicializar al cargar el script
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initIndex);
    } else {
        initIndex();
    }

    // Exponer para interacción unificada de cierre y gestos
    window.closePreviewModal = closePreviewModal;
    window.closeDeleteModal = closeDeleteSheet;
    window.togglePinFile = togglePinFile;
    window.reorderPinnedFiles = reorderPinnedFiles;
    window.getPinnedFiles = getPinnedFiles;
})();
