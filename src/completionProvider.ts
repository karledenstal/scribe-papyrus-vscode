import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectConfig, resolvePath } from './config';

interface PapyrusSymbol {
    name: string;
    type: 'script' | 'function' | 'event' | 'property' | 'class';
    detail?: string;
    documentation?: string;
}

export class PapyrusCompletionProvider implements vscode.CompletionItemProvider {
    private symbols: Map<string, PapyrusSymbol[]> = new Map();
    private cache: Map<string, { mtime: number; symbols: PapyrusSymbol[] }> = new Map();
    private config: ProjectConfig | null = null;
    private isIndexing: boolean = false;

    constructor() {}

    setConfig(config: ProjectConfig) {
        this.config = config;
        this.startIndexing();
    }

    private async startIndexing() {
        if (this.isIndexing || !this.config) {
            return;
        }
        
        this.isIndexing = true;
        console.log('[Papyrus] Starting symbol indexing...');
        
        const startTime = Date.now();
        const pathsToIndex: string[] = [];
        
        // Add main scripts path
        if (this.config.scripts) {
            pathsToIndex.push(resolvePath(this.config.scripts, this.config));
        }
        
        // Add dependency paths
        Object.values(this.config.dependencies).forEach(depPath => {
            pathsToIndex.push(resolvePath(depPath, this.config!));
        });
        
        // Index all paths
        let totalFiles = 0;
        for (const dirPath of pathsToIndex) {
            if (fs.existsSync(dirPath)) {
                const count = await this.indexDirectory(dirPath);
                totalFiles += count;
            }
        }
        
        const duration = Date.now() - startTime;
        console.log(`[Papyrus] Indexed ${totalFiles} files in ${duration}ms`);
        this.isIndexing = false;
    }

