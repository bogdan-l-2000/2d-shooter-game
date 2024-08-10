// https://www.freecodecamp.org/news/express-explained-with-examples-installation-routing-middleware-and-more/
// https://medium.com/@viral_shah/express-middlewares-demystified-f0c2c37ea6a1
// https://www.sohamkamani.com/blog/2018/05/30/understanding-how-expressjs-works/

var fs = require('fs');
var database_info = JSON.parse(fs.readFileSync('database_info.json', 'utf-8'));

var port = 8000; 
var webSocketPort = port + 1;
var game = null;

var express = require('express');
var app = express();

const { Pool } = require('pg')
const pool = new Pool({
    user: database_info.user,
    host: database_info.host,
    database: database_info.database,
    password: database_info.password,
    port: database_info.port
});

const bodyParser = require('body-parser'); // we used this middleware to parse POST bodies

function isObject(o){ return typeof o === 'object' && o !== null; }
function isNaturalNumber(value) { return /^\d+$/.test(value); }

// app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// app.use(bodyParser.raw()); // support raw bodies

// Non authenticated route. Can visit this without credentials
app.post('/api/test', function (req, res) {
	res.status(200); 
	res.json({"message":"got here"}); 
});

app.get('/api/users', function (re1, res) {
	let sql = 'SELECT * FROM tankGameUser';
	pool.query(sql, [], (err, pgRes) => {
	  if (err){
				res.status(403).json({ error: 'Not found'});
	} else {
		res.json(pgRes.rows);
		return;
	}
	});

});

// The following are 3 POST requests for registering a player, adding the player's game settings, and initializing the player's score.
// These requests do not require authentication as they only initialize the player. 

// POST request for registering a player
app.post('/api/register', function(req, res) {	
	
	// Get the request's data
	username = req.body.username;
	password = req.body.password;
	role = req.body.role;
	playMorning = req.body.playMorning;
	playAfternoon = req.body.playAfternoon;
	playEvening = req.body.playEvening;

	// Insert data into table 
	var statement = "INSERT INTO tankGameUser(username, password, role, playMorning, playAfternoon, playEvening) VALUES ($1,sha512($2), $3, $4, $5, $6)";
	pool.query(statement, [username, password, role, playMorning, playAfternoon, playEvening], (err, pgRes) => {
		if(err && err.code==23505){ // pg duplicate key error
               		res.status(409);
               		res.json({error:`${username} exists already`});
               		return;
		}
  		if (err) { // Database Error
			res.status(500);
			res.json({error :err.message});
			return;
  		} 
        	if(pgRes.rowCount == 1){ //INSERT succeeded
			res.status(200);
        		res.json({"message": `${username} registered`});
				return;
        	} else { // Error
			res.status(500);
			res.json({error:`couldn't add ${username}`});
			return;
        	}
	});
});

// POST request for creating game settings for a player
app.post('/api/createSettings', function (req, res) {
	
	var username = req.body.username;

	// Insert data into table 
	let sql = 'INSERT INTO tankGameParameters(username) VALUES($1)';
	pool.query(sql, [username], (err, pgRes) => {
		if (err) {
			res.status(500).json({ error: err.message});
	  	} else {
		  	res.json({"message":"authentication success"});
		  	res.status(200);
		  	return;
		}
	});
});

// POST request for creating score data for a player
app.post('/api/createScore', function (req, res) {
	
	var username = req.body.username;

	// Insert data into table 
	let sql = 'INSERT INTO tankGameScore(username) VALUES($1)';
	pool.query(sql, [username], (err, pgRes) => {
		if (err) {
			res.status(403).json({ error: 'Database error'});
	  	} else {
		  	res.json({"message":"authentication success"});
		  	res.status(200);
		  	return;
		}
	});
});


