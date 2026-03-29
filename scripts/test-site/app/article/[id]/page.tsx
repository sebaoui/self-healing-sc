import Link from 'next/link';
import { getArticleById, articles } from '../../../data/articles';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return articles.map((article) => ({
    id: article.id,
  }));
}

export default async function ArticlePage({ params }: PageProps) {
  const { id } = await params;
  const article = getArticleById(id);

  if (!article) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          marginBottom: '1.5rem',
          color: '#666',
          textDecoration: 'none',
        }}
      >
        ← Back to Articles
      </Link>
      
      <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ width: '100%', height: '300px', backgroundColor: '#f0f0f0' }}>
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
        
        <div style={{ padding: '2rem' }}>
          <h1 style={{ margin: '0 0 1rem 0', fontSize: '2rem' }}>{article.title}</h1>
          
          <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: '2rem' }}>
            By {article.author} • {article.date}
          </div>
          
          <div
            style={{
              lineHeight: '1.8',
              color: '#333',
            }}
          >
            {article.content.split('\n').map((line, index) => {
              const trimmed = line.trim();
              if (trimmed.startsWith('# ')) {
                return <h2 key={index} style={{ marginTop: '2rem', marginBottom: '1rem' }}>{trimmed.slice(2)}</h2>;
              }
              if (trimmed.startsWith('## ')) {
                return <h3 key={index} style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>{trimmed.slice(3)}</h3>;
              }
              if (trimmed.startsWith('- ')) {
                return <li key={index} style={{ marginLeft: '1.5rem', marginBottom: '0.5rem' }}>{trimmed.slice(2)}</li>;
              }
              if (trimmed.match(/^\d+\.\s/)) {
                return <li key={index} style={{ marginLeft: '1.5rem', marginBottom: '0.5rem' }}>{trimmed.replace(/^\d+\.\s/, '')}</li>;
              }
              if (trimmed === '') {
                return <br key={index} />;
              }
              return <p key={index} style={{ marginBottom: '1rem' }}>{trimmed}</p>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}