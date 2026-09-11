---
title: SSH commit signing
description: How to sign Git commits with SSH on macOS.
created: 2025-01-05
status: evergreen
---

You can sign Git commits with an SSH key.

> [!note]
>
> The following uses the same SSH key for GitHub authentication and signing commits.

## Create a new SSH key

Create a new SSH key with a passphrase:

```sh
ssh-keygen -t ed25519 -C "<ID>+<USERNAME>@users.noreply.github.com"
```

Use the following file location and name:

```txt
~/.ssh/id_ed25519_github_danillouz
```

> [!note]
>
> I'm using the GitHub noreply email (which matches the noreply commit email) to [keep my email private](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-email-preferences/setting-your-commit-email-address#about-commit-email-addresses) (my primary email is also marked private on GitHub, so the noreply email is also used for web-based operations).

### Update SSH config

Add the following to `~/.ssh/config`:

```ini
Host github.com
	AddKeysToAgent yes
	UseKeychain yes
	IdentityFile ~/.ssh/id_ed25519_github_danillouz
```

### Add private key to the SSH agent

Add the private key to the SSH agent, to automatically manage the key, and store the passphrase in the macOS keychain (the default macOS `ssh-add` must be used):

```sh
ssh-add --apple-use-keychain ~/.ssh/id_ed25519_github_danillouz
```

Then check it was added:

```sh
ssh-add -l
```

> [!tip]
>
> All previously added SSH key(s) can be deleted with `ssh-add -D`.

## Add public SSH key to GitHub

Copy the public key:

```sh
pbcopy < ~/.ssh/id_ed25519_github_danillouz.pub
```

And [add it to GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account).

> [!note]
>
> When using the same SSH key for GitHub authentication and signing commits, the same key must be added twice to GitHub: once with type "authentication" and once with type "signing".

## Test SSH connection

Test the SSH connection to GitHub (authentication):

```sh
ssh -T git@github.com
```

> [!note]
>
> Check that GitHub's [public key fingerprint](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints) matches before connecting.

The GitHub username is printed when it works.

## Tell Git about the signing key

Update the global Git config to start using the SSH key to sign commits and tags:

```sh
git config --global user.signingkey "~/.ssh/id_ed25519_github_danillouz.pub"
git config --global gpg.format ssh
git config --global commit.gpgsign true
git config --global tag.gpgsign true
```

The `.gitconfig` should now look like this:

```ini
[user]
	name = Daniël Illouz
	email = <ID>+<USERNAME>@users.noreply.github.com
	signingkey = ~/.ssh/id_ed25519_github_danillouz.pub
[gpg]
	format = ssh
[commit]
	gpgsign = true
[tag]
	gpgsign = true
```

### Local signature verification

SSH has no concept of trust levels like [GPG](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification#gpg-commit-signature-verification) does, but a file can be created that contains trusted SSH (public) keys.

For example:

```txt
~/.config/git_allowed_signers
```

Where each key in the file (each key must be placed on a separate line) has the format:

```txt
<EMAIL> <KEY_TYPE> <PUBLIC_KEY>
```

Where `KEY_TYPE` must be `ssh-ed25519`.

To get `PUBLIC_KEY` use:

```sh
 pbcopy < ~/.ssh/id_ed25519_github_danillouz.pub
```

Then update the global Git config to use the allowed signers file:

```sh
git config --global gpg.ssh.allowedSignersFile "~/.config/git_allowed_signers"
```

The `.gitconfig` should now look like this:

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
```

With this config, signatures can be verified locally. For example with:

```sh
git show --show-signature
```

## Resources

- [SSH commit signature verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification#ssh-commit-signature-verification)
- [Generating a new SSH key and adding it to the ssh-agent](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
- [Testing your SSH connection](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/testing-your-ssh-connection)
- [Git allowed signers file](https://git-scm.com/docs/git-config#Documentation/git-config.txt-gpgsshallowedSignersFile)
