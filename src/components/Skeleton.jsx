/*
 * Flat placeholder block used by every skeleton state.
 * Data attributes let each page compose the final shape without
 * introducing new dependencies.
 */
export default function Skeleton({
  width,
  height,
  className = "",
}) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonLines({ lines = 3 }) {
  return (
    <div className="skeleton-lines" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          width={
            index === lines - 1
              ? "62%"
              : "100%"
          }
        />
      ))}
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div
      className="sidebar-skeleton"
      role="status"
      aria-label="Loading analyses"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div
          className="sidebar-skeleton-row"
          key={index}
        >
          <Skeleton width="82%" height="12px" />
          <Skeleton width="48%" height="10px" />
        </div>
      ))}
    </div>
  );
}
