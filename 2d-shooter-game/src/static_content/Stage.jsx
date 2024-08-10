import React from 'react';
import $, { parseJSON } from 'jquery';

function randint(n){ return Math.round(Math.random()*n); }
function rand(n){ return Math.random()*n; }

/*
* A stage representing the game.
* Contains the view information for the game. 
*/ 
class Stage {
	// Create a new Stage. 
	constructor(canvas){
		this.canvas = canvas;
	
		this.actors=[]; // all stationary items on this stage (Obstacles, Weapon packages, Ammunition packages)
		this.players=[]; // a list of players
		this.ammunition=[]; // a list of active ammunition in the game. 

		for(var i = 0; i < 60; i++) {
			this.actors.push(null); // Add a 'null' placeholder for the item
		}

		// the logical width and height of the stage
		this.width=2000;
		this.height=2000;

		//Set the top left corner coordinates, to be used for the mouse position
		this.topX = 0;
		this.topY = 0;

		// Add this as the id for the current stage, and add a 'player' attribute. 
		// Use the 'id' and 'player' attributes to determine which player in the game represents the client's player. 
		this.id = null;
		this.player = null;

		// Clear the game canvas. 
		var context = this.canvas.getContext('2d');
		context.clearRect(-this.width, -this.height, 2 * this.width + 10, 2 * this.height + 10);

		// Display the canvas. 
		context.fillStyle = 'rgba(0, 200, 0)';
		context.fillRect(0, 0, this.canvas.width, this.canvas.height)

		this.update.bind(this);
	}

	// Create a list of items in <data>. 
	create(data) {
        var i;
        for (i = 0; i < data.length; i++) {
            var type = data[i].type;

			// Check the type of each item, handle appropriately
            switch (type) {
                case 'obstacle': // Create an Obstacle
                    var obstacle = new Obstacle(this, new Pair(data[i].x, data[i].y), data[i].colour, data[i].width, data[i].health);
                    this.actors[data[i].id] = obstacle;
                    break;
                case 'weapon': // Create a Weapon Package
                    var weapon = new WeaponPackage(this, new Pair(data[i].x, data[i].y), data[i].colour, data[i].width);
                    this.actors[data[i].id] = weapon;
                    break;
                case 'ammunition': // Create an Ammunition Package
                    var ammo = new AmmunitionPackage(this, new Pair(data[i].x, data[i].y), data[i].colour, data[i].width);
                    this.actors[data[i].id] = ammo;
                    break;
                case 'player': // Create a player, if one does not exist already. 
					if (this.player !== null) {
						break;
					}
					var protagonist = new Player(this, new Pair(data[i].x, data[i].y), data[i].colour, data[i].radius, data[i].health, data[i].weapon);
                	
					// Move the context to fit player's position appropriately. 
					var context = this.canvas.getContext('2d');
                	context.translate(-Math.abs(400 - protagonist.x), -Math.abs(400 - protagonist.y));
					this.topX = Math.abs(400 - protagonist.x);
					this.topY = Math.abs(400 - protagonist.y);

					// Set the player attribute for the stage
                	this.player = protagonist;

                	this.players.push(protagonist);
					this.id = data[i].id;
                    break;
				case 'opponent': // Create an Opponent, which is a Player controlled by another user
					var opponent = new Opponent(this, new Pair(data[i].x, data[i].y), "red", data[i].radius, data[i].health, data[i].weapon);
					this.players.push(opponent);
					break;
				case 'bullet': // Create a Bullet 
					var bullet = new Bullet(this, new Pair(data[i].x, data[i].y), data[i].radius);
					this.ammunition.push(bullet);
            }
        }
		// Draw the resulting stage
        this.draw();
	}

	// Update a list of existing items in <data>. 
    update(data) {
        var i;
		for (i=0; i < data.length; i++) {
			var type = data[i].type;
            
			// Check the type of each attribute, handle appropriately
			// Ammunition Packages and Weapon packages cannot be updated, but can be removed. 
            switch (type) {
                case 'obstacle': // Update the given obstacle
					this.actors[data[i].id].health = data[i].health;
                    break;
                case 'player': // Update a player or an opponent.
					// Check if the player is the client's player, or an opponent.  
					if (data[i].id == this.id) { 
						// Player is the client's player

						// Update position
						this.player.x = data[i].x;
						this.player.y = data[i].y;

						// Update health
						this.player.health = data[i].health;

						// Update weapon view
						this.player.weaponRadius = data[i].weapon;

						// Update canvas view and position. 
						var context = this.canvas.getContext('2d');
						context.translate(-data[i].changedX, -data[i].changedY);
						this.topX += data[i].changedX;
						this.topY += data[i].changedY;
					} else {
						// Player is an opponent, update the given opponent. 
						this.players[data[i].id].x = data[i].x;
						this.players[data[i].id].y = data[i].y;
						this.players[data[i].id].health = data[i].health;
						this.players[data[i].id].mousePosition.x = data[i].mouseX;
						this.players[data[i].id].mousePosition.y = data[i].mouseY;
					}
                    break;
            }
		}
    }

