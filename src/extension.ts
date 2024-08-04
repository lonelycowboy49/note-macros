import { workspace, Uri, Selection } from "vscode";
import fs = require("fs");
import dateFormat = require("dateformat");
import { execSync } from "child_process";

/* eslint-disable eqeqeq */
const { window } = require("vscode");
const vscode = require("vscode");

//
// globals
//
let activeContext: any;
let disposables: any[] = [];
let macros: any = {};
let invalidMacroNames = ["has", "get", "update", "inspect"];

//
// register commands
//

// create a command for running macros by name
vscode.commands.registerCommand("note-macro.run", async () => {
  let macroNames = Object.keys(macros).filter(
    (each) => macros[each] instanceof Array
  );
  let result = await window.showQuickPick(macroNames);
  executeMacro(result);
});

// command that helps with creating new macros
vscode.commands.registerCommand(
  "note-macro.list-builtin-commands",
  async () => {
    let commands = await vscode.commands.getCommands();
    let result = await window.showQuickPick(commands);
    if (result != null) {
      await vscode.commands.executeCommand(result);
    }
  }
);

//
// helpers
//

// see https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

function flushEventStack() {
  // this is a sleep timer for 0 seconds, which sounds dumb
  // the reason it's useful is because it puts a function on the BOTTOM of the javascript event stack
  // and then we wait for it to occur
  // this means runs all of the already-scheduled things to occur
  // which is ideal because it makes pop ups and other events happen in a more sequential/timely order
  return new Promise((r) => setTimeout(r, 0));
}

//
// on first load
//
exports.activate = function activate(context: any) {
  loadMacros(context);
  activeContext = context;
  // whenever settings is changed
  vscode.workspace.onDidChangeConfiguration(() => {
    // dispose of macros
    for (let disposable of disposables) {
      disposable.dispose();
    }
    // reload them
    loadMacros(activeContext);
  });
};

exports.deactivate = function deactivate() {};

//
// create macros from settings
//
function loadMacros(context: { subscriptions: any[] }) {
  // get the macros from the settings file
  macros = vscode.workspace.getConfiguration("note-macros");

  // look at each macro
  for (const name in macros) {
    // skip the things that are not arrays
    if (!(macros[name] instanceof Array)) {
      continue;
    }
    // register each one as a command
    const disposable = vscode.commands.registerCommand(
      `note-macros.${name}`,
      () => executeMacro(name)
    );
    context.subscriptions.push(disposable);
    disposables.push(disposable);
  }
}

async function executeMacro(name: string) {
  const actions = macros[name] || [];
  
  // Prepare to handle note creation
  let noteFileName: string | undefined;
  let noteDirectoryName: string | undefined;

  // Check if any action requires note creation and prompt for file name or directory if needed
  for (const action of actions) {
    if (action.type === "note") {
      // Prompt for file name if not provided
      if (!action.name || action.name === "?") {
        noteFileName = await promptForFileName();
      } else {
        noteFileName = action.name;
      }
      
      // Prompt for directory name if "?" is found in the directory structure
      if (action.directory && action.directory.includes("?")) {
        noteDirectoryName = await promptForDirectoryName(action.directory);
      } else {
        noteDirectoryName = action.directory;
      }
      break; // Exit after first note action to prevent multiple prompts
    }
  }

  // Process each action
  for (const action of actions) {
    console.log(`action is:`, action);

    // If it's a string, assume it's a command
    if (typeof action == "string") {
      await vscode.commands.executeCommand(action);
      await flushEventStack();
    } else if (action instanceof Object) {
      // Check if it's a JavaScript macro
      if (typeof action.javascript == "string") {
        await eval(`(async()=>{${action.javascript}})()`);
        await flushEventStack();
        continue;
      } else if (action.javascript instanceof Array) {
        let javascriptAction = action.javascript.join("\n");
        await eval(`(async()=>{${javascriptAction}})()`);
        await flushEventStack();
        continue;
      }

      // Check for injections
      let actionCopy = JSON.parse(JSON.stringify(action));
      if (action.injections) {
        for (let eachInjection of action.injections) {
          // Compute the value the user provided
          let value = eval(eachInjection.withResultOf);
          if (value instanceof Promise) {
            value = await value;
          }
          value = `${value}`;

          // Replace it in the arguments
          let replacer = (name: string) => {
            if (typeof name == "string") {
              return name.replace(
                RegExp(escapeRegExp(eachInjection.replace), "g"),
                value
              );
            }
            return name;
          };
          for (let eachKey in actionCopy.args) {
            // If it's a string value, then perform a replacement
            if (typeof actionCopy.args[eachKey] == "string") {
              actionCopy.args[eachKey] = replacer(actionCopy.args[eachKey]);
            }
          }

          // Convert arrays to strings
          let hiddenConsole = actionCopy.hiddenConsole;
          if (hiddenConsole instanceof Array) {
            hiddenConsole = hiddenConsole.join("\n");
          }
          if (typeof hiddenConsole == "string") {
            hiddenConsole += "\n";
          }

          // Replace it in the console command
          actionCopy.hiddenConsole = replacer(hiddenConsole);
        }
      }

      // Run the command
      actionCopy.hiddenConsole && execSync(actionCopy.hiddenConsole);
      actionCopy.command &&
        (await vscode.commands.executeCommand(
          actionCopy.command,
          actionCopy.args
        ));

      // Handle note creation
      if (action.type === "note") {
        // Set the action name and directory to the prompted or default values
        action.name = noteFileName;
        action.directory = noteDirectoryName;
        await createNoteIfNotExists(action);
        await focusNote(action);
        console.log(`Completed openNote`);
        await flushEventStack();
      }
    }
  }
}

