/**
 * TileGrid - Wrapper for tile grids with grout effect
 * Makes tiles look like they're embedded in mortar
 */
export default function TileGrid({ children, className = '' }) {
  return (
    <div
      className={`grid grid-cols-4 gap-1 bg-gray-100 ${className}`}
    >
      {children}
    </div>
  )
}
