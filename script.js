const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxvBcGJUp4J0e5OMJjR1E0-WA7fOcUawxt2XVkNrv1F5o9-OL-uf1ViTFFIZJ0ti7LUEQ/exec';

let stories = [];

// 1. ВСЕ ФУНКЦИИ ОПРЕДЕЛЕНЫ - НЕТ ОШИБОК
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Сайт загружен');
    loadStories();
    setupForm();
    setupSortButtons();
});

// 2. ЗАГРУЗКА ИЗ GOOGLE SHEETS + ЛОКАЛЬНОЕ ХРАНЕНИЕ
async function loadStories() {
    try {
        console.log('📡 Загружаем истории из Google Sheets...');
        const response = await fetch(GOOGLE_SCRIPT_URL);
        
        if (response.ok) {
            const data = await response.json();
            stories = data.stories || [];
            console.log(`✅ Загружено ${stories.length} историй из облака`);
            
            // Сохраняем в localStorage как резервную копию
            localStorage.setItem('vetaFanStories', JSON.stringify(stories));
        } else {
            throw new Error('Ошибка загрузки из облака');
        }
    } catch (error) {
        console.log('⚠️ Используем локальные данные...');
        const localStories = localStorage.getItem('vetaFanStories');
        stories = localStories ? JSON.parse(localStories) : [];
        console.log(`📁 Загружено ${stories.length} локальных историй`);
    }
    
    displayStories('newest');
    updateStats();
}

// 3. ОТПРАВКА В GOOGLE SHEETS
async function saveStoryToGoogleSheets(story) {
    try {
        console.log('☁️ Отправляем в облако:', story);
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(story)
        });
        console.log('✅ Успешно отправлено в облако');
        return true;
    } catch (error) {
        console.log('❌ Ошибка отправки в облако:', error);
        return false;
    }
}

// 4. ФОРМА ДОБАВЛЕНИЯ (РАБОТАЕТ ЛОКАЛЬНО И В ОБЛАКО)
function setupForm() {
    const form = document.getElementById('storyForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const author = document.getElementById('authorName').value.trim();
        const title = document.getElementById('storyTitle').value.trim();
        const content = document.getElementById('storyContent').value.trim();
        
        if (author && title && content) {
            const newStory = {
                id: Date.now(),
                author: author,
                title: title,
                content: content,
                date: new Date().toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }),
                likes: 0,
                likedByUser: false
            };
            
            showNotification('💾 Сохраняем историю...');
            
            // 1. Сохраняем ЛОКАЛЬНО (работает всегда)
            stories.unshift(newStory);
            localStorage.setItem('vetaFanStories', JSON.stringify(stories));
            
            // 2. Пытаемся сохранить в ОБЛАКО
            const cloudSaved = await saveStoryToGoogleSheets(newStory);
            
            // 3. Обновляем интерфейс
            displayStories('newest');
            updateStats();
            form.reset();
            
            if (cloudSaved) {
                showNotification('✅ История сохранена и будет видна на всех устройствах!');
            } else {
                showNotification('⚠️ История сохранена локально. На других устройствах пока не видна.');
            }
        }
    });
}

// 5. ОТОБРАЖЕНИЕ ИСТОРИЙ
function displayStories(sortType) {
    const container = document.getElementById('storiesContainer');
    const noStories = document.getElementById('noStories');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    let storiesToShow = [...stories];
    
    if (sortType === 'newest') {
        storiesToShow.sort((a, b) => b.id - a.id);
    } else if (sortType === 'popular') {
        storiesToShow.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }
    
    if (storiesToShow.length === 0) {
        if (noStories) noStories.style.display = 'block';
        return;
    }
    
    if (noStories) noStories.style.display = 'none';
    
    storiesToShow.forEach(story => {
        container.appendChild(createStoryElement(story));
    });
}

// 6. СОЗДАНИЕ КАРТОЧКИ
function createStoryElement(story) {
    const div = document.createElement('div');
    div.className = 'story-card';
    
    div.innerHTML = `
        <div class="story-header">
            <div class="story-author">
                <i class="fas fa-user"></i> ${escapeHtml(story.author || 'Аноним')}
            </div>
            <div class="story-date">
                <i class="far fa-calendar"></i> ${story.date || 'Неизвестно'}
            </div>
        </div>
        <h3 class="story-title">${escapeHtml(story.title || 'Без названия')}</h3>
        <div class="story-content">${escapeHtml(story.content || '').replace(/\n/g, '<br>')}</div>
        <div class="story-footer">
            <button class="like-btn ${story.likedByUser ? 'liked' : ''}" data-id="${story.id}">
                <i class="fas fa-heart"></i> ${story.likedByUser ? 'Понравилось' : 'Нравится'}
            </button>
            <div class="like-count">
                <i class="fas fa-thumbs-up"></i> ${story.likes || 0} лайков
            </div>
        </div>
    `;
    
    div.querySelector('.like-btn').addEventListener('click', () => toggleLike(story.id));
    
    return div;
}

// 7. ЛАЙКИ (работают локально)
function toggleLike(storyId) {
    const storyIndex = stories.findIndex(s => s.id === storyId);
    if (storyIndex === -1) return;
    
    if (stories[storyIndex].likedByUser) {
        stories[storyIndex].likes = (stories[storyIndex].likes || 0) - 1;
        stories[storyIndex].likedByUser = false;
    } else {
        stories[storyIndex].likes = (stories[storyIndex].likes || 0) + 1;
        stories[storyIndex].likedByUser = true;
    }
    
    localStorage.setItem('vetaFanStories', JSON.stringify(stories));
    displayStories('newest');
    updateStats();
}

// 8. СТАТИСТИКА
function updateStats() {
    const totalStories = stories.length;
    const totalLikes = stories.reduce((sum, s) => sum + (s.likes || 0), 0);
    const totalAuthors = new Set(stories.map(s => s.author)).size;
    
    const storiesEl = document.getElementById('totalStories');
    const likesEl = document.getElementById('totalLikes');
    const authorsEl = document.getElementById('totalAuthors');
    
    if (storiesEl) storiesEl.textContent = totalStories;
    if (likesEl) likesEl.textContent = totalLikes;
    if (authorsEl) authorsEl.textContent = totalAuthors;
}

// 9. КНОПКИ СОРТИРОВКИ
function setupSortButtons() {
    const sortButtons = document.querySelectorAll('.sort-btn');
    
    sortButtons.forEach(button => {
        button.addEventListener('click', function() {
            sortButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            displayStories(this.dataset.sort);
        });
    });
}

// 10. УТИЛИТЫ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: linear-gradient(90deg, #ff6b8b, #ff8e53);
        color: white; padding: 12px 20px; border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2); z-index: 1000;
        font-weight: 600; animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
    
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// 11. ПРИМЕРНЫЕ ИСТОРИИ ПРИ ПЕРВОМ ЗАПУСКЕ
if (!localStorage.getItem('vetaFanStories') && stories.length === 0) {
    stories = [
        {
            id: 1,
            author: "Анна",
            title: "Первая встреча с Ветой",
            content: "Я помню, как впервые увидела Вету на концерте. Это было невероятно!",
            date: "15 октября 2023",
            likes: 42,
            likedByUser: false
        },
        {
            id: 2,
            author: "Максим",
            title: "Лучший концерт в моей жизни",
            content: "Был на выступлении Веты в прошлом месяце. Незабываемые эмоции!",
            date: "10 октября 2023",
            likes: 28,
            likedByUser: false
        }
    ];
    
    localStorage.setItem('vetaFanStories', JSON.stringify(stories));
    displayStories('newest');
    updateStats();
}
