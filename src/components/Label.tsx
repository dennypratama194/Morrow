/** Button text that rolls up to a copy of itself on hover. The copy is drawn by CSS, so screen readers hear it once. */
export function L({ children }: { children: string }) {
  return <span className="bl" data-l={children}><span>{children}</span></span>;
}
