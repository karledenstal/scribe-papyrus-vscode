# Scribe Papyrus

A VSCode extension for compiling Papyrus scripts for Skyrim modding.

## Features

- 🔧 **Compile Papyrus Scripts** - Compile all .psc files in your project
- 🎯 **Compile Current File** - Compile just the file you're working on
- ✅ **Syntax Checking** - Validate your scripts without generating .pex files
- 📦 **Dependency Management** - Configure SKSE, PapyrusUtil, and other dependencies in YAML
- 🎨 **Right-click Integration** - Access compile commands directly from the editor

## Installation

1. Install the extension from the VSCode marketplace
2. Create a `project.yaml` file in your workspace root
3. Start coding!

## Platform Support

This extension was developed for **Linux** and bundles the Linux version of the papyrus compiler. While it may work on other platforms, it has been specifically tested on Linux.

If you're on Windows or macOS, you can specify a custom compiler path in your `project.yaml`:

```yaml
# For Windows
game: "sse"
scripts: "C:/Games/Steam/steamapps/common/Skyrim Special Edition/Data/scripts/source"
compiler: "C:/path/to/your/papyrus-compiler.exe"

# For macOS
game: "sse"
scripts: "/path/to/Skyrim/Data/scripts/source"
compiler: "/path/to/your/papyrus-compiler-macos"
```

Download the appropriate compiler for your platform from [russo-2025's repository](https://github.com/russo-2025/papyrus-compiler).

## Configuration

Create a `project.yaml` file in your workspace root:

```yaml
name: "My Awesome Mod"
game: "sse"

# Path to the game scripts directory (for base game imports)
scripts: "/path/to/Skyrim Special Edition/Data/scripts/source"

# Source and output directories (relative to workspace root)
sourceDir: "./scripts/source"
outputDir: "./scripts"

# Optional: Configure dependencies
# Use {mods}, {scripts}, {game}, or {name} as placeholders
dependencies:
  skse: "{mods}/SKSE/Scripts/Source"
  skyui: "{mods}/SkyUI/Scripts/Source"
  papyrusutil: "{mods}/PapyrusUtil/Scripts/Source"
```

### Configuration Options

| Option         | Required | Description                                                 |
| -------------- | -------- | ----------------------------------------------------------- |
| `name`         | Yes      | Your mod name                                               |
| `game`         | No       | Game version (`sse` for Skyrim Special Edition)             |
| `mods`         | No       | The path to your mods folder                                |
| `scripts`      | Yes      | Path to base game scripts for imports                       |
| `sourceDir`    | No       | Where your .psc files are (default: `./src/scripts/source`) |
| `outputDir`    | No       | Where .pex files go (default: `./src/scripts`)              |
| `dependencies` | No       | Map of dependency names to paths                            |
| `compiler`     | No       | Custom compiler path (default: bundled compiler)            |

## Commands

Access these commands from the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- **Scribe: Compile Papyrus Scripts** - Compile all .psc files
- **Scribe: Check Papyrus Syntax** - Validate without compiling
- **Scribe: Compile Current Papyrus File** - Compile just the open file

You can also right-click on any `.psc` file in the editor to access these commands.

## Project Structure

```
your-mod/
├── project.yaml          # Configuration file
├── scripts/
│   ├── source/           # Your .psc files
│   └── *.pex             # Compiled output
└── ...
```

## Dependencies

Dependencies are added as `-h` flags to the compiler, allowing your scripts to import from them. Placeholders are supported:

- `{mods}` - Path to your mods folder
- `{scripts}` - Path from the `scripts` config
- `{game}` - Game identifier (e.g., `sse`)
- `{name}` - Your mod name from config

Example:

```yaml
dependencies:
  skse: "{mods}/SKSE/Scripts/Source"
  skyui: "{mods}/SkyUI SDK/Scripts/Source"
```

## Keyboard Shortcuts

The tasks are registered as build tasks, so you can use:

- `Ctrl+Shift+B` (or `Cmd+Shift+B`) to run build tasks
- Select from the available Papyrus compile options

## Troubleshooting

### "No project.yaml found in workspace root"

Make sure you have a `project.yaml` file in the root of your workspace.

### "Invalid path specified for the -h flag"

Check that your `scripts` path points to a valid directory containing .psc files.

### Files not appearing in outputDir

Ensure the `outputDir` directory exists or can be created. The extension will create it if it doesn't exist.

## License

This extension is provided as-is for Skyrim modding purposes.

## Credits

**Papyrus Compiler** by [russo-2025](https://github.com/russo-2025/papyrus-compiler)

This extension bundles the papyrus compiler created by russo-2025. The compiler is licensed under the MIT License and is included in compliance with its terms. The original compiler can be found at:

🔗 https://github.com/russo-2025/papyrus-compiler

Special thanks to russo-2025 for creating and maintaining this excellent Papyrus compiler!
