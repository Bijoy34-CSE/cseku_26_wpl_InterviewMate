import { useEffect } from 'react';

// Adds `is-visible` to every `.im-reveal` element once it scrolls into view.
// One observer for the whole page keeps this cheap; elements animate once.
export function useReveal(dep) {
  useEffect(() => {
    const nodes = document.querySelectorAll('.im-reveal:not(.is-visible)');
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('is-visible'));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [dep]);
}
