/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          queso: {
            yellow: '#FFB800', 
            light: '#FFF0C2',  
          },
          madera: {
            brown: '#4A2511',  
            light: '#8B5A2B',  
          },
          sarchi: {
            red: '#D32F2F',    
          },
          poas: {
            green: '#2E7D32',  
          }
        }
      },
    },
    plugins: [],
  }