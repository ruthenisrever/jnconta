const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if(file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

console.log("Aplicando parche profundo de puertos a todos los módulos...");
const files = walk(path.join(__dirname, 'frontend', 'app'));

let updatedCount = 0;
files.forEach(f => {
  let text = fs.readFileSync(f, 'utf8');
  
  if(text.includes('localhost:3000') || text.includes('localhost:3001')) {
    // Escapar process.env para forzar 3005 absoluto
    text = text.replace(/const API = process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:3000';/g, "const API = 'http://localhost:3005';");
    text = text.replace(/const API = \(process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:3000'\) \+ '\/api';/g, "const API = 'http://localhost:3005/api';");
    text = text.replace(/const API = \(process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/localhost:3001'\) \+ '\/api';/g, "const API = 'http://localhost:3005/api';");
    
    // Todos los demás fetch huérfanos e imágenes
    text = text.replace(/http:\/\/localhost:3000/g, 'http://localhost:3005');
    text = text.replace(/http:\/\/localhost:3001/g, 'http://localhost:3005');
    
    fs.writeFileSync(f, text);
    console.log('✅ Corregido: ' + path.basename(f));
    updatedCount++;
  }
});

console.log(`\n¡Listo! Se actualizaron ${updatedCount} archivos para evitar pantallas rotas.`);
