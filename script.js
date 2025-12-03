const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxGFQr66F_wCf_tSbWWwj4kWqL6DcmjoWB4WkEno2YM_94sWCuvabgIvWMzoOtcQQGY/exec';

let stories = [];

// === 1. ЗАГРУЗКА САЙТА ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎵 Фан-клуб Веты загружен!');
    loadStories();
    setupForm();
    setupSortButtons();
});

// === 2. JSONP ЗАГРУЗКА ИЗ ОБЛАКА ===
function loadStories() {
    console.log('📥 Загружаем истории...');
    
    // Сначала грузим из localStorage
    loadFromLocalStorage();
    
    // Потом из облака через JSONP
    loadFromCloudJSONP();
    
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
            console.log(`📱 Из кэша: ${stories.length} историй`);
        } catch (e) {
            console.log('❌ Ошибка кэша');
            stories = [];
        }
    } else {
        console.log('📭 Кэш пуст');
        stories = [];
    }
}

// JSONP загрузка (без CORS!)
function loadFromCloudJSONP() {
    console.log('☁️ JSONP загрузка из облака...');
    
    // Создаем уникальное имя функции
    const callbackName = 'cloudCallback_' + Date.now();
    
    // Создаем script тег
    const script = document.createElement('script');
    script.src = `${GOOGLE_SCRIPT_URL}?callback=${callbackName}&_=${Date.now()}`;
    
    // Функция обратного вызова
    window[callbackName] = function(data) {
        console.log('📡 JSONP ответ получен:', data);
        
        if (data && data.success && data.stories) {
            const cloudStories = data.stories || [];
            console.log(`✅ Из облака: ${cloudStories.length} историй`);
            
            // Объединяем с локальными
            const allStories = [...cloudStories, ...stories];
            
            // Убираем дубликаты
            const seen = new Set();
            stories = allStories.filter(story => {
                if (seen.has(story.id)) return false;
                seen.add(story.id);
                return true;
            });
            
            // Сохраняем в localStorage
            localStorage.setItem('vetaStories', JSON.stringify(stories));
            
            // Обновляем интерфейс
            displayStories('newest');
            updateStats();
        }
        
        // Очистка
        if (script.parentNode) {
            document.head.removeChild(script);
        }
        delete window[callbackName];
    };
    
    // Обработка ошибок
    script.onerror = function() {
        console.log('⚠️ JSONP не сработал');
        if (script.parentNode) {
            document.head.removeChild(script);
        }
        if (window[callbackName]) {
            delete window[callbackName];
        }
    };
    
    // Добавляем script
    document.head.appendChild(script);
}

// === 3. JSONP ОТПРАВКА В ОБЛАКО ===
function saveToCloudJSONP(story) {
    return new Promise((resolve) => {
        console.log('📤 JSONP отправка в облако...');
        
        const callbackName = 'saveCallback_' + Date.now();
        
        // Создаем form для отправки
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = GOOGLE_SCRIPT_URL;
        form.style.display = 'none';
        
        // Параметр callback для JSONP
        const callbackInput = document.createElement('input');
        callbackInput.name = 'callback';
        callbackInput.value = callbackName;
        form.appendChild(callbackInput);
        
        // Добавляем данные истории
        Object.keys(story).forEach(key => {
            const input = document.createElement('input');
            input.name = key;
            input.value = story[key];
            form.appendChild(input);
        });
        
        // Создаем iframe для ответа
        const iframe = document.createElement('iframe');
        iframe.name = 'jsonpFrame';
        iframe.style.display = 'none';
        
        // Обработка загрузки iframe
        iframe.onload = function() {
            try {
                // Читаем ответ
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const scripts = iframeDoc.getElementsByTagName('script');
                
                if (scripts.length > 0) {
                    // Выполняем JSONP код
                    eval(scripts[0].textContent);
                }
            } catch (e) {
                console.log('❌ Ошибка чтения ответа');
                resolve(false);
            }
            
            // Очистка
            setTimeout(() => {
                if (form.parentNode) document.body.removeChild(form);
                if (iframe.parentNode) document.body.removeChild(iframe);
            }, 1000);
        };
        
        // Функция обратного вызова
        window[callbackName] = function(response) {
            console.log('📨 Ответ от сервера:', response);
            
            if (response && response.success) {
                console.log('✅ Успешно отправлено в облако!');
                resolve(true);
            } else {
                console.log('❌ Ошибка отправки');
                resolve(false);
            }
            
            delete window[callbackName];
        };
        
        // Добавляем в документ
        document.body.appendChild(iframe);
        document.body.appendChild(form);
        
        // Устанавливаем target и отправляем
        form.target = 'jsonpFrame';
        form.submit();
        
        // Таймаут
        setTimeout(() => {
            console.log('⏰ Таймаут отправки');
            resolve(false);
        }, 5000);
    });
}

