const fs = require('fs').promises;
const path = require('path');

async function fixJsonFiles() {
  const jsonPath = path.join(__dirname, 'test-data', 'config.json');
  
  try {
    // Read the file
    let content = await fs.readFile(jsonPath, 'utf8');
    
    // Remove BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
      console.log('✅ Removed BOM from config.json');
    }
    
    // Try to parse and reformat
    const jsonObj = JSON.parse(content);
    const cleanJson = JSON.stringify(jsonObj, null, 2);
    
    // Write back without BOM
    await fs.writeFile(jsonPath, cleanJson, 'utf8');
    console.log('✅ Successfully fixed and reformatted config.json');
    
  } catch (error) {
    console.error('Error fixing JSON:', error.message);
  }
}

fixJsonFiles();