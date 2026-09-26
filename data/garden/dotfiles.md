---
title: Dotfiles
description: My macOS (Apple Silicon) setup and application configuration.
created: 2025-01-05
updated: 2026-11-07
status: evergreen
---

## Dependencies

Install the Xcode CLI tools:

```sh
xcode-select --install
```

Install [Homebrew](https://brew.sh/) and these packages:

- [Atuin](https://atuin.sh/)
- [Delta](https://dandavison.github.io/delta/)
- [fzf](https://github.com/junegunn/fzf)
- [hunk](https://www.hunk.dev/)
- [jq](https://jqlang.org/)
- [Starship](https://starship.rs/)
- [zoxide](https://github.com/ajeetdsouza/zoxide)
- [zsh-autosuggestions](https://github.com/zsh-users/zsh-autosuggestions)

```sh
brew install atuin fzf git-delta hunk jq starship zoxide zsh-autosuggestions
```

Install [Berkeley Mono (TX-02)](https://usgraphics.com/products/berkeley-mono).

## Configuration

### Atuin

```toml title="~/.config/atuin/config.toml"
# See: https://docs.atuin.sh/latest/configuration/config/

enter_accept = true
filter_mode_shell_up_key_binding = "session"
invert = true
search_mode_shell_up_key_binding = "prefix"
```

### Ghostty

```ini title="config"
# Config: https://ghostty.org/docs/config/reference

auto-update = check
background-opacity = 0.95
background-blur-radius = 20
copy-on-select = clipboard
font-family = TX-02 SemiCondensed
font-size = 15
macos-titlebar-style = tabs
macos-option-as-alt = true
macos-icon = holographic
mouse-hide-while-typing = true
quit-after-last-window-closed = true
quick-terminal-position = bottom
selection-invert-fg-bg = true
theme = light:"Monokai Pro Light Sun", dark:"Monokai Pro Ristretto"
window-colorspace = display-p3
window-height = 45
window-width = 120
window-padding-x = 10
window-padding-y = 10
window-save-state = always
```

### Git

For signed commits, see [[ssh-commit-signing|SSH commit signing]].

```ini title="~/.gitconfig"
[alias]
alias = config --get-regexp alias
contribs = shortlog -sn
fuckit = !git reset --hard HEAD && git clean -d -f
tags = tag

[commit]
gpgsign = true

[core]
pager = delta

# See: https://dandavison.github.io/delta/
[delta]
hyperlinks = true
line-numbers = true
navigate = true

[delta "monokai-pro-light-sun"]
commit-style = yellow
file-style = blue
hunk-header-style = magenta
light = true
line-numbers-minus-style = red
line-numbers-plus-style = green
line-numbers-zero-style = brightblack
minus-emph-style = "syntax #f0d8e2"
minus-style = "syntax #f4e0e5"
plus-emph-style = "syntax #d9ebe4"
plus-style = "syntax #e4efe8"
syntax-theme = ansi
true-color = always
zero-style = "syntax normal"

[delta "monokai-pro-ristretto"]
commit-style = yellow
dark = true
file-style = blue
hunk-header-style = magenta
line-numbers-minus-style = red
line-numbers-plus-style = green
line-numbers-zero-style = brightblack
minus-emph-style = "syntax #58323f"
minus-style = "syntax #4c3038"
plus-emph-style = "syntax #354b3a"
plus-style = "syntax #30422e"
syntax-theme = ansi
true-color = always
zero-style = "syntax normal"

[gpg]
format = ssh

[gpg "ssh"]
allowedSignersFile = ~/.config/git_allowed_signers

[interactive]
diffFilter = delta --color-only

[merge]
conflictstyle = zdiff3

[pull]
rebase = true

[push]
default = simple

[rebase]
autosquash = true

[tag]
gpgsign = true

[user]
email = <ID>+<USERNAME>@users.noreply.github.com
name = Daniël Illouz
signingkey = ~/.ssh/id_ed25519_github_danillouz.pub
```

### Hunk

```toml title="~/.config/hunk/config.toml"
# See: https://www.hunk.dev/docs/configure/configuration/

agent_notes = true
copy_decorations = false
cursor_line = "row"
hunk_headers = true
line_numbers = true
menu_bar = true
mode = "unified"

# Foreground/background and ANSI accents match Ghostty's Monokai palette.
# Additional UI surface colors are adapted for Hunk.
# Transparent mode leaves neutral panels and context backgrounds unpainted;
# diff fills and note surfaces keep their theme colors.
theme = "monokai-pro-light-sun"
transparent_background = true
wrap_lines = true

[themes.monokai-pro-light-sun]
accent = "#6851a2"
accentMuted = "#a59c9c"
addedBg = "#e4efe8"
addedContentBg = "#edf5ef"
addedSignColor = "#218871"
background = "#f8efe7"
badgeAdded = "#218871"
badgeNeutral = "#6851a2"
badgeRemoved = "#ce4770"
base = "github-light-default"
border = "#a59c9c"
contextBg = "#f8efe7"
contextContentBg = "#f8efe7"
fileDeleted = "#ce4770"
fileModified = "#d4572b"
fileNew = "#218871"
fileRenamed = "#6851a2"
fileUntracked = "#b16803"
label = "Monokai Pro Light Sun"
lineNumberBg = "#f3e8df"
lineNumberFg = "#72696d"
movedAddedBg = "#d9ebe4"
movedRemovedBg = "#f0d8e2"
muted = "#72696d"
noteBackground = "#f1eaf4"
noteBorder = "#6851a2"
noteTitleBackground = "#e9dfea"
noteTitleText = "#2c232e"
panel = "#f3e8df"
panelAlt = "#ece1da"
removedBg = "#f4e0e5"
removedContentBg = "#faeeed"
removedSignColor = "#ce4770"
selectedHunk = "#e9dfea"
text = "#2c232e"

[themes.monokai-pro-light-sun.syntax_scopes]
"comment" = "#a59c9c"
"constant.language" = "#6851a2"
"constant.numeric" = "#6851a2"
"entity.name.function" = "#2473b6"
"entity.name.tag" = "#ce4770"
"entity.name.type" = "#d4572b"
"entity.other.attribute-name" = "#ce4770"
"invalid" = "#ce4770"
"keyword" = "#ce4770"
"markup.heading" = "#6851a2"
"punctuation.definition.comment" = "#a59c9c"
"punctuation.definition.string" = "#218871"
"storage" = "#ce4770"
"string" = "#218871"
"support.function" = "#2473b6"
"support.type" = "#d4572b"
"variable.parameter" = "#b16803"

[themes.monokai-pro-ristretto]
accent = "#a8a9eb"
accentMuted = "#72696a"
addedBg = "#30422e"
addedContentBg = "#35472f"
addedSignColor = "#adda78"
background = "#2c2525"
badgeAdded = "#adda78"
badgeNeutral = "#a8a9eb"
badgeRemoved = "#fd6883"
base = "github-dark-default"
border = "#72696a"
contextBg = "#2c2525"
contextContentBg = "#2c2525"
fileDeleted = "#fd6883"
fileModified = "#f38d70"
fileNew = "#adda78"
fileRenamed = "#a8a9eb"
fileUntracked = "#f9cc6c"
label = "Monokai Pro Ristretto"
lineNumberBg = "#342c2c"
lineNumberFg = "#c3b7b8"
movedAddedBg = "#354b3a"
movedRemovedBg = "#58323f"
muted = "#c3b7b8"
noteBackground = "#39323d"
noteBorder = "#a8a9eb"
noteTitleBackground = "#45404f"
noteTitleText = "#fff1f3"
panel = "#342c2c"
panelAlt = "#3c3334"
removedBg = "#4c3038"
removedContentBg = "#4b3038"
removedSignColor = "#fd6883"
selectedHunk = "#45404f"
text = "#fff1f3"

[themes.monokai-pro-ristretto.syntax_scopes]
"comment" = "#a59c9c"
"constant.language" = "#a8a9eb"
"constant.numeric" = "#a8a9eb"
"entity.name.function" = "#85dacc"
"entity.name.tag" = "#fd6883"
"entity.name.type" = "#f38d70"
"entity.other.attribute-name" = "#fd6883"
"invalid" = "#fd6883"
"keyword" = "#fd6883"
"markup.heading" = "#a8a9eb"
"punctuation.definition.comment" = "#a59c9c"
"punctuation.definition.string" = "#adda78"
"storage" = "#fd6883"
"string" = "#adda78"
"support.function" = "#85dacc"
"support.type" = "#f38d70"
"variable.parameter" = "#f9cc6c"
```

### Starship

```toml title="~/.config/starship.toml"
# See: https://starship.rs/config

"$schema" = 'https://starship.rs/config-schema.json'

format = """
$username\
$hostname\
$directory\
$git_branch\
$git_commit\
$git_state\
$git_status\
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
truncation_length = 2

[git_branch]
symbol = ""

[git_status]
ahead = "↑"
behind = "↓"
diverged = "↕"
renamed = "r"
deleted = "x"

[sudo]
disabled = false
symbol = "sudo "
format = "[$symbol]($style)"
```

### Vim

```ini title="~/.vimrc"
syntax on

set number
set smartindent
set textwidth=80
set wrap
```

### Zed

```json title="~/.config/zed/settings.json"
{
  "agent": {
    "button": true,
    "default_model": {
      "effort": "high",
      "enable_thinking": true,
      "model": "gpt-5.6",
      "provider": "openai-subscribed"
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
          "default": "allow"
        }
      }
    }
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
    "button": false
  },
  "colorize_brackets": true,
  "diff_view_style": "unified",
  "edit_predictions": {
    "allow_data_collection": "no",
    "provider": "none"
  },
  "git": {
    "inline_blame": {
      "enabled": true
    }
  },
  "git_panel": {
    "default_width": 300.0,
    "file_icons": true,
    "group_by": "staging",
    "show_count_badge": true,
    "status_style": "icon",
    "tree_view": true
  },
  "icon_theme": {
    "dark": "Zed (Default)",
    "light": "Zed (Default)",
    "mode": "light"
  },
  "minimap": {
    "show": "always"
  },
  "on_last_window_closed": "quit_app",
  "preferred_line_length": 80,
  "project_panel": {
    "bold_folder_labels": true,
    "button": true,
    "default_width": 300.0,
    "diagnostic_badges": true,
    "entry_spacing": "comfortable",
    "git_status_indicator": true
  },
  "proxy": "",
  "search": {
    "button": true
  },
  "session": {
    "trust_all_worktrees": true
  },
  "show_edit_predictions": false,
  "show_whitespaces": "all",
  "soft_wrap": "prefer_line",
  "status_bar": {
    "active_language_button": true,
    "cursor_position_button": false,
    "show_active_file": false
  },
  "sticky_scroll": {
    "enabled": true
  },
  "tab_bar": {
    "show": true,
    "show_tab_bar_buttons": true
  },
  "tabs": {
    "close_position": "left",
    "file_icons": true,
    "git_status": true,
    "show_diagnostics": "all"
  },
  "telemetry": {
    "diagnostics": false,
    "metrics": false
  },
  "terminal": {
    "blinking": "on",
    "copy_on_select": true,
    "cursor_shape": "bar",
    "font_size": 15.0,
    "show_count_badge": true,
    "toolbar": {
      "breadcrumbs": false
    }
  },
  "theme": {
    "dark": "Kohi Espresso",
    "light": "Kohi Latte",
    "mode": "system"
  },
  "title_bar": {
    "show_branch_name": true,
    "show_branch_status_icon": false,
    "show_menus": false,
    "show_project_items": true,
    "show_sign_in": false,
    "show_user_menu": true,
    "show_user_picture": false
  },
  "ui_font_size": 16,
  "wrap_guides": [
    80
  ]
}
```

#### Kohi theme

The [Kohi theme JSON](_assets/dotfiles/kohi.json) goes in `~/.config/zed/themes/kohi.json`.

### Zsh

#### Aliases

```zsh title="~/.config/zsh/aliases.zsh"
# Git
alias g='git'

# Git: inspect
alias gs='git status -sb'
alias gd='git diff'
alias gds='git diff --staged'
alias gsh='git show'
alias gl='git log --stat --graph --pretty=format:"%C(green)%d%Creset %C(yellow)%h%Creset %C(magenta)(%cr)%Creset %C(blue)<%cn>%Creset %s"'
alias gl1='git log --pretty=format:"%C(green)%d%Creset %C(yellow)%h%Creset %C(magenta)(%cd)%Creset %C(blue)<%cn>%Creset %s"'

# Git: review (https://www.hunk.dev)
# $THEME is set in ~/.zshrc
alias hd='hunk diff --theme "$THEME"'
alias hds='hunk diff --theme "$THEME" --staged'
alias hdw='hunk diff --theme "$THEME" --watch' # live review, reloads as files change
alias hsh='hunk show --theme "$THEME"'

# Git: stage / unstage / discard
alias ga='git add'
alias gap='git add -p'
alias gaa='git add -A'
alias gusp='git restore --staged -p' # unstage selected hunks
alias gdiscp='git restore -p'        # discard unstaged hunks (destructive)

# Git: commit / rewrite
alias gc='git commit -v'
alias gca='git commit -v -a'
alias gcam='git commit -v --amend'
alias gcfx='git commit --fixup'
alias gunc='git reset --mixed HEAD~' # uncommit, retaining changes

# Git: branches
alias gb='git branch -vv'
alias gbd='git branch -d'
alias gbD='git branch -D'
alias gco='git checkout'
alias gcob='git checkout -b'

# Git: sync / remotes
alias gf='git fetch --prune'
alias gpl='git pull'
alias gp='git push origin HEAD'
alias gpu='git push -u origin HEAD'
alias gpf='git push --force-with-lease --force-if-includes origin HEAD'
alias grpo='git remote prune origin'
alias grso='git remote show origin'

# Git: rebase
alias grb='git rebase'
alias grbi='git rebase -i'
alias grbc='git rebase --continue'
alias grba='git rebase --abort'

# Git: stash
alias gst='git stash'
alias gstp='git stash push -p'
alias gstls='git stash list'
alias gstpop='git stash pop'

# ls
alias ll='ls -alhG'

# Misc
alias cx='codex'
alias ide='zed'
```

#### Functions

```zsh title="~/.config/zsh/functions.zsh"
# Auto `ls` directory contents on `cd`.
auto_ls() {
  emulate -L zsh
  ls -alhG
}
autoload -Uz add-zsh-hook
add-zsh-hook chpwd auto_ls

# Open a configuration file.
unalias config 2>/dev/null
config() {
  emulate -L zsh
  local -a files=(
    "AI"$'\t'"~/.codex/config.toml"$'\t'"$HOME/.codex/config.toml"

    "Git"$'\t'"~/.gitconfig"$'\t'"$HOME/.gitconfig"

    "Shell"$'\t'"~/.config/atuin/config.toml"$'\t'"$HOME/.config/atuin/config.toml"
    "Shell"$'\t'"~/.config/hunk/config.toml"$'\t'"$HOME/.config/hunk/config.toml"
    "Shell"$'\t'"~/.config/starship.toml"$'\t'"$HOME/.config/starship.toml"
    "Shell"$'\t'"~/.config/zsh/aliases.zsh"$'\t'"$HOME/.config/zsh/aliases.zsh"
    "Shell"$'\t'"~/.config/zsh/functions.zsh"$'\t'"$HOME/.config/zsh/functions.zsh"
    "Shell"$'\t'"~/.zprofile"$'\t'"$HOME/.zprofile"
    "Shell"$'\t'"~/.zshrc"$'\t'"$HOME/.zshrc"
  )
  local selected
  selected=$(
    printf '%s\n' "${files[@]}" |
      fzf \
        --height=70% \
        --layout=reverse \
        --border=rounded \
        --border-label=' Config ' \
        --padding=1 \
        --prompt='Search > ' \
        --pointer='>' \
        --info=inline-right \
        --cycle \
        --highlight-line \
        --tiebreak=index \
        --delimiter=$'\t' \
        --with-nth=$'{1}\t{2}' \
        --query="$*" \
        --tabstop=8 \
        --accept-nth=3 \
        --preview='sed -n "1,200p" {3}' \
        --preview-label=' Preview ' \
        --preview-window='right,60%,border-left,wrap,<80(down,50%,border-top,wrap)' \
        --bind='ctrl-/:toggle-preview' \
        --footer='enter open  •  esc cancel  •  ctrl-/ preview'
  ) || return
  zed -e "$selected"
}

# Sort JSON object keys alphabetically (recursively), in place.
jsort() {
  emulate -L zsh
  (( $# )) || { print -u2 "usage: jsort <file.json>..."; return 1; }

  local file tmp failed=0
  for file in "$@"; do
    tmp=$(mktemp) || return 1

    # Write back through the original file, so permissions and symlinks stay.
    if jq -S . "$file" > "$tmp"; then
      if ! cat "$tmp" > "$file"; then
        print -u2 "jsort: could not write $file"
        failed=1
      fi
    else
      print -u2 "jsort: $file left unchanged"
      failed=1
    fi
    rm -f "$tmp" || failed=1
  done
  return "$failed"
}

# Update tools.
up() {
  emulate -L zsh
  local failed=()

  echo "\nHomebrew"
  brew update && brew upgrade || failed+=(homebrew)
  brew cleanup || failed+=(cleanup)

  if (( ${#failed[@]} )); then
    echo "\n\033[31m✗ Failed: ${failed[*]}\033[0m"
  else
    echo "\n\033[32m✓ All updated\033[0m"
  fi
  return $(( ${#failed[@]} > 0 ))
}
```

#### .zprofile

```zsh title="~/.zprofile"
eval "$(/opt/homebrew/bin/brew shellenv)"

# Restore Keychain-backed SSH identities for Git commit signing,
# but only when the agent is empty.
ssh-add -l >/dev/null 2>&1 ||
  ssh-add --apple-load-keychain >/dev/null 2>&1
```

#### .zshrc

```zsh title="~/.zshrc"
typeset -U path fpath

# Environment

export EDITOR=vim
export VISUAL=$EDITOR

# Custom light/dark theming.
#
# Each value must match a:
#   - [delta "<id>"] feature in ~/.gitconfig
#   - [themes.<id>] theme in ~/.config/hunk/config.toml
#
# Known limitation: it won't refresh when macOS changes appearance in an existing shell.
THEME_LIGHT=monokai-pro-light-sun
THEME_DARK=monokai-pro-ristretto
if [[ $(defaults read -g AppleInterfaceStyle 2>/dev/null) == Dark ]]; then
  THEME="$THEME_DARK"
else
  THEME="$THEME_LIGHT"
fi
# See: https://dandavison.github.io/delta/features-named-groups-of-settings.html
export DELTA_FEATURES="$THEME"

# Use the terminal's ANSI palette to follow Ghostty's theme.
export FZF_DEFAULT_OPTS="--color=16"

path=(
  "$HOME/.local/bin"
  "$HOME/go/bin"
  /opt/homebrew/opt/rustup/bin
  $path
)

# Shell behavior

setopt auto_cd
setopt interactivecomments

bindkey -e

WORDCHARS=${WORDCHARS//[\/-]/}

# Completion

zstyle ':completion:*' matcher-list '' 'm:{a-zA-Z}={A-Za-z}'
zstyle ':completion:*' menu select
zstyle ':completion:*' completer _complete _ignored _approximate

autoload -Uz compinit && compinit

# Tools

# See: https://github.com/ajeetdsouza/zoxide/#installation
eval "$(zoxide init zsh)"

source "$HOME/.config/zsh/aliases.zsh"
source "$HOME/.config/zsh/functions.zsh"

# Atuin is the persistent history store,
# and automatically adds itself as an autosuggest strategy (zsh-autosuggestions).
#
# See:
#   - https://docs.atuin.sh/latest/guide/installation/#manual-installation
#   - https://docs.atuin.sh/latest/integrations/#zsh-autosuggestions
#   - https://github.com/zsh-users/zsh-autosuggestions/blob/master/INSTALL.md
unset HISTFILE
SAVEHIST=0
eval "$(atuin init zsh)"
source /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh

# Prompt

# See: https://starship.rs/guide/
eval "$(starship init zsh)"
```
