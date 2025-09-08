import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");

async function ensureDirExists(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (e) {
    // ignore if exists
  }
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (err: any) {
    if (err?.code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  const tmpPath = `${filePath}.tmp`;
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(tmpPath, content, "utf-8");
  await fs.rename(tmpPath, filePath);
}

export interface StoreEntityBase {
  id: string;
}

export class JsonStore<T extends StoreEntityBase> {
  private readonly entityName: string;
  private readonly filePath: string;

  constructor(entityName: string) {
    this.entityName = entityName;
    this.filePath = path.join(DATA_DIR, `${entityName}.json`);
  }

  private async loadAll(): Promise<T[]> {
    await ensureDirExists(DATA_DIR);
    return readJsonFile<T[]>(this.filePath, []);
  }

  private async persistAll(items: T[]): Promise<void> {
    await ensureDirExists(DATA_DIR);
    await writeJsonFile(this.filePath, items);
  }

  async list(): Promise<T[]> {
    return this.loadAll();
  }

  async get(id: string): Promise<T | undefined> {
    const items = await this.loadAll();
    return items.find((it) => it.id === id);
  }

  async save(entity: T): Promise<T> {
    const items = await this.loadAll();
    const index = items.findIndex((it) => it.id === entity.id);
    if (index >= 0) {
      items[index] = entity;
    } else {
      items.push(entity);
    }
    await this.persistAll(items);
    return entity;
  }

  async upsertMany(entities: T[]): Promise<void> {
    const items = await this.loadAll();
    const byId = new Map<string, T>(items.map((it) => [it.id, it]));
    for (const entity of entities) {
      byId.set(entity.id, entity);
    }
    await this.persistAll(Array.from(byId.values()));
  }

  async update(id: string, updater: (entity: T) => T): Promise<T | undefined> {
    const items = await this.loadAll();
    const index = items.findIndex((it) => it.id === id);
    if (index === -1) return undefined;
    const updated = updater(items[index]);
    items[index] = updated;
    await this.persistAll(items);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const items = await this.loadAll();
    const index = items.findIndex((it) => it.id === id);
    if (index === -1) return false;
    items.splice(index, 1);
    await this.persistAll(items);
    return true;
  }
}


