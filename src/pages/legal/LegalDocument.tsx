import type { ReactNode } from "react";
import { Link } from "react-router";

// Compartim la presentació dels documents; el registre queda obert a l’altra pestanya.
export default function LegalDocument({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10 text-foreground">
      <article className="mx-auto max-w-3xl space-y-5 leading-relaxed break-words [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_a]:text-warning [&_a]:underline [&_a]:underline-offset-4 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-warning [&_blockquote]:border-l-4 [&_blockquote]:border-warning [&_blockquote]:pl-4 [&_blockquote]:text-muted [&_table]:w-full [&_table]:min-w-[36rem] [&_th]:p-3 [&_th]:text-left [&_td]:border-b [&_td]:border-separator [&_td]:p-3 [&_td]:align-top">
        {children}
      </article>
      <nav aria-label="Documentos del registro" className="mx-auto mt-10 flex max-w-3xl flex-wrap gap-6 text-warning underline underline-offset-4">
        <Link to="/legal/condiciones-de-uso">Condiciones de uso</Link>
        <Link to="/legal/politica-de-privacidad">Política de privacidad</Link>
      </nav>
    </div>
  );
}
