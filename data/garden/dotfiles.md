---
title: Dotfiles
description: Collection of my dotfiles and configuration setup on macOS.
created: 2025-01-05
updated: 2026-09-12
status: evergreen
---

## Font

[https://usgraphics.com/products/berkeley-mono](https://usgraphics.com/products/berkeley-mono)

## Terminal

First install the Xcode CLI tools:

```sh
xcode-select --install
```

And [Homebrew](https://brew.sh/).

### Ghostty

[https://ghostty.org/](https://ghostty.org/)

Config:

```ini
# Config: https://ghostty.org/docs/config/reference
auto-update = check

background-opacity = 0.95
background-blur-radius = 20

copy-on-select = clipboard

font-family = TX-02 SemiCondensed
font-size = 15

macos-titlebar-style = tabs
macos-option-as-alt = true

mouse-hide-while-typing = true

quit-after-last-window-closed = true
quick-terminal-position = bottom

selection-invert-fg-bg = true

theme = light:"Monokai Pro Light Sun",dark:"Monokai Pro Ristretto"

window-colorspace = display-p3
window-height = 40
window-width = 120
window-padding-x = 10
window-padding-y = 10
window-save-state = always

# Keybindings: https://ghostty.org/docs/config/keybind
keybind = global:ctrl+`=toggle_quick_terminal
```

### Git

Dependencies:

- [Delta](https://dandavison.github.io/delta/)
- [[ssh-commit-signing|SSH commit signing]]

Location:

```txt
~/.gitconfig
```

Config:

```ini
[user]
	name = Daniël Illouz
	email = <ID>+<USERNAME>@users.noreply.github.com
	signingkey = ~/.ssh/id_ed25519_github_danillouz.pub

[gpg]
	format = ssh
[gpg "ssh"]
	allowedSignersFile = ~/.config/git_allowed_signers

[commit]
	gpgsign = true
[tag]
	gpgsign = true

[help]
	autocorrect = -1

[pull]
	rebase = true
[push]
	default = simple

[alias]
	aliases = config --get-regexp alias
	contribs = shortlog -sn
	fuckit = !git reset --hard HEAD && git clean -d -f
	tags = tag

# delta: https://dandavison.github.io/delta/
[core]
	pager = delta
[delta]
	line-numbers = true
	hyperlinks = true
	side-by-side = true
	navigate = true
[interactive]
	diffFilter = delta --color-only
[merge]
    conflictstyle = zdiff3
```

### Prompt

[https://starship.rs/](https://starship.rs/)

Location:

```txt
~/.config/starship.toml
```

Config:

```ini
# See: https://starship.rs/config
"$schema" = 'https://starship.rs/config-schema.json'

format = """
$username\
$hostname\
$localip\
$shlvl\
$directory\
$git_branch\
$git_commit\
$git_state\
$git_metrics\
$git_status\
$docker_context\
$direnv\
$env_var\
$sudo\
$cmd_duration\
$line_break\
$character"""

[character]
success_symbol = "[>](green)"
error_symbol = "[>](red)"
vimcmd_symbol = "[vim](green)"

[directory]
read_only = " readonly"
fish_style_pwd_dir_length = 1

[git_branch]
symbol = ""

[git_status]
ahead = "↑"
behind = "↓"
diverged = "↕"
renamed = "r"
deleted = "x"

[status]
symbol = "[x](bold red) "

[sudo]
symbol = "sudo "
```

### Zsh

Dependencies:

- [fzf](https://junegunn.github.io/fzf/)
- [zoxide](https://github.com/ajeetdsouza/zoxide)
- [zsh-autosuggestions](https://github.com/zsh-users/zsh-autosuggestions)

#### zprofile

Location:

```txt
~/.zprofile
```

Config (Apple Silicon):

```ini
eval "$(/opt/homebrew/bin/brew shellenv)"

# Restore Keychain-backed SSH identities for Git commit signing.
ssh-add --apple-load-keychain >/dev/null 2>&1
```

### Aliases

Location:

```txt
~/.zsh_aliases
```

Config:

```ini
# Configuration files
alias configs='ide -n \
  ~/.codex/config.toml \
  ~/.config/starship.toml \
  ~/.gitconfig \
  ~/.vimrc \
  ~/.zprofile \
  ~/.zsh_aliases \
  ~/.zshrc \
'

# git
alias g='git'

alias ga='git add'
alias gap='git add -p'
alias gaa='git add -A'

alias gb='git branch -vv'
alias gbd='git branch -d'
alias gbD='git branch -D'

alias gco='git checkout'
alias gcob='git checkout -b'

alias gc='git commit -v'
alias gca='git commit -v -a'
alias gcam='git commit -v --amend'
alias gcfx='git commit --fixup'
alias gunc='git reset --mixed HEAD~' # uncommit
alias guns='git reset -q HEAD --' # unstage

alias gp='git push origin HEAD'
alias gpu='git push -u origin HEAD'
alias gpf='git push --force-with-lease --force-if-includes origin HEAD'

alias gl='git log --stat --graph --pretty=format:"%C(green)%d%Creset %C(yellow)%h%Creset %C(magenta)(%cr)%Creset %C(blue)<%cn>%Creset %s"'
alias gl1='git log --pretty=format:"%C(green)%d%Creset %C(yellow)%h%Creset %C(magenta)(%cd)%Creset %C(blue)<%cn>%Creset %s"'

alias gpl='git pull'

alias gs='git status -sb'

alias grb='git rebase'
alias grbi='git rebase -i'
alias grbc='git rebase --continue'
alias grba='git rebase --abort'

alias grpo='git remote prune origin'
alias grso='git remote show origin'

alias gst='git stash'
alias gstl='git stash list'
alias gstp='git stash pop'

# ls
alias ll='ls -alh'

# Misc
alias cx='codex'
alias ide='zed'

up() {
  local failed=()

  echo "\nHomebrew"
  brew update && brew upgrade || failed+=(homebrew)
  brew cleanup

  if (( ${#failed[@]} )); then
    echo "\n\033[31m✗ Failed: ${failed[*]}\033[0m"
  else
    echo "\n\033[32m✓ All updated\033[0m"
  fi
}
```

#### zshrc

Location:

```txt
~/.zshrc
```

Config:

```ini
setopt auto_cd

# Enables case-insensitive tab completion.
# See: https://stackoverflow.com/a/69014927
zstyle ':completion:*' matcher-list '' 'm:{a-zA-Z}={A-Za-z}' 'r:|=*' 'l:|=* r:|=*'
autoload -Uz compinit && compinit

# Run `alias` to see all aliases.
source ~/.zsh_aliases

# See: https://junegunn.github.io/fzf/shell-integration/
source <(fzf --zsh)

# See: https://github.com/junegunn/fzf-git.sh?tab=readme-ov-file
source ~/fzf-git.sh

# See: https://starship.rs/guide/
eval "$(starship init zsh)"

# See: https://github.com/ajeetdsouza/zoxide/#installation
eval "$(zoxide init zsh)"

# See: https://github.com/zsh-users/zsh-autosuggestions/blob/master/INSTALL.md
source $(brew --prefix)/share/zsh-autosuggestions/zsh-autosuggestions.zsh

export PATH="$HOME/.local/bin:$PATH"
```

Install `~/fzf-git.sh` separately before starting a shell, for example:

```sh
curl -o ~/fzf-git.sh https://raw.githubusercontent.com/junegunn/fzf-git.sh/main/fzf-git.sh
```

## Vim

Location:

```txt
~/.vimrc
```

Config:

```ini
syntax on

set number
set smartindent
set textwidth=80
set wrap
```

## VSCode

Config:

```json
{
  "[css][html][javascript][json][jsonc][typescript][typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "chat.disableAIFeatures": true,
  "editor.bracketPairColorization.independentColorPoolPerBracketType": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": "explicit"
  },
  "editor.copyWithSyntaxHighlighting": false,
  "editor.fontFamily": "TX-02 SemiCondensed",
  "editor.fontLigatures": true,
  "editor.fontSize": 15,
  "editor.formatOnSave": true,
  "editor.guides.bracketPairs": "active",
  "editor.minimap.showSlider": "always",
  "editor.occurrencesHighlight": "multiFile",
  "editor.renderWhitespace": "all",
  "editor.rulers": [80],
  "editor.stickyScroll.enabled": true,
  "editor.wordWrap": "wordWrapColumn",
  "editor.wordWrapColumn": 80,
  "go.coverageDecorator": {
    "coveredGutterStyle": "slashgreen",
    "type": "gutter",
    "uncoveredGutterStyle": "slashred"
  },
  "go.coverOnSingleTest": true,
  "go.editorContextMenuCommands": {
    "fillStruct": true
  },
  "go.formatTool": "goimports",
  "go.lintTool": "golangci-lint",
  "go.survey.prompt": false,
  "go.testEnvFile": "${workspaceFolder}/.env.test",
  "go.testFlags": ["-v"],
  "gopls": {
    "ui.codelenses": {
      "gc_details": true
    },
    "ui.completion.usePlaceholders": true,
    "ui.diagnostic.annotations": {
      "escape": true
    },
    "ui.semanticTokens": true
  },
  "security.workspace.trust.untrustedFiles": "open",
  "telemetry.telemetryLevel": "off",
  "terminal.integrated.copyOnSelection": true,
  "terminal.integrated.cursorBlinking": true,
  "terminal.integrated.cursorStyle": "line",
  "terminal.integrated.fontSize": 15,
  "terminal.integrated.stickyScroll.enabled": true,
  "window.autoDetectColorScheme": true,
  "window.newWindowProfile": "Default",
  "workbench.activityBar.location": "top",
  "workbench.colorTheme": "Monokai Pro Light (Filter Sun)",
  "workbench.editor.decorations.badges": true,
  "workbench.editor.decorations.colors": true,
  "workbench.editor.tabActionLocation": "left",
  "workbench.iconTheme": "Monokai Pro Light (Filter Sun) Icons",
  "workbench.layoutControl.enabled": false,
  "workbench.navigationControl.enabled": false,
  "workbench.preferredDarkColorTheme": "Monokai Pro (Filter Ristretto)",
  "workbench.preferredLightColorTheme": "Monokai Pro Light (Filter Sun)",
  "workbench.sideBar.location": "right",
  "workbench.startupEditor": "none",
  "workbench.tree.indent": 24,
  "zig.zls.enabled": "on",
  "zig.zls.inlayHintsShowParameterName": false,
  "zig.zls.inlayHintsShowVariableTypeHints": false
}
```

## Zed

Config:

```json
{
  "agent": {
    "button": true,
    "default_model": {
      "effort": "high",
      "enable_thinking": true,
      "model": "gpt-5.6",
      "provider": "openai-subscribed",
    },
    "default_width": 600.0,
    "favorite_models": [],
    "flexible": false,
    "max_content_width": 600.0,
    "model_parameters": [],
    "play_sound_when_agent_done": "when_hidden",
    "tool_permissions": {
      "tools": {
        "fetch": {
          "default": "allow",
        },
      },
    },
  },
  "agent_servers": {
    "codex-acp": {
      "type": "registry"
    }
  },
  "base_keymap": "VSCode",
  "bottom_dock_layout": "contained",
  "buffer_font_family": "TX-02",
  "buffer_font_size": 15,
  "cli_default_open_behavior": "existing_window",
  "collaboration_panel": {
    "button": false,
  },
  "colorize_brackets": true,
  "edit_predictions": {
    "allow_data_collection": "no",
    "provider": "none",
  },
  "git": {
    "inline_blame": {
      "enabled": true,
    },
  },
  "git_panel": {
    "group_by": "staging",
    "default_width": 300.0,
    "file_icons": true,
    "show_count_badge": true,
    "status_style": "icon",
    "tree_view": true,
  },
  "icon_theme": {
    "dark": "Zed (Default)",
    "light": "Zed (Default)",
    "mode": "light",
  },
  "minimap": {
    "show": "auto",
    "thumb": "always",
  },
  "on_last_window_closed": "quit_app",
  "preferred_line_length": 80,
  "project_panel": {
    "bold_folder_labels": true,
    "button": true,
    "default_width": 300.0,
    "diagnostic_badges": true,
    "entry_spacing": "comfortable",
    "git_status_indicator": true,
  },
  "proxy": "",
  "search": {
    "button": true,
  },
  "session": {
    "trust_all_worktrees": true,
  },
  "show_edit_predictions": false,
  "show_whitespaces": "all",
  "soft_wrap": "prefer_line",
  "status_bar": {
    "active_language_button": true,
    "cursor_position_button": false,
    "show_active_file": false,
  },
  "sticky_scroll": {
    "enabled": true,
  },
  "tab_bar": {
    "show": true,
    "show_tab_bar_buttons": true,
  },
  "tabs": {
    "close_position": "left",
    "file_icons": true,
    "git_status": true,
    "show_diagnostics": "all",
  },
  "telemetry": {
    "diagnostics": false,
    "metrics": false,
  },
  "terminal": {
    "blinking": "on",
    "copy_on_select": true,
    "cursor_shape": "bar",
    "font_size": 15.0,
    "show_count_badge": true,
    "toolbar": {
      "breadcrumbs": false,
    },
  },
  "theme": {
    "mode": "system",
    "light": "Kohi Latte",
    "dark": "Kohi Espresso"
  },
  "title_bar": {
    "show_branch_name": true,
    "show_branch_status_icon": false,
    "show_menus": false,
    "show_project_items": true,
    "show_sign_in": false,
    "show_user_menu": true,
    "show_user_picture": false,
  },
  "ui_font_size": 16,
  "wrap_guides": [80],
}
```

### Themes

Location:

```txt
~/.config/zed/themes
```

`kohi.json`:

```json
{
  "$schema": "https://zed.dev/schema/themes/v0.2.0.json",
  "name": "Kohi",
  "author": "danillouz",
  "themes": [
    {
      "name": "Kohi Latte",
      "appearance": "light",
      "style": {
        "accents": [
          "#d4572b",
          "#ce4770",
          "#218871",
          "#b16803",
          "#6851a2",
          "#2473b6",
          "#d4572b"
        ],
        "border": "#d7cec7",
        "border.variant": "#e6ddd5",
        "border.focused": "#d4572b",
        "border.selected": "#d4572b8c",
        "border.transparent": "#00000000",
        "border.disabled": "#eee5de",
        "elevated_surface.background": "#fffaf5",
        "surface.background": "#f3e9e0",
        "background": "#eee5de",
        "element.background": "#fffaf5",
        "element.hover": "#2c232e0c",
        "element.active": "#d4572b26",
        "element.selected": "#d4572b30",
        "element.disabled": "#f3e9e0",
        "drop_target.background": "#d4572b4d",
        "ghost_element.background": "#00000000",
        "ghost_element.hover": "#2c232e0c",
        "ghost_element.active": "#d4572b26",
        "ghost_element.selected": "#72696d14",
        "ghost_element.disabled": "#f3e9e0",
        "text": "#2c232e",
        "text.muted": "#92898a",
        "text.placeholder": "#beb5b3",
        "text.disabled": "#92898a",
        "text.accent": "#d4572b",
        "icon": "#2c232e",
        "icon.muted": "#92898a",
        "icon.disabled": "#92898a",
        "icon.placeholder": "#beb5b3",
        "icon.accent": "#d4572b",
        "status_bar.background": "#eee5de",
        "title_bar.background": "#eee5de",
        "title_bar.inactive_background": "#eee5de",
        "toolbar.background": "#fffaf5",
        "tab_bar.background": "#f3e9e0",
        "tab.inactive_background": "#f3e9e0",
        "tab.active_background": "#fffaf5",
        "search.match_background": "#b1680340",
        "search.active_match_background": "#ce477040",
        "panel.background": "#f3e9e0",
        "panel.focused_border": "#d4572b",
        "panel.indent_guide": "#ded5d0aa",
        "panel.indent_guide_hover": "#92898a88",
        "panel.indent_guide_active": "#d4572b",
        "pane.focused_border": "#d4572b",
        "pane_group.border": "#d7cec7",
        "scrollbar.thumb.background": "#72696d26",
        "scrollbar.thumb.hover_background": "#72696d55",
        "scrollbar.thumb.border": "#d7cec7",
        "scrollbar.track.background": "#00000000",
        "scrollbar.track.border": "#e6ddd5",
        "editor.foreground": "#2c232e",
        "editor.background": "#fffaf5",
        "editor.gutter.background": "#fffaf5",
        "editor.subheader.background": "#fffaf5",
        "editor.active_line.background": "#d4572b0d",
        "editor.highlighted_line.background": "#f3e9e080",
        "editor.line_number": "#beb5b3",
        "editor.active_line_number": "#d4572b",
        "editor.hover_line_number": "#2c232e",
        "editor.invisible": "#ded5d0cc",
        "editor.wrap_guide": "#ded5d0aa",
        "editor.active_wrap_guide": "#92898a88",
        "editor.indent_guide": "#ded5d0aa",
        "editor.indent_guide_active": "#d4572b",
        "editor.document_highlight.read_background": "#2473b624",
        "editor.document_highlight.write_background": "#d4572b33",
        "editor.document_highlight.bracket_background": "#d4572b33",
        "terminal.background": "#fffaf5",
        "terminal.foreground": "#2c232e",
        "terminal.bright_foreground": "#2c232e",
        "terminal.dim_foreground": "#92898a",
        "terminal.ansi.background": "#fffaf5",
        "terminal.ansi.black": "#d2c9c4",
        "terminal.ansi.red": "#ce4770",
        "terminal.ansi.green": "#218871",
        "terminal.ansi.yellow": "#b16803",
        "terminal.ansi.blue": "#d4572b",
        "terminal.ansi.magenta": "#6851a2",
        "terminal.ansi.cyan": "#2473b6",
        "terminal.ansi.white": "#2c232e",
        "terminal.ansi.bright_black": "#92898a",
        "terminal.ansi.bright_red": "#df547d",
        "terminal.ansi.bright_green": "#29967d",
        "terminal.ansi.bright_yellow": "#c07609",
        "terminal.ansi.bright_blue": "#e36637",
        "terminal.ansi.bright_magenta": "#765fb2",
        "terminal.ansi.bright_cyan": "#2d82c8",
        "terminal.ansi.bright_white": "#2c232e",
        "terminal.ansi.dim_black": "#d2c9c4cc",
        "terminal.ansi.dim_red": "#ce4770cc",
        "terminal.ansi.dim_green": "#218871cc",
        "terminal.ansi.dim_yellow": "#b16803cc",
        "terminal.ansi.dim_blue": "#d4572bcc",
        "terminal.ansi.dim_magenta": "#6851a2cc",
        "terminal.ansi.dim_cyan": "#2473b6cc",
        "terminal.ansi.dim_white": "#2c232ecc",
        "link_text.hover": "#2473b6",
        "version_control.added": "#218871",
        "version_control.modified": "#b16803",
        "version_control.word_added": "#21887133",
        "version_control.word_deleted": "#ce477033",
        "version_control.deleted": "#ce4770",
        "conflict": "#d4572b",
        "conflict.background": "#d4572b1f",
        "conflict.border": "#d4572b70",
        "created": "#218871",
        "created.background": "#2188711f",
        "created.border": "#21887170",
        "deleted": "#ce4770",
        "deleted.background": "#ce47701f",
        "deleted.border": "#ce477070",
        "error": "#ce4770",
        "error.background": "#ce47701f",
        "error.border": "#ce477070",
        "hidden": "#92898a",
        "hidden.background": "#92898a1a",
        "hidden.border": "#92898a66",
        "hint": "#2473b6",
        "hint.background": "#2473b61f",
        "hint.border": "#2473b670",
        "ignored": "#92898a",
        "ignored.background": "#92898a1a",
        "ignored.border": "#92898a66",
        "info": "#2473b6",
        "info.background": "#2473b61f",
        "info.border": "#2473b670",
        "modified": "#b16803",
        "modified.background": "#b168031f",
        "modified.border": "#b1680370",
        "predictive": "#92898a",
        "predictive.background": "#92898a1a",
        "predictive.border": "#92898a66",
        "renamed": "#6851a2",
        "renamed.background": "#6851a21f",
        "renamed.border": "#6851a270",
        "success": "#218871",
        "success.background": "#2188711f",
        "success.border": "#21887170",
        "unreachable": "#92898a",
        "unreachable.background": "#92898a1a",
        "unreachable.border": "#92898a66",
        "warning": "#d4572b",
        "warning.background": "#d4572b1f",
        "warning.border": "#d4572b70",
        "players": [
          {
            "cursor": "#d4572b",
            "background": "#d4572b",
            "selection": "#d4572b3d"
          },
          {
            "cursor": "#ce4770",
            "background": "#ce4770",
            "selection": "#ce47703d"
          },
          {
            "cursor": "#218871",
            "background": "#218871",
            "selection": "#2188713d"
          },
          {
            "cursor": "#b16803",
            "background": "#b16803",
            "selection": "#b168033d"
          },
          {
            "cursor": "#6851a2",
            "background": "#6851a2",
            "selection": "#6851a23d"
          },
          {
            "cursor": "#2473b6",
            "background": "#2473b6",
            "selection": "#2473b63d"
          },
          {
            "cursor": "#2c232e",
            "background": "#2c232e",
            "selection": "#2c232e3d"
          },
          {
            "cursor": "#d4572b",
            "background": "#d4572b",
            "selection": "#d4572b3d"
          }
        ],
        "syntax": {
          "attribute": {
            "color": "#218871",
            "font_style": null,
            "font_weight": null
          },
          "boolean": {
            "color": "#6851a2",
            "font_style": null,
            "font_weight": null
          },
          "comment": {
            "color": "#a59c9c",
            "font_style": "italic",
            "font_weight": null
          },
          "comment.doc": {
            "color": "#72696d",
            "font_style": "italic",
            "font_weight": null
          },
          "constant": {
            "color": "#6851a2",
            "font_style": null,
            "font_weight": null
          },
          "constructor": {
            "color": "#2473b6",
            "font_style": null,
            "font_weight": null
          },
          "embedded": {
            "color": "#2c232e",
            "font_style": null,
            "font_weight": null
          },
          "emphasis": {
            "color": "#d4572b",
            "font_style": "italic",
            "font_weight": null
          },
          "emphasis.strong": {
            "color": "#6851a2",
            "font_style": null,
            "font_weight": 700
          },
          "enum": {
            "color": "#2473b6",
            "font_style": null,
            "font_weight": null
          },
          "function": {
            "color": "#218871",
            "font_style": null,
            "font_weight": null
          },
          "hint": {
            "color": "#2473b6",
            "font_style": null,
            "font_weight": null
          },
          "keyword": {
            "color": "#ce4770",
            "font_style": null,
            "font_weight": null
          },
          "label": {
            "color": "#6851a2",
            "font_style": null,
            "font_weight": null
          },
          "link_text": {
            "color": "#d4572b",
            "font_style": "italic",
            "font_weight": null
          },
          "link_uri": {
            "color": "#2473b6",
            "font_style": null,
            "font_weight": null
          },
          "namespace": {
            "color": "#2473b6",
            "font_style": null,
            "font_weight": null
          },
          "number": {
            "color": "#6851a2",
            "font_style": null,
            "font_weight": null
          },
          "operator": {
            "color": "#ce4770",
            "font_style": null,
            "font_weight": null
          },
          "predictive": {
            "color": "#92898a",
            "font_style": "italic",
            "font_weight": null
          },
          "preproc": {
            "color": "#6851a2",
            "font_style": null,
            "font_weight": null
          },
          "primary": {
            "color": "#2c232e",
            "font_style": null,
            "font_weight": null
          },
          "property": {
            "color": "#2c232e",
            "font_style": null,
            "font_weight": null
          },
          "punctuation": {
            "color": "#92898a",
            "font_style": null,
            "font_weight": null
          },
          "punctuation.bracket": {
            "color": "#72696d",
            "font_style": null,
            "font_weight": null
          },
          "punctuation.delimiter": {
            "color": "#72696d",
            "font_style": null,
            "font_weight": null
          },
          "punctuation.list_marker": {
            "color": "#ce4770",
            "font_style": null,
            "font_weight": null
          },
          "punctuation.markup": {
            "color": "#ce4770",
            "font_style": null,
            "font_weight": null
          },
          "punctuation.special": {
            "color": "#df547d",
            "font_style": null,
            "font_weight": null
          },
          "selector": {
            "color": "#218871",
            "font_style": null,
            "font_weight": null
          },
          "selector.pseudo": {
            "color": "#2473b6",
            "font_style": "italic",
            "font_weight": null
          },
          "string": {
            "color": "#b16803",
            "font_style": null,
            "font_weight": null
          },
          "string.escape": {
            "color": "#6851a2",
            "font_style": null,
            "font_weight": null
          },
          "string.regex": {
            "color": "#b16803",
            "font_style": null,
            "font_weight": null
          },
          "string.special": {
            "color": "#d4572b",
            "font_style": null,
            "font_weight": null
          },
          "string.special.symbol": {
            "color": "#d4572b",
            "font_style": null,
            "font_weight": null
          },
          "tag": {
            "color": "#ce4770",
            "font_style": null,
            "font_weight": null
          },
          "text.literal": {
            "color": "#b16803",
            "font_style": null,
            "font_weight": null
          },
          "title": {
            "color": "#b16803",
            "font_style": null,
            "font_weight": 600
          },
          "type": {
            "color": "#2473b6",
            "font_style": null,
            "font_weight": null
          },
          "variable": {
            "color": "#2c232e",
            "font_style": null,
            "font_weight": null
          },
          "variable.member": {
            "color": "#2c232e",
            "font_style": null,
            "font_weight": null
          },
          "variable.parameter": {
            "color": "#d4572b",
            "font_style": "italic",
            "font_weight": null
          },
          "variable.special": {
            "color": "#72696d",
            "font_style": "italic",
            "font_weight": null
          },
          "variant": {
            "color": "#218871",
            "font_style": null,
            "font_weight": null
          },
          "diff.plus": {
            "color": "#218871",
            "font_style": null,
            "font_weight": null
          },
          "diff.minus": {
            "color": "#ce4770",
            "font_style": null,
            "font_weight": null
          }
        }
      }
    },
    {
      "name": "Kohi Espresso",
      "appearance": "dark",
      "style": {
        "accents": [
          "#f38d70",
          "#fd6883",
          "#adda78",
          "#f9cc6c",
          "#a8a9eb",
          "#85dacc",
          "#f38d70"
        ],
        "border": "#463a35",
        "border.variant": "#342b27",
        "border.focused": "#f38d70",
        "border.selected": "#f38d708c",
        "border.transparent": "#00000000",
        "border.disabled": "#332a26",
        "elevated_surface.background": "#332a26",
        "surface.background": "#27201d",
        "background": "#191412",
        "element.background": "#332a26",
        "element.hover": "#f0e4d012",
        "element.active": "#f38d7030",
        "element.selected": "#f38d7038",
        "element.disabled": "#27201d",
        "drop_target.background": "#f38d704d",
        "ghost_element.background": "#00000000",
        "ghost_element.hover": "#f0e4d012",
        "ghost_element.active": "#f38d7030",
        "ghost_element.selected": "#f0e4d014",
        "ghost_element.disabled": "#27201d",
        "text": "#f0e4d0",
        "text.muted": "#9a8d82",
        "text.placeholder": "#756961",
        "text.disabled": "#9a8d82",
        "text.accent": "#f38d70",
        "icon": "#f0e4d0",
        "icon.muted": "#9a8d82",
        "icon.disabled": "#9a8d82",
        "icon.placeholder": "#756961",
        "icon.accent": "#f38d70",
        "status_bar.background": "#191412",
        "title_bar.background": "#191412",
        "title_bar.inactive_background": "#201917",
        "toolbar.background": "#201917",
        "tab_bar.background": "#191412",
        "tab.inactive_background": "#191412",
        "tab.active_background": "#201917",
        "search.match_background": "#f9cc6c40",
        "search.active_match_background": "#fd688340",
        "panel.background": "#27201d",
        "panel.focused_border": "#f38d70",
        "panel.indent_guide": "#51453f99",
        "panel.indent_guide_hover": "#9a8d8288",
        "panel.indent_guide_active": "#f38d70",
        "pane.focused_border": "#f38d70",
        "pane_group.border": "#463a35",
        "scrollbar.thumb.background": "#9a8d8240",
        "scrollbar.thumb.hover_background": "#c3b3a56e",
        "scrollbar.thumb.border": "#463a35",
        "scrollbar.track.background": "#00000000",
        "scrollbar.track.border": "#342b27",
        "editor.foreground": "#f0e4d0",
        "editor.background": "#201917",
        "editor.gutter.background": "#201917",
        "editor.subheader.background": "#201917",
        "editor.active_line.background": "#f0e4d00c",
        "editor.highlighted_line.background": "#332a2680",
        "editor.line_number": "#756961",
        "editor.active_line_number": "#f38d70",
        "editor.hover_line_number": "#f0e4d0",
        "editor.invisible": "#51453faa",
        "editor.wrap_guide": "#51453f",
        "editor.active_wrap_guide": "#9a8d8288",
        "editor.indent_guide": "#51453f99",
        "editor.indent_guide_active": "#f38d70",
        "editor.document_highlight.read_background": "#85dacc24",
        "editor.document_highlight.write_background": "#f38d7033",
        "editor.document_highlight.bracket_background": "#f38d7033",
        "terminal.background": "#201917",
        "terminal.foreground": "#f0e4d0",
        "terminal.bright_foreground": "#f0e4d0",
        "terminal.dim_foreground": "#9a8d82",
        "terminal.ansi.background": "#201917",
        "terminal.ansi.black": "#191412",
        "terminal.ansi.red": "#fd6883",
        "terminal.ansi.green": "#adda78",
        "terminal.ansi.yellow": "#f9cc6c",
        "terminal.ansi.blue": "#f38d70",
        "terminal.ansi.magenta": "#a8a9eb",
        "terminal.ansi.cyan": "#85dacc",
        "terminal.ansi.white": "#f0e4d0",
        "terminal.ansi.bright_black": "#9a8d82",
        "terminal.ansi.bright_red": "#ff7a93",
        "terminal.ansi.bright_green": "#bdea86",
        "terminal.ansi.bright_yellow": "#ffdb80",
        "terminal.ansi.bright_blue": "#ff9d80",
        "terminal.ansi.bright_magenta": "#b9b9fb",
        "terminal.ansi.bright_cyan": "#96eadc",
        "terminal.ansi.bright_white": "#fff1f3",
        "terminal.ansi.dim_black": "#191412cc",
        "terminal.ansi.dim_red": "#fd6883cc",
        "terminal.ansi.dim_green": "#adda78cc",
        "terminal.ansi.dim_yellow": "#f9cc6ccc",
        "terminal.ansi.dim_blue": "#f38d70cc",
        "terminal.ansi.dim_magenta": "#a8a9ebcc",
        "terminal.ansi.dim_cyan": "#85dacccc",
        "terminal.ansi.dim_white": "#f0e4d0cc",
        "link_text.hover": "#85dacc",
        "version_control.added": "#adda78",
        "version_control.modified": "#f9cc6c",
        "version_control.word_added": "#adda7833",
        "version_control.word_deleted": "#fd688333",
        "version_control.deleted": "#fd6883",
        "conflict": "#f38d70",
        "conflict.background": "#f38d701f",
        "conflict.border": "#f38d7070",
        "created": "#adda78",
        "created.background": "#adda781f",
        "created.border": "#adda7870",
        "deleted": "#fd6883",
        "deleted.background": "#fd68831f",
        "deleted.border": "#fd688370",
        "error": "#fd6883",
        "error.background": "#fd68831f",
        "error.border": "#fd688370",
        "hidden": "#9a8d82",
        "hidden.background": "#9a8d821a",
        "hidden.border": "#9a8d8266",
        "hint": "#85dacc",
        "hint.background": "#85dacc1f",
        "hint.border": "#85dacc70",
        "ignored": "#9a8d82",
        "ignored.background": "#9a8d821a",
        "ignored.border": "#9a8d8266",
        "info": "#85dacc",
        "info.background": "#85dacc1f",
        "info.border": "#85dacc70",
        "modified": "#f9cc6c",
        "modified.background": "#f9cc6c1f",
        "modified.border": "#f9cc6c70",
        "predictive": "#9a8d82",
        "predictive.background": "#9a8d821a",
        "predictive.border": "#9a8d8266",
        "renamed": "#a8a9eb",
        "renamed.background": "#a8a9eb1f",
        "renamed.border": "#a8a9eb70",
        "success": "#adda78",
        "success.background": "#adda781f",
        "success.border": "#adda7870",
        "unreachable": "#9a8d82",
        "unreachable.background": "#9a8d821a",
        "unreachable.border": "#9a8d8266",
        "warning": "#f38d70",
        "warning.background": "#f38d701f",
        "warning.border": "#f38d7070",
        "players": [
          {
            "cursor": "#f38d70",
            "background": "#f38d70",
            "selection": "#f38d703d"
          },
          {
            "cursor": "#fd6883",
            "background": "#fd6883",
            "selection": "#fd68833d"
          },
          {
            "cursor": "#adda78",
            "background": "#adda78",
            "selection": "#adda783d"
          },
          {
            "cursor": "#f9cc6c",
            "background": "#f9cc6c",
            "selection": "#f9cc6c3d"
          },
          {
            "cursor": "#a8a9eb",
            "background": "#a8a9eb",
            "selection": "#a8a9eb3d"
          },
          {
            "cursor": "#85dacc",
            "background": "#85dacc",
            "selection": "#85dacc3d"
          },
          {
            "cursor": "#f0e4d0",
            "background": "#f0e4d0",
            "selection": "#f0e4d03d"
          },
          {
            "cursor": "#f38d70",
            "background": "#f38d70",
            "selection": "#f38d703d"
          }
        ],
        "syntax": {
          "attribute": {
            "color": "#adda78",
            "font_style": null,
            "font_weight": null
          },
          "boolean": {
            "color": "#a8a9eb",
            "font_style": null,
            "font_weight": null
          },
          "comment": {
            "color": "#9a8d82",
            "font_style": "italic",
            "font_weight": null
          },
          "comment.doc": {
            "color": "#c3b3a5",
            "font_style": "italic",
            "font_weight": null
          },
          "constant": {
            "color": "#a8a9eb",
            "font_style": null,
            "font_weight": null
          },
          "constructor": {
            "color": "#85dacc",
            "font_style": null,
            "font_weight": null
          },
          "embedded": {
            "color": "#f0e4d0",
            "font_style": null,
            "font_weight": null
          },
          "emphasis": {
            "color": "#f38d70",
            "font_style": "italic",
            "font_weight": null
          },
          "emphasis.strong": {
            "color": "#a8a9eb",
            "font_style": null,
            "font_weight": 700
          },
          "enum": {
            "color": "#85dacc",
            "font_style": null,
            "font_weight": null
          },
          "function": {
            "color": "#adda78",
            "font_style": null,
            "font_weight": null
          },
          "hint": {
            "color": "#85dacc",
            "font_style": null,
            "font_weight": null
          },
          "keyword": {
            "color": "#fd6883",
            "font_style": null,
            "font_weight": null
          },
          "label": {
            "color": "#a8a9eb",
            "font_style": null,
            "font_weight": null
          },
          "link_text": {
            "color": "#f38d70",
            "font_style": "italic",
            "font_weight": null
          },
          "link_uri": {
            "color": "#85dacc",
            "font_style": null,
            "font_weight": null
          },
          "namespace": {
            "color": "#85dacc",
            "font_style": null,
            "font_weight": null
          },
          "number": {
            "color": "#a8a9eb",
            "font_style": null,
            "font_weight": null
          },
          "operator": {
            "color": "#fd6883",
            "font_style": null,
            "font_weight": null
          },
          "predictive": {
            "color": "#9a8d82",
            "font_style": "italic",
            "font_weight": null
          },
          "preproc": {
            "color": "#a8a9eb",
            "font_style": null,
            "font_weight": null
          },
          "primary": {
            "color": "#f0e4d0",
            "font_style": null,
            "font_weight": null
          },
          "property": {
            "color": "#f0e4d0",
            "font_style": null,
            "font_weight": null
          },
          "punctuation": {
            "color": "#9a8d82",
            "font_style": null,
            "font_weight": null
          },
          "punctuation.bracket": {
            "color": "#c3b3a5",
            "font_style": null,
            "font_weight": null
          },
          "punctuation.delimiter": {
            "color": "#c3b3a5",
            "font_style": null,
            "font_weight": null
          },
          "punctuation.list_marker": {
            "color": "#fd6883",
            "font_style": null,
            "font_weight": null
          },
          "punctuation.markup": {
            "color": "#fd6883",
            "font_style": null,
            "font_weight": null
          },
          "punctuation.special": {
            "color": "#ff7a93",
            "font_style": null,
            "font_weight": null
          },
          "selector": {
            "color": "#adda78",
            "font_style": null,
            "font_weight": null
          },
          "selector.pseudo": {
            "color": "#85dacc",
            "font_style": "italic",
            "font_weight": null
          },
          "string": {
            "color": "#f9cc6c",
            "font_style": null,
            "font_weight": null
          },
          "string.escape": {
            "color": "#a8a9eb",
            "font_style": null,
            "font_weight": null
          },
          "string.regex": {
            "color": "#f9cc6c",
            "font_style": null,
            "font_weight": null
          },
          "string.special": {
            "color": "#f38d70",
            "font_style": null,
            "font_weight": null
          },
          "string.special.symbol": {
            "color": "#f38d70",
            "font_style": null,
            "font_weight": null
          },
          "tag": {
            "color": "#fd6883",
            "font_style": null,
            "font_weight": null
          },
          "text.literal": {
            "color": "#f9cc6c",
            "font_style": null,
            "font_weight": null
          },
          "title": {
            "color": "#f9cc6c",
            "font_style": null,
            "font_weight": 600
          },
          "type": {
            "color": "#85dacc",
            "font_style": null,
            "font_weight": null
          },
          "variable": {
            "color": "#f0e4d0",
            "font_style": null,
            "font_weight": null
          },
          "variable.member": {
            "color": "#f0e4d0",
            "font_style": null,
            "font_weight": null
          },
          "variable.parameter": {
            "color": "#f38d70",
            "font_style": "italic",
            "font_weight": null
          },
          "variable.special": {
            "color": "#c3b3a5",
            "font_style": "italic",
            "font_weight": null
          },
          "variant": {
            "color": "#adda78",
            "font_style": null,
            "font_weight": null
          },
          "diff.plus": {
            "color": "#adda78",
            "font_style": null,
            "font_weight": null
          },
          "diff.minus": {
            "color": "#fd6883",
            "font_style": null,
            "font_weight": null
          }
        }
      }
    }
  ]
}
```