	// Delete a list of existing items in <data>. 
	delete(data) {
		var i;
		for (i=0; i < data.length; i++) {
			var type = data[i].type;
            // Check the type of each item, handle appropriately. 
            switch (type) {
                case 'obstacle': // Delete the Obstacle. 
					this.actors[data[i].id] = null;
                    break;
                case 'weapon': // Delete the Weapon Package.
					this.actors[data[i].id] = null;
                    break;
                case 'ammunition': // Delete the Bullet.
					this.actors[data[i].id] = null;
                    break;
                case 'player': // Delete the Player or Opponent. 
					// Check if the player is the client's player, or an opponent.  
					if (data[i].id == this.id) {
						// Player is the client's player
						this.gameLost = true;
					} else {
						// Player is an opponent
						this.players[data[i].id] = null;
					}
                    break;
            }
		}
	}

    // Draw the resulting animation of the game. 
	draw(){
		if (this.isLost) { // Player has lost, no need to redraw. 
			return;
		}

		// Clear the rectangle, redraw it 
		var context = this.canvas.getContext('2d');
		context.clearRect(0, 0, this.width, this.height);
		context.clearRect(-this.width, -this.height, 3 * this.width + 10, 3 * this.height + 10);

		context.fillStyle = 'rgba(0, 200, 0)';
		context.fillRect(0, 0, this.width, this.height);

		// Draw each item in the game. 
		for(var i=0;i<this.actors.length;i++){
			if (this.actors[i] !== null) {
				this.actors[i].draw(context);
			}
		}
		// Draw each player in the game.
		for(var i=0;i<this.players.length;i++){
			if (this.players[i] !== null) {
				this.players[i].draw(context);
			}
		}
		// Draw each bullet in the game. 
		for(var i=0;i<this.ammunition.length;i++){
			this.ammunition[i].draw(context);
		}
		// Clear the bullets list. Ammunition is continuously updating, so we can get away with not storing the data. 
		this.ammunition = [];

		context.fillStyle = "black";
		// Update the score for this game. 
		context.font = '20px serif';
		context.fillText("Score: " + this.player.score, 650 + this.topX, 50 + this.topY, 200);

		// Update the player's ammunition count. 
		context.font = '20px serif';
		context.fillText("Ammunition: " + this.player.numBullets, 600 + this.topX, 750 + this.topY, 200);
	}
}

/*
* A Pair with an x and y coordinate. 
*/
class Pair {
	// Create a new Pair. 
	constructor(x,y){
		this.x=x; this.y=y;
	}

	// String value of the pair
	toString(){
		return "("+this.x+","+this.y+")";
	}

	// Normalize the pair
	normalize(){
		var magnitude=Math.sqrt(this.x*this.x+this.y*this.y);
		this.x=this.x/magnitude;
		this.y=this.y/magnitude;
	}
}

/*
* A ball that acts as a base class for characters in the game. 
*/
class Ball {

	// Create a new Ball.
	constructor(stage, position, colour, radius){
		this.stage = stage;
		this.position=position;
		this.intPosition(); // this.x, this.y are int version of this.position
		this.colour = colour;
		this.radius = radius;
		this.changed = new Pair(0, 0);
	}

    // Set the integer value of the Ball's current position. 
	intPosition(){
		this.x = Math.round(this.position.x);
		this.y = Math.round(this.position.y);
	}

	// Draw the ball. 
	draw(context){
		context.fillStyle = this.colour;
		context.beginPath(); 
		context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false); 
		context.fill();   
	}
}

/*
* A Ball that is a physical object with health, that can be interacted with. 
* Examples include Players, Opponents, and Obstacles. 
*/
class Characterball extends Ball {

	// Create a new Character Ball
	constructor(stage, position, colour, radius, health){
		super(stage, position, colour, radius);
		this.health = health;
		this.maxHealth = health;
	}
}

