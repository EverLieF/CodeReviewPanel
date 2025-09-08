import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export type Requirement = { 
  id: string; 
  title: string; 
  status: "passed" | "failed" | "skipped"; 
  evidence?: string 
};

export interface ReviewConfig {
  requirements?: Array<{
    id: string;
    title: string;
    description?: string;
    type?: "file" | "content" | "test" | "custom";
    check?: string; // regex pattern or file path
    required?: boolean;
  }>;
}

/**
 * Читает конфигурационный файл review.yaml|yml|json из корня проекта
 */
export function readReviewConfig(rootDir: string): ReviewConfig | null {
  const configFiles = [
    "review.yaml",
    "review.yml", 
    "review.json"
  ];

  for (const configFile of configFiles) {
    const configPath = path.join(rootDir, configFile);
    
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, "utf-8");
        
        if (configFile.endsWith(".json")) {
          return JSON.parse(content) as ReviewConfig;
        } else {
          // YAML файлы
          return yaml.load(content) as ReviewConfig;
        }
      } catch (error) {
        console.warn(`Ошибка при чтении конфига ${configPath}:`, error);
        continue;
      }
    }
  }

  return null;
}

/**
 * Преобразует требования из конфига в формат системы
 */
export function processConfigRequirements(
  config: ReviewConfig, 
  rootDir: string, 
  files: string[]
): Requirement[] {
  if (!config.requirements) {
    return [];
  }

  const requirements: Requirement[] = [];
  const lowerMap = new Map<string, string>();
  files.forEach((f) => lowerMap.set(f.toLowerCase(), f));

  for (const req of config.requirements) {
    let status: "passed" | "failed" | "skipped" = "failed";
    let evidence = "";

    try {
      switch (req.type) {
        case "file":
          // Проверка наличия файла
          const found = Array.from(lowerMap.keys()).some((p) => 
            p.endsWith(path.sep + req.check) || p.endsWith("/" + req.check)
          );
          status = found ? "passed" : "failed";
          evidence = found ? `Файл ${req.check} найден` : `Файл ${req.check} не найден`;
          break;

        case "content":
          // Проверка содержимого файлов по regex
          if (req.check) {
            // Экранируем обратные слеши для корректной работы regex
            const escapedPattern = req.check.replace(/\\/g, '\\');
            const regex = new RegExp(escapedPattern, "i");
            let foundInFiles: string[] = [];
            
            for (const file of files) {
              try {
                const content = fs.readFileSync(file, "utf-8");
                if (regex.test(content)) {
                  foundInFiles.push(path.basename(file));
                }
              } catch {
                // Игнорируем ошибки чтения файлов
              }
            }
            
            status = foundInFiles.length > 0 ? "passed" : "failed";
            evidence = foundInFiles.length > 0 
              ? `Найдено в файлах: ${foundInFiles.join(", ")}`
              : `Паттерн "${req.check}" не найден`;
          }
          break;

        case "test":
          // Проверка наличия тестов (базовая эвристика)
          const testFiles = files.filter(f => 
            f.toLowerCase().includes("test") || 
            f.toLowerCase().includes("spec") ||
            f.endsWith("_test.py") ||
            f.endsWith(".test.js")
          );
          status = testFiles.length > 0 ? "passed" : "failed";
          evidence = testFiles.length > 0 
            ? `Найдены тестовые файлы: ${testFiles.map(f => path.basename(f)).join(", ")}`
            : "Тестовые файлы не найдены";
          break;

        case "custom":
        default:
          // Для custom или неопределенного типа - всегда failed с описанием
          status = "failed";
          evidence = req.description || "Требование не проверено";
          break;
      }
    } catch (error) {
      status = "failed";
      evidence = `Ошибка проверки: ${error instanceof Error ? error.message : String(error)}`;
    }

    // Если требование не обязательно, помечаем как skipped при неудаче
    if (status === "failed" && req.required === false) {
      status = "skipped";
    }

    requirements.push({
      id: `config:${req.id}`,
      title: req.title,
      status,
      evidence
    });
  }

  return requirements;
}
