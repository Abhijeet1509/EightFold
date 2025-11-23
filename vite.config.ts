// import { defineConfig, loadEnv } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vitejs.dev/config/
// export default defineConfig(({ mode }) => {
//   const env = loadEnv(mode, process.cwd(), '');
//   return {
//     plugins: [react()],
//     define: {
//       'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY),
//     },
//   }
// })
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // CRITICAL FIX: Look in .env file (env) AND System Variables (process.env)
  const apiKey = env.VITE_API_KEY || process.env.VITE_API_KEY;

  return {
    base: "/",
    plugins: [react()],
    define: {
      // If apiKey is undefined, we stringify an empty string to avoid build errors
      'process.env.API_KEY': JSON.stringify(apiKey || ''), 
    },
  }
})