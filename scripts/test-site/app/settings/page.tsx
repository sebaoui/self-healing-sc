'use client';

import { useSettings, TitleSelector } from '../../context/SettingsContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { titleSelector, updateSelector } = useSettings();
  const router = useRouter();

  const handleUpdate = async (selector: TitleSelector) => {
    await updateSelector(selector);
    router.refresh();
  };

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Scraper Test Settings</h1>
      
      <div style={{ 
        padding: '2rem', 
        border: '1px solid #eee', 
        borderRadius: '8px',
        backgroundColor: '#fafafa'
      }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Article Title Selector</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Change the HTML tag used for article titles. The scraper is currently configured 
          to look for <code>h2</code>. If you change this to <code>h3</code>, 
          the scraper will no longer find the titles!
        </p>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => handleUpdate('h2')}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              border: '1px solid #ddd',
              backgroundColor: titleSelector === 'h2' ? '#007bff' : '#fff',
              color: titleSelector === 'h2' ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: titleSelector === 'h2' ? 'bold' : 'normal'
            }}
          >
            Use h2 (Default)
          </button>
          <button
            onClick={() => handleUpdate('h3')}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              border: '1px solid #ddd',
              backgroundColor: titleSelector === 'h3' ? '#007bff' : '#fff',
              color: titleSelector === 'h3' ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: titleSelector === 'h3' ? 'bold' : 'normal'
            }}
          >
            Use h3 (New)
          </button>
        </div>

        <div style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#888' }}>
          Current Active Selector: <code style={{ 
            backgroundColor: '#eee', 
            padding: '2px 4px', 
            borderRadius: '4px',
            color: '#d63384'
          }}>{titleSelector}</code>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Link href="/" style={{ color: '#007bff', textDecoration: 'none' }}>
          ← Back to Articles
        </Link>
      </div>
    </div>
  );
}