/** 
 * This is middleware to restrict access to subroutes of /api/auth/ 
 * To get past this middleware, all requests should be sent with appropriate
 * credentials. Now this is not secure, but this is a first step.
 *
**/
app.use('/api/auth', function (req, res,next) {
	if (!req.headers.authorization) {
		return res.status(403).json({ error: 'No credentials sent!' });
  	}
	try {
		// var credentialsString = Buffer.from(req.headers.authorization.split(" ")[1], 'base64').toString();
		var m = /^Basic\s+(.*)$/.exec(req.headers.authorization);

		var user_pass = Buffer.from(m[1], 'base64').toString()
		m = /^(.*):(.*)$/.exec(user_pass); // probably should do better than this

		var username = m[1];
		var password = m[2];

		console.log(username+" "+password);

		let sql = 'SELECT * FROM tankGameUser WHERE username=$1 and password=sha512($2)';
        	pool.query(sql, [username, password], (err, pgRes) => {
  			if (err){
				  		console.log('error');
                		res.status(403).json({ error: 'Not authorized'});
			} else if(pgRes.rowCount == 1){
				next(); 
			} else {
						console.log('duplicates');
						console.log(pgRes.rows);
                		res.status(403).json({ error: 'Not authorized'});
        		}
		});
	} catch(err) {
               	res.status(403).json({ error: 'Not authorized'});
	}
});

// All routes below /api/auth require credentials 

// POST request for logging in a player
app.post('/api/auth/login', function (req, res) {

	var m = /^Basic\s+(.*)$/.exec(req.headers.authorization);

	var user_pass = Buffer.from(m[1], 'base64').toString()
	m = /^(.*):(.*)$/.exec(user_pass); 

	var username = m[1];

	let sql= 'SELECT * FROM tankGameParameters WHERE username=$1';
	pool.query(sql, [username], (err, pgRes) => {
		if (err) {
			res.status(403).json({ error: 'Unauthorized'});
	  	} else {
		  	res.json(pgRes.rows[0]);
		  	res.status(200);
		  	return;
		}
	});
});

// Test for authorized requests
app.post('/api/auth/test', function (req, res) {
	res.status(200); 
	res.json({"message":"got to /api/auth/test"}); 
});

// GET request for retrieving player score statistics
app.get('/api/auth/getStats', function (req, res) {
	// Get the scores for all of the players, order by descending score
	let sql = 'SELECT username, score, gameswon FROM tankGameScore ORDER BY score DESC';
        	pool.query(sql, [], (err, pgRes) => {
  			if (err){
                res.status(403).json({ error: 'Unauthorized'});
			} else if (pgRes.rowCount == 0) {
				res.status(404).json({error: 'Not found'});
			} else {
				res.json(pgRes.rows);
				res.status(200);
				return;
			}
		});
});

// GET request for displaying a player's profile information
app.get('/api/auth/displayProfile', function (req, res) {
	// Get the player's username from the credentials
	var m = /^Basic\s+(.*)$/.exec(req.headers.authorization);
	var user_pass = Buffer.from(m[1], 'base64').toString()
	m = /^(.*):(.*)$/.exec(user_pass); 
	var username = m[1];

	// Get the player's profile information from the database
	let sql = 'SELECT username, role, playMorning, playAfternoon, playEvening FROM tankGameUser WHERE username=$1';
        	pool.query(sql, [username], (err, pgRes) => {
  			if (err){
                res.status(404).json({ error: 'Unauthorized'});
			} else if (pgRes.rowCount == 0) {
				res.status(404).json({error: 'Not found'});
			} else {
				res.json(pgRes.rows);
				res.status(200);
				return;
			}
	});
});

// GET request for retrieving a player's game settings 
app.get('/api/auth/getSettings', function (req, res) {
	// Get the player's username from the credentials
	var m = /^Basic\s+(.*)$/.exec(req.headers.authorization);
	var user_pass = Buffer.from(m[1], 'base64').toString()
	m = /^(.*):(.*)$/.exec(user_pass); 
	var username = m[1];

	// Get the player's game settings information from the database
	let sql= 'SELECT * FROM tankGameParameters WHERE username=$1';
	pool.query(sql, [username], (err, pgRes) => {
		if (err) {
			res.status(403).json({ error: 'Unauthorized'});
	  	} else if (pgRes.rowCount == 0) {
			res.status(404).json({error: 'Not found'});
		} else {
		  	res.json(pgRes.rows[0]);
		  	res.status(200);
		  	return;
		}
	});
});

