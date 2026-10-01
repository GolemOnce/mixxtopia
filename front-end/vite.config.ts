import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // 같은 네트워크의 다른 기기(폰 등)에서 접속 테스트할 수 있도록 0.0.0.0에 바인딩한다.
    host: true,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
