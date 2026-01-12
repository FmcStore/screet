const app = {
    baseUrl: 'https://www.sankavollerei.com/comic/mangasusuku',
    container: document.getElementById('app'),

    // --- UTILS ---
    async fetchAPI(endpoint) {
        try {
            this.container.innerHTML = '<div class="loading-box"><div class="spinner"></div><p>Memuat Data...</p></div>';
            const req = await fetch(`${this.baseUrl}${endpoint}`);
            const data = await req.json();
            return data;
        } catch (e) {
            console.error(e);
            this.container.innerHTML = '<div style="text-align:center; padding:50px; color:#888;"><h3>Koneksi Bermasalah</h3><p>Gagal mengambil data dari server.</p><button class="btn-read" onclick="location.reload()" style="margin:20px auto;">Muat Ulang</button></div>';
            return null;
        }
    },

    // --- SOLUSI ANTI BLOKIR GAMBAR (PROXY) ---
    // Menggunakan layanan wsrv.nl untuk mengambil gambar dari mangasusuku.com
    proxyImg(url) {
        if (!url) return 'https://via.placeholder.com/300x450?text=No+Image';
        // Encode URL gambar asli dan kirim ke proxy
        return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=400&q=80`; 
    },
    
    // Proxy khusus untuk banner besar (kualitas lebih tinggi)
    proxyBanner(url) {
        if (!url) return 'https://via.placeholder.com/800x400?text=No+Image';
        return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=800&q=85`; 
    },

    formatSlug(url) {
        if (!url || url.includes('#')) return null;
        const parts = url.split('/');
        return parts[parts.length - 1] || parts[parts.length - 2];
    },

    // --- HOME PAGE ---
    async loadHome(page = 1) {
        const endpoint = page === 1 ? '/home' : `/home/${page}`;
        const data = await this.fetchAPI(endpoint);
        if (!data || !data.success) return;

        const mainFeature = data.hotComics ? data.hotComics[0] : null;
        const otherHot = data.hotComics ? data.hotComics.slice(1, 4) : [];

        let html = `
            <div class="container">
                <!-- HERO BANNER (Hanya di Page 1) -->
                ${page === 1 && mainFeature ? `
                <div class="hero-wrapper">
                    <div class="hero-banner" onclick="app.loadDetail('${mainFeature.slug}')">
                        <img src="${this.proxyBanner(mainFeature.image)}" alt="${mainFeature.title}">
                        <div class="hero-info">
                            <span style="background:var(--primary); color:#000; padding:3px 8px; border-radius:4px; font-weight:700; font-size:0.75rem; margin-bottom:5px; display:inline-block;">POPULAR 🔥</span>
                            <h2>${mainFeature.title}</h2>
                            <p>Chapter ${mainFeature.chapter}</p>
                        </div>
                    </div>
                    <div class="hero-side" style="display:flex; flex-direction:column; gap:10px;">
                        ${otherHot.map(m => `
                            <div style="display:flex; gap:10px; background:var(--bg-card); padding:10px; border-radius:8px; cursor:pointer; align-items:center;" onclick="app.loadDetail('${m.slug}')">
                                <img src="${this.proxyImg(m.image)}" style="width:50px; height:70px; object-fit:cover; border-radius:4px;">
                                <div>
                                    <div style="font-weight:600; font-size:0.85rem; margin-bottom:3px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${m.title}</div>
                                    <div style="color:var(--primary); font-size:0.75rem;">${m.chapter}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- LIST KOMIK -->
                <div class="section-head">
                    <span class="section-title">Update Terbaru</span>
                </div>
                
                <!-- Search Box Mobile (Muncul di layout) -->
                <div style="margin-bottom:20px; display:none;" id="mobileSearch">
                    <input type="text" id="searchInputMobile" placeholder="Cari judul..." style="width:100%; padding:10px; border-radius:8px; border:none; background:#222; color:#fff;">
                </div>

                <div class="manga-grid">
                    ${data.latestUpdates.map(m => this.renderCard(m)).join('')}
                </div>

                <!-- PAGINATION -->
                <div style="margin:40px 0; display:flex; justify-content:center; gap:15px;">
                    ${page > 1 ? `<button onclick="app.loadHome(${page-1})" class="btn-read" style="background:#222; color:#fff;">Previous</button>` : ''}
                    ${data.pagination.hasNextPage ? `<button onclick="app.loadHome(${data.pagination.nextPage})" class="btn-read">Next Page</button>` : ''}
                </div>
            </div>
        `;
        this.container.innerHTML = html;
        
        // Listener untuk search mobile
        if(window.innerWidth <= 768) {
            document.getElementById('mobileSearch').style.display = 'block';
            document.getElementById('searchInputMobile').addEventListener('keypress', (e) => {
                if(e.key === 'Enter') app.handleSearch(e.target.value);
            });
        }
        
        window.scrollTo(0,0);
    },

    // --- DETAIL PAGE ---
    async loadDetail(slug) {
        const data = await this.fetchAPI(`/detail/${slug}`);
        if (!data || !data.success) return;

        // Sorting chapter agar tombol "Baca" mengarah ke Chapter 1
        const reversedChapters = [...data.chapters].reverse();
        const firstChapter = reversedChapters[0]; 
        const lastChapter = data.chapters[0];

        // Pakai proxyImg untuk background dan cover
        const proxyCover = this.proxyImg(data.image);

        let html = `
            <div class="detail-backdrop">
                <img src="${proxyCover}">
            </div>
            
            <div class="container">
                <div class="detail-layout">
                    <img src="${proxyCover}" class="detail-poster-img">
                    
                    <div class="detail-info">
                        <h1 class="detail-title">${data.title}</h1>
                        <div class="detail-meta">
                            <span class="meta-badge" style="background:var(--primary); color:#000; font-weight:bold;"><i class="fas fa-star"></i> ${data.rating}</span>
                            <span class="meta-badge">${data.status || 'Ongoing'}</span>
                            ${data.genres.slice(0,3).map(g => `<span class="meta-badge">${g.name}</span>`).join('')}
                        </div>
                        
                        <div class="btn-action-group">
                            ${firstChapter ? `
                            <button class="btn-read" onclick="app.loadRead('${firstChapter.slug}')">
                                <i class="fas fa-book-open"></i> Mulai Baca
                            </button>` : ''}
                            
                            ${lastChapter ? `
                            <button class="btn-read" style="background:#222; color:#fff; border:1px solid #444;" onclick="app.loadRead('${lastChapter.slug}')">
                                <i class="fas fa-bookmark"></i> Ch. Terbaru
                            </button>` : ''}
                        </div>

                        <div class="synopsis-box">
                            <h4 style="color:#fff; margin-bottom:10px;">Sinopsis</h4>
                            <p>${data.synopsis}</p>
                        </div>

                        <div class="chapter-list-container">
                            <h3 style="margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px; color:#fff;">Daftar Chapter</h3>
                            <div style="max-height: 500px; overflow-y: auto; padding-right:5px;">
                                ${data.chapters.map(c => `
                                    <div class="chapter-item" onclick="app.loadRead('${c.slug}')">
                                        <span style="font-weight:600; font-size:0.9rem;">${c.title}</span>
                                        <span style="font-size:0.75rem; color:#666;">${c.date}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.container.innerHTML = html;
        window.scrollTo(0,0);
    },

    // --- READER PAGE ---
    async loadRead(chapterSlug) {
        const cleanSlug = chapterSlug.replace(/\/$/, "");
        const data = await this.fetchAPI(`/chapter/${cleanSlug}`);
        
        if (!data || !data.success) return;

        const parentSlug = cleanSlug.split('-chapter-')[0];
        const prevLink = this.formatSlug(data.navigation.prev);
        const nextLink = this.formatSlug(data.navigation.next);

        let html = `
            <div class="reader-mode">
                <!-- Header Reader Sticky -->
                <div class="reader-header">
                    <button onclick="app.loadDetail('${parentSlug}')" style="background:none; border:none; color:#fff; font-size:1.2rem; cursor:pointer;">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="reader-title">${data.title}</div>
                    <button onclick="window.scrollTo(0,0)" style="background:none; border:none; color:var(--primary); font-size:1.2rem; cursor:pointer;">
                        <i class="fas fa-arrow-up"></i>
                    </button>
                </div>

                <!-- Gambar Komik -->
                <div class="image-container">
                    <!-- Biasanya gambar chapter tidak perlu proxy, tapi jika error, tambahkan this.proxyImg(img) -->
                    ${data.images.map(img => `<img src="${img}" class="comic-page" loading="lazy">`).join('')}
                </div>

                <!-- Tombol Navigasi Besar Bawah -->
                <div class="reader-footer-nav">
                    ${prevLink ? `
                        <div class="nav-card" onclick="app.loadRead('${prevLink}')">
                            <i class="fas fa-chevron-left"></i>
                            <span>Chapter Sebelumnya</span>
                        </div>
                    ` : '<div class="nav-card" style="opacity:0.5; cursor:default;"><span>Awal</span></div>'}

                    ${nextLink ? `
                        <div class="nav-card" onclick="app.loadRead('${nextLink}')">
                            <i class="fas fa-chevron-right"></i>
                            <span>Chapter Selanjutnya</span>
                        </div>
                    ` : '<div class="nav-card" onclick="app.loadDetail(\''+parentSlug+'\')"><i class="fas fa-check"></i><span>Selesai</span></div>'}
                </div>

                <!-- Floating Toolbar Melayang -->
                <div class="floating-bar">
                    <button class="float-btn" onclick="app.loadDetail('${parentSlug}')"><i class="fas fa-info-circle"></i></button>
                    
                    <button class="float-btn" ${!prevLink ? 'disabled' : `onclick="app.loadRead('${prevLink}')"`}>
                        <i class="fas fa-step-backward"></i>
                    </button>
                    
                    <button class="float-btn" ${!nextLink ? 'disabled' : `onclick="app.loadRead('${nextLink}')"`}>
                        <i class="fas fa-step-forward"></i>
                    </button>
                </div>
            </div>
        `;
        this.container.innerHTML = html;
        window.scrollTo(0,0);
    },

    // --- RENDER HELPERS ---
    renderCard(manga) {
        let chTitle = manga.chapter || (manga.chapters && manga.chapters[0] ? manga.chapters[0].title : 'Unknown');
        
        return `
            <div class="manga-card" onclick="app.loadDetail('${manga.slug}')">
                <div class="card-poster">
                    <div class="rating-tag"><i class="fas fa-star"></i> ${manga.rating || 'N/A'}</div>
                    <!-- PROXY APPLIED HERE -->
                    <img src="${this.proxyImg(manga.image)}" loading="lazy" alt="${manga.title}">
                    <div class="card-overlay">
                        <div class="card-title">${manga.title}</div>
                        <div class="card-chap">${chTitle}</div>
                    </div>
                </div>
            </div>
        `;
    },
    
    // --- SEARCH ---
    async handleSearch(query = null) {
        const q = query || document.getElementById('searchInput').value;
        if(!q) return;
        
        const data = await this.fetchAPI(`/search/${q.replace(/ /g, '+')}`);
        if(data && data.success) {
            this.container.innerHTML = `
                <div class="container">
                    <div class="section-head"><span class="section-title">Hasil Pencarian: "${q}"</span></div>
                    <div class="manga-grid">${data.results.map(m => this.renderCard(m)).join('')}</div>
                </div>`;
        }
    },

    // --- LIST & GENRE ---
    async loadList(page=1) {
        const data = await this.fetchAPI(`/list/${page}`);
        if(data) {
             this.container.innerHTML = `
                <div class="container">
                    <div class="section-head"><span class="section-title">Daftar Komik (Hal ${page})</span></div>
                    <div class="manga-grid">${data.mangaList.map(m => this.renderCard(m)).join('')}</div>
                    <div style="margin:40px 0; text-align:center;">
                        ${data.pagination.hasNextPage ? `<button onclick="app.loadList(${data.pagination.nextPage})" class="btn-read">Halaman Selanjutnya</button>` : ''}
                    </div>
                </div>`;
             window.scrollTo(0,0);
        }
    },

    async loadGenres() {
        const data = await this.fetchAPI('/genres');
        this.container.innerHTML = `
            <div class="container">
                <div class="section-head"><span class="section-title">Semua Genre</span></div>
                <div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:center;">
                    ${data.genres.map(g => `<button onclick="app.loadGenre('${g.id}', 1, '${g.name}')" class="btn-read" style="background:#222; color:#fff; font-size:0.85rem; padding:8px 15px;">${g.name}</button>`).join('')}
                </div>
            </div>`;
    },

    async loadGenre(id, page, name) {
        const data = await this.fetchAPI(`/genre/${id}/${page}`);
        this.container.innerHTML = `
            <div class="container">
                <div class="section-head"><span class="section-title">Genre: ${name}</span></div>
                <div class="manga-grid">${data.mangaList.map(m => this.renderCard(m)).join('')}</div>
                <div style="margin:20px; text-align:center;">${data.pagination.hasNextPage ? `<button onclick="app.loadGenre('${id}', ${data.pagination.nextPage}, '${name}')" class="btn-read">Halaman Selanjutnya</button>` : ''}</div>
            </div>`;
        window.scrollTo(0,0);
    }
};

// Init Application
document.addEventListener('DOMContentLoaded', () => {
    app.loadHome();
    
    // Keyboard Event untuk Search Desktop
    const searchInput = document.getElementById('searchInput');
    if(searchInput){
        searchInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') app.handleSearch();
        });
    }
});
