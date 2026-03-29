import Link from 'next/link';
import { articles } from '../data/articles';
import { getTitleSelector } from '../data/settingsStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const titleSelector = getTitleSelector();
  console.log(`[SSR] Rendering articles page using: <${titleSelector}> tag`);
  const TitleTag = titleSelector;

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Latest Articles</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/article/${article.id}`}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              overflow: 'hidden',
              transition: 'box-shadow 0.2s',
            }}
          >
            <div style={{ position: 'relative', width: '100%', height: '200px', backgroundColor: '#f0f0f0' }}>
              <img
                src={article.thumbnail}
                alt={article.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
            <div style={{ padding: '1.5rem' }}>
              <TitleTag style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>{article.title}</TitleTag>
              <p style={{ margin: '0 0 1rem 0', color: '#666' }}>{article.excerpt}</p>
              <div style={{ fontSize: '0.875rem', color: '#888' }}>
                {article.author} • {article.date}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}