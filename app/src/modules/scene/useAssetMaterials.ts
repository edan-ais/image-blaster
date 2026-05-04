import { useMemo, useEffect } from 'react'
import * as THREE from 'three'

export const SHADED_COLOR = new THREE.Color(0xb8b8b8)
export const HOVER_DIM_FACTOR = 0.72

export interface AssetMaterials {
  wireframeMaterial: THREE.MeshBasicMaterial
  shadedMaterial: THREE.MeshStandardMaterial
  wireframeOverlayMaterial: THREE.MeshBasicMaterial
  shadowCatcherMaterial: THREE.ShadowMaterial
}

export function useAssetMaterials(): AssetMaterials {
  const materials = useMemo<AssetMaterials>(
    () => ({
      wireframeMaterial: new THREE.MeshBasicMaterial({
        color: 0x000000,
        wireframe: true,
        toneMapped: false,
        fog: false,
      }),
      shadedMaterial: new THREE.MeshStandardMaterial({
        color: SHADED_COLOR,
        roughness: 0.75,
        metalness: 0,
      }),
      wireframeOverlayMaterial: new THREE.MeshBasicMaterial({
        color: 0x000000,
        wireframe: true,
        toneMapped: false,
        fog: false,
      }),
      shadowCatcherMaterial: new THREE.ShadowMaterial({
        opacity: 0.3,
        transparent: true,
      }),
    }),
    [],
  )

  useEffect(() => {
    return () => {
      materials.wireframeMaterial.dispose()
      materials.shadedMaterial.dispose()
      materials.wireframeOverlayMaterial.dispose()
      materials.shadowCatcherMaterial.dispose()
    }
  }, [materials])

  return materials
}
