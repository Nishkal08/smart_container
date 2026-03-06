/**
 * ContainerLogo – minimalist SVG icon representing a shipping container
 * with crane mounting rings on top, door panels, and horizontal ribs.
 * Renders as a stroke SVG so it inherits `currentColor` from its parent.
 */
export function ContainerLogo({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Crane mounting rings */}
      <circle cx="6"  cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      {/* Connectors to body */}
      <path d="M6 6v2M18 6v2" stroke="currentColor" strokeWidth="1.5" />
      {/* Container body */}
      <rect x="2" y="8" width="20" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      {/* Vertical door dividers */}
      <line x1="9.5"  y1="8" x2="9.5"  y2="20" stroke="currentColor" strokeWidth="1.5" />
      <line x1="14.5" y1="8" x2="14.5" y2="20" stroke="currentColor" strokeWidth="1.5" />
      {/* Horizontal rib */}
      <line x1="2" y1="13.5" x2="22" y2="13.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
