import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export async function generateStaticParams() {
    const docsDir = path.join(process.cwd(), "docs");

    function getMdFiles(dir: string, base: string = ""): { slug: string[] }[] {
        const files = fs.readdirSync(dir);
        let results: { slug: string[] }[] = [];

        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                results = results.concat(getMdFiles(fullPath, path.join(base, file)));
            } else if (file.endsWith(".md")) {
                const slugPath = path
                    .join(base, file.replace(".md", ""))
                    .split(path.sep)
                    .filter(Boolean);
                results.push({ slug: slugPath });
            }
        }
        return results;
    }

    return getMdFiles(docsDir);
}

export default async function DocPage({ params }: { params: Promise<{ slug: string[] }> }) {
    const { slug } = await params;
    const filePath = path.join(process.cwd(), "docs", ...slug) + ".md";

    let content = "";
    try {
        if (!fs.existsSync(filePath)) {
            notFound();
        }
        content = fs.readFileSync(filePath, "utf8");
    } catch (error) {
        notFound();
    }

    return (
        <article className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
    );
}
