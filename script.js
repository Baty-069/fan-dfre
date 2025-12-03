const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxvBcGJUp4J0e5OMJjR1E0-WA7fOcUawxt2XVkNrv1F5o9-OL-uf1ViTFFIZJ0ti7LUEQ/exec';

// ГЛАВНЫЙ МАССИВ ИСТОРИЙ
let stories = [];

// ============ 1. ЗАГРУЗКА САЙТА ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Сайт загружен!');
    
    // СНАЧАЛА грузим истории
    loadStoriesFromLocalStorage();
    
    // ПОТОМ настраиваем всё остальное
    setupForm();
    setupSortButtons();
    updateStats();
});

// ============ 2. ГАРАНТИРОВАННАЯ ЗАГРУЗКА ИЗ LOCALSTORAGE ============
function loadStoriesFromLocalStorage() {
    console.log('📂 Ищем истории в localStorage...');
    
    const saved = localStorage.getItem('vetaFanStories');
    console.log('📁 Данные из localStorage:', saved ? 'есть' : 'нет');
    
    if (saved) {
        try {
            stories = JSON.parse(saved);
            console.log(`✅ Загружено ${stories.length} историй из localStorage`);
        } catch (error) {
            console.log('❌ Ошибка парсинга localStorage:', error);
            stories = [];
        }
    } else {
        console.log('📭 localStorage пуст');
        stories = [];
    }
    
    // Показываем истории
    displayStories('newest');
    
    // Пробуем загрузить из облака (в фоне)
    loadStoriesFromGoogleSheets();
}

// ============ 3. ЗАГРУЗКА ИЗ GOOGLE SHEETS (дополнительно) ============
async function loadStoriesFromGoogleSheets() {
    try {
        console.log('☁️ Пробуем загрузить из Google Sheets...');
        const response = await fetch(GOOGLE_SCRIPT_URL);
        
        if (response.ok) {
            const data = await response.json();
            const cloudStories = data.stories || [];
            console.log(`☁️ В облаке найдено: ${cloudStories.length} историй`);
            
            if (cloudStories.length > 0) {
                // Объединяем с локальными
                stories = [...cloudStories, ...stories];
                // Убираем дубликаты
                stories = stories.filter((story, index, self) =>
                    index === self.findIndex(s => s.id === story.id)
                );
                // Сохраняем обратно в localStorage
                saveStoriesToLocalStorage();
                // Обновляем отображение
                displayStories('newest');
                updateStats();
            }
        }
    } catch (error) {
        console.log('⚠️ Google Sheets недоступен');
    }
}

// ============ 4. СОХРАНЕНИЕ В LOCALSTORAGE ============
function saveStoriesToLocalStorage() {
    console.log('💾 Сохраняем в localStorage...', stories.length, 'историй');
    localStorage.setItem('vetaFanStories', JSON.stringify(stories));
    console.log('✅ Успешно сохранено в localStorage');
}

// ============ 5. ДОБАВЛЕНИЕ НОВОЙ ИСТОРИИ ============
async function addNewStory(author, title, content) {
    const newStory = {
        id: Date.now(), // Уникальный ID
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
    
    console.log('➕ Добавляем новую историю:', newStory);
    
    // 1. Добавляем в массив
    stories.unshift(newStory);
    
    // 2. СОХРАНЯЕМ В LOCALSTORAGE (гарантированно!)
    saveStoriesToLocalStorage();
    
    // 3. Пробуем отправить в облако (не блокируем)
    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(newStory)
        });
        console.log('✅ Отправлено в Google Sheets');
    } catch (error) {
        console.log('⚠️ Не удалось отправить в облако');
    }
    
    // 4. Обновляем интерфейс
    displayStories('newest');
    updateStats();
    
    return true;
}

// ============ 6. ФОРМА ============
function setupForm() {
    const form = document.getElementById('storyForm');
    if (!form) {
        console.log('❌ Форма не найдена!');
        return;
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const author = document.getElementById('authorName').value.trim();
        const title = document.getElementById('storyTitle').value.trim();
        const content = document.getElementById('storyContent').value.trim();
        
        if (!author || !title || !content) {
            showNotification('⚠️ Заполните все поля!');
            return;
        }
        
        showNotification('💾 Сохраняем историю...');
        
        const success = await addNewStory(author, title, content);
        
        if (success) {
            form.reset();
            showNotification('✅ История сохранена!');
        }
    });
}

