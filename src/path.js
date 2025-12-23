// ============================================
// PATH SYSTEM - Waypoints and Interpolation
// ============================================

import { PATH_WAYPOINTS, PATH_WIDTH } from './settings.js'

// Pre-calculate segment lengths
const segments = []
let totalPathLength = 0

for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
  const from = PATH_WAYPOINTS[i]
  const to = PATH_WAYPOINTS[i + 1]
  const dx = to.x - from.x
  const dz = to.z - from.z
  const length = Math.sqrt(dx * dx + dz * dz)
  segments.push({
    from,
    to,
    length,
    startDistance: totalPathLength
  })
  totalPathLength += length
}

// Get total path length
export function getTotalPathLength() {
  return totalPathLength
}

// Get position along path (progress 0-1)
export function getPositionOnPath(progress) {
  const distance = progress * totalPathLength

  for (const seg of segments) {
    if (seg.startDistance + seg.length >= distance) {
      const t = (distance - seg.startDistance) / seg.length
      return {
        x: seg.from.x + (seg.to.x - seg.from.x) * t,
        z: seg.from.z + (seg.to.z - seg.from.z) * t
      }
    }
  }

  // Return end point if past the path
  const lastWaypoint = PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1]
  return { x: lastWaypoint.x, z: lastWaypoint.z }
}

// Get heading (rotation Y) at a position on path
export function getHeadingOnPath(progress) {
  const distance = progress * totalPathLength

  for (const seg of segments) {
    if (seg.startDistance + seg.length >= distance) {
      const dx = seg.to.x - seg.from.x
      const dz = seg.to.z - seg.from.z
      return Math.atan2(dx, dz)
    }
  }

  // Return last segment heading
  const lastSeg = segments[segments.length - 1]
  const dx = lastSeg.to.x - lastSeg.from.x
  const dz = lastSeg.to.z - lastSeg.from.z
  return Math.atan2(dx, dz)
}

// Convert speed to progress per second
export function speedToProgressPerSecond(speed) {
  return speed / totalPathLength
}

// Check if a point is on the path (for placement validation)
export function isOnPath(x, z, tolerance = 0) {
  const halfWidth = PATH_WIDTH / 2 + tolerance

  for (const seg of segments) {
    // Check if point is within the segment's bounding area
    const minX = Math.min(seg.from.x, seg.to.x) - halfWidth
    const maxX = Math.max(seg.from.x, seg.to.x) + halfWidth
    const minZ = Math.min(seg.from.z, seg.to.z) - halfWidth
    const maxZ = Math.max(seg.from.z, seg.to.z) + halfWidth

    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
      // Calculate distance to line segment
      const dx = seg.to.x - seg.from.x
      const dz = seg.to.z - seg.from.z
      const lengthSq = dx * dx + dz * dz

      if (lengthSq === 0) {
        // Segment is a point
        const dist = Math.sqrt((x - seg.from.x) ** 2 + (z - seg.from.z) ** 2)
        if (dist <= halfWidth) return true
      } else {
        // Project point onto line segment
        let t = ((x - seg.from.x) * dx + (z - seg.from.z) * dz) / lengthSq
        t = Math.max(0, Math.min(1, t))

        const projX = seg.from.x + t * dx
        const projZ = seg.from.z + t * dz
        const dist = Math.sqrt((x - projX) ** 2 + (z - projZ) ** 2)

        if (dist <= halfWidth) return true
      }
    }
  }

  return false
}

// Get path tiles for rendering
export function getPathTiles() {
  const tiles = new Set()
  const step = 0.5

  for (const seg of segments) {
    const dx = seg.to.x - seg.from.x
    const dz = seg.to.z - seg.from.z
    const steps = Math.ceil(seg.length / step)

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const cx = seg.from.x + dx * t
      const cz = seg.from.z + dz * t

      // Mark 5x5 area around center
      for (let ox = -2; ox <= 2; ox++) {
        for (let oz = -2; oz <= 2; oz++) {
          const tx = Math.floor(cx + ox)
          const tz = Math.floor(cz + oz)
          tiles.add(`${tx},${tz}`)
        }
      }
    }
  }

  return Array.from(tiles).map(key => {
    const [x, z] = key.split(',').map(Number)
    return { x, z }
  })
}

// Export waypoints for minimap etc
export function getWaypoints() {
  return PATH_WAYPOINTS
}
