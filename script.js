const app = {
    baseUrl: 'https://www.sankavollerei.com/comic/mangasusuku',
    container: document.getElementById('app'),

    async fetchData(endpoint) {
        try {
            this.container.innerHTML = '<div class="loading-screen"><div class="loader"></div><p>Memuat konten...</p></div>';
            const response = await fetch(`${this.baseUrl}${endpoint}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(error);
            this.container.innerHTML = '<div style="text-align:center; padding:50px;"><h3>Terjadi Kesalahan</h3><p>Gagal memuat data API.</p><button class="btn-primary" onclick="location.reload()">Coba Lagi</button></div>';
            return null;
        }
    },

    // Utility untuk handle data kosong
    safe(value, fallback = '') {
        return (value && value !== 'null' && value !== null) ? value : fallback;
    },

    // --- HOME ---
    async loadHome(page = 1) {
        let endpoint = page === 1 ? '/home' : `/home/${page}`;
        const data = await this.fetchData(endpoint);
        if (!data || !data.success) return;

        let html = '<div class="container">';

        // 1. Hot Comics Slider (Hanya Page 1)
        if (page === 1 && data.hotComics) {
            html += `
                <div class="hero-section">
                    <div class="section-header">
                        <span class="section-title">Sedang Hangat <i class="fas fa-fire" style="color:var(--primary)"></i></span>
                    </div>
                    <div class="hero-scroll">
                        ${data.hotComics.map(manga => `
                            <div class="hero-card" onclick="app.loadDetail('${manga.slug}')">
                                <img src="${manga.image}" loading="lazy">
                                <div class="hero-overlay">
                                    <div class="hero-title">${manga.title}</div>
                                    <div class="hero-chapter">Ch. ${manga.chapter}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // 2. Main Content Grid & Sidebar
        html += `<div class="content-grid">
            <div class="main-updates">
                <div class="section-header">
                    <span class="section-title">Update Terbaru</span>
                </div>
                <div class="manga-grid">
                    ${data.latestUpdates.map(manga => this.renderCard(manga)).join('')}
                </div>
                
                <div style="margin-top: 40px; text-align: center;">
                    ${page > 1 ? `<button class="btn-nav" onclick="app.loadHome(${page - 1})"><i class="fas fa-chevron-left"></i> Sebelumnya</button>` : ''}
                    ${data.pagination && data.pagination.hasNextPage ? 
                        `<button class="btn-primary" onclick="app.loadHome(${data.pagination.nextPage})">Halaman ${data.pagination.nextPage} <i class="fas fa-chevron-right"></i></button>` 
                        : ''}
                </div>
            </div>`;

        // 3. Sidebar (Hanya Page 1)
        if (page === 1 && data.popularToday) {
            html += `
                <div class="sidebar">
                    <div class="section-header">
                        <span class="section-title">Top Hari Ini</span>
                    </div>
                    <div class="sidebar-list">
                        ${data.popularToday.map((manga, index) => `
                            <div class="sidebar-item" onclick="app.loadDetail('${manga.slug}')">
                                <span class="sidebar-rank">#${index + 1}</span>
                                <img src="${manga.image}" class="sidebar-img">
                                <div>
                                    <div style="font-weight:600; font-size:0.9rem; margin-bottom:3px;">${manga.title}</div>
                                    <div style="font-size:0.8rem; color:var(--primary);">${this.safe(manga.chapter)}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        html += '</div></div>'; // Tutup grid & container
        this.container.innerHTML = html;
        window.scrollTo(0, 0);
    },

    // --- DETAIL ---
    async loadDetail(slug) {
        const data = await this.fetchData(`/detail/${slug}`);
        if (!data || !data.success) return;

        // Background image dari cover untuk efek blur
        let html = `
            <div class="detail-hero" style="background-image: url('${data.image}');">
                <div class="detail-content">
                    <img src="${data.image}" class="detail-poster">
                    <div class="detail-text">
                        <h1>${data.title}</h1>
                        <div class="detail-stats">
                            <span><i class="fas fa-star"></i> ${this.safe(data.rating, 'N/A')}</span>
                            <span>${this.safe(data.alternativeTitle)}</span>
                        </div>
                        <div class="detail-tags">
                            ${data.genres.map(g => `<span>${g.name}</span>`).join('')}
                        </div>
                        <p class="synopsis">${data.synopsis}</p>
                    </div>
                </div>
            </div>

            <div class="chapter-container">
                <div class="section-header">
                    <span class="section-title">List Chapter</span>
                </div>
                <div class="chapter-grid">
                    ${data.chapters.map(chapter => `
                        <div class="chapter-btn" onclick="app.loadRead('${chapter.slug}')">
                            <div>
                                <span>${chapter.title}</span><br>
                                <span class="chapter-date">${chapter.date}</span>
                            </div>
                            <i class="fas fa-play-circle" style="color:var(--text-muted)"></i>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        this.container.innerHTML = html;
        window.scrollTo(0, 0);
    },

    // --- READ ---
    async loadRead(chapterSlug) {
        const cleanSlug = chapterSlug.replace(/\/$/, "");
        const data = await this.fetchData(`/chapter/${cleanSlug}`);
        if (!data || !data.success) return;

        // Ambil slug manga induk untuk tombol kembali (sederhana)
        const parentSlug = cleanSlug.split('-chapter')[0];

        let html = `
            <div class="reader-wrapper">
                <div style="padding: 20px; max-width: 800px; margin: 0 auto; display:flex; justify-content:space-between; align-items:center;">
                    <button class="btn-nav" onclick="app.loadDetail('${parentSlug}')"><i class="fas fa-arrow-left"></i> Info</button>
                    <h4 style="color:#fff; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; max-width:60%;">${data.title}</h4>
                </div>

                <div class="reader-content">
                    ${data.images.map(img => `<img src="${img}" class="comic-image" loading="lazy">`).join('')}
                </div>

                <div class="reader-controls">
                    ${data.navigation.prev && data.navigation.prev !== '#/prev/' ? 
                        `<button class="btn-primary" onclick="app.loadRead('${this.extractSlug(data.navigation.prev)}')">Prev Chapter</button>` : ''}
                    
                    ${data.navigation.next && data.navigation.next !== '#/next/' ? 
                        `<button class="btn-primary" onclick="app.loadRead('${this.extractSlug(data.navigation.next)}')">Next Chapter</button>` : ''}
                </div>
            </div>
        `;
        this.container.innerHTML = html;
        window.scrollTo(0, 0);
    },

    // --- SEARCH ---
    async handleSearch() {
        const query = document.getElementById('searchInput').value;
        if (!query) return;
        const data = await this.fetchData(`/search/${query.replace(/ /g, '+')}`);
        
        if (!data || !data.success) return;

        this.container.innerHTML = `
            <div class="container" style="margin-top:20px;">
                <div class="section-header"><span class="section-title">Hasil: "${query}"</span></div>
                <div class="manga-grid">
                    ${data.results.map(manga => this.renderCard(manga)).join('')}
                </div>
            </div>
        `;
    },

    // --- GENRES & LIST ---
    async loadGenres() {
        const data = await this.fetchData('/genres');
        if(!data) return;
        
        let html = `
            <div class="container" style="margin-top:20px;">
                <div class="section-header"><span class="section-title">Jelajahi Genre</span></div>
                <div style="display:flex; flex-wrap:wrap; gap:10px; justify-content:center;">
                    ${data.genres.map(g => `
                        <button class="btn-nav" onclick="app.loadGenreResult('${g.id}', 1, '${g.name}')">${g.name}</button>
                    `).join('')}
                </div>
            </div>
        `;
        this.container.innerHTML = html;
    },

    async loadGenreResult(id, page, name) {
        const data = await this.fetchData(`/genre/${id}/${page}`);
        if(!data) return;
        
        this.container.innerHTML = `
            <div class="container" style="margin-top:20px;">
                <div class="section-header"><span class="section-title">Genre: ${name}</span></div>
                <div class="manga-grid">
                    ${data.mangaList.map(m => this.renderCard(m)).join('')}
                </div>
                <div style="margin-top:30px; text-align:center;">
                     ${data.pagination.hasNextPage ? 
                        `<button class="btn-primary" onclick="app.loadGenreResult('${id}', ${data.pagination.nextPage}, '${name}')">Next Page</button>` : ''}
                </div>
            </div>
        `;
        window.scrollTo(0,0);
    },

    async loadList(page) {
        const data = await this.fetchData(page === 1 ? '/list' : `/list/${page}`);
        if(!data) return;

        this.container.innerHTML = `
            <div class="container" style="margin-top:20px;">
                <div class="section-header"><span class="section-title">Daftar Komik (Hal ${page})</span></div>
                <div class="manga-grid">
                    ${data.mangaList.map(m => this.renderCard(m)).join('')}
                </div>
                <div style="margin-top:30px; text-align:center; display:flex; justify-content:center; gap:20px;">
                    ${page > 1 ? `<button class="btn-nav" onclick="app.loadList(${page-1})">Prev</button>` : ''}
                    ${data.pagination.hasNextPage ? `<button class="btn-primary" onclick="app.loadList(${data.pagination.nextPage})">Next</button>` : ''}
                </div>
            </div>
        `;
        window.scrollTo(0,0);
    },

    // --- RENDER CARD HELPER ---
    renderCard(manga) {
        // Logic untuk menentukan teks chapter atau time
        let subText = '';
        let timeText = '';

        if(manga.chapter) {
            subText = manga.chapter;
        } else if (manga.chapters && manga.chapters.length > 0) {
            subText = manga.chapters[0].title;
            timeText = `<div class="time-update">${manga.chapters[0].time}</div>`;
        }

        const typeBadge = this.safe(manga.type) ? `<span class="badge-type">${manga.type}</span>` : '';
        const ratingBadge = this.safe(manga.rating) ? `<span class="badge-rate"><i class="fas fa-star"></i> ${manga.rating}</span>` : '';

        return `
            <div class="manga-card" onclick="app.loadDetail('${manga.slug}')">
                <div class="img-wrapper">
                    ${typeBadge}
                    ${ratingBadge}
                    <img src="${manga.image}" class="card-img" loading="lazy" alt="${manga.title}">
                </div>
                <div class="card-info">
                    <div class="card-title" title="${manga.title}">${manga.title}</div>
                    <div class="card-meta">
                        <span>${subText}</span>
                    </div>
                    ${timeText}
                </div>
            </div>
        `;
    },

    extractSlug(url) {
        if(!url) return '';
        const parts = url.split('/');
        return parts[parts.length - 1] || parts[parts.length - 2]; 
    }
};

// Init
document.addEventListener('DOMContentLoaded', () => {
    app.loadHome();
    
    // Enter key search support
    document.getElementById('searchInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            app.handleSearch();
        }
    });
});
