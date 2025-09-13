import fs from 'fs/promises';
import path from 'path';

class SiteBuilder {
  constructor() {
    this.distDir = 'dist';
    this.articlesFile = 'articles.json';
    this.imagesDir = 'images';
  }

  async build() {
    console.log('🚀 Building site...');
    
    try {
      // Clean and create dist directory
      await this.cleanDist();
      await this.createDist();
      
      // Load articles
      const articles = await this.loadArticles();
      
      // Copy assets
      await this.copyAssets();
      
      // Generate pages
      await this.generateHomePage(articles);
      await this.generateArticlePages(articles);
      await this.generateRSSFeed(articles);
      
      console.log('✅ Site built successfully!');
    } catch (error) {
      console.error('❌ Build failed:', error);
      process.exit(1);
    }
  }

  async cleanDist() {
    try {
      await fs.rm(this.distDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's ok
    }
  }

  async createDist() {
    await fs.mkdir(this.distDir, { recursive: true });
    await fs.mkdir(path.join(this.distDir, 'articles'), { recursive: true });
    await fs.mkdir(path.join(this.distDir, 'images'), { recursive: true });
  }

  async loadArticles() {
    try {
      const data = await fs.readFile(this.articlesFile, 'utf-8');
      const articles = JSON.parse(data);
      
      // Sort articles by date (newest first)
      return articles.sort((a, b) => new Date(b.date || b.published_at || 0) - new Date(a.date || a.published_at || 0));
    } catch (error) {
      console.warn('No articles.json found, creating sample data...');
      return this.createSampleArticles();
    }
  }

  createSampleArticles() {
    return [
      {
        id: 'sample-article',
        title: 'Welcome to Your Automated Content Site',
        content: 'This is a sample article. Update your articles.json file to add your own content!',
        date: new Date().toISOString(),
        author: 'Site Builder',
        image: null,
        excerpt: 'Get started with your automated content management system.'
      }
    ];
  }

  async copyAssets() {
    // Copy CSS
    await fs.writeFile(path.join(this.distDir, 'styles.css'), this.getCSS());
    
    // Copy images
    try {
      const images = await fs.readdir(this.imagesDir);
      for (const image of images) {
        await fs.copyFile(
          path.join(this.imagesDir, image),
          path.join(this.distDir, 'images', image)
        );
      }
    } catch (error) {
      console.warn('No images directory found');
    }
  }

  async generateHomePage(articles) {
    const html = this.getHomePageHTML(articles);
    await fs.writeFile(path.join(this.distDir, 'index.html'), html);
  }

  async generateArticlePages(articles) {
    for (const article of articles) {
      const html = this.getArticlePageHTML(article);
      const filename = this.getArticleSlug(article) + '.html';
      await fs.writeFile(path.join(this.distDir, 'articles', filename), html);
    }
  }

  async generateRSSFeed(articles) {
    const rss = this.getRSSFeed(articles);
    await fs.writeFile(path.join(this.distDir, 'feed.xml'), rss);
  }

  getArticleSlug(article) {
    return (article.slug || article.id || article.title || 'untitled')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  getHomePageHTML(articles) {
    // Get featured article (first article when showing all)
    const featuredArticle = articles.length > 0 ? articles[0] : null;
    const regularArticles = articles.slice(1);
    
    const featuredSection = featuredArticle ? `
      <section class="border-b border-gray-800 dark:border-gray-600 pb-8 cursor-pointer relative group" onclick="window.location.href='articles/${this.getArticleSlug(featuredArticle)}.html'">
        <div class="grid lg:grid-cols-2 lg:gap-x-8 lg:gap-y-8">
          <div class="order-2 lg:order-1 relative p-6 bg-cream-100 dark:bg-dark-700 shadow-lg">
            <div class="relative z-10">
              <div class="flex items-center space-x-2 mb-3">
                <span class="px-2 py-1 bg-black text-cream-50 dark:bg-cream-200 dark:text-black text-xs font-semibold uppercase tracking-wide">
                  ${featuredArticle.category || 'General'}
                </span>
                <span class="text-xs text-gray-600 dark:text-gray-400 tracking-wide">
                  ${new Date(featuredArticle.date || featuredArticle.published_at || Date.now()).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-black dark:text-cream-200 mb-4 font-serif leading-tight">
                ${featuredArticle.title}
              </h1>
              <div class="text-lg text-gray-800 dark:text-gray-200 mb-4 leading-relaxed">
                ${featuredArticle.excerpt || this.extractExcerpt(featuredArticle.content)}
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 font-medium">
                By ${featuredArticle.author || 'Anonymous'}
              </p>
            </div>
            ${featuredArticle.is_favorite ? '<div class="absolute top-6 right-6 p-1 rounded-full text-yellow-500 text-lg z-20">🏆</div>' : ''}
            <div class="absolute bottom-6 left-6 hidden md:block text-sm text-gray-700 dark:text-cream-200 font-semibold italic z-20">
              Powered by <span class="cursor-pointer border-b border-current hover:text-black dark:hover:text-cream-50 transition-colors">$CWORD</span>. Don't ask what it stands for.
            </div>
          </div>
          <div class="order-1 lg:order-2 shadow-lg">
            <div class="aspect-square overflow-hidden">
              <img
                src="${featuredArticle.image_webp}"
                alt="${featuredArticle.title}"
                loading="lazy"
                class="w-full h-full object-cover"
                onerror="this.src='images/placeholder.webp'"
              />
            </div>
          </div>
        </div>
      </section>
    ` : '';

    const articleCards = regularArticles.map(article => {
      const slug = this.getArticleSlug(article);
      const image = article.image_webp ? `
        <div class="aspect-square overflow-hidden mb-4">
          <img src="${article.image_webp}" alt="${article.title}" loading="lazy" class="w-full h-full object-cover hover:scale-105 transition-transform duration-300" onerror="this.src='images/placeholder.webp'">
        </div>
      ` : '';
      const date = new Date(article.date || article.published_at || Date.now()).toLocaleDateString();
      
      return `
        <article class="bg-cream-100 dark:bg-dark-700 shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer group" onclick="window.location.href='articles/${slug}.html'">
          <div class="article-content">
            ${image}
            <div class="p-4">
              <div class="flex items-center space-x-2 mb-2">
                <span class="px-2 py-1 bg-black text-cream-50 dark:bg-cream-200 dark:text-black text-xs font-semibold uppercase tracking-wide">
                  ${article.category || 'General'}
                </span>
                ${article.is_favorite ? '<span class="text-yellow-500">🏆</span>' : ''}
              </div>
              <h2 class="text-lg font-bold text-black dark:text-cream-200 mb-2 font-serif leading-tight group-hover:text-gray-700 dark:group-hover:text-cream-100 transition-colors">
                ${article.title}
              </h2>
              <p class="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                ${article.excerpt || this.extractExcerpt(article.content)}
              </p>
              <div class="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                <span>${date}</span>
                ${article.author ? `<span>by ${article.author}</span>` : ''}
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Content Hub</title>
    <meta name="description" content="Your automated content management system">
    <link rel="stylesheet" href="styles.css">
    <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="feed.xml">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            colors: {
              'cream': {
                50: '#fefdf9',
                100: '#fdf8f0',
                200: '#f9f0e1',
                300: '#f4e6d1',
              },
              'dark': {
                700: '#2d3748',
                800: '#1a202c',
              }
            },
            fontFamily: {
              'serif': ['Georgia', 'serif'],
            }
          }
        }
      }
    </script>
</head>
<body class="min-h-screen bg-cream-200 dark:bg-dark-800">
    <header class="bg-cream-100 dark:bg-dark-700 shadow-lg sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-2xl sm:text-3xl font-bold text-black dark:text-cream-200 font-serif">Daily Content Hub</h1>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Automated content, perfectly delivered</p>
                </div>
                <button onclick="toggleDarkMode()" class="p-2 rounded-lg bg-black text-cream-50 dark:bg-cream-200 dark:text-black hover:opacity-80 transition-opacity">
                    🌙
                </button>
            </div>
        </div>
    </header>

    <main class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="space-y-8">
            ${featuredSection}
            
            ${regularArticles.length > 0 ? `
            <section>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
                    ${articleCards}
                </div>
            </section>
            ` : ''}
        </div>
    </main>
    <footer class="bg-cream-100 dark:bg-dark-700 mt-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
            <p>&copy; ${new Date().getFullYear()} Daily Content Hub. Built with automated content management.</p>
            <a href="feed.xml" class="text-black dark:text-cream-200 hover:opacity-80 transition-opacity">RSS Feed</a>
        </div>
    </footer>
    
    <script>
        function toggleDarkMode() {
            document.documentElement.classList.toggle('dark');
            localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
        }
        
        // Initialize dark mode from localStorage
        if (localStorage.getItem('darkMode') === 'true') {
            document.documentElement.classList.add('dark');
        }
    </script>
</body>
</html>`;
  }

  getArticlePageHTML(article) {
    const date = new Date(article.date || article.published_at || Date.now()).toLocaleDateString();
    const image = article.image_webp ? `<img src="${article.image_webp}" alt="${article.title}" class="article-hero-image">` : '';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title} - Daily Content Hub</title>
    <meta name="description" content="${article.excerpt || this.extractExcerpt(article.content)}">
    <link rel="stylesheet" href="../styles.css">
    <meta property="og:title" content="${article.title}">
    <meta property="og:description" content="${article.excerpt || this.extractExcerpt(article.content)}">
    ${article.image_webp ? `<meta property="og:image" content="${article.image_webp}">` : ''}
</head>
<body>
    <header class="header">
        <div class="container">
            <a href="../" class="back-link">← Back to Home</a>
            <h1 class="site-title">Daily Content Hub</h1>
        </div>
    </header>

    <main class="main">
        <div class="container">
            <article class="article-full">
                <header class="article-header">
                    <h1 class="article-title">${article.title}</h1>
                    <div class="article-meta">
                        <span class="article-date">${date}</span>
                        ${article.author ? `<span class="article-author">by ${article.author}</span>` : ''}
                    </div>
                </header>
                
                ${image}
                
                <div class="article-body">
                    ${this.formatContent(article.content)}
                </div>
            </article>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} Daily Content Hub</p>
            <a href="../" class="back-link">← Back to Home</a>
        </div>
    </footer>
</body>
</html>`;
  }

  extractExcerpt(content, length = 150) {
    if (!content) return '';
    const text = content.replace(/<[^>]*>/g, '').trim();
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  formatContent(content) {
    if (!content) return '';
    
    // Convert line breaks to paragraphs if content is plain text
    if (!content.includes('<')) {
      return content.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('');
    }
    
    return content;
  }

  getRSSFeed(articles) {
    const items = articles.slice(0, 20).map(article => {
      const slug = this.getArticleSlug(article);
      const date = new Date(article.date || article.published_at || Date.now()).toUTCString();
      
      return `
        <item>
            <title><![CDATA[${article.title}]]></title>
            <link>articles/${slug}.html</link>
            <description><![CDATA[${article.excerpt || this.extractExcerpt(article.content)}]]></description>
            <pubDate>${date}</pubDate>
            <guid>articles/${slug}.html</guid>
        </item>
      `;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
    <channel>
        <title>Daily Content Hub</title>
        <description>Your automated content management system</description>
        <link>/</link>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        ${items}
    </channel>
</rss>`;
  }

  getCSS() {
    return `
/* Reset and base styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f8fafc;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Header */
.header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem 0;
    text-align: center;
}

.site-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
}

.site-description {
    font-size: 1.1rem;
    opacity: 0.9;
}

.back-link {
    color: white;
    text-decoration: none;
    font-weight: 500;
    margin-bottom: 1rem;
    display: inline-block;
    opacity: 0.9;
    transition: opacity 0.2s;
}

.back-link:hover {
    opacity: 1;
}

/* Main content */
.main {
    padding: 3rem 0;
    min-height: calc(100vh - 200px);
}

/* Articles grid */
.articles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
}

.article-card {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s, box-shadow 0.2s;
}

.article-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.article-link {
    text-decoration: none;
    color: inherit;
    display: block;
}

.article-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
}

.article-content {
    padding: 1.5rem;
}

.article-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: #1a202c;
}

.article-excerpt {
    color: #4a5568;
    margin-bottom: 1rem;
    line-height: 1.5;
}

.article-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
    color: #718096;
}

/* Full article page */
.article-full {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.article-header {
    padding: 2rem;
    border-bottom: 1px solid #e2e8f0;
}

.article-full .article-title {
    font-size: 2rem;
    margin-bottom: 1rem;
}

.article-hero-image {
    width: 100%;
    height: 300px;
    object-fit: cover;
}

.article-body {
    padding: 2rem;
    font-size: 1.1rem;
    line-height: 1.7;
}

.article-body p {
    margin-bottom: 1.5rem;
}

.article-body h2 {
    font-size: 1.5rem;
    margin: 2rem 0 1rem 0;
    color: #2d3748;
}

.article-body h3 {
    font-size: 1.25rem;
    margin: 1.5rem 0 0.75rem 0;
    color: #2d3748;
}

/* Footer */
.footer {
    background: #2d3748;
    color: white;
    padding: 2rem 0;
    text-align: center;
}

.footer .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.rss-link {
    color: #90cdf4;
    text-decoration: none;
}

.rss-link:hover {
    text-decoration: underline;
}

/* Responsive design */
@media (max-width: 768px) {
    .articles-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
    }
    
    .site-title {
        font-size: 2rem;
    }
    
    .article-full .article-title {
        font-size: 1.5rem;
    }
    
    .footer .container {
        flex-direction: column;
        gap: 1rem;
    }
}

@media (max-width: 480px) {
    .container {
        padding: 0 15px;
    }
    
    .article-content {
        padding: 1rem;
    }
    
    .article-header,
    .article-body {
        padding: 1.5rem;
    }
}
`;
  }
}

// Run the build
const builder = new SiteBuilder();
builder.build();