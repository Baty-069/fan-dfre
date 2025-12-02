document.addEventListener('DOMContentLoaded', function() {
    // Элементы DOM
    const storyForm = document.getElementById('storyForm');
    const storiesContainer = document.getElementById('storiesContainer');
    const noStories = document.getElementById('noStories');
    const sortButtons = document.querySelectorAll('.sort-btn');
    
    // Загружаем истории из localStorage
    let stories = JSON.parse(localStorage.getItem('vetaFanStories')) || [];
    
    // Инициализация
    displayStories('newest');
    
    // Обработчик формы
    storyForm.addEventListener('submit', function(e) {
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
            
            stories.unshift(newStory);
            saveStories();
            displayStories('newest');
            
            // Сброс формы
            storyForm.reset();
            
            // Показываем уведомление
            showNotification('История успешно опубликована!');
        }
    });
    
    // Функция отображения историй
    function displayStories(sortType) {
        let storiesToDisplay = [...stories];
        
        // Сортировка
        if (sortType === 'newest') {
            storiesToDisplay.sort((a, b) => b.id - a.id);
        } else if (sortType === 'popular') {
            storiesToDisplay.sort((a, b) => b.likes - a.likes);
        }
        
        // Очистка контейнера
        storiesContainer.innerHTML = '';
        
        // Показать/скрыть сообщение "нет историй"
        if (storiesToDisplay.length === 0) {
            noStories.style.display = 'block';
        } else {
            noStories.style.display = 'none';
            
            // Добавление историй в DOM
            storiesToDisplay.forEach(story => {
                const storyElement = createStoryElement(story);
                storiesContainer.appendChild(storyElement);
            });
        }
    }
    
    // Создание элемента истории
    function createStoryElement(story) {
        const storyDiv = document.createElement('div');
        storyDiv.className = 'story-card';
        storyDiv.dataset.id = story.id;
        
        storyDiv.innerHTML = `
            <div class="story-header">
                <div class="story-author">
                    <i class="fas fa-user"></i> ${escapeHtml(story.author)}
                </div>
                <div class="story-date">
                    <i class="far fa-calendar"></i> ${story.date}
                </div>
            </div>
            <h3 class="story-title">${escapeHtml(story.title)}</h3>
            <div class="story-content">${escapeHtml(story.content).replace(/\n/g, '<br>')}</div>
            <div class="story-footer">
                <button class="like-btn ${story.likedByUser ? 'liked' : ''}" data-id="${story.id}">
                    <i class="fas fa-heart"></i> ${story.likedByUser ? 'Понравилось' : 'Нравится'}
                </button>
                <div class="like-count">
                    <i class="fas fa-thumbs-up"></i> ${story.likes} лайков
                </div>
            </div>
        `;
        
        // Добавляем обработчик лайков
        const likeBtn = storyDiv.querySelector('.like-btn');
        likeBtn.addEventListener('click', function() {
            toggleLike(story.id);
        });
        
        return storyDiv;
    }
    
    // Переключение лайка
    function toggleLike(storyId) {
        const storyIndex = stories.findIndex(s => s.id === storyId);
        
        if (storyIndex !== -1) {
            if (stories[storyIndex].likedByUser) {
                stories[storyIndex].likes--;
                stories[storyIndex].likedByUser = false;
            } else {
                stories[storyIndex].likes++;
                stories[storyIndex].likedByUser = true;
            }
            
            saveStories();
            
            // Обновляем активную сортировку
            const activeSort = document.querySelector('.sort-btn.active').dataset.sort;
            displayStories(activeSort);
            
            // Показываем уведомление
            showNotification(stories[storyIndex].likedByUser ? 
                'Вы поставили лайк!' : 'Вы убрали лайк');
        }
    }
    
    // Сохранение историй в localStorage
    function saveStories() {
        localStorage.setItem('vetaFanStories', JSON.stringify(stories));
    }
    
    // Обработчики кнопок сортировки
    sortButtons.forEach(button => {
        button.addEventListener('click', function() {
            sortButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            const sortType = this.dataset.sort;
            displayStories(sortType);
        });
    });
    
    // Функция для безопасного отображения HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Функция показа уведомлений
    function showNotification(message) {
        // Удаляем старое уведомление, если есть
        const oldNotification = document.querySelector('.notification');
        if (oldNotification) {
            oldNotification.remove();
        }
        
        // Создаем новое уведомление
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
        
        // Удаляем уведомление через 3 секунды
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
        
        // Добавляем анимации
        const style = document.createElement('style');
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
    
    // Добавляем несколько примеров историй при первом посещении
    if (stories.length === 0) {
        const exampleStories = [
            {
                id: 1,
                author: "Анна",
                title: "Первая встреча с Ветой",
                content: "Я помню, как впервые увидела Вету на концерте. Её энергия и харизма покорили меня с первой минуты! Она не просто певица, она настоящая звезда, которая умеет зажечь сердца тысяч людей.",
                date: "15 октября 2023",
                likes: 42,
                likedByUser: false
            },
            {
                id: 2,
                author: "Максим",
                title: "Незабываемый концерт",
                content: "Был на концерте Веты в прошлом месяце. Это было невероятно! Атмосфера, голос, шоу - всё на высшем уровне. Жду следующего выступления с нетерпением!",
                date: "10 октября 2023",
                likes: 28,
                likedByUser: false
            },
            {
                id: 3,
                author: "Ольга",
                title: "Вета вдохновляет",
                content: "Каждый раз, когда слушаю песни Веты, чувствую прилив сил и вдохновения. Её творчество помогает мне в трудные моменты и делает счастливые дни ещё ярче!",
                date: "5 октября 2023",
                likes: 35,
                likedByUser: false
            }
        ];
        
        stories = exampleStories;
        saveStories();
        displayStories('newest');
    }
});