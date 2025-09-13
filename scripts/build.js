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
    const articleCards = articles.map(article => {
      const slug = this.getArticleSlug(article);
      const image = article.image ? `<img src="images/${article.image}" alt="${article.title}" class="article-image">` : '';
      const date = new Date(article.date || article.published_at || Date.now()).toLocaleDateString();
      
      return `
        <article class="article-card">
          <a href="articles/${slug}.html" class="article-link">
            ${image}
            <div class="article-content">
              <h2 class="article-title">${article.title}</h2>
              <p class="article-excerpt">${article.excerpt || this.extractExcerpt(article.content)}</p>
              <div class="article-meta">
                <span class="article-date">${date}</span>
                ${article.author ? `<span class="article-author">by ${article.author}</span>` : ''}
              </div>
            </div>
          </a>
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
</head>
<body>
    <header class="header">
        <div class="container">
            <h1 class="site-title">Daily Content Hub</h1>
            <p class="site-description">Automated content, perfectly delivered</p>
        </div>
    </header>

    <main class="main">
        <div class="container">
            <div class="articles-grid">
                ${articleCards}
            </div>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} Daily Content Hub. Built with automated content management.</p>
            <a href="feed.xml" class="rss-link">RSS Feed</a>
        </div>
    </footer>
</body>
</html>`;
  }

  getArticlePageHTML(article) {
    const date = new Date(article.date || article.published_at || Date.now()).toLocaleDateString();
    const image = article.image ? `<img src="../images/${article.image}" alt="${article.title}" class="article-hero-image">` : '';
    
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
    ${article.image ? `<meta property="og:image" content="images/${article.image}">` : ''}
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