// PUT request for updating a player's game settings
app.put('/api/auth/updateSettings', function (req, res) {
	// Get the player's username from the credentials
	var m = /^Basic\s+(.*)$/.exec(req.headers.authorization);
	var user_pass = Buffer.from(m[1], 'base64').toString()
	m = /^(.*):(.*)$/.exec(user_pass); 
	var username = m[1];

	// Get the data passed in by the player
	var numopponents = parseInt(req.body.numopponents);
	var numadvopponents = parseInt(req.body.numadvopponents);
	var numobstacles = parseInt(req.body.numobstacles);
	var playerhp = parseInt(req.body.playerhp);
	var opponenthp = parseInt(req.body.opponenthp);

	// Update the player's game settings with the data that the player has requested
	let sql = 'UPDATE tankGameParameters SET numOpponents=$1, numAdvOpponents=$2, numObstacles=$3, playerHP=$4, opponentHP=$5 WHERE username=$6';
	pool.query(sql, [numopponents, numadvopponents, numobstacles, playerhp, opponenthp, username], (err, pgRes) => {
		if (err) {
			res.status(403).json({ error: 'Database error'});
	  	} else {
		  	res.json({"message": "Settings updated"});
		  	res.status(200);
		  	return;
		}
	});
});

// Middleware for checking if a username exists in the database or not
// Used if a player wishes to update their profile information, including their username
app.use('/api/auth/checkNewProfile', function (req, res, next) {
	// Get the old username from the credentials
	var m = /^Basic\s+(.*)$/.exec(req.headers.authorization);
	var user_pass = Buffer.from(m[1], 'base64').toString()
	m = /^(.*):(.*)$/.exec(user_pass); 
	var oldUsername = m[1];

	// Get the new username from the data
	var newUsername = req.body.username;	

	// Try to find the new username in the database
	let sql = 'SELECT * FROM tankGameUser WHERE username=$1';
	pool.query(sql, [newUsername], (err, pgRes) => {
		if (err) {
			res.status(403).json({ error: 'Database error'});
	  	} else if (pgRes.rowCount >= 1) { // Username exists
			if (newUsername == oldUsername) { // Player did not change their username
				next(); // Move on
			} else { // Other user has this username, not possible to change
				res.status(403).json({error: "Username already exists"});
			}
		} else { // Username does not exist
		  	next(); // Move on 
		}
	});
});

// PUT request to update a player's profile information
// Done after player's username change was validated
app.put('/api/auth/checkNewProfile/updateProfile', function (req, res) {
	// Get the old username from the credentials
	var m = /^Basic\s+(.*)$/.exec(req.headers.authorization);
	var user_pass = Buffer.from(m[1], 'base64').toString();
	m = /^(.*):(.*)$/.exec(user_pass); 
	var oldUsername = m[1];

	// Get the new profile data that the player has passed in
	var newUsername = req.body.username;
	var password = req.body.enterPassword;
	var role = req.body.role;
	var morning = req.body.playMorning;
	var afternoon = req.body.playAfternoon;
	var evening = req.body.playEvening;

	// Update user's profile data 
	let sql = 'UPDATE tankGameUser SET username=$1, password=sha512($2), role=$3, playMorning=$4, playAfternoon=$5, playEvening=$6 WHERE username=$7';
	pool.query(sql, [newUsername, password, role, morning, afternoon, evening, oldUsername], (err, pgRes) => {
		if (err) {
			res.status(403).json({ error: 'Unable to update profile'});
	  	} else {
			res.json({"message": "Profile updated"});
			res.status(200);
		}
	});
});

// Delete a player's profile data
app.delete('/api/auth/deleteProfile', function (req, res) {
	// Get the player's username from the credentials
	var m = /^Basic\s+(.*)$/.exec(req.headers.authorization);
	var user_pass = Buffer.from(m[1], 'base64').toString()
	m = /^(.*):(.*)$/.exec(user_pass); 
	var username = m[1];

	// Delete the player's profile information.
	// Player's game settings and score information will be delete as well. 
	let sql= "DELETE FROM tankGameUser WHERE username=$1";
	pool.query(sql, [username], (err, pgRes) => {
		if (err) {
			res.status(403).json({ error: 'Profile not found'});
	  	} else {
		  	res.json({"message": `${username} deleted`});
			res.status(200);
			return;
		}
	});
});

