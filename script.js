const app = {
    baseUrl: 'https://www.sankavollerei.com/comic/mangasusuku',
    container: document.getElementById('app'),

    // --- UTILS ---
    async fetchAPI(endpoint) {
        try {
            this.container.innerHTML = '<div class="loading-box"><div class="spinner"></div><p>FmcPlus Loading...</p></div>';
            const req = await fetch(`${this.baseUrl}${endpoint}`);
            return await req.json();
        } catch (e) {
            this.container.innerHTML = '<div style="text-align:center; padding:50px;"><h3>Gagal Memuat</h3><p>Cek koneksi internet Anda.</p></div>';
            return null;
        }
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

        // Ambil komik pertama dari hotComics untuk jadi Banner Utama
        const mainFeature = data.hotComics ? data.hotComics[0] : null;
        const otherHot = data.hotComics ? data.hotComics.slice(1, 5) : [];

        let html = `
            <div class="container">
                <!-- HERO SECTION -->
                ${page === 1 && mainFeature ? `
                <div class="hero-wrapper">
                    <div class="hero-banner" onclick="app.loadDetail('${mainFeature.slug}')">
                        <img src="${mainFeature.image}" alt="${mainFeature.title}">
                        <div class="hero-info">
                            <span style="background:var(--primary); color:#000; padding:4px 8px; border-radius:4px; font-weight:700; font-size:0.8rem;">HOT 🔥</span>
                            <h2>${mainFeature.title}</h2>
                            <p>Chapter ${mainFeature.chapter}</p>
                        </div>
                    </div>
                    <div class="hero-side" style="display:flex; flex-direction:column; gap:15px;">
                        ${otherHot.map(m => `
                            <div style="display:flex; gap:10px; background:var(--bg-card); padding:10px; border-radius:8px; cursor:pointer;" onclick="app.loadDetail('${m.slug}')">
                                <img src="${m.image}" style="width:60px; height:60px; object-fit:cover; border-radius:4px;">
                                <div>
                                    <div style="font-weight:600; font-size:0.9rem; margin-bottom:5px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${m.title}</div>
                                    <div style="color:var(--primary); font-size:0.8rem;">${m.chapter}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- MAIN GRID -->
                <div class="section-head">
                    <span class="section-title">Update Terbaru</span>
                </div>
                
                <div class="manga-grid">
                    ${data.latestUpdates.map(m => this.renderCard(m)).join('')}
                </div>

                <!-- PAGINATION -->
                <div style="margin:40px 0; display:flex; justify-content:center; gap:15px;">
                    ${page > 1 ? `<button onclick="app.loadHome(${page-1})" class="btn-read" style="background:#333; color:#fff;">Previous</button>` : ''}
                    ${data.pagination.hasNextPage ? `<button onclick="app.loadHome(${data.pagination.nextPage})" class="btn-read">Next Page</button>` : ''}
                </div>
            </div>
        `;
        this.container.innerHTML = html;
        window.scrollTo(0,0);
    },

    // --- DETAIL PAGE ---
    async loadDetail(slug) {
        const data = await this.fetchAPI(`/detail/${slug}`);
        if (!data || !data.success) return;

        // Ambil chapter pertama dan terakhir untuk tombol pintas
        const reversedChapters = [...data.chapters].reverse(); // Biasanya API return Descending
        const firstChapter = reversedChapters[0]; 
        const lastChapter = data.chapters[0];

        let html = `
            <div class="detail-backdrop">
                <img src="${data.image}">
            </div>
            
            <div class="container">
                <div class="detail-layout">
                    <img src="${data.image}" class="detail-poster-img">
                    
                    <div class="detail-info">
                        <h1 class="detail-title">${data.title}</h1>
                        <div class="detail-meta">
                            <span class="rating-tag"><i class="fas fa-star"></i> ${data.rating}</span>
                            <span>${data.genres.map(g => g.name).slice(0, 3).join(', ')}</span>
                            <span>${data.status || 'Ongoing'}</span>
                        </div>
                        
                        <div class="btn-action-group">
                            ${firstChapter ? `
                            <button class="btn-read" onclick="app.loadRead('${firstChapter.slug}')">
                                <i class="fas fa-book-open"></i> Mulai Baca
                            </button>` : ''}
                            
                            ${lastChapter ? `
                            <button class="btn-read" style="background:#333; color:#fff;" onclick="app.loadRead('${lastChapter.slug}')">
                                <i class="fas fa-forward"></i> Ch. Terbaru
                            </button>` : ''}
                        </div>

                        <div class="synopsis-box">
                            <h4>Sinopsis</h4>
                            <p>${data.synopsis}</p>
                        </div>

                        <div class="chapter-list-container">
                            <h3 style="margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px;">Daftar Chapter</h3>
                            <div style="max-height: 500px; overflow-y: auto;">
                                ${data.chapters.map(c => `
                                    <div class="chapter-item" onclick="app.loadRead('${c.slug}')">
                                        <span style="font-weight:600;">${c.title}</span>
                                        <span style="font-size:0.8rem; color:#888;">${c.date}</span>
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

    // --- READER PAGE (REVISED) ---
    async loadRead(chapterSlug) {
        // Hapus trailing slash
        const cleanSlug = chapterSlug.replace(/\/$/, "");
        const data = await this.fetchAPI(`/chapter/${cleanSlug}`);
        
        if (!data || !data.success) return;

        // Parent Slug untuk tombol kembali (misal: judul-komik-chapter-1 -> judul-komik)
        const parentSlug = cleanSlug.split('-chapter-')[0];

        // Navigasi Next/Prev Links
        const prevLink = this.formatSlug(data.navigation.prev);
        const nextLink = this.formatSlug(data.navigation.next);

        let html = `
            <div class="reader-mode">
                <!-- Header Reader -->
                <div class="reader-header">
                    <button onclick="app.loadDetail('${parentSlug}')" style="background:none; border:none; color:#fff; font-size:1.2rem; cursor:pointer;">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="reader-title">${data.title}</div>
                    <button onclick="window.scrollTo(0,0)" style="background:none; border:none; color:var(--primary); font-size:1.2rem; cursor:pointer;">
                        <i class="fas fa-arrow-up"></i>
                    </button>
                </div>

                <!-- Images -->
                <div class="image-container">
                    ${data.images.map(img => `<img src="${img}" class="comic-page" loading="lazy">`).join('')}
                </div>

                <!-- Big Navigation Buttons (Bottom) -->
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

                <!-- Floating Toolbar -->
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
        // Ambil data chapter terbaru
        let chTitle = manga.chapter || (manga.chapters && manga.chapters[0] ? manga.chapters[0].title : 'Unknown');
        
        return `
            <div class="manga-card" onclick="app.loadDetail('${manga.slug}')">
                <div class="card-poster">
                    <div class="rating-tag" style="position:absolute; top:10px; right:10px; font-size:0.7rem;">
                        <i class="fas fa-star"></i> ${manga.rating || '-'}
                    </div>
                    <img src="${manga.image}" loading="lazy" alt="${manga.title}">
                    <div class="card-overlay">
                        <div class="card-title">${manga.title}</div>
                        <div class="card-chap">${chTitle}</div>
                    </div>
                </div>
            </div>
        `;
    },
    
    // --- SEARCH & GENRE HANDLERS (Same logic, updated UI called internally) ---
    async handleSearch() {
        const q = document.getElementById('searchInput').value;
        if(!q) return;
        const data = await this.fetchAPI(`/search/${q.replace(/ /g, '+')}`);
        if(data && data.success) {
            this.container.innerHTML = `
                <div class="container">
                    <div class="section-head"><span class="section-title">Hasil: ${q}</span></div>
                    <div class="manga-grid">${data.results.map(m => this.renderCard(m)).join('')}</div>
                </div>`;
        }
    },

    async loadList(page=1) {
        const data = await this.fetchAPI(`/list/${page}`);
        if(data) {
             this.container.innerHTML = `
                <div class="container">
                    <div class="section-head"><span class="section-title">Daftar Komik (Hal ${page})</span></div>
                    <div class="manga-grid">${data.mangaList.map(m => this.renderCard(m)).join('')}</div>
                    <div style="margin:40px 0; text-align:center;">
                        ${data.pagination.hasNextPage ? `<button onclick="app.loadList(${data.pagination.nextPage})" class="btn-read">Next</button>` : ''}
                    </div>
                </div>`;
        }
    },

    async loadGenres() {
        const data = await this.fetchAPI('/genres');
        this.container.innerHTML = `
            <div class="container">
                <div class="section-head"><span class="section-title">Semua Genre</span></div>
                <div style="display:flex; flex-wrap:wrap; gap:10px;">
                    ${data.genres.map(g => `<button onclick="app.loadGenre('${g.id}', 1)" class="btn-read" style="background:#222; color:#fff; font-size:0.8rem;">${g.name}</button>`).join('')}
                </div>
            </div>`;
    },

    async loadGenre(id, page) {
        const data = await this.fetchAPI(`/genre/${id}/${page}`);
        this.container.innerHTML = `
            <div class="container">
                <div class="section-head"><span class="section-title">Genre Result</span></div>
                <div class="manga-grid">${data.mangaList.map(m => this.renderCard(m)).join('')}</div>
                <div style="margin:20px; text-align:center;">${data.pagination.hasNextPage ? `<button onclick="app.loadGenre('${id}', ${data.pagination.nextPage})" class="btn-read">Next</button>` : ''}</div>
            </div>`;
    }
};

// Init
document.addEventListener('DOMContentLoaded', () => {
    app.loadHome();
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') app.handleSearch();
    });
});
