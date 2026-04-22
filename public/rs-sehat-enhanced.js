document.addEventListener('DOMContentLoaded', () => {
    // Existing animations (unchanged)
    anime({
        targets: '.anime-hero',
        translateY: [30, 0],
        opacity: [0, 1],
        delay: anime.stagger(200),
        easing: 'easeOutExpo',
        duration: 1500
    });

    anime({
        targets: '.anime-quick',
        translateY: [50, 0],
        opacity: [0, 1],
        delay: anime.stagger(150, {start: 500}),
        easing: 'easeOutElastic(1, .8)',
        duration: 1200
    });

    // Scroll observer (unchanged)
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.target.classList.contains('anime-doc')) {
                    anime({
                        targets: '.anime-doc .doc-card',
                        translateY: [50, 0],
                        opacity: [0, 1],
                        delay: anime.stagger(150),
                        easing: 'easeOutCubic',
                        duration: 800
                    });
                } else {
                    anime({
                        targets: entry.target,
                        translateY: [40, 0],
                        opacity: [0, 1],
                        easing: 'easeOutCubic',
                        duration: 800
                    });
                }
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-anime').forEach((el) => {
        observer.observe(el);
    });

    // === ENHANCED MAP INITIALIZATION ===
    const mapContainer = document.getElementById('rs-sehat-map');
    if (mapContainer && typeof L !== 'undefined') {
        let map, userMarker, userLocation = null, faskesMarkers = [];
        const DEFAULT_CENTER = [-7.3305, 110.5084]; // Salatiga area fallback
        const RADIUS_KM = 10; // Search radius

        // Initialize map
        map = L.map('rs-sehat-map').setView(DEFAULT_CENTER, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors | Dokutah'
        }).addTo(map);

        // Add map controls
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'map-controls';
        controlsDiv.innerHTML = `
            <button id="locate-btn" class="locate-btn" title="Lokasi Saya">
                <i class="fas fa-location-crosshairs"></i>
            </button>
        `;
        mapContainer.appendChild(controlsDiv);

        const locateBtn = document.getElementById('locate-btn');

        // 1. GEOLOCATION FUNCTION
        async function getUserLocation() {
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocation tidak didukung'));
                    return;
                }

                locateBtn.classList.add('active');
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        userLocation = { lat: latitude, lng: longitude };
                        
                        // Update map view & user marker
                        const userLatLng = [latitude, longitude];
                        map.setView(userLatLng, 14);
                        
                        if (userMarker) {
                            userMarker.setLatLng(userLatLng);
                        } else {
                            userMarker = L.marker(userLatLng, {
                                icon: L.divIcon({
                                    className: 'custom-marker user-marker',
                                    html: `<div style="background: #ff4444; width: 24px; height: 24px; border-radius: 50%; border: 4px solid white;"></div>`,
                                    iconSize: [32, 32]
                                })
                            }).addTo(map).bindPopup('<b>Lokasi Anda</b>');
                        }
                        
                        userMarker.openPopup();
                        
                        // Load nearby faskes
                        await loadNearbyFaskes();
                        
                        locateBtn.classList.remove('active');
                        resolve(userLocation);
                    },
                    (error) => {
                        locateBtn.classList.remove('active');
                        alert('Gagal mendapatkan lokasi: ' + error.message);
                        reject(error);
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
                );
            });
        }

        // 2. LOAD NEARBY FASKESES FROM API
        async function loadNearbyFaskes() {
            if (!userLocation) return;
            
            try {
                const url = `/api/maps/all?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=${RADIUS_KM * 1000}`;
                const response = await fetch(url);
                const data = await response.json();
                
                // Clear existing faskes markers
                faskesMarkers.forEach(marker => map.removeLayer(marker));
                faskesMarkers = [];
                
                let allPlaces = [];
                // Flatten all jenis results
                Object.values(data).forEach(jenisPlaces => {
                    allPlaces = allPlaces.concat(jenisPlaces);
                });
                
                // Sort by distance (API already does this, but ensure)
                allPlaces.sort((a, b) => parseFloat(a.distance_km || 999) - parseFloat(b.distance_km || 999));
                
                // Add markers for top 20 nearest
                allPlaces.slice(0, 20).forEach((place, idx) => {
                    const lat = parseFloat(place.latitude);
                    const lng = parseFloat(place.longitude);
                    const distance = parseFloat(place.distance_km || 0).toFixed(1);
                    const jenis = place.jenis || 'faskes';
                    
                    let color = '#006699'; // default
                    if (jenis.includes('rs')) color = '#006699';
                    else if (jenis.includes('puskesmas')) color = '#ff8c00';
                    else if (jenis.includes('klinik')) color = '#4169e1';
                    else if (jenis.includes('apotek')) color = '#32cd32';
                    
                    const marker = L.marker([lat, lng], {
                        icon: L.divIcon({
                            className: 'custom-marker',
                            html: `<div style="background: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>`,
                            iconSize: [26, 26]
                        })
                    }).addTo(map);
                    
                    // Dynamic popup with distance & Google Maps navigation
                    const popupContent = `
                        <div class="text-left">
                            <b>${place.name || 'Faskes'}</b>
                            <span class="distance-badge">${distance} km</span>
                            <br><small>${jenis.toUpperCase()}</small>
                            ${place.address ? `<br><small>${place.address}</small>` : ''}
                            <br>
                            <a href="https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${lat},${lng}&travelmode=driving" 
                               target="_blank" class="btn btn-sm btn-success mt-2 gps-nav-btn" style="width:100%; font-size:12px;">
                                <i class="fas fa-directions"></i> Arahkan GPS
                            </a>
                        </div>
                    `;
                    
                    marker.bindPopup(popupContent);
                    faskesMarkers.push(marker);
                    
                    // Auto-open nearest
                    if (idx === 0) {
                        setTimeout(() => marker.openPopup(), 1000);
                    }
                });
                
                console.log(`Loaded ${allPlaces.length} faskes within ${RADIUS_KM}km`);
                
            } catch (error) {
                console.error('API Error:', error);
                L.popup()
                    .setLatLng(map.getCenter())
                    .setContent('<b>Error</b><br>Gagal memuat data peta. Gunakan tombol lokasi.')
                    .openOn(map);
            }
        }

        // 3. EVENT LISTENERS
        locateBtn.addEventListener('click', () => {
            if (userLocation) {
                // Re-center to user if already located
                map.setView([userLocation.lat, userLocation.lng], 14);
                userMarker?.openPopup();
            } else {
                getUserLocation();
            }
        });

        // Auto-locate on load (with permission)
        setTimeout(() => getUserLocation().catch(() => {}), 2000);
    }
});