    private async indexDirectory(dirPath: string): Promise<number> {
        let count = 0;
        
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory()) {
                    count += await this.indexDirectory(fullPath);
                } else if (entry.isFile() && entry.name.endsWith('.psc')) {
                    await this.indexFile(fullPath);
                    count++;
                }
            }
        } catch (error) {
            console.error(`[Papyrus] Error indexing directory ${dirPath}:`, error);
        }
        
        return count;
    }

    private async indexFile(filePath: string) {
        try {
            const stats = fs.statSync(filePath);
            const cached = this.cache.get(filePath);
            
            // Use cache if file hasn't changed
            if (cached && cached.mtime === stats.mtime.getTime()) {
                return;
            }
            
            const content = fs.readFileSync(filePath, 'utf-8');
            const symbols = this.parseSymbols(content, path.basename(filePath, '.psc'));
            
            this.cache.set(filePath, {
                mtime: stats.mtime.getTime(),
                symbols
            });
            
            // Store symbols by file
            this.symbols.set(filePath, symbols);
        } catch (error) {
            console.error(`[Papyrus] Error indexing file ${filePath}:`, error);
        }
    }

    private parseSymbols(content: string, defaultScriptName: string): PapyrusSymbol[] {
        const symbols: PapyrusSymbol[] = [];
        const lines = content.split('\n');
        let currentScriptName = defaultScriptName;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // ScriptName declaration
            const scriptMatch = line.match(/^\s*ScriptName\s+(\w+)/i);
            if (scriptMatch) {
                currentScriptName = scriptMatch[1];
                symbols.push({
                    name: currentScriptName,
                    type: 'script',
                    detail: 'Script',
                    documentation: this.extractDocumentation(lines, i)
                });
                continue;
            }
            
            // Function declaration
            const funcMatch = line.match(/^\s*(?:\w+\s+)?Function\s+(\w+)\s*\(/i);
            if (funcMatch) {
                const funcName = funcMatch[1];
                symbols.push({
                    name: funcName,
                    type: 'function',
                    detail: `Function in ${currentScriptName}`,
                    documentation: this.extractDocumentation(lines, i)
                });
                continue;
            }
            
            // Event declaration  
            const eventMatch = line.match(/^\s*Event\s+(\w+)\s*\(/i);
            if (eventMatch) {
                const eventName = eventMatch[1];
                symbols.push({
                    name: eventName,
                    type: 'event',
                    detail: `Event in ${currentScriptName}`,
                    documentation: this.extractDocumentation(lines, i)
                });
                continue;
            }
            
            // Property declaration
            const propMatch = line.match(/^\s*(\w+)\s+Property\s+(\w+)/i);
            if (propMatch) {
                const propName = propMatch[2];
                const propType = propMatch[1];
                symbols.push({
                    name: propName,
                    type: 'property',
                    detail: `${propType} Property in ${currentScriptName}`,
                    documentation: this.extractDocumentation(lines, i)
                });
            }
        }
        
        return symbols;
    }

    private extractDocumentation(lines: string[], lineIndex: number): string {
        // Look for comments above the declaration
        const docs: string[] = [];
        
        for (let i = lineIndex - 1; i >= 0 && i >= lineIndex - 5; i--) {
            const line = lines[i].trim();
            
            // Documentation comment { ... }
            if (line.startsWith('{') && line.endsWith('}')) {
                docs.unshift(line.slice(1, -1).trim());
                break;
            }
            
            // Regular comment ; ...
            if (line.startsWith(';')) {
                docs.unshift(line.slice(1).trim());
            } else if (line.length > 0) {
                break;
            }
        }
        
        return docs.join('\n');
    }

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.CompletionItem[]> {
        
        const completions: vscode.CompletionItem[] = [];
        const lineText = document.lineAt(position).text.substring(0, position.character);
        
        // Check if we're typing a method call (e.g., "Debug.")
        const methodCallMatch = lineText.match(/(\w+)\.$/);
        
        if (methodCallMatch) {
            // Looking for methods on a specific class
            const className = methodCallMatch[1];
            const methods = this.findMethodsForClass(className);
            
            for (const method of methods) {
                const item = new vscode.CompletionItem(
                    method.name,
                    method.type === 'function' ? vscode.CompletionItemKind.Method : vscode.CompletionItemKind.Event
                );
                item.detail = method.detail;
                item.documentation = method.documentation;
                completions.push(item);
            }
        } else {
            // General completion - provide all symbols
            const seen = new Set<string>();
            
            for (const [, fileSymbols] of this.symbols) {
                for (const symbol of fileSymbols) {
                    if (seen.has(symbol.name)) {
                        continue;
                    }
                    seen.add(symbol.name);
                    
                    let kind: vscode.CompletionItemKind;
                    switch (symbol.type) {
                        case 'script':
                            kind = vscode.CompletionItemKind.Class;
                            break;
                        case 'function':
                            kind = vscode.CompletionItemKind.Function;
                            break;
                        case 'event':
                            kind = vscode.CompletionItemKind.Event;
                            break;
                        case 'property':
                            kind = vscode.CompletionItemKind.Property;
                            break;
                        default:
                            kind = vscode.CompletionItemKind.Text;
                    }
                    
                    const item = new vscode.CompletionItem(symbol.name, kind);
                    item.detail = symbol.detail;
                    item.documentation = symbol.documentation;
                    completions.push(item);
                }
            }
        }
        
        return completions;
    }

    private findMethodsForClass(className: string): PapyrusSymbol[] {
        const methods: PapyrusSymbol[] = [];
        
        // Find the script file for this class
        for (const [, fileSymbols] of this.symbols) {
            const scriptSymbol = fileSymbols.find(s => 
                s.type === 'script' && s.name.toLowerCase() === className.toLowerCase()
            );
            
            if (scriptSymbol) {
                // Found the script, return all its functions and events
                return fileSymbols.filter(s => 
                    s.type === 'function' || s.type === 'event' || s.type === 'property'
                );
            }
        }
        
        return methods;
    }

    // Refresh indexing when files change
    async refreshFile(filePath: string) {
        if (filePath.endsWith('.psc')) {
            await this.indexFile(filePath);
        }
    }
}
