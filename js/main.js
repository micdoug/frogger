/**************************
 * Game global constants.
 **************************/

const GAME_EVENTS = {
    STOP: "stop",
    WIN: "win",
    LOSE: "lose",
    CHANGE_CHARACTER: "change_character",
    RESET: "reset"
};

const CHARACTERS = {
    BOY: "img/char-boy.png",
    CAT_GIRL: "img/char-cat-girl.png",
    HORN_GIRL: "img/char-horn-girl.png",
    PINK_GIRL: "img/char-pink-girl.png",
    PRINCESS_GIRL: "img/char-princess-girl.png"
};

/**
 * Provides a common interface to load images from URLs.
 * It has a internal cache, so images that were already loaded will be immediately returned, reducing network overhead
 * and improving performance.
 */
class ImageLoader {

    constructor() {
        this.imageCache = new Map();
    }

    /**
     * Load an image from the provided url.
     * @param url
     *  Provides the url used to load the image from.
     * @returns {Promise<Image>}
     *  Returns the image element with the loaded file.
     * @private
     */
    async _loadNewImage(url) {
        const image = new Image();
        return new Promise((resolve) => {
            image.addEventListener("load", () => {
                resolve(image)
            });
            image.src = url;
        });
    }

    /**
     * Returns the image element with the file loaded.
     * @param url
     *  The url to load the image from.
     * @returns {Promise<Image>}
     */
    async loadImage(url) {
        if (this.imageCache.has(url)) {
            return this.imageCache.get(url)
        } else {
            const image = await this._loadNewImage(url);
            this.imageCache.set(url, image);
            return image;
        }
    }
}

/**
 * Class is used as a centralized event bus, all game elements can send events and register for receiving events.
 * Events are identified by strings.
 */
class EventBus {

    constructor() {
        this.events = new Map();
    }

    /**
     * Register a observer to an event.
     * @param event
     *  The event identifier.
     * @param observer
     *  A callback function that receives the event name and the source of the event.
     */
    observeEvent(event, observer) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(observer);
    }

    /**
     * Emmit a new event to all observers.
     * @param event
     *  The event identifier.
     * @param source
     *  The object that caused the event.
     */
    async emitEvent(event, source, params={}) {
        if (!this.events.has(event)) {
            return;
        }
        const observers = this.events.get(event);
        for (let observer of observers) {
            await observer(event, source, params);
        }
    }
}

/**
 * Represents an element of the game that can be drawn in the screen.
 * It is designed to represent game elements as an element tree. The idea is that we can call the draw method on
 * the root element and all the game elements will be drawn. Each element is responsible of providing its current
 * position relative to its parent, and also its size.
 */
class GameElement {

    /**
     * Create a new game element.
     * @param context
     *  The canvas 2d context.
     * @param eventBus
     *  The event bus shared in the game.
     * @param imageLoader
     *  Shared image loader.
     * @param parent
     *  The parent of this game element.
     */
    constructor(context, eventBus, imageLoader, parent=null) {
        this.context = context;
        this.children = [];
        this.imageLoader = imageLoader;
        this.eventBus = eventBus;
        if (parent) {
            parent.children.push(this);
            this.parent = parent;
        }
    }

    /**
     * This function must be implemented by derived classes. It is responsible of drawing the element in the screen.
     */
    async drawItself() {
        throw new Error("You must implement this function on derived classes.")
    }

    /**
     * This function must be implemented by derived classes.
     * @returns
     *  A pair of x,y pixel coordinates relative to the parent element.
     */
    getPosition() {
        throw new Error("You must implement this function on derived classes");
    }

    /**
     * This function must be implemented by derived classes.
     * @returns
     *  A pair of width,height pixel coordinates relative to the parent element.
     */
    getSize() {
       throw new Error("You must implement this function on derived classes.");
    }

    /**
     * Recursively draw all game elements in the tree from this element to its children.
     */
    async draw() {
        this.context.save();
        await this.drawItself();
        this.context.restore();
        for (let child of this.children) {
            await child.draw()
        }
    }
}

/**
 * This is the top level element of the frogger game. It is responsible of rendering the game background scenario.
 */
class FieldElement extends GameElement {

    constructor(canvas, context, eventBus, imageLoader) {
        super(context, eventBus, imageLoader);
        this.canvas = canvas;

        this.drawWin = false;
        this.drawLose = false;

        this.eventBus.observeEvent(GAME_EVENTS.RESET, () => {
            this.drawWin = false;
            this.drawLose = false;
        });
        this.eventBus.observeEvent(GAME_EVENTS.WIN, () => this.drawWin = true);
        this.eventBus.observeEvent(GAME_EVENTS.LOSE, () => this.drawLose = true);
    }