// Prompt for File Name if Needed
async function promptForFileName(): Promise<string> {
  const input = await window.showInputBox({
    prompt: "Enter the file name for the new note",
    placeHolder: "e.g., Meeting Notes",
    validateInput: (value: string): string | undefined => {
      return value.trim() === "" ? "File name cannot be empty" : undefined;
    },
  });
  return input || "Untitled";
}

// Prompt for Directory Name if Needed
async function promptForDirectoryName(baseDirectory: string): Promise<string> {
  const input = await window.showInputBox({
    prompt: "Enter the subdirectory name for the note",
    placeHolder: "e.g., Project Alpha",
    validateInput: (value: string): string | undefined => {
      return value.trim() === "" ? "Directory name cannot be empty" : undefined;
    },
  });
  // Replace the "?" in the base directory with the user's input
  return baseDirectory.replace("?", input || "General");
}

// Get Note Directory
function noteDirectory(action: any): string {
  return action.directory || "notes"; // Default directory if none specified
}

// Get File Extension
function noteExtension(action: any): string {
  return action.extension || ".md";
}

// Get Date Format
function dateFormatted(action: any): string {
  const now = new Date();
  return action.date ? dateFormat(now, action.date) : dateFormat(now, "yyyy-mm-dd");
}

function notePath(action: any): string {
  const rootDir = vscode.workspace.rootPath;
  const noteDir = noteDirectory(action);

  return `${rootDir}/${noteDir}`;
}

async function newNote(action: any): Promise<string> {
  return `${notePath(action)}/${dateFormatted(action)}-${action.name}${noteExtension(action)}`;
}

async function createNoteIfNotExists(action: any): Promise<boolean> {
  if (await pathExists(await newNote(action))) {
    return false;
  }

  await createNoteDirectoryIfNotExists(action);

  // Load template content and replace placeholders
  const content = await generateNoteContent(action);
  await fs.promises.writeFile(await newNote(action), content);
  return true;
}

async function generateNoteContent(action: any): Promise<string> {
  let content = `# ${dateFormatted(action)}-${action.name}`; // Default content
  if (action.template) {
    content = await loadTemplateContent(action.template);
    content = replacePlaceholders(content, {
      title: `${dateFormatted(action)}-${action.name}`,
      date: dateFormatted(action),
      // Add more placeholders as needed
    });
  }
  return content;
}

async function createNoteDirectoryIfNotExists(action: any): Promise<void> {
  if (!(await pathExists(notePath(action)))) {
    await fs.promises.mkdir(notePath(action), { recursive: true });
  }
}

async function focusNote(action: any): Promise<void> {
  const document = await workspace.openTextDocument(Uri.file(await newNote(action)));
  const editor = await window.showTextDocument(document);

  // Move the cursor to end of the file
  const { lineCount } = editor.document;
  const { range } = editor.document.lineAt(lineCount - 1);
  editor.selection = new Selection(range.end, range.end);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.promises.access(path, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Load template content
async function loadTemplateContent(templateFile: string): Promise<string> {
  const templatePath = `${vscode.workspace.rootPath}/.foam/templates/${templateFile}`;
  try {
    return await fs.promises.readFile(templatePath, "utf8");
  } catch (err) {
    console.error("Error reading template file:", err);
    return "";
  }
}

// Replace placeholders in the template
function replacePlaceholders(template: string, placeholders: { [key: string]: string }): string {
  return template.replace(/{{(\w+)}}/g, (_, key) => placeholders[key] || "");
}
