
// const demoImages = [
//             'images/cases/3друм.png',
//             'images/cases/nimble.png',
//             'images/cases/маскоты_цдют.png',
//             'images/cases/маскоты2.png',
//             'images/cases/яндекс.png' 
//         ];


class InfiniteCarousel {
    constructor(trackId, options = {}) {
        this.track = document.getElementById(trackId);
        this.container = this.track.parentElement;
        
        // Настройки по умолчанию
        this.settings = {
            maxCardWidth: 828,         // Максимальная ширина карточки (px) при 1920px
            maxCardHeight: 600,        // Максимальная высота карточки (px)
            animationDuration: 5000,  // 60 секунд на полный цикл
            hoverDelay: 600,           // Задержка перед остановкой при наведении
            ...options
        };
        
        this.cards = [];
        this.originalCardsCount = 5;
        this.currentOffset = 0;
        this.animationId = null;
        this.lastTimestamp = null;
        this.isPaused = false;
        this.hoverTimeout = null;
        this.speed = 0;
        this.totalWidth = 0;
        this.setWidth = 0; // ширина одного набора (5 карточек)
        this.cardWidth = 0;
        this.cardGap = 0;
        
        this.init();
    }
    
    init() {
        // Создаем 5 карточек с демо-изображениями
        const demoImages = [
            'images/cases/nimble.png',
            'images/cases/3друм.png',
            'images/cases/яндекс.png',
            'images/cases/маскоты2.png',
            'images/cases/маскоты_цдют.png'
        ];
        
        // Создаем оригинальные карточки
        for (let i = 0; i < this.originalCardsCount; i++) {
            const card = this.createCard(demoImages[i], i);
            this.track.appendChild(card);
            this.cards.push(card);
        }
        
        // Создаем ДВА дополнительных набора для бесшовной прокрутки (всего 3 набора)
        // Это ключевое решение: карточки никогда не доходят до конца
        for (let copy = 0; copy < 2; copy++) {
            for (let i = 0; i < this.originalCardsCount; i++) {
                const originalCard = this.cards[i];
                const clone = originalCard.cloneNode(true);
                this.track.appendChild(clone);
                this.cards.push(clone);
            }
        }
        
        // Рассчитываем размеры
        this.calculateSizes();
        
        // Рассчитываем скорость движения
        this.calculateSpeed();
        
        // Устанавливаем начальную позицию на первом наборе
        this.currentOffset = 0;
        this.updateTrackPosition();
        
        // Запускаем анимацию
        this.startAnimation();
        
        // Добавляем обработчики наведения
        this.addHoverHandlers();
        
        // Добавляем обработчик изменения размера окна
        window.addEventListener('resize', () => this.handleResize());
        
        // Запускаем обновление масштабов
        this.startScaleUpdater();
    }
    
    createCard(imageUrl, index) {
        const card = document.createElement('div');
        card.className = 'carousel-card';
        card.setAttribute('data-index', index);
        
        const link = document.createElement('a');
        link.href = `case${index + 1}.html`;
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = `Card ${index + 1}`;
        img.loading = 'lazy';
        
        link.appendChild(img);
        card.appendChild(link);
        
        return card;
    }
    
    calculateSizes() {
        const viewportWidth = window.innerWidth;
        
        // Рассчитываем ширину карточки
        let cardWidth;
        if (viewportWidth >= 1920) {
            cardWidth = this.settings.maxCardWidth;
        } else if (viewportWidth <= 1024) {
            cardWidth = this.settings.maxCardWidth * (1024 / 1920);
        } else {
            const ratio = (viewportWidth - 1024) / (1920 - 1024);
            const minWidth = this.settings.maxCardWidth * (1024 / 1920);
            cardWidth = minWidth + (this.settings.maxCardWidth - minWidth) * ratio;
        }
        
        const cardHeight = (cardWidth / this.settings.maxCardWidth) * this.settings.maxCardHeight;
        const gap = parseFloat(getComputedStyle(this.track).gap) || 32;
        
        this.cardWidth = cardWidth;
        this.cardGap = gap;
        
        // Применяем размеры ко всем карточкам
        this.cards.forEach(card => {
            card.style.width = `${cardWidth}px`;
            card.style.height = `${cardHeight}px`;
        });
        
        // Ширина одного набора (5 карточек)
        this.setWidth = this.originalCardsCount * (cardWidth + gap);
        // Общая ширина всех карточек (3 набора)
        this.totalWidth = this.cards.length * (cardWidth + gap);
    }
    
