# Frogger Clone

This is a clone of the arcade game `Frogger`. 
The goal of the game is to help the character to reach the river while evicting bugs.

## How to load the game

You just need to open the file `index.html` with a modern browser.
I tested it with current versions of `Firefox` and `Google Chrome`.

By default the game will have focus when you load the file in the browser, so you can
immediately start moving the character using the directional keys of the keyboard.
If you cannot move the character, click on the game area to set the focus to it
then it will start responding to keyboard events.

You can also change the character image using a selection box below the game element.

## Technical Details

All the game code is on `js/main.js` file.
There is only one external javascript library dependency, the `kibo` library. It is bundled with this code in the `js` directory.

The code is object oriented, in the sense that almost all code elements are encapsulated in classes.
There is a base class called `GameElement` that abstracts the idea of a tree of elements that 
are drawn in the screen. All elements of the game extends from this class. This class provides
shared instances for accessing the canvas context, a cached image loader and also a shared event bus
used to propagate game events across all game objects. Each class has a brief documentation.

