const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Rad\\Downloads\\Github\\cert-system\\skripsi_text.txt', 'utf8');

const getSection = (startKeyword, endKeyword) => {
    // try to find case-insensitive
    const startRegex = new RegExp(startKeyword, "i");
    const endRegex = new RegExp(endKeyword, "i");
    
    const startMatch = content.match(startRegex);
    if (!startMatch) return "NOT FOUND: " + startKeyword;
    
    const start = startMatch.index;
    
    // search for end keyword after start
    const afterStart = content.substring(start + startKeyword.length);
    const endMatch = afterStart.match(endRegex);
    
    if (!endMatch) return content.substring(start, start + 3000);
    const end = start + startKeyword.length + endMatch.index;
    
    return content.substring(start, end);
};

let out = "";
out += "=== LATAR BELAKANG ===\n" + getSection("Latar Belakang", "Rumusan Masalah") + "\n\n";
out += "=== RUMUSAN MASALAH ===\n" + getSection("Rumusan Masalah", "Tujuan Penelitian") + "\n\n";
out += "=== TUJUAN PENELITIAN ===\n" + getSection("Tujuan Penelitian", "Batasan Masalah") + "\n\n";
out += "=== BATASAN MASALAH ===\n" + getSection("Batasan Masalah", "Sistematika Penulisan") + "\n\n";

fs.writeFileSync('C:\\Users\\Rad\\Downloads\\Github\\cert-system\\skripsi_extracted_sections.txt', out, 'utf8');
console.log('Sections extracted.');
