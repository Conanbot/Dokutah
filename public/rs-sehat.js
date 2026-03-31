document.addEventListener('DOMContentLoaded', () => {
    // Hero animations
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

    // Scroll-triggered animations
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

    // Map initialization for RS Sehat (Salatiga/Ambarawa area)
    const mapContainer = document.getElementById('rs-sehat-map');
    if (mapContainer && typeof L !== 'undefined') {
        const salatigaLatLng = [-7.3305, 110.5084]; // Ambarawa/Salatiga area
        const map = L.map('rs-sehat-map').setView(salatigaLatLng, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors | Dokutah RS Sehat'
        }).addTo(map);

        // RS Sehat marker (demo location)
        L.marker(salatigaLatLng, {
            icon: L.divIcon({
                className: 'custom-marker',
                html: `<div style="background: #006699; width: 24px; height: 24px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 12px rgba(0,102,153,0.6);"></div>`,
                iconSize: [32, 32]
            })
        }).addTo(map)
        .bindPopup(`
            <div class="text-center">
                <i class="fas fa-hospital fa-2x text-primary mb-2"></i>
                <b>RS Sehat Ambarawa</b><br>
                <small>Jl. Pemuda No. 8<br>Emergency: 1-500-123</small><br>
                <a href="#" class="btn btn-sm btn-primary mt-2">Arahkan GPS</a>
            </div>
        `).openPopup();

        // Nearby demo markers (RS, Klinik, Puskesmas)
        const demoFaskes = [
            { lat: -7.325, lng: 110.515, name: 'Puskesmas Ambarawa', type: 'puskesmas', color: 'orange' },
            { lat: -7.335, lng: 110.502, name: 'Klinik Sehat Jaya', type: 'klinik', color: 'blue' },
            { lat: -7.328, lng: 110.520, name: 'Apotek 24 Jam', type: 'apotek', color: 'green' }
        ];

        demoFaskes.forEach(faskes => {
            L.marker([faskes.lat, faskes.lng], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background: ${faskes.color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>`,
                    iconSize: [26, 26]
                })
            }).addTo(map)
            .bindPopup(`<b>${faskes.name}</b><br><small>${faskes.type.toUpperCase()}</small>`);
        });
    }
});
