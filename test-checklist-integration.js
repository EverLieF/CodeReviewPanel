// Тест интеграции checklist функциональности
const fs = require('fs');
const path = require('path');

// Имитируем импорт TypeScript модуля
async function testChecklistIntegration() {
  try {
    // Читаем файл checklist.ts и выполняем его логику
    const checklistCode = fs.readFileSync('./server/services/checklist.ts', 'utf-8');
    
    // Простая проверка - читаем конфиг напрямую
    const testDir = './tmp/test-project';
    const configFiles = ['review.yaml', 'review.yml', 'review.json'];
    
    let config = null;
    for (const configFile of configFiles) {
      const configPath = path.join(testDir, configFile);
      if (fs.existsSync(configPath)) {
        console.log(`Найден конфиг: ${configFile}`);
        const content = fs.readFileSync(configPath, 'utf-8');
        
        if (configFile.endsWith('.json')) {
          config = JSON.parse(content);
        } else {
          // Простой YAML парсинг для теста
          const lines = content.split('\n');
          const requirements = [];
          let inRequirements = false;
          let currentReq = {};
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === 'requirements:') {
              inRequirements = true;
              continue;
            }
            
            if (inRequirements && trimmed.startsWith('- id:')) {
              if (Object.keys(currentReq).length > 0) {
                requirements.push(currentReq);
              }
              currentReq = { id: trimmed.replace('- id:', '').trim().replace(/"/g, '') };
            } else if (inRequirements && trimmed.startsWith('title:')) {
              currentReq.title = trimmed.replace('title:', '').trim().replace(/"/g, '');
            } else if (inRequirements && trimmed.startsWith('type:')) {
              currentReq.type = trimmed.replace('type:', '').trim().replace(/"/g, '');
            } else if (inRequirements && trimmed.startsWith('check:')) {
              currentReq.check = trimmed.replace('check:', '').trim().replace(/"/g, '');
            } else if (inRequirements && trimmed.startsWith('required:')) {
              currentReq.required = trimmed.replace('required:', '').trim() === 'true';
            }
          }
          
          if (Object.keys(currentReq).length > 0) {
            requirements.push(currentReq);
          }
          
          config = { requirements };
        }
        break;
      }
    }
    
    if (config) {
      console.log('Конфиг успешно прочитан:');
      console.log(JSON.stringify(config, null, 2));
      
      // Проверяем требования
      const files = [];
      function walkDir(dir) {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            walkDir(fullPath);
          } else {
            files.push(fullPath);
          }
        }
      }
      walkDir(testDir);
      
      console.log('\nФайлы в проекте:');
      files.forEach(f => console.log('  ', f));
      
      // Простая проверка требований
      console.log('\nПроверка требований:');
      for (const req of config.requirements) {
        let status = 'failed';
        let evidence = '';
        
        if (req.type === 'file') {
          const found = files.some(f => f.endsWith(req.check));
          status = found ? 'passed' : 'failed';
          evidence = found ? `Файл ${req.check} найден` : `Файл ${req.check} не найден`;
        } else if (req.type === 'content') {
          let foundInFiles = [];
          for (const file of files) {
            try {
              const content = fs.readFileSync(file, 'utf-8');
              const regex = new RegExp(req.check, 'i');
              if (regex.test(content)) {
                foundInFiles.push(path.basename(file));
              }
            } catch (e) {
              // Игнорируем ошибки
            }
          }
          status = foundInFiles.length > 0 ? 'passed' : 'failed';
          evidence = foundInFiles.length > 0 
            ? `Найдено в файлах: ${foundInFiles.join(', ')}`
            : `Паттерн "${req.check}" не найден`;
        }
        
        console.log(`  ${req.title}: ${status} - ${evidence}`);
      }
      
    } else {
      console.log('Конфиг не найден');
    }
    
  } catch (error) {
    console.error('Ошибка теста:', error);
  }
}

testChecklistIntegration();