    calculateSpeed() {
        // Скорость = ширина одного набора / длительность (пикселей в секунду)
        this.speed = this.setWidth / (this.settings.animationDuration / 1000);
    }
    
    updateTrackPosition() {
        // КЛЮЧЕВОЕ РЕШЕНИЕ: используем бесконечное смещение без сброса
        // Просто применяем transform с текущим смещением
        this.track.style.transform = `translateX(-${this.currentOffset}px)`;
        
        // Проверяем, не ушли ли мы слишком далеко (за пределы 2 наборов)
        // Если ушли за второй набор, возвращаемся на один набор вперед
        // Это делается без изменения transform, только меняем currentOffset
        if (this.currentOffset >= this.setWidth * 2) {
            // Возвращаемся на один набор назад, сохраняя визуальную позицию
            this.currentOffset -= this.setWidth;
            // Мгновенно применяем новую позицию без анимации
            this.track.style.transform = `translateX(-${this.currentOffset}px)`;
        } else if (this.currentOffset < 0) {
            this.currentOffset += this.setWidth;
            this.track.style.transform = `translateX(-${this.currentOffset}px)`;
        }
    }
    
    updateScales() {
        const containerRect = this.container.getBoundingClientRect();
        const centerX = containerRect.left + containerRect.width / 2;
        
        this.cards.forEach(card => {
            const cardRect = card.getBoundingClientRect();
            const cardCenterX = cardRect.left + cardRect.width / 2;
            
            const distanceFromCenter = Math.abs(cardCenterX - centerX);
            const maxDistance = containerRect.width / 2;
            
            let scale = 1 - (distanceFromCenter / maxDistance) * 0.4;
            scale = Math.max(0.6, Math.min(1, scale));
            
            card.style.transform = `scale(${scale})`;
            card.style.transformOrigin = 'center center';
            
            if (scale > 0.95) {
                card.classList.add('center');
            } else {
                card.classList.remove('center');
            }
        });
    }
    
    startScaleUpdater() {
        const updateScales = () => {
            this.updateScales();
            requestAnimationFrame(updateScales);
        };
        updateScales();
    }
    
    startAnimation() {
        const animate = (timestamp) => {
            if (!this.lastTimestamp) {
                this.lastTimestamp = timestamp;
                this.animationId = requestAnimationFrame(animate);
                return;
            }
            
            if (!this.isPaused) {
                const delta = Math.min(50, timestamp - this.lastTimestamp);
                const deltaSeconds = delta / 1000;
                
                // Увеличиваем смещение
                this.currentOffset += this.speed * deltaSeconds;
                
                // Обновляем позицию (с автоматическим сбросом без скачков)
                this.updateTrackPosition();
            }
            
            this.lastTimestamp = timestamp;
            this.animationId = requestAnimationFrame(animate);
        };
        
        this.animationId = requestAnimationFrame(animate);
    }
    
    addHoverHandlers() {
        this.cards.forEach(card => {
            card.addEventListener('mouseenter', () => this.pauseWithDelay());
            card.addEventListener('mouseleave', () => this.resume());
        });
    }
    
    pauseWithDelay() {
        if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
        
        this.hoverTimeout = setTimeout(() => {
            this.isPaused = true;
            this.container.classList.add('paused');
        }, this.settings.hoverDelay);
    }
    
