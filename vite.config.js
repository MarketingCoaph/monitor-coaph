import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins:[react(),tailwindcss()],
  server:{
    proxy:{
      '/api':{
        target:'https://imprensas.coaph.com.br',
        changeOrigin:true,
        secure:true
      }
    }
  }
});
