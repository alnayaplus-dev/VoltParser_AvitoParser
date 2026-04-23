// semantic.js – один CSV: сначала слова, затем фразы (2-5 слов) в тех же колонках

window.runSemanticParsing = async function(statusElement, stopFlagObj, getLinks) {
    if (stopFlagObj.value) return;
    const status = statusElement;
    status.textContent = "🔍 Сбор семантики...";
    await randomSleep(1000, 3000);
    await randomScroll();

    const links = getLinks();
    if (links.length === 0) {
        status.textContent = "❌ Нет ссылок";
        return;
    }

    let titleWordCount = new Map();
    let descWordCount = new Map();
    let titlePhrases = new Map();
    let descPhrases = new Map();

    function tokenize(text) {
        if (!text) return [];
        const cleaned = text.replace(/[^\p{L}\p{N}\s]/gu, ' ');
        return cleaned.split(/\s+/).filter(w => w.length > 0);
    }

    function updatePhrases(words, n, targetMap) {
        if (words.length < n) return;
        for (let i = 0; i <= words.length - n; i++) {
            const phrase = words.slice(i, i + n).join(' ');
            targetMap.set(phrase, (targetMap.get(phrase) || 0) + 1);
        }
    }

    for (let i = 0; i < links.length; i++) {
        if (stopFlagObj.value) break;
        status.textContent = `🔍 ${i+1}/${links.length}`;
        await randomSleep(1200, 3500);
        if (i > 0 && i % 7 === 0) {
            status.textContent = `😴 Пауза...`;
            await randomSleep(8000, 14000);
            await randomScroll();
        }
        try {
            const html = await fetchWithRetry(links[i]);
            const doc = new DOMParser().parseFromString(html, "text/html");

            // ЗАГОЛОВОК
            const titleRaw = doc.querySelector("h1")?.innerText?.toLowerCase() || "";
            const titleWords = tokenize(titleRaw);
            for (let w of titleWords) {
                titleWordCount.set(w, (titleWordCount.get(w) || 0) + 1);
            }
            for (let n = 2; n <= 5; n++) {
                updatePhrases(titleWords, n, titlePhrases);
            }

            // ОПИСАНИЕ
            let descriptionRaw = "";
            const descEl = doc.querySelector('[itemprop="description"]') ||
                           doc.querySelector("div[itemprop='description']") ||
                           doc.querySelector("[data-marker='item-description/text']") ||
                           doc.querySelector("[data-marker='item-description']");
            if (descEl) {
                descriptionRaw = descEl.innerText.toLowerCase().replace(/\r/g, "").replace(/\n{2,}/g, "\n").replace(/[ \t]+/g, " ").trim();
            }
            if (!descriptionRaw) {
                const scripts = doc.querySelectorAll("script");
                for (let s of scripts) {
                    if (s.innerText.includes("description")) {
                        const match = s.innerText.match(/"description":"(.*?)"/);
                        if (match) {
                            descriptionRaw = match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').toLowerCase();
                            break;
                        }
                    }
                }
            }
            const descWords = tokenize(descriptionRaw);
            for (let w of descWords) {
                descWordCount.set(w, (descWordCount.get(w) || 0) + 1);
            }
            for (let n = 2; n <= 5; n++) {
                updatePhrases(descWords, n, descPhrases);
            }

            await randomSleep(200, 600);
        } catch(e) {
            console.error(e);
            await randomSleep(2000, 5000);
        }
    }

    const MIN_WORD_LEN = 4;
    function isValidWord(word, count) {
        if (count < 2) return false;
        if (word.length < MIN_WORD_LEN) return false;
        if (isStopWord(word)) return false;
        if (isNumericWord(word)) return false;
        return true;
    }

    let filteredTitleWords = [];
    for (let [w, cnt] of titleWordCount.entries()) {
        if (isValidWord(w, cnt)) filteredTitleWords.push({ word: w, count: cnt });
    }
    let filteredDescWords = [];
    for (let [w, cnt] of descWordCount.entries()) {
        if (isValidWord(w, cnt)) filteredDescWords.push({ word: w, count: cnt });
    }
    filteredTitleWords.sort((a,b) => b.count - a.count);
    filteredDescWords.sort((a,b) => b.count - a.count);

    function isValidPhrase(phrase, count) {
        if (count < 2) return false;
        const words = phrase.split(' ');
        for (let w of words) {
            if (w.length < MIN_WORD_LEN) return false;
            if (isStopWord(w)) return false;
            if (isNumericWord(w)) return false;
        }
        return true;
    }

    let filteredTitlePhrases = [];
    for (let [ph, cnt] of titlePhrases.entries()) {
        if (isValidPhrase(ph, cnt)) filteredTitlePhrases.push({ phrase: ph, count: cnt });
    }
    let filteredDescPhrases = [];
    for (let [ph, cnt] of descPhrases.entries()) {
        if (isValidPhrase(ph, cnt)) filteredDescPhrases.push({ phrase: ph, count: cnt });
    }
    filteredTitlePhrases.sort((a,b) => b.count - a.count);
    filteredDescPhrases.sort((a,b) => b.count - a.count);

    // Заголовок CSV (один раз)
    let csv = "word_title;freq_title;word_desc;freq_desc\n";

    // Блок слов
    const maxRowsWords = Math.max(filteredTitleWords.length, filteredDescWords.length);
    for (let i = 0; i < maxRowsWords; i++) {
        const tWord = i < filteredTitleWords.length ? filteredTitleWords[i].word : "";
        const tFreq = i < filteredTitleWords.length ? filteredTitleWords[i].count : "";
        const dWord = i < filteredDescWords.length ? filteredDescWords[i].word : "";
        const dFreq = i < filteredDescWords.length ? filteredDescWords[i].count : "";
        csv += `"${tWord.replace(/"/g, '""')}";${tFreq};"${dWord.replace(/"/g, '""')}";${dFreq}\n`;
    }

    // Блок фраз – сразу следом, без дополнительных заголовков, без пустых строк
    const maxRowsPhrases = Math.max(filteredTitlePhrases.length, filteredDescPhrases.length);
    for (let i = 0; i < maxRowsPhrases; i++) {
        const tPh = i < filteredTitlePhrases.length ? filteredTitlePhrases[i].phrase : "";
        const tFreq = i < filteredTitlePhrases.length ? filteredTitlePhrases[i].count : "";
        const dPh = i < filteredDescPhrases.length ? filteredDescPhrases[i].phrase : "";
        const dFreq = i < filteredDescPhrases.length ? filteredDescPhrases[i].count : "";
        csv += `"${tPh.replace(/"/g, '""')}";${tFreq};"${dPh.replace(/"/g, '""')}";${dFreq}\n`;
    }

    downloadCSV(csv, "semantic_words.csv");

    status.textContent = `✅ Готово!`;
};