// Update a player's score information. 
app.put('/api/auth/updateScore', function (req, res) {
	// Get the player's username from the credentials
	var m = /^Basic\s+(.*)$/.exec(req.headers.authorization);
	var user_pass = Buffer.from(m[1], 'base64').toString()
	m = /^(.*):(.*)$/.exec(user_pass); 
	var username = m[1];

	// Get the new score information from the data
	var score = req.body.score;
	var won = req.body.won;
	var played = req.body.played;

	// Update the player's score information, add the new data to the database
	let sql= "UPDATE tankGameScore SET score=score+$1, gamesWon=gamesWon+$2, gamesPlayed=gamesPlayed+$3 WHERE username=$4";
	pool.query(sql, [score, won, played, username], (err, pgRes) => {
		if (err) {
			res.status(403).json({ error: 'Unable to update score'});
	  	} else {
		  	res.json({"message": "score updated"});
			res.status(200);
			return;
		}
	});
});


app.use('/',express.static('static_content')); 

app.listen(port, function () {
  	console.log('Example app listening on port '+port);
});

// Web Sockets
var WebSocketServer = require('ws').Server
   ,wss = new WebSocketServer({port: webSocketPort});
console.log(webSocketPort);

var actors = [];
var players = [];
var game = null;
var to_send = [];
var next_player = 0;


function randint(n){ return Math.round(Math.random()*n); }
function rand(n){ return Math.random()*n; }


wss.on('close', function() {
	console.log('disconnected');
});


wss.on('connection', function(ws) {
	// Set index for player, index maps socket to a player
	ws.index = next_player;
	next_player++;

	// Check if a game exists. If not, create the game. 
	if (game === null) {
		console.log('no game!');
		game = new ServerStage(); // ServerStage is the model for the game

		// Start the interval
		interval=setInterval(function(){ this.to_send = []; game.step(); wss.broadcast(JSON.stringify(to_send)); },100);
	}

	// Send the player a list of the obstacles, weapon pickups, and ammunition pickups located in the game
	var i;
	for (i = 0; i < game.items.length; i++) {
		if (game.items[i] !== null) {
			to_send.push({"type": game.items[i].type, "width": game.items[i].width, 
					 "x": game.items[i].x, "y": game.items[i].y, "health": game.items[i].health, 
					 "colour": game.items[i].colour, "id": game.items[i].id
					, "action": "create"});
		}
	}

	// Send the player a list of players currently playing the game, if applicable
	for (i = 0; i < game.players.length; i++) {
		if (game.players[i] !== null) {
		to_send.push({"type": 'opponent', "radius": game.players[i].radius, "id": game.players[i].id,
		"x": game.players[i].x, "y": game.players[i].y, "health": game.players[i].health, "weapon": game.players[i].weapon.weaponRadius,
		"colour": game.players[i].colour, "id": game.players[i].id
	   , "action": "create"});
		}
	}

	// Create the player, send the data to the client
	var player = new Player("player", 20, Math.random()*(1960), Math.random()*(1960), "black", 1, game, ws.index);
	to_send.push({"type": player.type, "radius": player.radius, "id": player.id, "weapon": player.weapon.weaponRadius,
					"x": player.x, "y": player.y, "colour": player.colour, "health": player.health, "action": "create"});
	
	// Send the data to the client
	ws.send(JSON.stringify(to_send));
	
	// Clear the 'send' buffer
	to_send = [];

	// Send the new player data to all other existing players
	for (let client of this.clients) {
		if (client.index == ws.index) { // index of current player: already sent
			continue;
		}
		client.send(JSON.stringify([{"type": "opponent", "radius": player.radius, "id": player.id, "weapon": player.weapon.weaponRadius,
		"x": player.x, "y": player.y, "colour": player.colour, "health": player.health, "action": "create"}]));
	}
	
	// Add the player to the list of players
	game.players.push(player);

	// Server receives a message from the client. Message contains information on user input. 
	ws.on('message', function(message) {

		// Parse the message
		var data = JSON.parse(message);
		if (game.players[ws.index] === null) { // Player is no longer in the game, ignore
			return;
		}
		
		// deltaX and deltaY are the changes in position, corresponding to the key the player has pressed
		// Update the player's velocity depending on the changes specified
		game.players[ws.index].velocity.x += 0.25*data.deltaX;
		game.players[ws.index].velocity.y += 0.25*data.deltaY;

		// mousePosition is the position of the mouse location. This tells us where the player is aiming. 
		game.players[ws.index].setMousePosition(new Pair(data.mousePositionX, data.mousePositionY));

		// if isBullet is True, then the player has made the decision to shoot. Handle appropriately. 
		if (data.isBullet) {
			
			// Check if player has enough ammunition to shoot, and has reloaded. 
			if (game.players[ws.index].numBullets > 0 && game.players[ws.index].weapon.reloadRemaining <= 0) {

				// Create a new bullet based on the player's data and the player's weapon data. 
				var newBullet = new Bullet(game, new Pair(game.players[ws.index].x, game.players[ws.index].y), new Pair(0.1 * (game.players[ws.index].mousePosition.x - game.players[ws.index].x), 
					0.1* (game.players[ws.index].mousePosition.y - game.players[ws.index].y)), game.players[ws.index].weapon.range, game.players[ws.index].id, game.players[ws.index].weapon.bulletDamage,
					game.players[ws.index].weapon.bulletSize
				);

				// Add the bullet to the list of ammunition currently in play.  
				game.activeAmmunition.push(newBullet);
				
				// Remove a bullet from the Player
				game.players[ws.index].numBullets -= 1;
                        
				// Reset the reload time. 
				game.players[ws.index].weapon.reloadRemaining = game.players[ws.index].weapon.reloadTime;
			}
		}
	});
});

