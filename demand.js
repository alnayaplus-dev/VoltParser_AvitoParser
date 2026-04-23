// demand.js – анализ спроса (открытие wordstat)

function showDemandModal() {
    const existingModal = document.getElementById("voltparser-modal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.id = "voltparser-modal";
    Object.assign(modal.style, {
        position: "fixed",
        top: "10%",
        left: "10%",
        width: "80%",
        maxWidth: "900px",
        height: "auto",
        maxHeight: "80%",
        background: "white",
        zIndex: "10000000000",
        borderRadius: "20px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif"
    });

    const header = document.createElement("div");
    header.style.cssText = "padding:15px 20px; background:#f5f5f5; border-bottom:1px solid #ddd; display:flex; justify-content:space-between; align-items:center;";
    header.innerHTML = `<h3 style="margin:0;">📈 Анализ спроса по фразам</h3><button id="closeModalBtn" style="background:none; border:none; font-size:20px; cursor:pointer;">✖</button>`;
    
    const content = document.createElement("div");
    content.style.cssText = "padding:20px; overflow-y:auto; flex:1;";
    
    const footer = document.createElement("div");
    footer.style.cssText = "padding:10px 20px; background:#f5f5f5; border-top:1px solid #ddd; text-align:right;";

    modal.appendChild(header);
    modal.appendChild(content);
    modal.appendChild(footer);
    document.body.appendChild(modal);

    document.getElementById("closeModalBtn").onclick = () => modal.remove();

    content.innerHTML = `
        <div style="margin-bottom:20px;">
            <label><strong>Шаг 1. Список фраз</strong></label><br>
            <textarea id="demandPhrasesInput" rows="5" style="width:100%; margin-top:5px; padding:8px; font-family:monospace;" placeholder="Введите фразы по одной на строку&#10;или загрузите CSV с колонкой 'phrase' / 'title'"></textarea>
            <div style="margin-top:15px;">
                <button id="loadPhrasesFromCsvBtn" class="demand-modal-btn" style="background:#2196F3;">📂 Загрузить CSV с фразами</button>
            </div>
        </div>
        <div style="margin-bottom:20px;">
            <label><strong>Шаг 2. Действия с фразами</strong></label><br>
            <button id="openWordstatAllBtn" class="demand-modal-btn" style="background:#4CAF50;">🔗 Открыть все фразы в Wordstat (avito.ru/analytics/wordstat)</button>
            <p style="font-size:12px; color:#666; margin-top:5px;">
                ⚠️ После открытия вкладки выберите категорию и нажмите «Показать».
            </p>
        </div>
        <div>
            <label><strong>Список фраз (предпросмотр)</strong></label>
            <div id="demandPreview" style="border:1px solid #ccc; height:200px; overflow:auto; padding:8px; background:#fafafa; font-family:monospace; font-size:12px;"></div>
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
        .demand-modal-btn {
            padding: 8px 16px;
            border-radius: 40px;
            border: none;
            color: white;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            margin-right: 10px;
            margin-bottom: 10px;
        }
        .demand-modal-btn:hover {
            transform: translateY(-1px);
            filter: brightness(0.95);
        }
        .open-single-btn {
            background: #ff8c00;
            padding: 0 8px;
            line-height: 24px;
            border-radius: 40px;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 11px;
            transition: 0.15s ease;
            margin-left: 8px;
            white-space: nowrap;
        }
        .open-single-btn:hover {
            transform: translateY(-1px);
            background: #e07c00;
        }
    `;
    document.head.appendChild(style);

    let currentPhrases = [];

    function updatePreview() {
        const previewDiv = document.getElementById("demandPreview");
        if (!previewDiv) return;
        if (currentPhrases.length === 0) {
            previewDiv.innerText = "Нет фраз. Загрузите список или введите в поле выше.";
            return;
        }
        previewDiv.innerHTML = `<table border="1" cellpadding="4" style="border-collapse:collapse; width:100%;">
            <tr><th>#</th><th>Фраза</th><th>Действие</th></tr>
            ${currentPhrases.map((p, idx) => `<tr><td>${idx+1}</td><td>${escapeHtml(p)}</td><td><button class="open-single-btn" data-phrase="${escapeAttr(p)}">🔗 Открыть Wordstat</button></td><tr>`).join('')}
        </table>`;
        document.querySelectorAll('.open-single-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const phrase = btn.getAttribute('data-phrase');
                if (phrase) window.open(`https://www.avito.ru/analytics/wordstat?q=${encodeURIComponent(phrase)}`, '_blank');
            });
        });
    }

    function loadPhrasesFromArray(phrases) {
        currentPhrases = [...new Map(phrases.map(p => [p.trim(), p.trim()])).values()].filter(p => p.length > 0);
        document.getElementById("demandPhrasesInput").value = currentPhrases.join("\n");
        updatePreview();
    }

    document.getElementById("loadPhrasesFromCsvBtn").onclick = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".csv";
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const text = ev.target.result;
                const lines = text.split(/\r?\n/);
                const headers = lines[0].toLowerCase().split(";");
                let phraseIdx = headers.findIndex(h => h.includes("phrase") || h.includes("title"));
                if (phraseIdx === -1) phraseIdx = 0;
                const phrases = [];
                for (let i=1; i<lines.length; i++) {
                    const cols = lines[i].split(";");
                    if (cols[phraseIdx]) phrases.push(cols[phraseIdx].replace(/^"|"$/g, '').trim());
                }
                loadPhrasesFromArray(phrases);
            };
            reader.readAsText(file, "UTF-8");
        };
        input.click();
    };

    document.getElementById("openWordstatAllBtn").onclick = () => {
        if (currentPhrases.length === 0) { alert("Нет фраз"); return; }
        for (let phrase of currentPhrases) {
            window.open(`https://www.avito.ru/analytics/wordstat?q=${encodeURIComponent(phrase)}`, '_blank');
        }
    };

    document.getElementById("demandPhrasesInput").addEventListener("input", (e) => {
        const text = e.target.value;
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        currentPhrases = [...new Set(lines)];
        updatePreview();
    });

    function escapeHtml(str) {
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    function escapeAttr(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}