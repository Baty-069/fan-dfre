const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxvBcGJUp4J0e5OMJjR1E0-WA7fOcUawxt2XVkNrv1F5o9-OL-uf1ViTFFIZJ0ti7LUEQ/exec';

let stories = [];

// === ОСНОВНАЯ ЗАГРУЗКА ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('Сайт загружен');
    loadStories();
    setupForm();
    setupSortButtons();
});

// === ЗАГРУЗКА ИСТОРИЙ ===
async function loadStories() {
    try {
        console.log('Загружаем истории из Google Sheets...');
        const response = await fetch(GOOGLE_SCRIPT_URL);
        console.log('Статус ответа:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Данные получены:', data);
        
        stories = data.stories || [];
        console.log('Загружено историй:', stories.length);
        
        displayStories('newest');
        updateStats();
    } catch (error) {
        console.error('Ошибка загрузки из Google Sheets:', error);
        console.log('Используем локальные данные...');
        stories = JSON.parse(localStorage.getItem('vetaFanStories')) || [];
        displayStories('newest');
        updateStats();
    }
}

// === ОТПРАВКА ИСТОРИИ ===
async function saveStoryToGoogleSheets(story) {
    try {
        console.log('Отправляем историю в Google Sheets:', story);
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(story)
        });
        console.log('История отправлена');
        return true;
    } catch (error) {
        console.error('Ошибка отправки:', error);
        return false;
    }
}

// === ФОРМА ===
function setupForm() {
    const form = document.getElementById('storyForm');
    if (!form) {
        console.log('Форма не найдена!');
        return;
    }
    
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
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                likes: 0,
                likedByUser: false
            };
            
            showNotification('Сохраняем историю...');
            
            // Сохраняем в облако
            const savedToCloud = await saveStoryToGoogleSheets(newStory);
            
            // Сохраняем локально
            stories.unshift(newStory);
            localStorage.setItem('vetaFanStories', JSON.stringify(stories));
            
            // Обновляем интерфейс
            const activeSort = document.querySelector('.sort-btn.active')?.dataset.sort || 'newest';
            displayStories(activeSort);
            form.reset();
            updateStats();
            
            if (savedToCloud) {
                showNotification('✅ История опубликована и видна на всех устройствах!');
            } else {
                showNotification('⚠️ История сохранена локально. В облаке пока не видна.');
            }
        } else {
            showNotification('⚠️ Заполните все поля!');
        }
    });
}

// === ОТОБРАЖЕНИЕ ИСТОРИЙ ===
function displayStories(sortType) {
    const container = document.getElementById('storiesContainer');
    const noStories = document.getElementById('noStories');
    
    if (!container) {
        console.log('Контейнер историй не найден!');
        return;
    }
    
    container.innerHTML = '';
    
    let storiesToShow = [...stories];
    
    if (sortType === 'newest') {
        storiesToShow.sort((a, b) => b.id - a.id);
    } else if (sortType === 'popular') {
        storiesToShow.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }
    
    if (storiesToShow.length === 0) {
        if (noStories) {
            noStories.style.display = 'block';
        }
        return;
    }
    
    if (noStories) {
        noStories.style.display = 'none';
    }
    
    storiesToShow.forEach(story => {
        const storyEl = createStoryElement(story);
        container.appendChild(storyEl);
    });
}

// === СОЗДАНИЕ КАРТОЧКИ ИСТОРИИ ===
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
    
    div.querySelector('.like-btn').addEventListener('click', function() {
        toggleLike(story.id);
    });
    
    return div;
}

// === ЛАЙКИ ===
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
    
    const activeSort = document.querySelector('.sort-btn.active')?.dataset.sort || 'newest';
    displayStories(activeSort);
    updateStats();
    
    showNotification(stories[storyIndex].likedByUser ? 'Вы поставили лайк!' : 'Вы убрали лайк');
}

// === СТАТИСТИКА ===
function updateStats() {
    const totalStories = stories.length;
    const totalLikes = stories.reduce((sum, story) => sum + (story.likes || 0), 0);
    const authors = new Set(stories.map(s => s.author).filter(a => a));
    const totalAuthors = authors.size;
    
    const totalStoriesEl = document.getElementById('totalStories');
    const totalLikesEl = document.getElementById('totalLikes');
    const totalAuthorsEl = document.getElementById('totalAuthors');
    
    if (totalStoriesEl) totalStoriesEl.textContent = totalStories;
    if (totalLikesEl) totalLikesEl.textContent = totalLikes;
    if (totalAuthorsEl) totalAuthorsEl.textContent = totalAuthors;
}

// === КНОПКИ СОРТИРОВКИ ===
function setupSortButtons() {
    const sortButtons = document.querySelectorAll('.sort-btn');
    
    sortButtons.forEach(button => {
        button.addEventListener('click', function() {
            sortButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const sortType = this.getAttribute('data-sort');
            displayStories(sortType);
        });
    });
}

// === СОХРАНЕНИЕ ===
function saveStories() {
    localStorage.setItem('vetaFanStories', JSON.stringify(stories));
}

// === УТИЛИТЫ ===
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message) {
    // Удаляем старое уведомление если есть
    const oldNotification = document.querySelector('.notification');
    if (oldNotification) {
        oldNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(90deg, #ff6b8b, #ff8e53);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        font-weight: 600;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
    
    // Добавляем стили для анимации если их нет
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

// === ПРИМЕРНЫЕ ИСТОРИИ ===
if (!localStorage.getItem('vetaFanStories') && stories.length === 0) {
    const exampleStories = [
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
        },
        {
            id: 3,
            author: "Ольга",
            title: "Вета вдохновляет",
            content: "Каждый раз, когда слушаю песни Веты, чувствую прилив сил и вдохновения.",
            date: "5 октября 2023",
            likes: 35,
            likedByUser: false
        }
    ];
    
    stories = exampleStories;
    saveStories();
    displayStories('newest');
}