// === 4. ДОБАВЛЕНИЕ ИСТОРИИ ===
async function addNewStory(author, title, content) {
    const newStory = {
        id: Date.now(),
        author: author,
        title: title,
        content: content,
        date: new Date().toLocaleDateString('ru-RU'),
        likes: 0,
        likedByUser: false
    };
    
    console.log('➕ Новая история:', newStory);
    
    // 1. Добавляем локально
    stories.unshift(newStory);
    localStorage.setItem('vetaStories', JSON.stringify(stories));
    
    // 2. Пробуем отправить в облако
    const cloudSuccess = await saveToCloudJSONP(newStory);
    
    // 3. Обновляем интерфейс
    displayStories('newest');
    updateStats();
    
    return cloudSuccess;
}

// === 5. ФОРМА ===
function setupForm() {
    const form = document.getElementById('storyForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const author = document.getElementById('authorName').value.trim();
        const title = document.getElementById('storyTitle').value.trim();
        const content = document.getElementById('storyContent').value.trim();
        
        if (!author || !title || !content) {
            alert('Заполните все поля!');
            return;
        }
        
        // Показываем загрузку
        const btn = form.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳ Сохраняем...';
        btn.disabled = true;
        
        try {
            const success = await addNewStory(author, title, content);
            
            if (success) {
                alert('✅ История сохранена и будет видна на всех устройствах!');
                form.reset();
            } else {
                alert('⚠️ История сохранена локально. В облако не отправлено.');
            }
            
        } catch (error) {
            console.error('❌ Ошибка:', error);
            alert('❌ Ошибка сохранения');
            
        } finally {
            // Восстанавливаем кнопку
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// === 6. ОТОБРАЖЕНИЕ ИСТОРИЙ ===
function displayStories(sortType) {
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
        storiesToShow.sort((a, b) => b.likes - a.likes);
    }
    
    // Показываем
    storiesToShow.forEach(story => {
        const div = document.createElement('div');
        div.className = 'story-card';
        
        div.innerHTML = `
            <div class="story-header">
                <div class="story-author">👤 ${story.author}</div>
                <div class="story-date">📅 ${story.date}</div>
            </div>
            <h3>${story.title}</h3>
            <div class="story-content">${story.content.replace(/\n/g, '<br>')}</div>
            <div class="story-footer">
                <button class="like-btn ${story.likedByUser ? 'liked' : ''}">
                    ❤️ ${story.likedByUser ? 'Понравилось' : 'Нравится'}
                </button>
                <div>👍 ${story.likes} лайков</div>
            </div>
        `;
        
        div.querySelector('.like-btn').addEventListener('click', function() {
            story.likedByUser = !story.likedByUser;
            story.likes += story.likedByUser ? 1 : -1;
            localStorage.setItem('vetaStories', JSON.stringify(stories));
            displayStories(sortType);
            updateStats();
        });
        
        container.appendChild(div);
    });
}

// === 7. СТАТИСТИКА ===
function updateStats() {
    const total = stories.length;
    const likes = stories.reduce((sum, s) => sum + s.likes, 0);
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

// === 9. ПРИМЕРНЫЕ ИСТОРИИ ===
if (stories.length === 0 && !localStorage.getItem('vetaStories')) {
    stories = [
        {
            id: 1,
            author: "Анна",
            title: "Тестовая история",
            content: "Это проверка работы облака",
            date: new Date().toLocaleDateString(),
            likes: 0,
            likedByUser: false
        }
    ];
    localStorage.setItem('vetaStories', JSON.stringify(stories));
    displayStories('newest');
    updateStats();
}


