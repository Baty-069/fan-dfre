// === НАСТРОЙКИ ===
// ВСТАВЬ СЮДА СВОЮ ССЫЛКУ ИЗ APPS SCRIPT!
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/ТВОЙ_НОВЫЙ_ID/exec';

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let stories = [];

// === 1. ЗАГРУЗКА САЙТА ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎵 Фан-клуб Веты загружен!');
    initApp();
});

async function initApp() {
    // Загружаем истории
    await loadStories();
    
    // Настраиваем интерфейс
    setupForm();
    setupSortButtons();
    updateStats();
    
    console.log('✅ Приложение готово!');
}

// === 2. ЗАГРУЗКА ИСТОРИЙ ===
async function loadStories() {
    console.log('📥 Загружаем истории...');
    
    // Пробуем из облака
    const cloudSuccess = await loadFromCloud();
    
    // Если облако не сработало, грузим локально
    if (!cloudSuccess) {
        loadFromLocalStorage();
    }
    
    // Показываем истории
    displayStories('newest');
}

// Загрузка из Google Sheets
async function loadFromCloud() {
    try {
        console.log('☁️ Загружаем из облака...');
        const response = await fetch(GOOGLE_SCRIPT_URL);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (data.error) {
            console.error('❌ Ошибка облака:', data.error);
            return false;
        }
        
        stories = data.stories || [];
        console.log(`✅ Загружено ${stories.length} историй из облака`);
        
        // Сохраняем локально как резервную копию
        saveToLocalStorage();
        
        return true;
        
    } catch (error) {
        console.log('⚠️ Облако недоступно:', error.message);
        return false;
    }
}

// Загрузка из localStorage
function loadFromLocalStorage() {
    const saved = localStorage.getItem('vetaCloudStories');
    
    if (saved) {
        try {
            stories = JSON.parse(saved);
            console.log(`📱 Загружено ${stories.length} историй из кэша`);
        } catch (e) {
            console.log('❌ Ошибка загрузки кэша');
            stories = [];
        }
    } else {
        console.log('📭 Кэш пуст');
        stories = [];
    }
}

// Сохранение в localStorage
function saveToLocalStorage() {
    localStorage.setItem('vetaCloudStories', JSON.stringify(stories));
    console.log(`💾 Сохранено в кэш: ${stories.length} историй`);
}

// === 3. ДОБАВЛЕНИЕ НОВОЙ ИСТОРИИ ===
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
        likes: 0
    };
    
    console.log('➕ Создаем новую историю:', newStory);
    
    // 1. Пробуем сохранить в облако
    const cloudSaved = await saveToCloud(newStory);
    
    if (cloudSaved) {
        // 2. Если успешно в облако, добавляем в массив
        stories.unshift(newStory);
        
        // 3. Обновляем кэш
        saveToLocalStorage();
        
        // 4. Обновляем интерфейс
        displayStories('newest');
        updateStats();
        
        return { success: true, cloud: true };
    } else {
        // Если облако не работает, сохраняем только локально
        console.log('💾 Сохраняем только локально...');
        
        stories.unshift(newStory);
        saveToLocalStorage();
        displayStories('newest');
        updateStats();
        
        return { success: true, cloud: false };
    }
}

