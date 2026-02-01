import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

export interface ProjectConfig {
    name: string;
    mods: string;
    game: string;
    scripts: string;
    compiler: string;
    dependencies: Record<string, string>;
    sourceDir?: string;
    outputDir?: string;
}

export function loadProjectConfig(workspaceRoot: string): ProjectConfig | null {
    const configPath = path.join(workspaceRoot, 'project.yaml');
    
    if (!fs.existsSync(configPath)) {
        return null;
    }

    try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const parsed = yaml.load(content) as any;
        
        return {
            name: parsed.name || 'Unknown Mod',
            mods: parsed.mods || '',
            game: parsed.game || 'sse',
            scripts: parsed.scripts || '',
            compiler: parsed.compiler || './bin/papyrus',
            dependencies: parsed.dependencies || {},
            sourceDir: parsed.sourceDir || './src/scripts/source',
            outputDir: parsed.outputDir || './src/scripts'
        };
    } catch (error) {
        console.error('Error parsing project.yaml:', error);
        return null;
    }
}

export function resolvePath(template: string, config: ProjectConfig): string {
    return template
        .replace(/\{mods\}/g, config.mods)
        .replace(/\{scripts\}/g, config.scripts)
        .replace(/\{game\}/g, config.game)
        .replace(/\{name\}/g, config.name);
}