// ============ 7. ОТОБРАЖЕНИЕ ИСТОРИЙ ============
function displayStories(sortType) {
    const container = document.getElementById('storiesContainer');
    const noStories = document.getElementById('noStories');
    
    if (!container) {
        console.log('❌ Контейнер историй не найден!');
        return;
    }
    
    container.innerHTML = '';
    
    if (!stories || stories.length === 0) {
        if (noStories) noStories.style.display = 'block';
        console.log('📭 Нет историй для показа');
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
    
    // Создаем карточки
    storiesToShow.forEach(story => {
        container.appendChild(createStoryElement(story));
    });
    
    console.log(`👁️ Показано ${storiesToShow.length} историй`);
}

// ============ 8. СОЗДАНИЕ КАРТОЧКИ ============
function createStoryElement(story) {
    const div = document.createElement('div');
    div.className = 'story-card';
    div.dataset.id = story.id;
    
    div.innerHTML = `
        <div class="story-header">
            <div class="story-author">
                <i class="fas fa-user"></i> ${escapeHtml(story.author || 'Аноним')}
            </div>
            <div class="story-date">
                <i class="far fa-calendar"></i> ${story.date || 'Без даты'}
            </div>
        </div>
        <h3 class="story-title">${escapeHtml(story.title || 'Без названия')}</h3>
        <div class="story-content">${escapeHtml(story.content || '').replace(/\n/g, '<br>')}</div>
        <div class="story-footer">
            <button class="like-btn ${story.likedByUser ? 'liked' : ''}" data-id="${story.id}">
                <i class="fas fa-heart"></i> ${story.likedByUser ? 'Понравилось' : 'Нравится'}
            </button>
            <div class="like-count">
                <i class="fas fa-thumbs-up"></i> <span class="likes-count">${story.likes || 0}</span> лайков
            </div>
        </div>
    `;
    
    // Лайк
    div.querySelector('.like-btn').addEventListener('click', function() {
        toggleLike(story.id);
    });
    
    return div;
}

// ============ 9. ЛАЙКИ ============
function toggleLike(storyId) {
    const storyIndex = stories.findIndex(s => s.id === storyId);
    if (storyIndex === -1) return;
    
    const story = stories[storyIndex];
    
    if (story.likedByUser) {
        story.likes = Math.max(0, (story.likes || 0) - 1);
        story.likedByUser = false;
    } else {
        story.likes = (story.likes || 0) + 1;
        story.likedByUser = true;
    }
    
    // СОХРАНЯЕМ!
    saveStoriesToLocalStorage();
    
    // Обновляем карточку
    const storyEl = document.querySelector(`[data-id="${storyId}"]`);
    if (storyEl) {
        const likeBtn = storyEl.querySelector('.like-btn');
        const likesCount = storyEl.querySelector('.likes-count');
        
        likeBtn.innerHTML = `<i class="fas fa-heart"></i> ${story.likedByUser ? 'Понравилось' : 'Нравится'}`;
        likeBtn.classList.toggle('liked', story.likedByUser);
        if (likesCount) likesCount.textContent = story.likes;
    }
    
    updateStats();
    showNotification(story.likedByUser ? '❤️ Лайк!' : '💔 Лайк убран');
}

// ============ 10. СТАТИСТИКА ============
function updateStats() {
    const totalStories = stories.length;
    const totalLikes = stories.reduce((sum, s) => sum + (s.likes || 0), 0);
    const authors = new Set(stories.map(s => s.author).filter(Boolean));
    const totalAuthors = authors.size;
    
    // Обновляем на странице
    const elements = {
        'totalStories': totalStories,
        'totalLikes': totalLikes,
        'totalAuthors': totalAuthors
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

// ============ 11. КНОПКИ СОРТИРОВКИ ============
function setupSortButtons() {
    const buttons = document.querySelectorAll('.sort-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            displayStories(this.dataset.sort);
        });
    });
}

// ============ 12. УТИЛИТЫ ============
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message) {
    // Удаляем старые
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: linear-gradient(90deg, #ff6b8b, #ff8e53);
        color: white; padding: 12px 20px; border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2); z-index: 1000;
        font-weight: 600; animation: fadeIn 0.3s;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============ 13. ПРИМЕРНЫЕ ИСТОРИИ ============
// Добавляем только если совсем пусто
window.addEventListener('load', function() {
    setTimeout(() => {
        if (!localStorage.getItem('vetaFanStories') || stories.length === 0) {
            console.log('🎁 Добавляем примерные истории...');
            
            stories = [
                {
                    id: 1,
                    author: "Анна",
                    title: "Первая встреча с Ветой",
                    content: "Я помню, как впервые увидела Вету на концерте. Это было невероятно!",
                    date: "15 октября 2023",
                    likes: 12,
                    likedByUser: false
                },
                {
                    id: 2,
                    author: "Максим",
                    title: "Незабываемый вечер",
                    content: "Концерт Веты в нашем городе был лучшим событием года!",
                    date: "10 октября 2023",
                    likes: 8,
                    likedByUser: false
                }
            ];
            
            saveStoriesToLocalStorage();
            displayStories('newest');
            updateStats();
            console.log('✅ Примерные истории добавлены');
        }
    }, 1000);
});
