import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { liveNewsPlugin } from './dev-server/live-news.js';
export default defineConfig(({mode})=>{const env=loadEnv(mode,process.cwd(),'');return{
  plugins:[liveNewsPlugin({serperApiKey:env.SERPER_API_KEY}),react(),tailwindcss()],
  server:{
    proxy:{
      '/api':{
        target:'https://imprensas.coaph.com.br',
        changeOrigin:true,
        secure:true
      }
    }
  }
}});
