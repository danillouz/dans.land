---
title: Dotfiles
description: Collection of my dotfiles and configuration setup on macOS.
created: 2025-01-05
updated: 2025-01-06
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
keybind = shift+enter=text:\x1b\r
```

### Git

Dependencies:

- [Delta](https://dandavison.github.io/delta/)
- [[Signing-Git-commits-with-SSH|Signing Git commits with SSH]]

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

# delta
# See: https://dandavison.github.io/delta/
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

Config:

```ini
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### Aliases

Location:

```txt
~/.zsh_aliases
```

Config:

```ini
# Configurations
alias configs="ide ~/.config/starship.toml ~/.gitconfig ~/.vimrc ~/.zprofile ~/.zshrc ~/.zsh_aliases"

# git
alias g='git'

alias gl='git log --stat --graph --pretty=format:"%C(green)%d%Creset %C(yellow)%h%Creset %C(magenta)(%cr)%Creset %C(blue)<%cn>%Creset %s"'
alias gl1='git log --pretty=format:"%C(green)%d%Creset %C(yellow)%h%Creset %C(magenta)(%cd)%Creset %C(blue)<%cn>%Creset %s"'

alias gs='git status -sb'

alias gb='git branch -vv'
alias gbd='git branch -d'
alias gbD='git branch -D'

alias gco='git checkout'
alias gcob='git checkout -b'

alias gp='git push origin HEAD'
alias gpu='git push -u origin HEAD'
alias gpf='git push --force-with-lease origin HEAD'

alias gpl='git pull'

alias grb='git rebase'
alias grbi='git rebase -i'
alias grbc='git rebase --continue'
alias grba='git rebase --abort'

alias grpo='git remote prune origin'
alias grso='git remote show origin'

alias ga='git add'
alias gap='git add -p'
alias gaa='git add -A'

alias gc='git commit -v'
alias gca='git commit -v -a'
alias gcam='git commit -v --amend'
alias gcfx='git commit --fixup'
alias gunc='git reset --mixed HEAD~' # uncommit
alias guns='git reset -q HEAD --' # unstage

alias gst='git stash'
alias gstl='git stash list'
alias gstp='git stash pop'

# ls
alias ll='ls -alh'

# Misc
alias ide='code'
alias cc='claude'
alias oc='opencode'
```

#### zshrc

Location:

```txt
~/.zshrc
```

Config:

```ini
setopt auto_cd

# Enables case-insensitve tab-completion.
# See: https://stackoverflow.com/a/69014927
zstyle ':completion:*' matcher-list '' 'm:{a-zA-Z}={A-Za-z}' 'r:|=*' 'l:|=* r:|=*'
autoload -Uz compinit && compinit

# Run `alias` to see all aliases.
source ~/.zsh_aliases

# See: https://junegunn.github.io/fzf/shell-integration/
source <(fzf --zsh)

# See: https://github.com/junegunn/fzf-git.sh
source ~/fzf-git.sh

# See: https://starship.rs/guide/
eval "$(starship init zsh)"

# See: https://github.com/ajeetdsouza/zoxide/#installation
eval "$(zoxide init zsh)"

# See: https://github.com/zsh-users/zsh-autosuggestions/blob/master/INSTALL.md
source $(brew --prefix)/share/zsh-autosuggestions/zsh-autosuggestions.zsh

export PATH="$HOME/.local/bin:$PATH"
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
