import React from 'react';
import $ from 'jquery';
import './style.css';
import {Stage, Pair} from './Stage';

var stage;

class OnlineView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {view: 'game'};
        //this.toRegister = this.toRegister.bind(this);
        // var socket = new WebSocket(`ws://${window.location.hostname}:8001`);
        // socket.onopen = function (event) {
        //     this.stage = new Stage(document.getElementById('stage'));
        //     console.log("connected");
        // };
        // socket.onmessage = function (event) {
        //     var data=JSON.parse(event.data);
        //     console.log(data);
        //     this.stage.update(data);
        //     console.log('ah!');
        // }
        // socket.onclose = function (event) {
        //     this.stage = null;
        // };
        // this.socket = socket;

        this.socket = new WebSocket(`ws://${window.location.hostname}:8001`);
        this.socket.onopen = function (event) {
            stage = new Stage(document.getElementById('stage'));
            //console.log("connected");
            //console.log(this.stage);
        };
        this.socket.onmessage = function (event) {
            var data=JSON.parse(event.data);
            var toCreate = [];
            var toUpdate = [];
            var toDelete = [];
            
            for (var i = 0; i < data.length; i++) {
                switch (data[i].action) {
                    case "create":
                        toCreate.push(data[i]);
                        break;
                    case "update":
                        toUpdate.push(data[i]);
                        break;
                    case "delete":
                        toDelete.push(data[i]);
                        break;
                }
            }
            // console.log(data);
            // this.stage.create(toCreate);
            // this.stage.update(toUpdate);
            // this.stage.delete(toDelete);
            stage.create(toCreate);
            stage.update(toUpdate);
            stage.delete(toDelete);
            //console.log('ah!');
        }
        this.socket.onclose = function (event) {
            //console.log('close!');
            var context = stage.canvas.getContext('2d');
            var protagonist = stage.player;
			console.log(-Math.abs(400 - protagonist.x)+ " " + -Math.abs(400 - protagonist.y))
            context.translate(protagonist.x, protagonist.y);
            this.stage = null;
        };

        //console.log(this.socket);
        this.moveByKey = this.moveByKey.bind(this);
        this.hoverMouse = this.hoverMouse.bind(this);
        //console.log(this.stage);
    }

    moveByKey(event){
        //console.log(this.stage);
        var key = event.key; // Get the key that was pressed
        var moveMap = { // direction keys
            'a': new Pair(-5,0),
            's': new Pair(0,5),
            'd': new Pair(5,0),
            'w': new Pair(0,-5)
        };
        var to_send = {"isBullet": false, "mousePositionX": stage.player.mousePosition.x, "mousePositionY": stage.player.mousePosition.y, "deltaX": 0, "deltaY": 0};
        if(key in moveMap){ // Player moves in a direction
                    //stage.player.velocity.x+=0.25*moveMap[key].x;
                    //stage.player.velocity.y+=0.25*moveMap[key].y;
                    //console.log(this.socket);
                    //this.socket.send(JSON.stringify({"deltaX": moveMap[key].x, "deltaY": moveMap[key].y}));
                    to_send["deltaX"] = moveMap[key].x;
                    to_send["deltaY"] = moveMap[key].y;
                    
                    //console.log('sent!');
        } else if (key == ' ') { // Player shoots
                // Check if the player can shoot, add bullet if so 
                to_send["isBullet"] = true;
            }
        this.socket.send(JSON.stringify(to_send));
    }

    hoverMouse(event) {
        if (this.stage === null) { // To avoid errors
                return;
        } else {
            // Set the player's mouse position to the client location, subtract the canvas offset, add the player offset.
            var canvas = document.getElementById('stage');
            var rectangle = canvas.getBoundingClientRect();

            // var x = event.clientX - rectangle.left + this.stage.topX;
            // var y = event.clientY - rectangle.top + this.stage.topY;

            var x = event.clientX - rectangle.left + stage.topX;
            var y = event.clientY - rectangle.top + stage.topY;

            stage.player.setMousePosition(new Pair(x, y));
            //console.log(x);
            //console.log(y);
        }

        
}


    render() {
        switch (this.state.view) {
            case 'game':
                document.addEventListener('keydown', this.moveByKey.bind(this));
                //document.addEventListener('mousemove', this.hoverMouse.bind(this));
                return (
                    <div>
                        <NavBar></NavBar>
                        <GameView mouseHandler={this.hoverMouse.bind(this)}></GameView>
                    </div>
                );
            case 'instructions':
                return (
                    <div>
                        <NavBar></NavBar>
                        <InstructionPage></InstructionPage>
                    </div>
                );

        }
    }
}

class NavBar extends React.Component {
    render() {
        return (
            <header id="navbar">
                <nav>
                    <ul>
                            <li> <input type="submit" id="Play" value="Play"></input> </li>
                            <li> <input type="submit" id="Instructions" value="Instructions"></input> </li>
                            <li> <input type="submit" id="Statistics"  value="Stats" ></input> </li>
                            <li> <input type="submit" id="Settings"  value="Settings" ></input> </li>
                            <li> <input type="submit" id="Profile"  value="Profile"></input> </li>
                            <li> <input type="submit" id="Logout"  value="Logout" ></input> </li>
                    </ul>
                </nav>
		    </header>
        );
    }
}

class GameView extends React.Component {
    //style="border:1px solid black;" onmousemove="hoverMouse(event)"

    constructor(props) {
        super(props);
    }

    
    
    render() {
        return (
            <center>
				<canvas id="stage" width="800" height="800" style={{border: '1px solid black'}} onMouseMove={this.props.mouseHandler}> </canvas>
			</center>
        );
    }
}

class InstructionPage extends React.Component {
    render () {
        return (
            <div id="instructionPage"> 
			    WASD to move. <br/>
			    Space to shoot. <br/>
			    Point mouse in direction you want to shoot. <br/>
			    <br/>
			    Move over a black square to gain ammunition. <br/>
			    Move over a grey square to gain a new weapon. <br/>
			    Large squares are obstacles that can be destroyed when you shoot them. <br/>
			    Goal: survive, defeat all opponents. <br/>
		    </div>
        )
    }
}


export {OnlineView};