export function resolvePlayerAnimation({ grounded, direction, speed, running }) {
  if (!grounded) return `jump-${direction}`
  if (Math.abs(speed) < 1) return `idle-${direction}`
  return `${running ? 'run' : 'walk'}-${direction}`
}