// Send a message to every client. 
wss.broadcast = function(message){
	for(let ws of this.clients){ 
		ws.send(message); 
	}
}

/* 
* The server side of the stage.
* Contains the game model and data. 
*/
class ServerStage {

	// Create a new Server Stage. 
    constructor() {
        this.items = []; // items: the list of immovable objects in the game, such as obstacles, weapon pickups, and bullet pickups
        this.activeAmmunition = []; // activeAmmunition: the list of ammunition currently on the map. Ammunition times out.
        this.players = []; // players: the list of players currently in the game.
		this.changed = []; // changed: the list of objects which have attributes changed since the last iteration.
        
		// Set the width and the height of the map. Important for handling boundaries.
		this.width = 2000;
		this.height = 2000;

		// Create all of the objects: a lost of obstacles, weapon pickups, and bullet pickups.
		var i;
		for (i = 0; i < 60; i+=3) {

			// Create an obstacle: any colour. Add it to the items list.
			var red=randint(255), green=randint(255), blue=randint(255);
			var alpha = Math.random();
			var colour= 'rgba('+red+','+green+','+blue+','+alpha+')';
			var obstacle = new ServerObstacle("obstacle", 80, Math.random()*(1960), Math.random()*(1960), colour, i, 1, this);
			this.items.push(obstacle);
			
			// Create an ammunition package. Add it to the items list.
			var ammo = new ServerAmmunitionPackage("ammunition", 30, Math.random()*(1960), Math.random()*(1960), "black", i + 1, 1, this);
			this.items.push(ammo);

			// Create a weapon package. Add it to the items list. 
			var weapon = new ServerWeaponPackage("weapon", 30, Math.random()*(1960), Math.random()*(1960), "grey", i + 2, 1, this);
			this.items.push(weapon);
		}
    }

	// Take one step in the progression of the game. 
	step(){
		// Move each player in the game
		for(var i=0;i<this.players.length;i++){
			if (this.players[i] !== null){ 
				this.players[i].step();
			}
		}
		
		// Move each bullet in the game. Bullets are consistently moving and we thus update them in each step. 
		for(var i=0;i<this.activeAmmunition.length;i++){
			var newBullet = this.activeAmmunition[i];
			if (!(newBullet === null)) {
				this.changed.push({"type": "bullet", "x": newBullet.x, "y": newBullet.y, "radius": newBullet.radius, "action": "create"});
			}
			this.activeAmmunition[i].step();
		}

		// Update the items in the game. These are stationary items and don't 'move', however the items and their attributes can be updated.
		// The step() method makes checks and carries out appropriate actions with the items. 
		for(var i=0;i<this.items.length;i++) {
			if (this.items[i] !== null) {
				this.items[i].step();
			}
		}

		// Set the list of items to be sent to the current changed list.
		to_send = this.changed;

		// Clear the existing changed list, until the next iteration.
		this.changed = [];
	}

