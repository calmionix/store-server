/**
 * CALMIONIX SMP - MAIN JAVASCRIPT
 * Server Website with Pixel Art Theme
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  API_URL: 'https://api.mcsrvstat.us/3/calmionix.fun:19132',
  REFRESH_INTERVAL: 30000, // 30 seconds
  SOUND_ENABLED: true,
  THEME_KEY: 'calmionix-theme'
};

// ============================================
// AUDIO SYSTEM
// ============================================
class AudioSystem {
  constructor() {
    this.clickSound = new Audio('assets/sounds/click.wav');
    this.clickSound.volume = 0.5;
    this.enabled = CONFIG.SOUND_ENABLED;
  }

  playClick() {
    if (this.enabled && this.clickSound) {
      this.clickSound.currentTime = 0;
      this.clickSound.play().catch(() => {});
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

const audio = new AudioSystem();

// ============================================
// THEME SYSTEM
// ============================================
class ThemeSystem {
  constructor() {
    this.currentTheme = localStorage.getItem(CONFIG.THEME_KEY) || 'dark';
    this.init();
  }

  init() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    this.updateToggleButton();
  }

  toggle() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    localStorage.setItem(CONFIG.THEME_KEY, this.currentTheme);
    this.updateToggleButton();
    audio.playClick();
  }

  updateToggleButton() {
    const toggle = document.querySelector('.theme-toggle');
    if (toggle) {
      toggle.setAttribute('title', `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} mode`);
    }
  }
}

const theme = new ThemeSystem();

// ============================================
// NOTIFICATION SYSTEM
// ============================================
class NotificationSystem {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Create notification container
    this.container = document.createElement('div');
    this.container.className = 'notification-container';
    document.body.appendChild(this.container);
  }

  show(title, message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-title">${title}</div>
      <div class="notification-message">${message}</div>
    `;

    this.container.appendChild(notification);
    audio.playClick();

    // Auto remove
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }

  success(title, message) {
    this.show(title, message, 'success');
  }

  error(title, message) {
    this.show(title, message, 'error');
  }

  warning(title, message) {
    this.show(title, message, 'warning');
  }
}

const notifications = new NotificationSystem();

// ============================================
// SERVER STATUS API
// ============================================
class ServerStatus {
  constructor() {
    this.data = null;
    this.previousPlayers = [];
    this.isFirstLoad = true;
    this.init();
  }

  async init() {
    await this.fetchStatus();
    // Auto refresh
    setInterval(() => this.fetchStatus(), CONFIG.REFRESH_INTERVAL);
  }

  async fetchStatus() {
    try {
      const response = await fetch(CONFIG.API_URL);
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      this.handleStatusUpdate(data);
      this.data = data;
    } catch (error) {
      console.error('Server status error:', error);
      this.handleOffline();
    }
  }

  handleStatusUpdate(data) {
    const wasOffline = this.data && !this.data.online;
    const isNowOnline = data.online;

    // Server came back online
    if (wasOffline && isNowOnline) {
      notifications.success('Server Online!', 'Calmionix SMP is now back online!');
    }

    // Server went offline
    if (this.data && this.data.online && !isNowOnline) {
      notifications.error('Server Offline', 'Calmionix SMP is currently offline.');
    }

    // Check for player joins/leaves
    if (!this.isFirstLoad && data.players && this.data && this.data.players) {
      const currentPlayers = data.players.list || [];
      const prevPlayers = this.previousPlayers;

      // Player joined
      currentPlayers.forEach(player => {
        if (!prevPlayers.find(p => p.name === player.name)) {
          notifications.show('Player Joined', `${player.name} joined the server!`, 'success', 3000);
        }
      });

      // Player left
      prevPlayers.forEach(player => {
        if (!currentPlayers.find(p => p.name === player.name)) {
          notifications.show('Player Left', `${player.name} left the server.`, 'warning', 3000);
        }
      });

      this.previousPlayers = currentPlayers;
    } else if (data.players) {
      this.previousPlayers = data.players.list || [];
    }

    this.isFirstLoad = false;
    this.updateUI(data);
  }

  handleOffline() {
    const offlineData = {
      online: false,
      players: { online: 0, max: 100 },
      version: 'Unknown',
      motd: { clean: ['Server Offline', 'Please try again later'] }
    };
    this.updateUI(offlineData);
  }

  updateUI(data) {
    // Update status indicator
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    if (statusDot && statusText) {
      if (data.online) {
        statusDot.classList.remove('offline');
        statusDot.classList.add('online');
        statusText.textContent = 'ONLINE';
        statusText.style.color = 'var(--online-color)';
      } else {
        statusDot.classList.remove('online');
        statusDot.classList.add('offline');
        statusText.textContent = 'OFFLINE';
        statusText.style.color = 'var(--offline-color)';
      }
    }

    // Update player count
    const playerCount = document.querySelector('.player-count');
    if (playerCount && data.players) {
      playerCount.textContent = `${data.players.online} / ${data.players.max}`;
    }

    // Update version
    const versionEl = document.querySelector('.server-version');
    if (versionEl) {
      versionEl.textContent = data.version || 'Unknown';
    }

    // Update MOTD
    const motdEl = document.querySelector('.server-motd');
    if (motdEl && data.motd) {
      motdEl.textContent = data.motd.clean ? data.motd.clean[0] : 'Calmionix SMP';
    }

    // Update platform
    const platformEl = document.querySelector('.server-platform');
    if (platformEl) {
      platformEl.textContent = 'Java & Bedrock';
    }
  }
}

// ============================================
// COPY TO CLIPBOARD
// ============================================
function copyToClipboard(text, successMessage = 'Copied to clipboard!') {
  navigator.clipboard.writeText(text).then(() => {
    notifications.success('Copied!', successMessage);
    audio.playClick();
  }).catch(() => {
    notifications.error('Error', 'Failed to copy to clipboard');
  });
}

// ============================================
// NAVBAR
// ============================================
function initNavbar() {
  const menuToggle = document.querySelector('.menu-toggle');
  const navbarMenu = document.querySelector('.navbar-menu');

  if (menuToggle && navbarMenu) {
    menuToggle.addEventListener('click', () => {
      navbarMenu.classList.toggle('active');
      audio.playClick();
    });
  }

  // Close menu on link click
  const navLinks = document.querySelectorAll('.navbar-menu a');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navbarMenu.classList.remove('active');
      audio.playClick();
    });
  });

  // Theme toggle
  const themeToggle = document.querySelector('.theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => theme.toggle());
  }

  // Navbar scroll effect
  window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
      navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    } else {
      navbar.style.boxShadow = 'none';
    }
  });
}

// ============================================
// SCROLL ANIMATIONS
// ============================================
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);

  document.querySelectorAll('.scroll-animate').forEach(el => {
    observer.observe(el);
  });
}

// ============================================
// PARTICLES
// ============================================
function initParticles() {
  const container = document.querySelector('.particles');
  if (!container) return;

  // Create floating particles
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 10 + 's';
    particle.style.animationDuration = (10 + Math.random() * 10) + 's';
    container.appendChild(particle);
  }

  // Create stars (only in dark mode)
  if (theme.currentTheme === 'dark') {
    for (let i = 0; i < 50; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 50 + '%';
      star.style.animationDelay = Math.random() * 2 + 's';
      container.appendChild(star);
    }
  }
}

// ============================================
// LOADING SCREEN
// ============================================
function initLoadingScreen() {
  const loadingScreen = document.querySelector('.loading-screen');
  if (loadingScreen) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
      }, 1500);
    });
  }
}

// ============================================
// BUTTON CLICK SOUNDS
// ============================================
function initButtonSounds() {
  document.querySelectorAll('button, .btn, a').forEach(el => {
    el.addEventListener('click', () => audio.playClick());
  });
}

// ============================================
// FILTER & SORT (for Rank/Shard pages)
// ============================================
function initFilterSort() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.filterable-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      audio.playClick();
      
      // Update active state
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      const sort = btn.dataset.sort;

      // Filter cards
      cards.forEach(card => {
        if (filter === 'all' || card.dataset.category === filter) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });

      // Sort visible cards
      if (sort) {
        const visibleCards = Array.from(cards).filter(c => c.style.display !== 'none');
        const container = visibleCards[0]?.parentElement;
        
        if (container) {
          visibleCards.sort((a, b) => {
            const priceA = parseInt(a.dataset.price) || 0;
            const priceB = parseInt(b.dataset.price) || 0;
            return sort === 'asc' ? priceA - priceB : priceB - priceA;
          });

          visibleCards.forEach(card => container.appendChild(card));
        }
      }
    });
  });
}

// ============================================
// DATA LOADING
// ============================================
async function loadJSON(url) {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Error loading JSON:', error);
    return null;
  }
}

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initLoadingScreen();
  initNavbar();
  initScrollAnimations();
  initParticles();
  initButtonSounds();
  initFilterSort();

  // Initialize server status on home page
  if (document.querySelector('.server-status')) {
    new ServerStatus();
  }

  // Add click sound to all interactive elements
  document.querySelectorAll('a, button, .btn, .card, .filter-btn').forEach(el => {
    el.addEventListener('click', () => audio.playClick());
  });
});

// Export for global access
window.Calmionix = {
  audio,
  theme,
  notifications,
  copyToClipboard,
  loadJSON
};
