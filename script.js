const app = {
    baseUrl: 'https://www.sankavollerei.com/comic/mangasusuku',
    container: document.getElementById('app'),

    // --- UTILS ---
    async fetchData(endpoint) {
        try {
            this.container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
            const response = await fetch(`${this.baseUrl}${endpoint}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error:', error);
            this.container.innerHTML = '<div class="error">Gagal memuat data. Periksa koneksi internet.</div>';
            return null;
        }
    },

    formatTime(timeStr) {
        return timeStr || 'Baru saja';
    },

    // --- PAGES ---

    // 1. HOME PAGE
    async loadHome(page = 1) {
        // Jika page > 1, kita asumsikan endpointnya /home/page atau menggunakan query params
        // Berdasarkan pola user: "ganti apinya : .../home" dan "tambahkan next page".
        // Karena endpoint home biasanya statis di page 1, untuk page 2 biasanya strukturnya berbeda
        // Namun, kita akan coba request ke endpoint dasar. Jika user minta page 2, 
        // kita akan gunakan logic manipulasi jika API mendukung, atau load ulang.
        
        // PENTING: Sesuai request, "tolong tambahkan next page untuk page 2 halaman home".
        // Saya asumsikan jika page > 1, URL nya menjadi /home/${page} (tebakan standar) 
        // ATAU kita memanggil list jika home tidak support paging.
        // Mari kita coba endpoint: /home/${page} jika page > 1.
        
        let endpoint = '/home';
        if (page > 1) {
            endpoint = `/home/${page}`; 
        }

        const data = await this.fetchData(endpoint);
        if (!data || !data.success) return;

        // Render Structure
        let html = `
            <div class="home-container">
                <!-- Hot Comics Section (Hanya tampil di Page 1) -->
                ${page === 1 ? `
                <h2 class="section-title"><i class="fas fa-fire"></i> Hot Comics</h2>
                <div class="hot-comics-scroll">
                    ${data.hotComics.map(manga => this.renderCard(manga, 'hot')).join('')}
                </div>
                ` : ''}

                <div class="home-layout">
                    <!-- Left: Latest Updates -->
                    <div class="main-content">
                        <h2 class="section-title"><i class="fas fa-clock"></i> Update Terbaru</h2>
                        <div class="grid-container">
                            ${data.latestUpdates.map(manga => this.renderCard(manga, 'latest')).join('')}
                        </div>

                        <!-- Pagination Home -->
                        ${data.pagination && data.pagination.hasNextPage ? `
                            <button class="btn-load" onclick="app.loadHome(${data.pagination.nextPage})">
                                Halaman Selanjutnya (Page ${data.pagination.nextPage}) <i class="fas fa-arrow-right"></i>
                            </button>
                        ` : ''}
                        
                        ${page > 1 ? `
                            <button class="btn-load" style="background:#555; margin-top:10px;" onclick="app.loadHome(${page - 1})">
                                <i class="fas fa-arrow-left"></i> Kembali ke Halaman ${page - 1}
                            </button>
                        ` : ''}
                    </div>

                    <!-- Right: Popular Today (Hanya tampil di Page 1 agar tidak duplikat) -->
                    ${page === 1 ? `
                    <div class="sidebar">
                        <h2 class="section-title"><i class="fas fa-chart-line"></i> Populer Hari Ini</h2>
                        <div class="popular-list">
                            ${data.popularToday.map(manga => this.renderSidebarItem(manga)).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        window.scrollTo(0, 0);
    },

    // 2. DETAIL MANGA
    async loadDetail(slug) {
        const data = await this.fetchData(`/detail/${slug}`);
        if (!data || !data.success) return;

        let html = `
            <div class="detail-page">
                <div class="detail-header">
                    <img src="${data.image}" class="detail-cover" alt="${data.title}">
                    <div class="detail-info">
                        <h1>${data.title}</h1>
                        <div style="margin-bottom: 15px;">
                            <span class="rating-badge"><i class="fas fa-star"></i> ${data.rating}</span>
                            <span>${data.alternativeTitle || ''}</span>
                        </div>
                        <p class="synopsis">${data.synopsis}</p>
                        <div class="genres">
                            ${data.genres.map(g => `<span class="genre-tag">${g.name}</span>`).join('')}
                        </div>
                    </div>
                </div>

                <h2 class="section-title">Daftar Chapter</h2>
                <div class="chapter-list">
                    ${data.chapters.map(chapter => `
                        <div class="chapter-btn" onclick="app.loadRead('${chapter.slug}')">
                            <strong>${chapter.title}</strong><br>
                            <small>${chapter.date}</small>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        this.container.innerHTML = html;
        window.scrollTo(0, 0);
    },

    // 3. BACA CHAPTER
    async loadRead(chapterSlug) {
        // Membersihkan slug jika ada trailing slash dari API
        const cleanSlug = chapterSlug.replace(/\/$/, "");
        const data = await this.fetchData(`/chapter/${cleanSlug}`);
        
        if (!data || !data.success) return;

        let html = `
            <div class="reader-container">
                <div class="reader-nav">
                    <button class="nav-btn" onclick="app.loadDetail('${chapterSlug.split('-chapter-')[0]}')">Kembali ke Detail</button>
                    <h4>${data.title}</h4>
                </div>

                <div class="reader-images">
                    ${data.images.map(img => `<img src="${img}" class="comic-page" loading="lazy">`).join('')}
                </div>

                <div class="reader-nav">
                    ${data.navigation.prev && data.navigation.prev !== '#/prev/' ? 
                        `<button class="nav-btn" onclick="app.loadRead('${this.extractSlug(data.navigation.prev)}')">Chapter Sebelumnya</button>` : '<div></div>'}
                    
                    ${data.navigation.next && data.navigation.next !== '#/next/' ? 
                        `<button class="nav-btn" onclick="app.loadRead('${this.extractSlug(data.navigation.next)}')">Chapter Berikutnya</button>` : '<div></div>'}
                </div>
            </div>
        `;
        this.container.innerHTML = html;
        window.scrollTo(0, 0);
    },

    // 4. SEARCH
    async handleSearch() {
        const query = document.getElementById('searchInput').value;
        if (!query) return;
        
        // Encode query agar aman untuk URL (misal spasi jadi + atau %20)
        // API contoh menggunakan format: A+Bachelor+in+the+Country
        const formattedQuery = query.replace(/ /g, '+');
        
        const data = await this.fetchData(`/search/${formattedQuery}`);
        if (!data || !data.success) return;

        let html = `
            <h2 class="section-title">Hasil Pencarian: "${query}"</h2>
            <div class="grid-container">
                ${data.results.map(manga => this.renderCard(manga)).join('')}
            </div>
        `;
        this.container.innerHTML = html;
    },

    // 5. LIST SEMUA MANGA
    async loadList(page = 1) {
        // API List structure: /list (mungkin support /list/page/2 atau query param, 
        // tapi di prompt: "api : .../list". Namun biasanya list butuh page.
        // Saya akan gunakan logika filter genre untuk list page jika diperlukan, 
        // tapi disini saya panggil list basic sesuai prompt.
        // Asumsi List pagination pattern mirip home.
        
        // Jika API list defaultnya page 1, kita coba append page untuk next
        const endpoint = page === 1 ? '/list' : `/list/${page}`; // Prediksi endpoint
        
        // Note: Karena prompt tidak spesifik tentang endpoint page ke-2 untuk LIST,
        // Kita gunakan endpoint /list saja, tapi menghandle pagination dari response JSON.
        
        const data = await this.fetchData(page === 1 ? '/list' : `/list/${page}`);
        
        // Jika endpoint /list/${page} gagal (404), kita harus menyesuaikan kembali,
        // tapi demi flow kode ini kita asumsikan strukturnya konsisten.
        
        if (!data || !data.success) return;

        let html = `
            <h2 class="section-title">Daftar Semua Komik (Halaman ${data.pagination.currentPage})</h2>
            <div class="grid-container">
                ${data.mangaList.map(manga => this.renderCard(manga)).join('')}
            </div>
            <div style="margin-top: 20px; display:flex; justify-content:center; gap:10px;">
                ${page > 1 ? `<button class="nav-btn" onclick="app.loadList(${page - 1})">Prev</button>` : ''}
                ${data.pagination.hasNextPage ? `<button class="nav-btn" onclick="app.loadList(${data.pagination.nextPage})">Next</button>` : ''}
            </div>
        `;
        this.container.innerHTML = html;
        window.scrollTo(0, 0);
    },

    // 6. GENRES
    async loadGenres() {
        const data = await this.fetchData('/genres');
        if (!data || !data.success) return;

        let html = `
            <h2 class="section-title">Pilih Genre</h2>
            <div style="display: flex; flex-wrap: wrap; justify-content: center;">
                ${data.genres.map(g => `
                    <div class="genre-tag" style="cursor:pointer;" onclick="app.loadGenreResult('${g.id}', 1, '${g.name}')">
                        ${g.name}
                    </div>
                `).join('')}
            </div>
        `;
        this.container.innerHTML = html;
    },

    async loadGenreResult(genreId, page = 1, genreName) {
        const data = await this.fetchData(`/genre/${genreId}/${page}`);
        if (!data || !data.success) return;

        let html = `
            <h2 class="section-title">Genre: ${genreName} (Page ${page})</h2>
            <div class="grid-container">
                ${data.mangaList.map(manga => this.renderCard(manga)).join('')}
            </div>
            <div style="margin-top: 20px; display:flex; justify-content:center; gap:10px;">
                ${page > 1 ? `<button class="nav-btn" onclick="app.loadGenreResult('${genreId}', ${page - 1}, '${genreName}')">Prev</button>` : ''}
                ${data.pagination.hasNextPage ? `<button class="nav-btn" onclick="app.loadGenreResult('${genreId}', ${data.pagination.nextPage}, '${genreName}')">Next</button>` : ''}
            </div>
        `;
        this.container.innerHTML = html;
        window.scrollTo(0, 0);
    },

    // --- RENDER HELPERS ---
    
    // Render Kartu Komik (Grid)
    renderCard(manga, type = 'normal') {
        // Handling Type Null
        const typeLabel = manga.type ? `<span class="type-badge">${manga.type}</span>` : '';
        const rating = manga.rating ? `<span class="rating-badge"><i class="fas fa-star"></i> ${manga.rating}</span>` : '';
        
        // Handling Chapter Text
        let chapterText = '';
        if (manga.chapter) {
            chapterText = manga.chapter;
        } else if (manga.chapters && manga.chapters.length > 0) {
            // Untuk Latest Updates yang punya array chapters
            chapterText = manga.chapters[0].title;
        }

        // Handling Time (Latest Updates)
        let timeText = '';
        if (manga.chapters && manga.chapters.length > 0) {
            timeText = `<small style="color:#aaa; display:block; margin-top:2px;">${manga.chapters[0].time}</small>`;
        }

        return `
            <div class="manga-card" onclick="app.loadDetail('${manga.slug}')">
                ${typeLabel}
                ${rating}
                <img src="${manga.image}" class="card-img" alt="${manga.title}" loading="lazy">
                <div class="card-info">
                    <div class="card-title" title="${manga.title}">${manga.title}</div>
                    <div class="card-meta">
                        <span>${chapterText}</span>
                    </div>
                    ${timeText}
                </div>
            </div>
        `;
    },

    // Render Item Sidebar (Popular)
    renderSidebarItem(manga) {
        return `
            <div style="display: flex; gap: 10px; margin-bottom: 15px; cursor: pointer;" onclick="app.loadDetail('${manga.slug}')">
                <img src="${manga.image}" style="width: 60px; height: 80px; object-fit: cover; border-radius: 4px;">
                <div>
                    <div style="font-weight: bold; font-size: 0.9rem; line-height:1.2; margin-bottom:5px;">${manga.title}</div>
                    <div style="font-size: 0.8rem; color: var(--primary);">${manga.chapter}</div>
                    <div style="font-size: 0.8rem; color: #777;"><i class="fas fa-star"></i> ${manga.rating}</div>
                </div>
            </div>
        `;
    },

    // Helper untuk mengambil slug bersih dari URL navigasi
    extractSlug(url) {
        // Asumsi url format: .../chapter/slug-chapter atau #/next/
        if(!url) return '';
        // Cek jika url adalah absolute path
        const parts = url.split('/');
        // Ambil bagian terakhir yang bermakna
        return parts[parts.length - 1] || parts[parts.length - 2]; 
    }
};

// Init App
document.addEventListener('DOMContentLoaded', () => {
    app.loadHome();
});
