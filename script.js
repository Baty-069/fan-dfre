const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby39DxMjetd73rdn896heh-W5s4uvipZYiz3hR5D--ofM_nk79wVJwX9EySxAqjC4Rk/exec';

let stories = [];

// === 1. ЗАГРУЗКА САЙТА ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎵 Фан-клуб Веты загружен!');
    initApp();
});

async function initApp() {
    // Загружаем истории (сначала из кэша, потом из облака)
    await loadStories();
    
    // Настраиваем интерфейс
    setupForm();
    setupSortButtons();
    updateStats();
    
    console.log('✅ Приложение готово!');
}

// === 2. ЗАГРУЗКА ИСТОРИЙ (JSONP) ===
async function loadStories() {
    console.log('📥 Загружаем истории...');
    
    // Сначала из localStorage (быстро)
    loadFromLocalStorage();
    
    // Потом из облака (JSONP)
    await loadFromCloudJSONP();
    
    // Показываем
    displayStories('newest');
    updateStats();
}

// Загрузка из localStorage
function loadFromLocalStorage() {
    const saved = localStorage.getItem('vetaStories');
    if (saved) {
        try {
            stories = JSON.parse(saved);
            console.log(`📱 Локальные истории: ${stories.length}`);
        } catch (e) {
            console.log('❌ Ошибка загрузки кэша');
            stories = [];
        }
    }
}

// JSONP загрузка из облака
function loadFromCloudJSONP() {
    return new Promise((resolve) => {
        console.log('☁️ JSONP запрос к облаку...');
        
        // Создаем уникальное имя функции
        const callbackName = 'jsonpCallback_' + Date.now();
        
        // Создаем script тег
        const script = document.createElement('script');
        script.src = `${GOOGLE_SCRIPT_URL}?callback=${callbackName}&t=${Date.now()}`;
        
        // Функция обратного вызова
        window[callbackName] = function(data) {
            console.log('📡 JSONP ответ:', data);
            
            if (data && data.success && data.stories) {
                console.log(`✅ Облачные истории: ${data.stories.length}`);
                
                // Объединяем с локальными (убираем дубликаты)
                const cloudStories = data.stories || [];
                const allStories = [...cloudStories, ...stories];
                
                // Убираем дубликаты по ID
                const seen = new Set();
                stories = allStories.filter(story => {
                    if (seen.has(story.id)) return false;
                    seen.add(story.id);
                    return true;
                });
                
                // Сохраняем в localStorage
                saveToLocalStorage();
            } else if (data && data.error) {
                console.log('❌ Ошибка облака:', data.error);
            }
            
            // Очистка
            document.head.removeChild(script);
            delete window[callbackName];
            resolve();
        };
        
        // Обработка ошибок
        script.onerror = function() {
            console.log('⚠️ JSONP запрос не удался');
            document.head.removeChild(script);
            delete window[callbackName];
            resolve();
        };
        
        // Таймаут
        setTimeout(() => {
            if (script.parentNode) {
                console.log('⏰ JSONP таймаут');
                document.head.removeChild(script);
                if (window[callbackName]) delete window[callbackName];
                resolve();
            }
        }, 10000);
        
        // Добавляем script
        document.head.appendChild(script);
    });
}

// JSONP отправка в облако
function saveToCloudJSONP(story) {
    return new Promise((resolve) => {
        console.log('📤 JSONP отправка в облако...');
        
        const callbackName = 'jsonpPostCallback_' + Date.now();
        
        // Создаем form для отправки данных
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = GOOGLE_SCRIPT_URL;
        form.style.display = 'none';
        
        // Добавляем callback параметр
        const callbackInput = document.createElement('input');
        callbackInput.name = 'callback';
        callbackInput.value = callbackName;
        form.appendChild(callbackInput);
        
        // Добавляем данные истории
        for (const key in story) {
            const input = document.createElement('input');
            input.name = key;
            input.value = typeof story[key] === 'object' 
                ? JSON.stringify(story[key]) 
                : story[key];
            form.appendChild(input);
        }
        
        // Функция обратного вызова
        window[callbackName] = function(response) {
            console.log('📨 JSONP ответ на запись:', response);
            
            if (response && response.success) {
                console.log('✅ Успешно отправлено в облако!');
                resolve(true);
            } else {
                console.log('❌ Ошибка отправки в облако:', response?.error);
                resolve(false);
            }
            
            // Очистка
            document.body.removeChild(form);
            delete window[callbackName];
        };
        
        // Добавляем form в документ
        document.body.appendChild(form);
        
        // Создаем iframe для отправки
        const iframe = document.createElement('iframe');
        iframe.name = 'jsonpIframe_' + Date.now();
        iframe.style.display = 'none';
        iframe.onload = function() {
            // Читаем ответ из iframe
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const scriptTags = iframeDoc.getElementsByTagName('script');
                if (scriptTags.length > 0) {
                    // Выполняем JSONP код
                    eval(scriptTags[0].textContent);
                }
            } catch (e) {
                console.log('❌ Ошибка чтения ответа iframe');
                resolve(false);
            }
            
            // Очистка
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        };
        
        document.body.appendChild(iframe);
        form.target = iframe.name;
        form.submit();
        
        // Таймаут
        setTimeout(() => {
            console.log('⏰ Таймаут отправки JSONP');
            resolve(false);
        }, 10000);
    });
}

// Сохранение в localStorage
function saveToLocalStorage() {
    localStorage.setItem('vetaStories', JSON.stringify(stories));
    console.log(`💾 Сохранено в кэш: ${stories.length} историй`);
}

