import React from 'react'
import Svg, { Path } from 'react-native-svg'

const ARROW_PATH =
  'M21.415,12.554 L2.418,0.311 C1.291,-0.296 0,-0.233 0,1.946 L0,26.054 C0,28.046 1.385,28.36 2.418,27.689 L21.415,15.446 C22.197,14.647 22.197,13.353 21.415,12.554'

export default function ArrowIcon({
  direction,
  color,
  size = 18,
}: {
  direction: 'left' | 'right'
  color: string
  size?: number
}) {
  const flip = direction === 'left'
  return (
    <Svg
      width={size}
      height={size}
      viewBox="-1 -1 26 30"
      style={[
        { backgroundColor: 'transparent' },
        flip ? { transform: [{ scaleX: -1 }] } : undefined,
      ]}
    >
      <Path fill={color} d={ARROW_PATH} />
    </Svg>
  )
}