	// Remove a bullet from the game. 
	removeAmmunition(bullet){
		var index=this.activeAmmunition.indexOf(bullet);
		if(index!=-1){
			this.activeAmmunition.splice(index,1);
		}
	}
}


/*
* Base class for Obstacles, Weapon packages, and Ammunition packages. 
*/ 
class ServerItem {

	// Create a server item. It is a square item with a given set of attributes. 
    constructor(type, width, x, y, colour, id, health, stage) {
        this.type = type;
        this.width = width;
        this.x = x;
        this.y = y;
        this.colour = colour;
        this.id = id;
        this.health = health;
		this.stage = stage;
    }

	// Check for player interaction with this item. 
	step() {
		var itemIndex = this.id;
		var i;
		var centerX = this.x + 0.5 * this.width;
		var centerY = this.y + 0.5 * this.width;

		// Check if a player is near the Ammunition Package.
		for (i = 0; i < this.stage.players.length; i++) {
			if (i == itemIndex || this.stage.players[i] === null) {
				// Index of the current ammunition package, continue.
				continue;
			}

			// Check the distance between the player and the Ammunition package.
			if (Math.abs(this.stage.players[i].x - centerX) < this.width / 2  &&
				Math.abs(this.stage.players[i].y - centerY) < this.width / 2
			) {
				// If the player is above the ammunition package, player picks it up, gains a given number of bullets. 
				//this.stage.actors[i].numBullets += this.numBullets;
				this.onPickup(this.stage.players[i]);
				this.stage.changed.push({"id": this.id, "type": this.type, "action": "delete"});
				this.stage.items[this.id] = null;
				return;
			}	
		}
	}
}

/*
* An Obstacle in the game.
*/
class ServerObstacle extends ServerItem {

	// Create a new Obstacle.
    constructor(type, width, x, y, colour, id, health, stage) {
        super(type, width, x, y, colour, id, health, stage);
    }

	// Check for player interaction with this item. 
	step() {
		var i;
		var centerX = this.x + 0.5 * this.width;
		var centerY = this.y + 0.5 * this.width;

		// Check if Obstacle is shot at. If so, decrease the Obstacle's health. 
		for (i = 0; i < this.stage.activeAmmunition.length; i++) {
			// Check the distance between the bullet and the Obstacle. 
			if (Math.abs(this.stage.activeAmmunition[i].x - centerX) < this.width / 2  &&
				Math.abs(this.stage.activeAmmunition[i].y - centerY) < this.width / 2
			) {
				// If the bullet passes the obstacle's boundaries, damage the obstacle. 
				
				// Check if the obstacle has any health left.
				if (this.health <= 0) {
					// No health, remove the obstacle. 
					this.stage.changed.push({"id": this.id, "type": this.type, "action": "delete"});
					this.stage.items[this.id] = null;
					return;
				} else {
					// Obstacle still has health, update obstacle's health, remove the bullet from the stage. 
					this.health = this.health - 0.1;
					this.stage.changed.push({"id": this.id, "type": this.type, "width": this.width, 
			"x": this.x, "y": this.y, "colour": this.colour, "health": this.health, "action": "update"});
					this.stage.removeAmmunition(this.stage.activeAmmunition[i]);
					return;
				}
			}
		}
	}	
}

/*
* A package that contains ammunition. 
*/
class ServerAmmunitionPackage extends ServerItem {

	// Create an Ammunition Package.
	constructor(type, width, x, y, colour, id, health, stage) {
		super(type, width, x, y, colour, id, health, stage);
		this.numBullets = 20;
	}

	// Called when a player moves over the package. The player gains a set number of bullets. 
	onPickup(player) {
		player.numBullets += this.numBullets;
	}
}

/*
* A package that contains a weapon.
*/ 
class ServerWeaponPackage extends ServerItem {