    resume() {
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }
        this.isPaused = false;
        this.container.classList.remove('paused');
        this.lastTimestamp = null;
    }
    
    handleResize() {
        this.calculateSizes();
        this.calculateSpeed();
        // Корректируем текущее смещение, чтобы оно оставалось в пределах 0 - setWidth*2
        this.currentOffset = this.currentOffset % (this.setWidth * 2);
        this.updateTrackPosition();
        this.updateScales();
    }
}

// Запускаем карусель
document.addEventListener('DOMContentLoaded', () => {
    const carousel = new InfiniteCarousel('carouselTrack', {
        maxCardWidth: 828,
        maxCardHeight: 600,
        animationDuration: 32000,
        hoverDelay: 800
    });
});


// АНИМАЦИЯ ПОЯВЛЕНИЯ ПРИ СКРОЛЛЕ

document.addEventListener('DOMContentLoaded', () => {
    // Выбираем все блоки, которые нужно анимировать
    const animatedBlocks = document.querySelectorAll('.cover, .carousel-container, .button-wrapper-1, .about-me, .skills, .education, .contacts, .card-grid, .cases-header, .button-wrapper-2, .case-images, .case-info, .button-wrapper-3');
    
    // Создаем наблюдатель
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // Если блок появляется в области видимости
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Опционально: продолжаем наблюдать, чтобы анимация сработала только раз
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.2, // Блок считается видимым, когда 20% его площади на экране
        rootMargin: '0px 0px -50px 0px' // Небольшой отступ снизу
    });
    
    // Начинаем наблюдение за каждым блоком
    animatedBlocks.forEach(block => {
        observer.observe(block);
    });
});



// Получаем кнопку
const backToTopButton = document.getElementById('backToTop');

// Функция проверки прокрутки
function checkScroll() {
    // Высота всей страницы
    const pageHeight = document.documentElement.scrollHeight;
    
    // Текущая позиция прокрутки + высота окна
    const scrollPosition = window.scrollY + window.innerHeight;
    
    // Порог - 2/3 страницы (66.67%)
    const threshold = pageHeight * 0.6667;
    
    // Показываем или скрываем кнопку
    if (scrollPosition > threshold) {
        backToTopButton.classList.add('show');
    } else {
        backToTopButton.classList.remove('show');
    }
}

// Функция прокрутки наверх
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth' // Плавная прокрутка
    });
}

// Слушаем событие прокрутки
window.addEventListener('scroll', checkScroll);

// Слушаем клик по кнопке
backToTopButton.addEventListener('click', scrollToTop);

// Вызываем один раз при загрузке, чтобы проверить начальное состояние
checkScroll();





function showToastNearCursor(message, event) {
    const toast = document.createElement('div');
    toast.className = 'cursor-toast';
    toast.textContent = message;
    
    // Получаем координаты иконки
    const targetElement = event.currentTarget || event.target;
    const rect = targetElement.getBoundingClientRect();
    
    // Позиционируем над иконкой по центру
    const toastWidth = toast.offsetWidth;
    const centerX = rect.left + (rect.width / 2);
    const topPosition = rect.top - 10; // 10px над иконкой
    
    toast.style.left = (centerX - (toastWidth / 2)) + 'px';
    toast.style.top = (topPosition - 40) + 'px'; // Поднимаем выше
    
    document.body.appendChild(toast);
    
    // Корректируем позицию после добавления в DOM (чтобы учесть реальную ширину)
    setTimeout(() => {
        const finalWidth = toast.offsetWidth;
        toast.style.left = (centerX - (finalWidth / 2)) + 'px';
    }, 0);
    
    setTimeout(() => {
        toast.remove();
    }, 2000);
}

async function copyEmailWithToastNearCursor(email, event) {
    try {
        await navigator.clipboard.writeText(email);
        showToastNearCursor('Email скопирован', event);
    } catch (err) {
        showToastNearCursor('Ошибка копирования', event);
    }
}