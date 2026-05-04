import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { useDebugStore } from '../../store/debug'
import { ObjectRenderMode, WorldRenderMode } from '../../types/world'
import { SHADED_COLOR } from '../scene/useAssetMaterials'

const LARGE = 200
const GRID_SIZE = 5
const GRID_DIVS = 5

export function GroundPlane() {
  const objectRenderMode = useDebugStore((s) => s.objectRenderMode)
  const worldRenderMode = useDebugStore((s) => s.worldRenderMode)

  const isObjectOnly = worldRenderMode === WorldRenderMode.ObjectOnly
  const isLit = objectRenderMode === ObjectRenderMode.Lit
  const isWireframe = objectRenderMode === ObjectRenderMode.Wireframe
  const isShaded = objectRenderMode === ObjectRenderMode.ShadedWireframe

  const gridLines = useMemo(() => {
    const geo = new THREE.EdgesGeometry(
      new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE, GRID_DIVS, GRID_DIVS),
    )
    const lines = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: 0x000000, fog: false }),
    )
    lines.rotation.x = -Math.PI / 2
    return lines
  }, [])

  return (
    <>
      {/* large wireframe/shaded plane — non-ObjectOnly, non-Lit */}
      {!isObjectOnly && !isLit && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[LARGE, LARGE]} />
            {isShaded
              ? <meshStandardMaterial color={SHADED_COLOR} roughness={0.75} metalness={0} />
              : <meshBasicMaterial color={0x000000} wireframe toneMapped={false} fog={false} />
            }
          </mesh>
          {isShaded && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} renderOrder={1}>
              <planeGeometry args={[LARGE, LARGE]} />
              <meshBasicMaterial color={0x000000} wireframe toneMapped={false} fog={false} />
            </mesh>
          )}
        </>
      )}

      {/* ObjectOnly: small 5×5 grid */}
      {isObjectOnly && (
        <>
          {isWireframe && <primitive object={gridLines} />}

          {!isWireframe && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[GRID_SIZE, GRID_SIZE, GRID_DIVS, GRID_DIVS]} />
              {isLit
                ? <shadowMaterial transparent opacity={1} depthWrite={false} />
                : <meshStandardMaterial color={SHADED_COLOR} roughness={0.75} metalness={0} />
              }
            </mesh>
          )}

          {isShaded && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} renderOrder={1}>
              <planeGeometry args={[GRID_SIZE, GRID_SIZE, GRID_DIVS, GRID_DIVS]} />
              <meshBasicMaterial color={0x000000} wireframe toneMapped={false} fog={false} />
            </mesh>
          )}

          <RigidBody type="fixed">
            <CuboidCollider args={[GRID_SIZE / 2, 0.05, GRID_SIZE / 2]} position={[0, -0.05, 0]} />
          </RigidBody>
        </>
      )}

      {/* physics safety net */}
      <RigidBody type="fixed" position={[0, -10, 0]}>
        <CuboidCollider args={[LARGE / 2, 1, LARGE / 2]} />
      </RigidBody>
    </>
  )
}
