// script.js - Enhanced Anime.js Animations + Core Functionality
// 3D cool variatif animations for modern RS theme
// Dark/Light theme, geolocation, API calls, dynamic lists

// Anime.js already loaded via CDN, use global anime

const API_BASE = '/api';

// === ANIME.JS UTILITIES ===
// 3D card flip hover
function card3dHover(el) {
  anime({
    targets: el,
    rotateY: [0, 10],
    rotateX: [0, 5],
    scale: [1, 1.05],
    boxShadow: ['0 10px 30px rgba(0,0,0,0.1)', '0 25px 50px rgba(0,0,0,0.25)'],
    duration: 400,
    easing: 'easeOutQuart'
  });
}

// Smooth entrance cascade
function cascadeEntrance(container, selector = '.card, .anime-card') {
  anime.timeline()
    .add({
      targets: container.querySelectorAll(selector),
      translateY: [100, 0],
      opacity: [0, 1],
      rotateX: [-20, 0],
      duration: 600,
      delay: anime.stagger(150),
      easing: 'easeOutBack'
    });
}

// Floating particles background
function floatingParticles() {
  const particles = document.createElement('div');
  particles.id = 'particles';
  particles.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:1';
  document.body.prepend(particles);
  
  for (let i = 0; i < 20; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position:absolute;width:4px;height:4px;background:var(--primary-blue);border-radius:50%;
      animation: float 20s infinite linear;
      animation-delay: ${Math.random() * 20}s;
      left: ${Math.random() * 100}vw;
      top: ${Math.random() * 100}vh;
    `;
    particles.appendChild(dot);
  }
  
  anime({
    targets: '#particles div',
    translateX: () => anime.random(-100, 100),
    translateY: () => anime.random(-100, 100),
    scale: [0.5, 1.5],
    opacity: [0.3, 1, 0.3],
    duration: () => anime.random(10000, 20000),
    loop: true,
    delay: anime.stagger(200)
  });
}

// Pulse button on hover
function pulseButton(btn) {
  anime({
    targets: btn,
    scale: [1, 1.1, 1],
    backgroundColor: ['var(--primary-blue)', 'var(--primary-light)', 'var(--primary-blue)'],
    duration: 600,
    easing: 'easeInOutQuad'
  });
}

// === CORE FUNCTIONALITY ===
// Theme Toggle (enhanced with anime)
let currentTheme = 'light';
function setTheme(theme) {
  const html = document.documentElement;
  const toggleIcon = document.querySelector('#themeToggle i');
  
  anime({
    targets: 'body',
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f8f9fa',
    color: theme === 'dark' ? '#f8f9fa' : '#212529',
    duration: 500,
    easing: 'easeOutQuart',
    complete: () => {
      html.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      currentTheme = theme;
      toggleIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
  });
}

function initTheme() {
  const saved = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  setTheme(saved);
}

// Search Form Handler
document.getElementById('searchForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const bpjs = document.getElementById('bpjsSwitch').checked;
  const kriteria = document.getElementById('kriteria').value;
  const lat = document.getElementById('lat').value;
  const lng = document.getElementById('lng').value;
  const radius = document.querySelector('select[name="radius"]').value;
  
  if (!lat || !lng) return alert('Gunakan GPS detect dulu!');
  
  // Loading animation
  anime({
    targets: '#loading .spinner-border',
    rotate: '360deg',
    duration: 1000,
    loop: true
  });
  
  try {
    let data;
    if (bpjs) {
      data = await (await fetch(`${API_BASE}/dokter/bpjs?lat=${lat}&lng=${lng}`)).json();
      renderResults(data, 'BPJS Dokter Siap Layani');
    } else {
      data = await (await fetch(`${API_BASE}/faskes/by-dokter?kriteria=${kriteria}&lat=${lat}&lng=${lng}&radius=${radius}`)).json();
      renderFaskes(data, kriteria);
    }
  } catch (err) {
    alert('Error API: ' + err);
  }
});

// Geolocation (with cool anim)
document.getElementById('detectLoc')?.addEventListener('click', () => {
  navigator.geolocation.getCurrentPosition((pos) => {
    document.getElementById('lat').value = pos.coords.latitude;
    document.getElementById('lng').value = pos.coords.longitude;
    document.getElementById('locInput').value = `GPS OK: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
    
    // Success pulse
    anime({
      targets: '#detectLoc',
      scale: [1, 1.3, 1],
      backgroundColor: ['#0d47a1', '#4fc3f7', '#0d47a1'],
      duration: 800,
      easing: 'easeOutElastic(1, .8)'
    });
  });
});

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  floatingParticles();
  
  // Leaflet Map Init for dokter.html
  const mapContainer = document.getElementById('map');
  if (mapContainer && typeof L !== 'undefined') {
    const defaultLatLng = [-7.3305, 110.5084]; // Salatiga
    const map = L.map('map').setView(defaultLatLng, 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // User location marker
    const userMarker = L.marker(defaultLatLng).addTo(map)
      .bindPopup('Lokasi Anda (Salatiga)')
      .openPopup();
    
    // Load nearby faskes/dokter
    const loadMapData = async (lat, lng, radius = 5000) => {
      try {
        const response = await fetch(`/api/maps/all?lat=${lat}&lng=${lng}&radius=${radius}`);
        const result = await response.json();
        
        // Clear existing markers except user
        map.eachLayer(layer => {
          if (layer !== mapContainer._layers[userMarker._leaflet_id]) {
            if (layer instanceof L.Marker) map.removeLayer(layer);
          }
        });
        
        // Add markers for all faskes types
        Object.entries(result.data).forEach(([jenis, places]) => {
          places.forEach(place => {
            const iconColor = {
              'rs': 'red', 'klinik': 'blue', 'apotek': 'green',
              'puskesmas': 'orange', 'gigi': 'purple'
            }[jenis] || 'gray';
            
            const marker = L.marker([place.latitude, place.longitude], {
              icon: L.divIcon({
                className: 'custom-marker',
                html: `<div style="background: ${iconColor}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
                iconSize: [26, 26]
              })
            }).addTo(map)
            .bindPopup(`
              <b>${place.nama}</b><br>
              <small>${jenis.toUpperCase()}</small><br>
              Rating: ${place.rating || '-'} ⭐<br>
              Jarak: ${place.distance_km ? place.distance_km.toFixed(2) + ' km' : 'N/A'}<br>
              Alamat: ${place.alamat || 'N/A'}<br>
            `);
          });
        });
        
        console.log(`Loaded ${Object.values(result.data).flat().length} faskes markers`);
      } catch (err) {
        console.error('Map API error:', err);
        L.popup()
          .setLatLng(defaultLatLng)
          .setContent('Error loading map data. Check /api/maps/all endpoint.')
          .openOn(map);
      }
    };
    
    // Load default Salatiga data
    loadMapData(...defaultLatLng);
    
    // Update on GPS detect
    document.getElementById('detectLoc')?.addEventListener('click', () => {
      navigator.geolocation.getCurrentPosition(pos => {
        const newLatLng = [pos.coords.latitude, pos.coords.longitude];
        map.setView(newLatLng, 14);
        userMarker.setLatLng(newLatLng).setPopupContent('Lokasi GPS Anda');
        loadMapData(...newLatLng);
      });
    });
  }
  
  // 3D Draggable Cards Init (existing)
  if (typeof anime !== 'undefined' && anime.utils && anime.createDraggable) {
    anime.utils.set('.square', { z: 100 });
    anime.createDraggable('.square.draggable', {
      x: { mapTo: 'rotateY' },
      y: { mapTo: 'z' },
    });
    
    // Flip on drag threshold
    document.querySelectorAll('.square.draggable').forEach(square => {
      const draggable = anime.getDraggableInstance(square);
      if (draggable) {
        draggable.addEventListener('drag', (e) => {
          if (Math.abs(e.detail.offsetX) > 50) {
            square.classList.toggle('flipped');
          }
        });
      }
    });
  }
  
  // Enhanced hover + cascade entrance (existing)
  document.querySelectorAll('.doctor-card:not(.square), .card:not(.square)').forEach(card => {
    card.addEventListener('mouseenter', () => card3dHover(card));
    card.addEventListener('mouseleave', () => {
      anime({
        targets: card,
        rotateY: 0,
        rotateX: 0,
        scale: 1,
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        duration: 300,
        easing: 'easeOutQuart'
      });
    });
  });
  
  cascadeEntrance(document.querySelector('.row.g-4') || document.body);
  
  // Navbar scroll + Demo handlers (existing)
  window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
      navbar.style.background = 'rgba(255,255,255,0.95)';
      navbar.style.backdropFilter = 'blur(20px)';
    } else {
      navbar.style.background = 'var(--bg-secondary)';
    }
  });
  
  const showDemo = document.getElementById('showDemo');
  if (showDemo) showDemo.addEventListener('click', () => {
    document.getElementById('mainResults')?.style.setProperty('display', 'block', 'important');
    document.getElementById('loadingSpinner').style.display = 'none';
    cascadeEntrance('#dokterGrid');
  });
  
  // Demo map btn
  const demoBtn = document.getElementById('demoBtn');
  if (demoBtn) demoBtn.addEventListener('click', () => loadMapData(-7.3305, 110.5084));
});

