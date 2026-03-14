import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Allowed documentation slugs
const validSlugs = ['introduction', 'app-guide', 'extension-guide', 'faq-troubleshooting'];

export async function generateStaticParams() {
  return validSlugs.map((slug) => ({
    slug,
  }));
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;

  if (!validSlugs.includes(slug)) {
    notFound();
  }

  const filePath = path.join(process.cwd(), 'docs', `${slug}.md`);
  
  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    notFound();
  }

  return (
    <article className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
