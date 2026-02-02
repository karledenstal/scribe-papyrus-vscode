import * as vscode from 'vscode';
import * as path from 'path';
import { PapyrusTaskProvider } from './taskProvider';
import { loadProjectConfig, resolvePath } from './config';
import { PapyrusCompletionProvider } from './completionProvider';

let taskProvider: vscode.Disposable | undefined;

export function activate(context: vscode.ExtensionContext) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    const extensionPath = context.extensionPath;
    
    if (workspaceRoot) {
        // Setup completion provider
        const completionProvider = new PapyrusCompletionProvider();
        const config = loadProjectConfig(workspaceRoot);
        if (config) {
            completionProvider.setConfig(config);
        }
        
        const completionDisposable = vscode.languages.registerCompletionItemProvider(
            { language: 'papyrus', scheme: 'file' },
            completionProvider,
            '.', // Trigger on dot for method calls
            '('  // Trigger on parenthesis
        );
        
        // Watch for file changes to refresh completions
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.psc');
        fileWatcher.onDidChange(uri => completionProvider.refreshFile(uri.fsPath));
        fileWatcher.onDidCreate(uri => completionProvider.refreshFile(uri.fsPath));
        
        taskProvider = vscode.tasks.registerTaskProvider(
            PapyrusTaskProvider.taskType,
            new PapyrusTaskProvider(workspaceRoot, extensionPath)
        );

        const compileCommand = vscode.commands.registerCommand('scribe.compile', async () => {
            const config = loadProjectConfig(workspaceRoot);
            if (!config) {
                vscode.window.showErrorMessage('No project.yaml found in workspace root');
                return;
            }

            const tasks = await vscode.tasks.fetchTasks({ type: 'papyrus' });
            const compileTask = tasks.find(t => t.name === 'Compile Papyrus Scripts');
            
            if (compileTask) {
                await vscode.tasks.executeTask(compileTask);
            }
        });

        const compileNoCacheCommand = vscode.commands.registerCommand('scribe.compileNoCache', async () => {
            const config = loadProjectConfig(workspaceRoot);
            if (!config) {
                vscode.window.showErrorMessage('No project.yaml found in workspace root');
                return;
            }

            const tasks = await vscode.tasks.fetchTasks({ type: 'papyrus' });
            const compileTask = tasks.find(t => t.name === 'Compile Papyrus (No Cache)');
            
            if (compileTask) {
                await vscode.tasks.executeTask(compileTask);
            }
        });

        const checkCommand = vscode.commands.registerCommand('scribe.check', async () => {
            const config = loadProjectConfig(workspaceRoot);
            if (!config) {
                vscode.window.showErrorMessage('No project.yaml found in workspace root');
                return;
            }

            const tasks = await vscode.tasks.fetchTasks({ type: 'papyrus' });
            const checkTask = tasks.find(t => t.name === 'Check Papyrus Syntax');
            
            if (checkTask) {
                await vscode.tasks.executeTask(checkTask);
            }
        });

        const compileCurrentCommand = vscode.commands.registerCommand('scribe.compileCurrent', async () => {
            const config = loadProjectConfig(workspaceRoot);
            if (!config) {
                vscode.window.showErrorMessage('No project.yaml found in workspace root');
                return;
            }

            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active file to compile');
                return;
            }

            const filePath = editor.document.fileName;
            if (!filePath.endsWith('.psc')) {
                vscode.window.showErrorMessage('Current file is not a .psc file');
                return;
            }

            const compilerPath = path.join(extensionPath, config.compiler.startsWith('.') ? config.compiler.slice(2) : config.compiler);
            const outputDir = resolvePath(config.outputDir || './src/scripts', config);
            
            const args: string[] = [];
            args.push(`-h "${config.scripts}"`);
            
            Object.entries(config.dependencies).forEach(([name, depPath]) => {
                args.push(`-h "${depPath}"`);
            });
            
            args.push(`-i "${filePath}"`);
            args.push(`-o "${outputDir}"`);

            const terminal = vscode.window.createTerminal('Papyrus Compile Current');
            terminal.sendText(`"${compilerPath}" compile ${args.join(' ')}`);
            terminal.show();
        });

        context.subscriptions.push(
            taskProvider,
            compileCommand,
            compileNoCacheCommand,
            checkCommand,
            compileCurrentCommand,
            completionDisposable,
            fileWatcher
        );
    }
}

export function deactivate() {
    if (taskProvider) {
        taskProvider.dispose();
    }
}