// === 3. ДОБАВЛЕНИЕ ИСТОРИИ ===
async function addNewStory(author, title, content) {
    const newStory = {
        id: Date.now(),
        author: author,
        title: title,
        content: content,
        date: new Date().toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }),
        likes: 0,
        likedByUser: false
    };
    
    console.log('➕ Новая история:', newStory);
    
    // 1. Добавляем в массив
    stories.unshift(newStory);
    
    // 2. Сохраняем локально (гарантированно)
    saveToLocalStorage();
    
    // 3. Пытаемся отправить в облако через JSONP
    const cloudSaved = await saveToCloudJSONP(newStory);
    
    // 4. Обновляем интерфейс
    displayStories('newest');
    updateStats();
    
    return {
        success: true,
        cloudSaved: cloudSaved,
        story: newStory
    };
}

// === 4. ФОРМА ===
function setupForm() {
    const form = document.getElementById('storyForm');
    if (!form) {
        console.error('❌ Форма не найдена!');
        return;
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const author = document.getElementById('authorName').value.trim();
        const title = document.getElementById('storyTitle').value.trim();
        const content = document.getElementById('storyContent').value.trim();
        
        if (!author || !title || !content) {
            showMessage('⚠️ Заполните все поля!', 'warning');
            return;
        }
        
        // Показываем загрузку
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '⏳ Сохраняем...';
        submitBtn.disabled = true;
        
        try {
            const result = await addNewStory(author, title, content);
            
            if (result.success) {
                if (result.cloudSaved) {
                    showMessage('✅ История опубликована! Видна на всех устройствах!', 'success');
                } else {
                    showMessage('⚠️ История сохранена локально. В облако пока не отправлено.', 'warning');
                }
                
                form.reset();
            }
            
        } catch (error) {
            console.error('❌ Ошибка:', error);
            showMessage('❌ Ошибка при сохранении', 'error');
            
        } finally {
            // Восстанавливаем кнопку
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// === 5. ОТОБРАЖЕНИЕ ИСТОРИЙ ===
function displayStories(sortType = 'newest') {
    const container = document.getElementById('storiesContainer');
    const noStories = document.getElementById('noStories');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (stories.length === 0) {
        if (noStories) noStories.style.display = 'block';
        return;
    }
    
    if (noStories) noStories.style.display = 'none';
    
    // Сортировка
    let storiesToShow = [...stories];
    if (sortType === 'newest') {
        storiesToShow.sort((a, b) => b.id - a.id);
    } else if (sortType === 'popular') {
        storiesToShow.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }
    
    // Показываем
    storiesToShow.forEach(story => {
        container.appendChild(createStoryElement(story));
    });
    
    console.log(`👁️ Показано ${storiesToShow.length} историй`);
}

// === 6. СОЗДАНИЕ КАРТОЧКИ ===
function createStoryElement(story) {
    const div = document.createElement('div');
    div.className = 'story-card';
    
    div.innerHTML = `
        <div class="story-header">
            <div class="story-author">👤 ${story.author || 'Аноним'}</div>
            <div class="story-date">📅 ${story.date || ''}</div>
        </div>
        <h3 class="story-title">${story.title || 'Без названия'}</h3>
        <div class="story-content">${(story.content || '').replace(/\n/g, '<br>')}</div>
        <div class="story-footer">
            <button class="like-btn ${story.likedByUser ? 'liked' : ''}">
                ❤️ ${story.likedByUser ? 'Понравилось' : 'Нравится'}
            </button>
            <div class="like-count">👍 ${story.likes || 0} лайков</div>
        </div>
    `;
    
    // Лайк
    div.querySelector('.like-btn').addEventListener('click', function() {
        story.likedByUser = !story.likedByUser;
        story.likes += story.likedByUser ? 1 : -1;
        saveToLocalStorage();
        displayStories('newest');
        updateStats();
    });
    
    return div;
}

// === 7. СТАТИСТИКА ===
function updateStats() {
    const total = stories.length;
    const likes = stories.reduce((sum, s) => sum + (s.likes || 0), 0);
    const authors = new Set(stories.map(s => s.author)).size;
    
    const storiesEl = document.getElementById('totalStories');
    const likesEl = document.getElementById('totalLikes');
    const authorsEl = document.getElementById('totalAuthors');
    
    if (storiesEl) storiesEl.textContent = total;
    if (likesEl) likesEl.textContent = likes;
    if (authorsEl) authorsEl.textContent = authors;
}

// === 8. КНОПКИ СОРТИРОВКИ ===
function setupSortButtons() {
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            displayStories(this.dataset.sort);
        });
    });
}

// === 9. УТИЛИТЫ ===
function showMessage(text, type = 'info') {
    alert(text); // Пока просто alert
}

// === 10. ПРИМЕРНЫЕ ИСТОРИИ ===
if (stories.length === 0 && !localStorage.getItem('vetaStories')) {
    console.log('🎁 Добавляем примерные истории...');
    
    stories = [
        {
            id: 1,
            author: "Анна",
            title: "Мой первый концерт Веты",
            content: "Это было невероятно! Вета пела так, что у всех мурашки по коже.",
            date: "Сегодня",
            likes: 5,
            likedByUser: false
        }
    ];
    
    saveToLocalStorage();
    displayStories('newest');
    updateStats();
}

// === 11. ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ ===
// Каждые 5 минут обновляем из облака
setInterval(async () => {
    console.log('🔄 Автосинхронизация...');
    await loadFromCloudJSONP();
    displayStories('newest');
    updateStats();
}, 5 * 60 * 1000);
