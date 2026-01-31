/**
 * TileGrid - Wrapper for tile grids with grout effect
 * Makes tiles look like they're embedded in mortar
 */
export default function TileGrid({ children, className = '' }) {
  return (
    <div
      className={`grid grid-cols-3 gap-1.5 ${className}`}
      style={{ maxWidth: '400px', margin: '0 auto' }}
    >
      {children}
    </div>
  )
}