// Сохранение в Google Sheets
async function saveToCloud(story) {
    try {
        console.log('📤 Отправляем в облако...');
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(story)
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        
        if (result.error) {
            console.error('❌ Ошибка сервера:', result.error);
            return false;
        }
        
        console.log('✅ Успешно отправлено в облако!');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка отправки в облако:', error);
        return false;
    }
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
        
        // Валидация
        if (!author || !title || !content) {
            showMessage('⚠️ Заполните все поля!', 'warning');
            return;
        }
        
        if (content.length < 10) {
            showMessage('⚠️ История слишком короткая!', 'warning');
            return;
        }
        
        // Показываем загрузку
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохраняем...';
        submitBtn.disabled = true;
        
        try {
            const result = await addNewStory(author, title, content);
            
            if (result.success) {
                if (result.cloud) {
                    showMessage('✅ История опубликована! Видна на всех устройствах!', 'success');
                } else {
                    showMessage('⚠️ История сохранена локально. В облако пока не отправлено.', 'warning');
                }
                
                // Очищаем форму
                form.reset();
            }
            
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
            showMessage('❌ Ошибка при сохранении истории', 'error');
            
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
    
    if (!container) {
        console.error('❌ Контейнер историй не найден!');
        return;
    }
    
    container.innerHTML = '';
    
    // Проверяем есть ли истории
    if (!stories || stories.length === 0) {
        if (noStories) {
            noStories.style.display = 'block';
        }
        console.log('📭 Нет историй для показа');
        return;
    }
    
    if (noStories) {
        noStories.style.display = 'none';
    }
    
    // Сортировка
    let storiesToShow = [...stories];
    if (sortType === 'newest') {
        storiesToShow.sort((a, b) => b.id - a.id);
    } else if (sortType === 'popular') {
        storiesToShow.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }
    
    // Создаем карточки
    storiesToShow.forEach((story, index) => {
        const storyElement = createStoryElement(story);
        container.appendChild(storyElement);
        
        // Анимация появления
        setTimeout(() => {
            storyElement.style.opacity = '1';
            storyElement.style.transform = 'translateY(0)';
        }, index * 50);
    });
    
    console.log(`👁️ Показано ${storiesToShow.length} историй`);
}

function createStoryElement(story) {
    const div = document.createElement('div');
    div.className = 'story-card';
    div.style.opacity = '0';
    div.style.transform = 'translateY(20px)';
    div.style.transition = 'opacity 0.3s, transform 0.3s';
    
    // Форматируем дату
    let displayDate = story.date;
    if (story.date && story.date.includes('г.')) {
        displayDate = story.date.replace('г.', '');
    }
    
    div.innerHTML = `
        <div class="story-header">
            <div class="story-author">
                <i class="fas fa-user-circle"></i> ${escapeHtml(story.author || 'Анонимный поклонник')}
            </div>
            <div class="story-date">
                <i class="far fa-clock"></i> ${displayDate || 'Недавно'}
            </div>
        </div>
        
        <h3 class="story-title">
            <i class="fas fa-star"></i> ${escapeHtml(story.title || 'История о Вете')}
        </h3>
        
        <div class="story-content">
            ${escapeHtml(story.content || '').replace(/\n/g, '<br>')}
        </div>
        
        <div class="story-footer">
            <button class="like-btn" data-id="${story.id}">
                <i class="fas fa-heart ${story.likedByUser ? 'liked' : ''}"></i>
                <span class="like-text">${story.likedByUser ? 'Понравилось' : 'Нравится'}</span>
            </button>
            <div class="like-count">
                <i class="fas fa-thumbs-up"></i>
                <span class="count">${story.likes || 0}</span> сердец
            </div>
        </div>
    `;
    
    // Обработчик лайков
    const likeBtn = div.querySelector('.like-btn');
    likeBtn.addEventListener('click', function() {
        toggleLike(story.id);
    });
    
    return div;
}

// === 6. ЛАЙКИ ===
function toggleLike(storyId) {
    const storyIndex = stories.findIndex(s => s.id === storyId);
    if (storyIndex === -1) return;
    
    const story = stories[storyIndex];
    
    // Переключаем лайк
    if (story.likedByUser) {
        story.likes = Math.max(0, (story.likes || 0) - 1);
        story.likedByUser = false;
    } else {
        story.likes = (story.likes || 0) + 1;
        story.likedByUser = true;
    }
    
    // Обновляем данные
    saveToLocalStorage();
    
    // Обновляем интерфейс
    const storyElement = document.querySelector(`.story-card .like-btn[data-id="${storyId}"]`);
    if (storyElement) {
        const heartIcon = storyElement.querySelector('.fa-heart');
        const likeText = storyElement.querySelector('.like-text');
        const countElement = storyElement.closest('.story-footer').querySelector('.count');
        
        heartIcon.classList.toggle('liked', story.likedByUser);
        likeText.textContent = story.likedByUser ? 'Понравилось' : 'Нравится';
        if (countElement) countElement.textContent = story.likes;
    }
    
    updateStats();
    showMessage(story.likedByUser ? '❤️ Вы поставили лайк!' : '💔 Лайк убран', 'info');
}

// === 7. СТАТИСТИКА ===
function updateStats() {
    const totalStories = stories.length;
    const totalLikes = stories.reduce((sum, story) => sum + (story.likes || 0), 0);
    const uniqueAuthors = [...new Set(stories.map(story => story.author).filter(Boolean))];
    const totalAuthors = uniqueAuthors.length;
    
    // Обновляем на странице
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            // Анимация
            element.style.transform = 'scale(1.1)';
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 300);
        }
    };
    
    updateElement('totalStories', totalStories);
    updateElement('totalLikes', totalLikes);
    updateElement('totalAuthors', totalAuthors);
    
    console.log(`📊 Статистика: ${totalStories} историй, ${totalLikes} лайков, ${totalAuthors} авторов`);
}

