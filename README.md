This a fork of [Extraterm](https://github.com/sedwards2009/extraterm/)
======================================================================

Notable changes so far
----------------------

I'm currently only developing for and testing on Linux x64 machines. Windows may follow later. 

    1) CTRL+L (or `clear`, `tput clear`, ...) actually clears the whole screen, not just the currently active terminal input control.
    2) Added "Open new terminal window" functionality (currently only available in command palette).
    3) New tabs are started in the same working directory as the currently selected tab.
    4) Changing build system to separate source code from compiled (via tsc) code and ease extension management.

Planned changes
---------------

    * Switch to webpack.
    * Plugin/exension loader that separates extensions/extension-api from the main source tree.
    * Support for filtering for information (e.g. filenames, URLs, dates, ...).
    * Support for session profiles (working directory, environment, shell, ...).
    * More configurable command handling (more than just "show box").

![Extraterm logo](docs/extraterm_main_logo_512x367.png)

*The swiss army chainsaw of terminal emulators*

Main website: [extraterm.org](http://extraterm.org)

# About

Extraterm is an open source project to build a terminal emulator and expand it with new features to support modern workflows and do more than just act like a glorified teletype.

More background information is in the [Why document](http://extraterm.org/why.html).

* *Capture and reuse command output as new command input*
* *Manipulate and copy text without leaving the keyboard*
* *Slice and dice command output like a text editor*
* *Display images directly*
* *See the [Features list](http://extraterm.org/features.html) for more*

![Directly edit and execute command output](docs/edit_direct.gif)

See the [Features and Screenshots](http://extraterm.org/features.html)

The primary developer is [Simon Edwards](mailto:simon@simonzone.com). Extraterm logos were designed and provided by [Gabriel Harel](https://github.com/g-harel).

# Features

* Supports Linux, macOS and Cygwin on Windows
* xterm compatible
* Multiple tabs and panes, split and tiled any way you like
* Keyboard based selection
* Show images in the terminal
* Shell integration; can isolate and 'frame' command output. (bash, zsh and fish supported)
* Previous command output can be used as input for new commands
* Command output is editable in place. Multi-cursor editing
* Keyboard friendly "command palette" for searching menus
* Text zoom
* Unicode support
* Color emoji
* [MIT license](LICENSE.txt)
* [...much more to come](https://github.com/sedwards2009/extraterm/issues/30)

See the more detailed [features list](http://extraterm.org/features.html).

# News

[News is here](http://extraterm.org/news.html)

# Download

[Download and try it out on Linux, Windows+Cygwin and macOS](https://github.com/sedwards2009/extraterm/releases)

:warning: Extraterm is in development and roughly 'beta' in quality. It is generally stable, but don't be too surprised if you encounter a few bugs. Use at your own risk. :warning:

With that out of the way, the primary author does use it as their main terminal emulator on a daily basis. The basics are in place and it will run most common terminal applications such as vi, emacs and joe without problems and even more demanding applications such as midnight commander.

# Further Information

* :loudspeaker: :bird: Follow development on [Twitter @ ExtratermDev](https://twitter.com/ExtratermDev)
* [User Guide](http://extraterm.org/guide.html)
* [Downloads and Releases](https://github.com/sedwards2009/extraterm/releases) (Linux, Windows and OS X supported)
* [FAQ](http://extraterm.org/faq.html)
* [How to Create Themes](http://extraterm.org/theming.html)
* [Development and Contributing](http://extraterm.org/development.html)
* [Current Development Roadmap](https://github.com/sedwards2009/extraterm/issues/30)
* :octocat: Github: https://github.com/sedwards2009/extraterm