    getPosition() {
        return [0, 0];
    }

    getSize() {
        return [this.canvas.width, this.canvas.height];
    }

    async drawItself() {
        const columns = 5;
        const columnSize = 101;
        const rowSize = 83;
        const stoneBlock = await this.imageLoader.loadImage("img/stone-block.png");
        const waterBlock = await this.imageLoader.loadImage("img/water-block.png");
        const grassBlock = await this.imageLoader.loadImage("img/grass-block.png");

        for (let i=0; i<columns; i++) {
            this.context.drawImage(waterBlock, (i * columnSize), (0));
            this.context.drawImage(stoneBlock, (i * columnSize), (rowSize));
            this.context.drawImage(stoneBlock, (i * columnSize), (rowSize * 2));
            this.context.drawImage(stoneBlock, (i * columnSize), (rowSize * 3));
            this.context.drawImage(grassBlock, (i * columnSize), (rowSize * 4));
            this.context.drawImage(grassBlock, (i * columnSize), (rowSize * 5));
        }

        if (this.drawLose) {
            this.context.fillStyle = "#ff000033";
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (this.drawWin) {
            this.context.fillStyle = "#00ff0033";
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

/**
 * Implements the player element. It is responsible of rendering the
 */
class Player extends GameElement {

    /**
     * Create a new player element.
     * @param context
     *  Canvas 2d context.
     * @param eventBus
     *  Shared event bus.
     * @param imageLoader
     *  Shared image loader.
     * @param parent
     *  Parent element.
     * @param initialSquarePosition
     *  The initial position of the player in the field considering it divided in squares 5x6.
     * @param keyboard
     *  Shared keyboard listener.
     */
    constructor(context, eventBus, imageLoader, parent, initialSquarePosition, keyboard) {
        super(context, eventBus, imageLoader, parent);
        this.x = initialSquarePosition[0];
        this.y = initialSquarePosition[1];
        if (keyboard) {
            this.keyboard = keyboard;

            this.keyboard.down("up", async () => await this._moveUp());
            this.keyboard.down("down", () => this._moveDown());
            this.keyboard.down("left", () => this._moveLeft());
            this.keyboard.down("right", () => this._moveRight());
        }
        this.charImage = CHARACTERS.BOY;
        this.stopped = false;

        // register an observer to change the character image.
        this.eventBus.observeEvent(GAME_EVENTS.CHANGE_CHARACTER, (event, source, new_character) => this.charImage = new_character );
        // register an observer to reset player position
        this.eventBus.observeEvent(GAME_EVENTS.RESET, () => {
            this.x = initialSquarePosition[0];
            this.y = initialSquarePosition[1];
            this.stopped = false;
        });
        this.eventBus.observeEvent(GAME_EVENTS.STOP, () => this.stopped = true);
    }

    async _moveUp() {
        if (this.stopped) return;
        if (this.y > 0) {
            this.y -= 1;
        }
        if (this.y === 0) {
            await this.eventBus.emitEvent(GAME_EVENTS.WIN, this);
        }
    }

    _moveDown() {
        if (this.stopped) return;
        if (this.y < 5) {
            this.y += 1;
        }
    }

    _moveLeft() {
        if (this.stopped) return;
        if (this.x > 0) {
            this.x -= 1;
        }
    }

    _moveRight() {
        if (this.stopped) return;
        if (this.x < 4) {
            this.x += 1;
        }
    }

    getSize() {
        return [101, 83];
    }

    getPosition() {
        return [(this.x * 101), (this.y * 83)-25];
    }

    async drawItself() {
        const [x, y] = this.getPosition();
        const [width, height] = this.getSize();
        const playerImage = await this.imageLoader.loadImage(this.charImage);
        if (this.collisionDetection() && !this.stopped) {
            await this.eventBus.emitEvent(GAME_EVENTS.LOSE, this);
        }
        this.context.drawImage(playerImage, x, y);
    }

    /**
     * Check if there is a collision of the player with siblings elements (elements with the same parent).
     */
    collisionDetection() {
        // get all game elements in the parent and compare positions
        const gameElements = this.parent.children.filter(e => e !== this);
        const myBoundary = new GameElementBoundaries(this, {leftThreshold: 22, rightThreshold: 22, topThreshold: 9, bottomThreshold: 30});
        for (const element of gameElements) {
            const elementBoundary = new GameElementBoundaries(element);
            if (myBoundary.checkCollision(elementBoundary)) {
                return true;
            }
        }
        return false;
    }
}

/**
 * Represents a game element boundaries in the canvas.
 * It also encapsulates the algorithm to detect collisions between two elements.
 */
class GameElementBoundaries {

    /**
     * Create a new boundary object.
     * @param gameElement
     *  The game element associated.
     * @param leftThreshold
     *  The left threshold associated with the collision detection. It is like the amount of pixels a element can "invade"
     *  another element before being considered as a collision.
     * @param rightThreshold
     *  The right threshold for collision detection.
     * @param topThreshold
     *  The top threshold for collision detection.
     * @param bottomThreshold
     *  The bottom threshold for collision detection.
     */
    constructor(gameElement, {leftThreshold=0, rightThreshold=0, topThreshold=0, bottomThreshold=0}={}) {
        const [x, y] = gameElement.getPosition();
        const [width, height] = gameElement.getSize();
        this.topLeft = [x, y];
        this.topRight = [(x + width), y];
        this.bottomLeft = [x, (y + height)];
        this.bottomRight = [(x + width), (y + height)];
        this.leftThreshold = leftThreshold;
        this.rightThreshold = rightThreshold;
        this.topThreshold = topThreshold;
        this.bottomThreshold = bottomThreshold;
    }

    /**
     * Check if this element top-right corner is between the other element top-right and bottom-left corners.
     * @param blX
     *  Other element bottom-left X position.
     * @param blY
     *  Other element bottom-left Y position.
     * @param trX
     *  Other element top-right X position.
     * @param trY
     *  Other element top-right Y position.
     * @returns {boolean}
     *  If there is a collision.
     */
    _checkTopRightCollision([blX, blY], [trX, trY]) {
        const [localTrX, localTrY] = this.topRight;
        const xCollision = ((blX + this.rightThreshold) <= localTrX) && (trX >= localTrX);
        const yCollision = (trY <= localTrY) && ((blY - this.topThreshold) >= localTrY);
        return xCollision && yCollision;
    }

    /**
     * Check if this element top-left corner is between the other element bottom-right and top-left corners.
     * @param brX
     *  Other element bottom-right X position.
     * @param brY
     *  Other element bottom-right Y position.
     * @param tlX
     *  Other element top-left X position.
     * @param tlY
     *  Other element top-left Y position.
     * @returns {boolean}
     *  If there is a collision.
     */
    _checkTopLeftCollision([brX, brY], [tlX, tlY]) {
        const [localTlX, localTlY] = this.topLeft;
        const xCollision = (tlX <= localTlX) && ((brX - this.leftThreshold) >= localTlX);
        const yCollision = (tlY <= localTlY) && ((brY - this.topThreshold) >= localTlY);
        return xCollision && yCollision;
    }

    /**
     * Check if this element bottom-right corner is between the other element bottom-right and top-left corners.
     * @param brX
     *  Other element bottom-right X position.
     * @param brY
     *  Other element bottom-right Y position.
     * @param tlX
     *  Other element top-left X position.
     * @param tlY
     *  Other element top-left Y position.
     * @returns {boolean}
     *  If ther is a collision.
     */
    _checkBottomRightCollision([brX, brY], [tlX, tlY]) {
        const [localBrX, localBrY] = this.bottomRight;
        const xCollision = ((tlX + this.rightThreshold) <= localBrX) && (brX >= localBrX);
        const yCollision = ((tlY + this.bottomThreshold) <= localBrY) && (brY >= localBrY);
        return xCollision && yCollision;
    }

    /**
     * Check if this element bottom-left corner is between the other element bottom-left and top-right corners.
     * @param blX
     *  Other element bottom-left X position.
     * @param blY
     *  Other element bottom-left Y position.
     * @param trX
     *  Other element top-right X position.
     * @param trY
     *  Other element top-right Y position.
     * @returns {boolean}
     *  If there is a collision.
     */
    _checkBottomLeftCollision([blX, blY], [trX, trY]) {
        const [localBlx, localBly] = this.bottomLeft;
        const xCollision = (blX <= localBlx) && ((trX - this.leftThreshold) >= localBlx);
        const yCollision = ((trY + this.bottomThreshold) <= localBly) && (blY >= localBly);
        return xCollision && yCollision;
    }

    checkCollision(gameElementBoundary) {
        return (
            this._checkTopRightCollision(gameElementBoundary.bottomLeft, gameElementBoundary.topRight) ||
            this._checkTopLeftCollision(gameElementBoundary.bottomRight, gameElementBoundary.topLeft) ||
            this._checkBottomRightCollision(gameElementBoundary.bottomRight, gameElementBoundary.topLeft) ||
            this._checkBottomLeftCollision(gameElementBoundary.bottomLeft, gameElementBoundary.topRight)
        );
    }
}

/**
 * Represents an enemy in the game.
 */
class Enemy extends GameElement {

    /**
     *
     * @param context
     *  The canvas 2d context.
     * @param eventBus
     *  The event bus used by the game.
     * @param imageLoader
     *  Shared image loader.
     * @param parent
     *  The parent element.
     * @param row
     *  Specifies on which row the enemy is placed.
     * @param increase
     *  The increasing factor of the enemy movement.
     */
    constructor(context, eventBus, imageLoader, parent, row, increase) {
        super(context, eventBus, imageLoader, parent);
        this.row = row;
        this.x = -101;
        this.increase = increase;
        this.lastUpdate = Date.now();
        this.stopped = false;

        this.eventBus.observeEvent(GAME_EVENTS.RESET, () => {
            this.x = -101;
            this.stopped = false;
        });
        this.eventBus.observeEvent(GAME_EVENTS.STOP, () => {
            this.stopped = true;
        });
    }

    getPosition() {
        return [this.x, (this.row * 83)-25]
    }

    getSize() {
        return [101, 83];
    }

    /**
     * Update the position of the enemy based on time passed and also on its increase factor.
     */
    _updatePosition() {
        if (this.stopped) {
            return;
        }
        const now = Date.now();
        const timePassed = (now - this.lastUpdate) / 1000; // in seconds
        this.lastUpdate = now;
        this.x += (this.increase * timePassed);
        if (this.x > 505) {
            this.x = -101;
        }
    }

    async drawItself() {
        const bugImage = await this.imageLoader.loadImage("img/enemy-bug.png");
        this._updatePosition();
        const [x, y] = this.getPosition();
        this.context.drawImage(bugImage, x, y);
    }

}

/**
 * Encapsulates high level game constructs and dom initialization routines.
 */
class FroggerGame {

    /**
     * Initializes the game.
     * @param root
     *  The root element in which game elements will be loaded on.
     */
    constructor(root) {

        this.rootParent = root;
        this._createCanvas();
        this.eventBus = new EventBus();
        this.imageLoader = new ImageLoader();
        this.keyboard = new Kibo(this.canvas);
        this._createGameElements();
        this._createCharacterCombobox();
        this._registerGameEvents();
    }

    _createCanvas() {
        this.canvas = document.createElement("canvas");
        this.rootParent.appendChild(this.canvas);
        this.canvas.width = 505;
        this.canvas.height = 606;
        this.context = this.canvas.getContext("2d");
        this.canvas.tabIndex = 1;
        this.canvas.focus();
    }

    _createGameElements() {
        this.root = new FieldElement(this.canvas, this.context, this.eventBus, this.imageLoader);
        const player = new Player(this.context, this.eventBus, this.imageLoader, this.root, [2, 5], this.keyboard);
        const bug = new Enemy(this.context, this.eventBus, this.imageLoader, this.root, 1, 20);
        new Enemy(this.context, this.eventBus, this.imageLoader, this.root, 2, 200);
        new Enemy(this.context, this.eventBus, this.imageLoader, this.root,1, 400);
        new Enemy(this.context, this.eventBus, this.imageLoader, this.root, 3, 300);
    }

    /**
     * Creates a combobox with all available characters for the game.
     */
    _createCharacterCombobox() {
        this.rootParent.appendChild(document.createElement("br"));
        const combobox = document.createElement("select");
        for (const name in CHARACTERS) {
            combobox.add(new Option(name, CHARACTERS[name]));
        }
        this.rootParent.appendChild(combobox);
        combobox.addEventListener("change", async () => {
            const option = combobox.options[combobox.selectedIndex];
            await this.eventBus.emitEvent(GAME_EVENTS.CHANGE_CHARACTER, combobox, option.value);
        });
    }

    _registerGameEvents() {

        // when the player wins or lose the game we stop all elements for two seconds
        this.eventBus.observeEvent(GAME_EVENTS.WIN, async () => {
            await this.eventBus.emitEvent(GAME_EVENTS.STOP, this);
            this.sleep(2000).then(async () => await this.eventBus.emitEvent(GAME_EVENTS.RESET, this));
        });
        this.eventBus.observeEvent(GAME_EVENTS.LOSE, async () => {
            await this.eventBus.emitEvent(GAME_EVENTS.STOP, this);
            this.sleep(2000).then(async () => await this.eventBus.emitEvent(GAME_EVENTS.RESET, this));
        });
    }

    async sleep(duration) {
        return new Promise((resolve) => {
            window.setTimeout(resolve, duration);
        });
    }

    async run() {
        window.requestAnimationFrame(async () => {await this.run()});
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        await this.root.draw();
    }

}

document.addEventListener("DOMContentLoaded", async () => {
    const game = new FroggerGame(document.body);
    await game.run();
});