/*
* An obstacle in the map.
* Player and AI cannot move on the obstacle. 
* Obstacle can be destroyed. 
*/
class Obstacle extends Characterball {
	
	// Create a new Obstacle
	constructor(stage, position, colour, radius, health) {
		super(stage, position, colour, radius, health);
		this.character = "Obstacle";
	}

	// Draw the Obstacle
    draw(context){
		// Fill the health bar.
		context.fillStyle = 'blue';
		context.fillRect(this.x, this.y + this.radius * 1.2, this.radius * this.health, 5);

		// Fill the obstacle. 
		context.fillStyle = this.colour;
   		context.fillRect(this.x, this.y, this.radius,this.radius);
	}
}

/*
* An ammunition package that the player picks up. 
* Gives the player a given number of bullets if picked up. 
*/ 
class AmmunitionPackage extends Ball {
	
	// Create a new Ammunition package. 
	constructor(stage, position, colour, radius) {
		super(stage, position, colour, radius);
		this.numBullets = 20;
	}

	// Draw the Ammunition Package
	draw(context) {
		// Draw ammunition package.
		context.fillStyle = this.colour;
		context.fillRect(this.x, this.y, this.radius,this.radius);
	}
}

/*
* A weapon package that the player can pick up. 
* Gives the player a new weapon when the player picks it up. 
*/
class WeaponPackage extends AmmunitionPackage {
	// Created similarly to an Ammunition Package. 
}

// A bullet that the player or AI can fire. 
class Bullet extends Ball {
	
	// Create a new bullet. 
	constructor(stage, position, radius) {
		super(stage, position, 'black', radius);
	}
}

/* 
* A Human-controlled player of the game. 
*/
class Player extends Characterball {
	
	// Create a new player.
	constructor(stage, position, colour, radius, health, weaponRadius){
		super(stage, position, colour, radius, health);
		this.mousePosition = this.position;
		this.numBullets = 0;
		this.score = 0;

		// Radius of the player's weapon. 
		this.weaponRadius = weaponRadius;
	}
	
	// Update the player's mouse position. 
	setMousePosition(newPosition) {
		this.mousePosition = newPosition;
	}

	// Draw the Player.
	draw(context){

		// Draw the Player object
		context.fillStyle = this.colour;
		context.beginPath(); 
		context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false); 
		context.stroke();  
		context.fill();

		// Draw the Player's rotating 'turret'. 
		var distance = Math.sqrt(Math.pow(this.mousePosition.x - this.x, 2) + Math.pow(this.mousePosition.y - this.y, 2));
		var newX = this.x + this.radius * ((this.mousePosition.x - this.x) / distance);
		var newY = this.y + this.radius * ((this.mousePosition.y - this.y) / distance);
		context.beginPath();
		context.arc(newX, newY, this.weaponRadius, 0, 2 * Math.PI, true);
		context.stroke();
		context.fill();
	
		// Draw the Player's health bar. 
		context.fillStyle = 'blue';
		context.fillRect(this.x - this.radius * 1.2, this.y + this.radius * 1.2, 2 * this.radius * this.health, 10);

	}
}

/*
* An Opponent, a Player controlled by another individual. 
*/
class Opponent extends Characterball {

	// Create a new Opponent. 
	constructor(stage, position, colour, radius, health, weaponRadius){
		super(stage, position, colour, radius, health);
		this.mousePosition = position;
		this.weaponRadius = weaponRadius;
	}

	// Draw the Opponent
	draw(context){

		// Draw the Opponent object
		context.fillStyle = this.colour;
		context.beginPath(); 
		context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false); 
		context.stroke();  
		context.fill();

		// Draw the Opponent's rotating 'turret'. 
		var distance = Math.sqrt(Math.pow(this.mousePosition.x - this.x, 2) + Math.pow(this.mousePosition.y - this.y, 2));
		var newX = this.x + this.radius * ((this.mousePosition.x - this.x) / distance);
		var newY = this.y + this.radius * ((this.mousePosition.y - this.y) / distance);
		context.beginPath();
		context.arc(newX, newY, this.weaponRadius, 0, 2 * Math.PI, true);

		context.stroke();
		context.fill();
	
		// Draw the Opponent's health bar. 
		context.fillStyle = 'blue';
		context.fillRect(this.x - this.radius * 1.2, this.y + this.radius * 1.2, 2 * this.radius * this.health, 10);
	}
}


export {Stage, Pair};