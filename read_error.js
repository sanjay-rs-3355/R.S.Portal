const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'backend', 'error.log');
try {
    const data = fs.readFileSync(file, 'utf8');
    console.log(data.split('\n').slice(-20).join('\n'));
} catch (e) {
    try {
        const data = fs.readFileSync(file, 'utf16le');
        console.log(data.split('\n').slice(-20).join('\n'));
    } catch (ee) {
        console.error(ee);
    }
}
