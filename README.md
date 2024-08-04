# Note Macros

Heavily inspired by [Foam's](https://foambubble.github.io/foam/) [Daily Note](https://foambubble.github.io/foam/daily-notes) feature and [Jeff Hykin's](https://github.com/jeff-hykin/macro-commander) code.

# Enhancements

I loved the foundational work done by [kneely](https://github.com/kneely/note-macros) and have enhanced it with two significant features to make it even more powerful and flexible:

1. **Template Integration:**
   - **Custom Templates:** You can now use custom templates for your notes. This feature allows you to start with a pre-defined structure or content, tailored to your specific needs, ensuring consistency and saving time on repetitive tasks.

2. **Dynamic Directory and Name Creation:**
   - **Wildcard Structure:** Use a wildcard character (`?`) in the directory path or note name to dynamically prompt for inputs. This allows for flexible and intuitive organization and naming of your notes.

# Intended Use

This extension was originally developed to go hand in hand with [Foam](https://foambubble.github.io/foam/).

>Foam is a personal knowledge management and sharing system inspired by Roam Research, built on Visual Studio Code and GitHub.

You theoretically could also use this with other Note Taking solutions with vscode.

# Installation

To install search note-macros in vscode or head to [note-macros](https://marketplace.visualstudio.com/items?itemName=NeelyInnovations.note-macros)

# Features

This extension was heavily inspired by Jeff Hykin's [macro-commander](https://github.com/jeff-hykin/macro-commander). In addition to the functionality mentioned below you are able to use macro-commander's [functionality](https://github.com/jeff-hykin/macro-commander#what-are-some-macro-examples).

## Create Custom Note Macros

Create your own custom macros by adding them to your `settings.json` (Code|File > Preferences > User Settings). A full example can be found at [settings.json](settings.json)

## Example

### Example 1: Weekly Note in a Fixed Directory

This macro creates a Daily note in a fixed Daily directory. It also uses a template to standardize note content.

```json
{
  "note-macros": {
    "Weekly": [
      {
        "type": "note",
        "directory": "weekly",
        "extension": ".md",
        "name": "weekly-note",
        "date": "yyyy-W",
        "template": "weekly-template.md"
      }
    ]
  }
}
```
### Example 2: Meeting Note with Dynamic Directory and Name

This macro creates a Meeting note in a dynamically specified subdirectory under the `Meeting` directory. It uses a template to pre-fill the note content.

```json
{
  "note-macros": {
    "Weekly": [
      {
        "type": "note",
        "directory": "meeting/?",
        "extension": ".md",
        "name": "?",
        "date": "yyyy-mm-dd",
        "template": "meeting-template.md"
      }
    ]
  }
}
```

### Explanation of fields

```json
"type": "note"
```

If your macro does not execute check this field first. This field was introduced to separate the existing functionality of [macro-commander](https://github.com/jeff-hykin/macro-commander) and my work. In the future this field will also separate the [Zettelkasten](https://zettelkasten.de/posts/overview/) functionality.

```json
"directory": "meeting/?"
```

The directory where your note will be created. The `?` allows for dynamic input, prompting you to specify a subdirectory name when the macro is executed.

```json
"extension": ".md"
```

The extension that will be used. If not supplied this will default to markdown but can be changed.

```json
"name": "weekly-note" || "name": "?",
```

This will be the name of the note. The `?` allows for dynamic input, prompting you to specify a name when the macro is executed. Both the file name and note title will be effected by this. 

```json
"date": "yyyy-W"
```

This is the date format for your note. For additional formats please go to [dateFormat](https://github.com/felixge/node-dateformat#mask-options). **This will default to `yyyy-mm-dd`.**

Your macros can run any built-in VS Code action, and even actions from other extensions.
To see all the names of possible actions VS Code can run, see `Default Keyboard Shortcuts` (Code|File > Preferences > Keyboard Shortcuts)

## Add Keybindings to Run your Macros

in `keybindings.json` (Code|File > Preferences > Keyboard Shortcuts) add bindings to your macros:

```json
{
  "key": "ctrl+cmd+/",
  "command": "note-macros.Weekly"
}
```

Notice that `note-macros.my_macro_name` has to match what you named your macro.

## Executing Snippets As Part Of A Macro

> **Release 0.0.1 Snippets are not functioning correctly!** 
> 
> I am leaving this in here in case it works for someone else. If it works for you please open an [Issue](https://github.com/kneely/note-macros/issues) to let me know.

Macros can also execute any of your snippets which is super neat. Just insert the same text that you would normally type for the snippet, followed by the `insertSnippet` command:

```json
{"command": "type", "args": {"text": "mySnippetPrefixHere" }},
      "insertSnippet" 
```

```json
{
  "macros": {
    "Weekly": [
      {
        "type": "note",
        "directory": "Weekly",
        "extension": ".md",
        "name": "weekly-note",
        "date": "yyyy-W"
      }
    ],
    "doMySnippet": [
      { "command": "editor.action.insertSnippet", "args": ":daily" }
    ]
  }
}
```

## Run macro From command pallette

Simply use `Ctrl+Shft+P` or `Alt+P` depend on your os, and type `Note Macros: Run A Macro` then chose the macro you want to execute.

## Available Commands for Macros

To list all available commands for your macros use `Ctrl+Shft+P` or `Alt+P` depend on your os, and type `Macro Dev: List all the commands that can be used in macros` then chose the macro you want to execute.

# Issues

This extension will be extensively used and tested on Windows and Linux. I do not have access to a MacOS machine. With that being said I cannot test on Mac. If you run into any issues on any environment please open an [Issue](https://github.com/lonelycowboy49/note-macros/issues).

# Credit

This extension combines the my work with [Jani Eväkallio's](https://github.com/jevakallio) work, [Jeff Hykin's](https://github.com/jeff-hykin) and [Kevin Neely](https://github.com/kneely) work.

# License

Note Macros is released under the [MIT License](https://github.com/kneely/note-macros/blob/master/LICENSE).