	// Called when a player moves over the package. The player gains a new weapon with randomized statistics. 
	onPickup(player) {
		
		// Set randomized statistics for the new weapon. 
		var bulletSize = 2 + rand(1);
		var damage= 0.2 + rand(0.2);
		var size = player.radius / 4 + rand(player.radius / 4);
		var ttl = 10 + randint(5);
		var reloadTime = 10 - randint(5);

		// Give the player a new weapon, inform each player. 
		player.weapon = new PlayerWeapon(bulletSize, damage, size, ttl, reloadTime, reloadTime, 'advanced');
		this.stage.changed.push({"id": player.id, "type": player.type, "radius": player.radius, 
			"x": player.position.x, "y": player.position.y, "colour": player.colour, "health": player.health, 
			"weapon": player.weapon.weaponRadius,
			"action": "update", "changedX": player.changed.x, "changedY": player.changed.y});
	}
}

/*
* A weapon that the player or AI could use.
* Contains information about itself. 
*/
class PlayerWeapon {

	// Create a new weapon for the player. 
	constructor(bulletSize, bulletDamage, weaponRadius, range, reloadTime, reloadRemaining, description) {
		this.bulletSize = bulletSize; // Physical size of bullet
		this.bulletDamage = bulletDamage; // Damage that a bullet makes
		this.weaponRadius = weaponRadius; // Radius of a player/AI weapon
		this.range = range; // Weapon range: how far a bullet can shoot
		this.reloadTime = reloadTime; // Time to reload
		this.reloadRemaining = reloadRemaining; // Remaining time to reload
		this.description = description; // Basic weapon description
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
* A base class for 'ball' type objects that can move across the map.
* Used as a base class for Player and bullet objects. 
*/
class Ball {

	// Create a new Ball. 
	constructor(stage, position, velocity, colour, radius){
		this.stage = stage;
		this.position=position;
		this.intPosition(); // this.x, this.y are int version of this.position

		this.velocity=velocity;
		this.colour = colour;
		this.radius = radius;

		// Distance that the player has changed from the last step. 
		this.changed = new Pair(0, 0);
	}

	// Take a step in the progression of the game. 
	step(){
		// Get the old position. 
		var oldX = this.position.x;
		var oldY = this.position.y;
		
		// Accelerate
		this.position.x=this.position.x+this.velocity.x;
		this.position.y=this.position.y+this.velocity.y;

		// bounce off the walls
		if(this.position.x<0){
			this.position.x=0;
			this.velocity.x=Math.abs(this.velocity.x);
		}
		if(this.position.x>this.stage.width){
			this.position.x=this.stage.width;
			this.velocity.x=-Math.abs(this.velocity.x);
		}
		if(this.position.y<0){
			this.position.y=0;
			this.velocity.y=Math.abs(this.velocity.y);
		}
		if(this.position.y>this.stage.height){
			this.position.y=this.stage.height;
			this.velocity.y=-Math.abs(this.velocity.y);
		}

		// Get the distance that the Ball has changed during this step.
		this.changed.x = this.position.x - oldX;
		this.changed.y = this.position.y - oldY;
		
		// Set the integer value of the position 
		this.intPosition();
	}

	// Set the integer value of the Ball's current position. 
	intPosition(){
		this.x = Math.round(this.position.x);
		this.y = Math.round(this.position.y);
	}
}

/*
* A bullet in the game. 
*/
class Bullet extends Ball {

	// Create a new bullet. 
	constructor(stage, position, velocity, ttL, player, damage, radius) {
		super(stage, position, velocity, 'black', radius);
		this.ttl = ttL; // Time to live (range)
		this.owner = player; // Who owns the bullet. Cannot damage the owner but can damage everyone and everything else.  
		this.damage = damage; // How much damage does the bullet make
	}

	// Take a step in the progression of the game. 
	step(){
		super.step();
		this.ttl-= 1;
		if (this.ttl == 0) { //Check if bullet expired, remove it from the stage if so. 
			this.stage.removeAmmunition(this);
		}
	}
}

/*
* A human-controlled player in the game. 
*/
class Player extends Ball {

	// Create a new Player for a human. 
	constructor(type, radius, x, y, colour, health, stage, id){
		super(stage, new Pair(x, y), new Pair(0, 0), colour, radius); // Create a stationary ball. 
		this.type = type;
		this.health = health;
		this.maxHealth = health;
		this.numBullets = 0;
		this.score = 0;
		this.id = id; // Player Identifier for the model, and for each client. 
		this.mousePosition = new Pair(x, y); // Position the player's mouse is facing. Used for aiming. 
		this.weapon = new PlayerWeapon(2, 0.2, this.radius / 4, 10, 10, 10, 'basic'); // Create a basic weapon with the player. 
	}

	// Take a step in the progression of the game. 
	step(){

		// Modify the remaining time to reload. 
		this.weapon.reloadRemaining -= 1;

		// Check all of the objects that the player interacts with. 
		for (var i = 0; i < this.stage.items.length; i++) {
			if (this.stage.items[i] === null) { // Item does not exist anymore. 
				continue;
			}

			// Check if player encounters an obstacle. 
			if (this.stage.items[i] instanceof ServerObstacle) {
				// Actor is an Obstacle. Check the distance to the Obstacle. 
				var centerX = this.stage.items[i].x + 0.5 * this.stage.items[i].width;
				var centerY = this.stage.items[i].y + 0.5 * this.stage.items[i].width;
				if (Math.abs(centerX - (this.position.x + this.velocity.x)) < this.stage.items[i].width / 2 + this.radius &&
				Math.abs(centerY - (this.position.y + this.velocity.y)) < this.stage.items[i].width / 2 + this.radius
				) {
					// Handle the Obstacle Encounter. 
					this.encounterObstacle(centerX, centerY);
				}
			}
		}

		// Check all of the other player that the player interacts with. 
		for (var i = 0; i < this.stage.players.length; i++) {
			if (i == this.id || this.stage.players[i] === null) { 
				// Player does not exist anymore, or the current index represents the current player.
				// Either way, we can proceed to the next iteration. 
				continue;
			}

			// Check the distance from the other player.
			if (Math.abs(this.stage.players[i].x - (this.position.x + this.velocity.x)) < this.stage.players[i].radius / 2 + this.radius &&
						Math.abs(this.stage.players[i].y - (this.position.y + this.velocity.y)) < this.stage.players[i].radius / 2 + this.radius
					) {
				// Players hit one another, bounce back. 
				this.velocity.x = -this.velocity.x;
				this.velocity.y = -this.velocity.y;
			}	
		}

		// Check if a bullet hit the player. 
		for (var i = 0; i < this.stage.activeAmmunition.length; i++) {
			if (this.stage.activeAmmunition[i].owner == this.id) { // Bullet belongs to the player, does not harm player. 
				continue;
			}
			var centerX = this.stage.activeAmmunition[i].x + 0.5 * this.stage.activeAmmunition[i].radius;
			var centerY = this.stage.activeAmmunition[i].y + 0.5 * this.stage.activeAmmunition[i].radius;

			// Check the distance from the bullet. 
			if (Math.abs(centerX - (this.position.x + this.velocity.x)) < this.stage.activeAmmunition[i].radius / 2 + this.radius &&
			Math.abs(centerY - (this.position.y + this.velocity.y)) < this.stage.activeAmmunition[i].radius / 2 + this.radius
			) {
				// Bullet hit the actor: take damage. 
				this.health = this.health - this.stage.activeAmmunition[i].damage;
				if (this.health <= 0) {
					this.stage.changed.push({"id": this.id, "type": this.type, "action": "delete"});
					this.stage.players[this.id] = null;
					return;
				} else {
					this.stage.removeAmmunition(this.stage.activeAmmunition[i]);
				}
			}
		}
		super.step();

		// Decrease velocity to simulate drag
		this.velocity.x = this.velocity.x / 1.1;
		this.velocity.y = this.velocity.y / 1.1;

		// Player has their position changed.Add it to the 'changed' buffer, to modify. 
		if (!(this.changed.x == 0 && this.changed.y == 0)) {
			this.stage.changed.push({"id": this.id, "type": this.type, "radius": this.radius, "weapon": this.weapon.weaponRadius, "mouseX": this.mousePosition.x, "mouseY": this.mousePosition.y,
			"x": this.position.x, "y": this.position.y, "colour": this.colour, "health": this.health, "action": "update", "changedX": this.changed.x, "changedY": this.changed.y});
		}
	}

	// Update the player's mouse position. 
	setMousePosition(newPosition) {
		this.mousePosition = newPosition;
	}

	// Handle the player hitting an Obstacle. 
	encounterObstacle(centerX, centerY) {
		// If the player hits the Obstacle, 'bounce back'.
		this.velocity.x = -this.velocity.x;
		this.velocity.y = -this.velocity.y;
	}
}