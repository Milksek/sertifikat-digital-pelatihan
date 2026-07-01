const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Rad\\Downloads\\Github\\cert-system\\skripsi_parafrase.txt', 'utf8');

function searchContext(keywords) {
    console.log(`\n=== SEARCHING FOR: ${keywords.join(' OR ')} ===`);
    let found = false;
    for (const kw of keywords) {
        const regex = new RegExp('.{0,150}' + kw.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '.{0,150}', 'gi');
        let match;
        while ((match = regex.exec(content)) !== null) {
            console.log("MATCH:", match[0]);
            found = true;
        }
    }
    if (!found) console.log("NOT FOUND.");
}

searchContext(["Role-Based Access Control", "RBAC"]);
searchContext(["4.2.3.4", "gas used", "identik", "determinis"]);
searchContext(["meminimalkan celah pemalsuan dokumen", "kesimpulan", "saran", "Bab V"]);
searchContext(["Tabel 4.2", "27,50 Gwei"]);
