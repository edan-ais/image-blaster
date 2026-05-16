import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import path from 'path'

// External packages the consumer must supply (peer deps)
const external = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'three',
  /^three\/.*/,
  '@react-three/fiber',
  /^@react-three\/fiber\/.*/,
  '@react-three/drei',
  '@react-three/rapier',
  '@react-three/postprocessing',
  '@sparkjsdev/spark',
  'postprocessing',
  'zustand',
  /^zustand\/.*/,
  '@radix-ui/themes',
  '@phosphor-icons/react',
  'tailwind-merge',
  'three-stdlib',
]

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/lib.ts', 'src/components/WorldViewer.tsx', 'src/types/world.ts', 'src/utils/worldLoader.ts'],
      outDir: 'dist/lib',
      insertTypesEntry: true,
      skipDiagnostics: true,
    }),
  ],
  publicDir: false,
  define: {
    'import.meta.env.DEV': 'false',
    'import.meta.env.PROD': 'true',
    // suppress hot module replacement in lib consumers
    'import.meta.hot': 'undefined',
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/lib.ts'),
      name: 'ImageBlaster',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    outDir: 'dist/lib',
    rollupOptions: {
      external,
      output: {
        assetFileNames: 'index.[ext]',
      },
    },
  },
  resolve: {
    alias: {
      // stub out the virtual:worlds module — not used by WorldViewer itself
      'virtual:worlds': path.resolve(__dirname, 'src/lib-stubs/virtual-worlds.ts'),
    },
  },
})
