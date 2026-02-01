import * as vscode from 'vscode';
import * as path from 'path';
import { loadProjectConfig, resolvePath, ProjectConfig } from './config';

export class PapyrusTaskProvider implements vscode.TaskProvider {
    static taskType = 'papyrus';
    private tasks: vscode.Task[] | undefined;

    constructor(private workspaceRoot: string, private extensionPath: string) {}

    async provideTasks(): Promise<vscode.Task[]> {
        return this.getTasks();
    }

    resolveTask(task: vscode.Task): vscode.Task | undefined {
        return task;
    }

    private getTasks(): vscode.Task[] {
        if (this.tasks) {
            return this.tasks;
        }

        const config = loadProjectConfig(this.workspaceRoot);
        if (!config) {
            return [];
        }

        this.tasks = [
            this.createCompileTask(config, 'Compile Papyrus Scripts'),
            this.createCompileTask(config, 'Compile Papyrus (No Cache)', true),
            this.createCheckTask(config)
        ];

        return this.tasks;
    }

    private createCompileTask(config: ProjectConfig, name: string, noCache: boolean = false): vscode.Task {
        const args = this.buildCompileArgs(config, noCache, false);
        const papyrusCompiler = this.resolveCompilerPath(config.compiler, config);
        
        const execution = new vscode.ShellExecution(
            `${papyrusCompiler} compile ${args.join(' ')}`,
            { cwd: this.workspaceRoot }
        );

        const task = new vscode.Task(
            { type: PapyrusTaskProvider.taskType, task: 'compile' },
            vscode.TaskScope.Workspace,
            name,
            'scribe',
            execution,
            '$papyrus'
        );

        task.group = vscode.TaskGroup.Build;
        task.presentationOptions = {
            reveal: vscode.TaskRevealKind.Always,
            panel: vscode.TaskPanelKind.Shared
        };

        return task;
    }

    private createCheckTask(config: ProjectConfig): vscode.Task {
        const args = this.buildCompileArgs(config, false, true);
        const papyrusCompiler = this.resolveCompilerPath(config.compiler, config);
        
        const execution = new vscode.ShellExecution(
            `${papyrusCompiler} compile ${args.join(' ')}`,
            { cwd: this.workspaceRoot }
        );

        const task = new vscode.Task(
            { type: PapyrusTaskProvider.taskType, task: 'check' },
            vscode.TaskScope.Workspace,
            'Check Papyrus Syntax',
            'scribe',
            execution,
            '$papyrus'
        );

        task.group = vscode.TaskGroup.Build;
        task.presentationOptions = {
            reveal: vscode.TaskRevealKind.Always,
            panel: vscode.TaskPanelKind.Shared
        };

        return task;
    }

    private buildCompileArgs(config: ProjectConfig, noCache: boolean, checkOnly: boolean): string[] {
        const args: string[] = [];

        args.push('-nocache');

        if (checkOnly) {
            args.push('-check');
        }

        args.push(`-h "${resolvePath(config.scripts, config)}"`);

        Object.entries(config.dependencies).forEach(([name, depPath]) => {
            const resolvedPath = resolvePath(depPath, config);
            args.push(`-h "${resolvedPath}"`);
        });

        const sourceDir = config.sourceDir || './src/scripts/source';
        args.push(`-i "${resolvePath(sourceDir, config)}"`);

        const outputDir = config.outputDir || './src/scripts';
        args.push(`-o "${resolvePath(outputDir, config)}"`);

        return args;
    }

    private resolveCompilerPath(compilerPath: string, config: ProjectConfig): string {
        const resolved = resolvePath(compilerPath, config);
        
        if (resolved.startsWith('.')) {
            return path.join(this.extensionPath, resolved);
        }
        
        return resolved;
    }
}
