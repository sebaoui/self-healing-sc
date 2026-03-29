export interface Article {
  id: string;
  title: string;
  thumbnail: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
}

export const articles: Article[] = [
  {
    id: '1',
    title: 'How AI is Transforming Modern Businesses',
    thumbnail: 'https://picsum.photos/seed/article1/800/400',
    excerpt: 'Explore the profound impact of artificial intelligence on corporate strategy and operations.',
    content: '# How AI is Transforming Modern Businesses\n\nAI is no longer a future concept...',
    author: 'AI Specialist',
    date: 'March 20, 2026'
  },
  {
    id: '2',
    title: 'Beginner’s Guide to Web Scraping in 2026',
    thumbnail: 'https://picsum.photos/seed/article2/800/400',
    excerpt: 'A comprehensive entry point into the world of data extraction using the latest tools.',
    content: '# Beginner’s Guide to Web Scraping in 2026\n\nWeb scraping has evolved significantly...',
    author: 'Data Enthusiast',
    date: 'March 18, 2026'
  },
  {
    id: '3',
    title: 'Top 10 Side Hustles You Can Start Today',
    thumbnail: 'https://picsum.photos/seed/article3/800/400',
    excerpt: 'Discover actionable ways to generate extra income using your existing skills.',
    content: '# Top 10 Side Hustles You Can Start Today\n\nLooking for extra income?',
    author: 'Founder',
    date: 'March 15, 2026'
  },
  {
    id: '4',
    title: 'Understanding APIs: A Simple Explanation',
    thumbnail: 'https://picsum.photos/seed/article4/800/400',
    excerpt: 'The fundamental building blocks of modern software explained in plain English.',
    content: '# Understanding APIs: A Simple Explanation\n\nAPIs are everywhere...',
    author: 'Tech Writer',
    date: 'March 12, 2026'
  },
  {
    id: '5',
    title: 'How to Automate Your Workflow with Python',
    thumbnail: 'https://picsum.photos/seed/article5/800/400',
    excerpt: 'Save hours every week by automating repetitive tasks with simple scripts.',
    content: '# How to Automate Your Workflow with Python\n\nPython is the perfect language for automation...',
    author: 'Python Expert',
    date: 'March 10, 2026'
  },
  {
    id: '6',
    title: 'The Future of No-Code and Low-Code Platforms',
    thumbnail: 'https://picsum.photos/seed/article6/800/400',
    excerpt: 'How non-technical creators are building complex software without writing code.',
    content: '# The Future of No-Code and Low-Code Platforms\n\nThe barriers to entry are falling...',
    author: 'No-Code Advocate',
    date: 'March 08, 2026'
  },
  {
    id: '7',
    title: 'Building Scalable Applications: Key Principles',
    thumbnail: 'https://picsum.photos/seed/article7/800/400',
    excerpt: 'Architectural patterns to ensure your software remains performant as it grows.',
    content: '# Building Scalable Applications: Key Principles\n\nScalability is a design choice...',
    author: 'Software Architect',
    date: 'March 05, 2026'
  },
  {
    id: '8',
    title: 'Data Privacy in the Age of AI',
    thumbnail: 'https://picsum.photos/seed/article8/800/400',
    excerpt: 'Protecting personal information in an era of massive data collection.',
    content: '# Data Privacy in the Age of AI\n\nPrivacy is more important than ever...',
    author: 'Security Researcher',
    date: 'March 02, 2026'
  },
  {
    id: '9',
    title: 'How to Start a Tech Blog and Monetize It',
    thumbnail: 'https://picsum.photos/seed/article9/800/400',
    excerpt: 'Turn your knowledge into a sustainable income stream through technical writing.',
    content: '# How to Start a Tech Blog and Monetize It\n\nTechnical writing is in high demand...',
    author: 'Blogger',
    date: 'February 28, 2026'
  },
  {
    id: '10',
    title: 'Common Mistakes Developers Make and How to Avoid Them',
    thumbnail: 'https://picsum.photos/seed/article10/800/400',
    excerpt: 'Accelerate your career by learning from the pitfalls of others.',
    content: '# Common Mistakes Developers Make\n\nWe all make mistakes...',
    author: 'Senior Engineer',
    date: 'February 25, 2026'
  }
];

export function getArticleById(id: string): Article | undefined {
  return articles.find(article => article.id === id);
}

export function getAllArticles(): Article[] {
  return articles;
}