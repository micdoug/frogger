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
 * Represents an element of the game that can be drawn in the screen.
 * It is designed to represent game elements as an element tree. The idea is that we can call the draw method on
 * the root element and all the game elements will be drawn. Each element is responsible of providing its current
 * position relative to its parent, and also its size.
 */
class GameElement {

    /**
     * Create a new game element.
     * @param context
     * @param parent
     */
    constructor(context, parent=null) {
        this.context = context;
        this.children = [];
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

    async draw() {
        this.context.save();
        await this.drawItself();
        this.context.restore();
        for (let child of this.children) {
            await child.draw()
        }
    }
}

class FieldElement extends GameElement {

    constructor(canvas, context, imageLoader) {
        super(context);
        this.imageLoader = imageLoader;
        this.canvas = canvas;
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
    }
}

/**
 * Implements the
 */
class Player extends GameElement {

    constructor(context, parent, imageLoader, initialSquarePosition, keyboard) {
        super(context, parent);
        this.imageLoader = imageLoader;
        this.x = initialSquarePosition[0];
        this.y = initialSquarePosition[1];
        if (keyboard) {
            this.keyboard = keyboard;

            this.keyboard.down("up", () => this._moveUp());
            this.keyboard.down("down", () => this._moveDown());
            this.keyboard.down("left", () => this._moveLeft());
            this.keyboard.down("right", () => this._moveRight());
        }
    }

    _moveUp() {
        if (this.y > 0) {
            this.y -= 1;
        }
    }

    _moveDown() {
        if (this.y < 5) {
            this.y += 1;
        }
    }

    _moveLeft() {
        if (this.x > 0) {
            this.x -= 1;
        }
    }

    _moveRight() {
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
        const playerImage = await this.imageLoader.loadImage("img/char-boy.png");

        if (this.collisionDetection()) {
            this.context.fillStyle = "red";
            this.context.fillRect(0, 0, width, height);
        }
        this.context.drawImage(playerImage, x, y);
    }

    collisionDetection() {
        // get all game elements in the parent and compare positions
        const gameElements = this.parent.children.filter(e => e !== this);
        const myBoundary = new GameElementBoundaries(this);
        for (const element of gameElements) {
            const elementBoundary = new GameElementBoundaries(element);
            if (myBoundary.checkCollision(elementBoundary)) {
                return true;
            }
        }
        return false;
    }
}

class GameElementBoundaries {

    constructor(gameElement) {
        const [x, y] = gameElement.getPosition();
        const [width, height] = gameElement.getSize();
        this.topLeft = [x, y];
        this.topRight = [(x + width), y];
        this.bottomLeft = [x, (y + height)];
        this.bottomRight = [(x + width), (y + height)];
        this.leftThreshold = 19;
        this.rightThreshold = 19;
        this.topThreshold = 9;
        this.bottomThreshold = 30;
    }

    /**
     * A top right collision happens when the other element top right coordinate is placed between the
     * current object top right and bottom left coordinates.
     * @param trX
     * @param trY
     * @private
     */
    _checkTopRightCollision([blX, blY], [trX, trY]) {
        const [localTrX, localTrY] = this.topRight
        const xCollision = ((blX + this.rightThreshold) <= localTrX) && (trX >= localTrX);
        const yCollision = (trY <= localTrY) && ((blY - this.topThreshold) >= localTrY);
        return xCollision && yCollision;
    }

    _checkTopLeftCollision([brX, brY], [tlX, tlY]) {
        const [localTlX, localTlY] = this.topLeft;
        const xCollision = (tlX <= localTlX) && ((brX - this.leftThreshold) >= localTlX);
        const yCollision = (tlY <= localTlY) && ((brY - this.topThreshold) >= localTlY);
        return xCollision && yCollision;
    }

    _checkBottomRightCollision([brX, brY], [tlX, tlY]) {
        const [localBrX, localBrY] = this.bottomRight;
        const xCollision = ((tlX + this.rightThreshold) <= localBrX) && (brX >= localBrX);
        const yCollision = ((tlY + this.bottomThreshold) <= localBrY) && (brY >= localBrY);
        return xCollision && yCollision;
    }

    _checkBottomLeftCollision([blX, blY], [trX, trY]) {
        const [localBlx, localBly] = this.bottomLeft;
        const xCollision = ((blX + this.rightThreshold) <= localBlx) && (trX >= localBlx);
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


class Enemy extends GameElement {

    constructor(context, parent, imageLoader, row, increase) {
        super(context, parent);
        this.imageLoader = imageLoader;
        this.row = row;
        this.x = -101;
        this.increase = increase;
        this.lastUpdate = Date.now();
    }

    getPosition() {
        return [this.x, (this.row * 83)-25]
    }

    getSize() {
        return [101, 83];
    }

    _updatePosition() {
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
     * @param width
     *  The width of the game screen.
     * @param height
     *  The height of the game screen.
     */
    constructor(root, width=505, height=606) {
        this.rootParent = root;

        // create the
        this.canvas = document.createElement("canvas");
        this.rootParent.appendChild(this.canvas);
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext("2d");
        this.canvas.tabIndex = 1;
        this.canvas.focus();

        this.imageLoader = new ImageLoader();
        this.keyboard = new Kibo(this.canvas);
        this.root = new FieldElement(this.canvas, this.context, this.imageLoader);
        const player = new Player(this.context, this.root, this.imageLoader, [2, 5], this.keyboard);

        const bug = new Enemy(this.context, this.root, this.imageLoader, 1, 20);
        new Enemy(this.context, this.root, this.imageLoader, 1, 400);
        new Enemy(this.context, this.root, this.imageLoader, 2, 200);
        new Enemy(this.context, this.root, this.imageLoader, 3, 300);

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