// === 8. КНОПКИ СОРТИРОВКИ ===
function setupSortButtons() {
    const buttons = document.querySelectorAll('.sort-btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            // Обновляем активную кнопку
            buttons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Сортируем истории
            const sortType = this.getAttribute('data-sort');
            displayStories(sortType);
        });
    });
}

// === 9. УТИЛИТЫ ===
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(text, type = 'info') {
    // Удаляем старое сообщение
    const oldMsg = document.querySelector('.flash-message');
    if (oldMsg) oldMsg.remove();
    
    // Создаем новое
    const message = document.createElement('div');
    message.className = `flash-message ${type}`;
    message.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${text}</span>
        <button class="close-msg"><i class="fas fa-times"></i></button>
    `;
    
    // Стили
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
    `;
    
    // Кнопка закрытия
    message.querySelector('.close-msg').addEventListener('click', () => {
        message.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => message.remove(), 300);
    });
    
    document.body.appendChild(message);
    
    // Автоматическое закрытие
    setTimeout(() => {
        if (document.body.contains(message)) {
            message.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => message.remove(), 300);
        }
    }, 5000);
    
    // Добавляем анимации если их нет
    if (!document.querySelector('#message-styles')) {
        const style = document.createElement('style');
        style.id = 'message-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// === 10. ПРИМЕРНЫЕ ДАННЫЕ ===
// Если историй нет ни в облаке, ни локально
if (stories.length === 0 && !localStorage.getItem('vetaCloudStories')) {
    console.log('🎁 Добавляем примерные истории...');
    
    stories = [
        {
            id: 1,
            author: "Анна",
            title: "Моя первая встреча с Ветой",
            content: "Это было на концерте в Москве. Вета вышла на сцену, и зал взорвался аплодисментами! Её голос просто завораживает.",
            date: "15 октября 2023",
            likes: 24,
            likedByUser: false
        },
        {
            id: 2,
            author: "Максим",
            title: "Незабываемый вечер",
            content: "Привел девушку на концерт Веты. Теперь она тоже фанатка! Спасибо за прекрасную музыку!",
            date: "12 октября 2023",
            likes: 18,
            likedByUser: false
        },
        {
            id: 3,
            author: "София",
            title: "Вдохновение",
            content: "Песни Веты помогают мне пережить трудные моменты. Спасибо за творчество!",
            date: "10 октября 2023",
            likes: 32,
            likedByUser: false
        }
    ];
    
    saveToLocalStorage();
    displayStories('newest');
    updateStats();
}

// === 11. АВТОСИНХРОНИЗАЦИЯ ===
// Каждые 5 минут проверяем обновления в облаке
setInterval(async () => {
    console.log('🔄 Проверяем обновления в облаке...');
    await loadFromCloud();
    displayStories('newest');
    updateStats();
}, 5 * 60 * 1000); // 5 минут

// === 12. ОФФЛАЙН РЕЖИМ ===
// Показываем уведомление если нет интернета
window.addEventListener('online', () => {
    showMessage('🌐 Интернет соединение восстановлено!', 'success');
    loadFromCloud(); // Сразу грузим обновления
});

window.addEventListener('offline', () => {
    showMessage('⚠️ Вы в оффлайн режиме. История будет сохранена локально.', 'warning');
});
