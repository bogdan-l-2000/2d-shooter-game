import React from 'react';
import $ from 'jquery';
import { OnlineView } from './gameComponents';
import {Stage} from './Stage';

class Container extends React.Component {
    constructor(props) {
        super(props);
        this.state = {view: 'login'};
        //this.toRegister = this.toRegister.bind(this);
        this.setLogin = this.setLogin.bind(this);
        this.setRegister = this.setRegister.bind(this);
        this.toGame = this.toGame.bind(this);
        this.socket = null;
        this.stage = null;
    }

    toGame() {
        this.setState({view: 'play'});
        
    }

    setLogin() {
        this.setState({view: 'login'});
    }

    setRegister() {
        this.setState({view: 'register'});
    }

    render() {
        console.log(this.state);
        switch(this.state.view) {
            case 'login':
                return (
                    <div>
                        <h1>2D Tank Shooter Game</h1>
                        <LoginPage view={this.state.view} toGame={this.toGame.bind(this)} setRegister={this.setRegister.bind(this)}></LoginPage>
                        <Feedback></Feedback>
                    </div>
                );
            case 'register':
                return (
                    <div>
                        <h1>2D Tank Shooter Game</h1>
                        <RegisterPage view={this.state.view} setLogin={this.setLogin.bind(this)}></RegisterPage>
                        <Feedback></Feedback>
                    </div>
                );
            case 'play':
                return (
                    <div>
                        <h1>2D Tank Shooter Game</h1>
                        <OnlineView></OnlineView>
                        <Feedback></Feedback>
                    </div>
                );
        }
    }
}

class LoginPage extends React.Component {
    constructor(props) {
		super(props);
        this.login = this.login.bind(this);
	}

    // Player moves to the register page
    toRegister() {
        var temp = this;

        // Clear feedback and forms
        document.getElementById("Feedback").innerHTML = "";
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";

        // Create a POST request to move to the registration page. 
        // Authorization is not required. 
        $.ajax({
                method: "POST",
                url: "/api/test",
                data: {},
                headers: {},
                contentType:"application/json; charset=utf-8",
                datatype:"json"
        }).done(function(data, text_status, jqXHR){
                console.log(jqXHR.status+" "+text_status+JSON.stringify(data));
                // Update display
                temp.props.setRegister();
        }).fail(function(err){
                console.log("fail "+err.status+" "+JSON.stringify(err.responseJSON));
        });
    }

    // Player is logging in
    login(){
        var temp = this;
        
        // Start with empty feedback
        document.getElementById("Feedback").innerHTML = "";

        // Get credentials from user input
        var credentials =  { 
            "username": $("#username").val(), 
            "password": $("#password").val() 
        };

        if (credentials.username == "") { // Username missing
                document.getElementById("Feedback").innerHTML = "Please enter Username";
                return;
        }

        if (credentials.password == "") { // Password missing
                document.getElementById("Feedback").innerHTML = "Please enter Password";
                return;
        }
        // Create a POST request to log in. Retrieve a player's game settings as well. 
        $.ajax({
                method: "POST",
                url: "/api/auth/login",
                data: JSON.stringify({}),
                headers: { "Authorization": "Basic " + btoa(credentials.username + ":" + credentials.password) },
                processData:false,
                contentType: "application/json; charset=utf-8",
                dataType:"json"
        }).done(function(data, text_status, jqXHR){
                console.log(jqXHR.status+" "+text_status+JSON.stringify(data));
                
                // Update display

                // Clear username and password forms
                document.getElementById("username").value = "";
                document.getElementById("password").value = "";
                
                temp.props.toGame();
        }).fail(function(err){
                console.log("fail "+err.status+" "+JSON.stringify(err.responseJSON));
                //document.getElementById("Feedback").innerHTML = "Invalid username or password";

        });
    }

    render() {
        return (
            <div id="ui_login">
                <LoginUsername></LoginUsername>
                <LoginPassword></LoginPassword>
                <LoginSubmit clickHandler={this.login}></LoginSubmit>      
                <br/>
                <ToRegister clickHandler={this.toRegister.bind(this)}></ToRegister>
            </div>
        );
    }
}

class LoginUsername extends React.Component {
    render() {
        return (  <input type="text" id="username" placeholder="User Name" /> );
    }
}

class LoginPassword extends React.Component {
    render() {
        return ( <input type="password" id="password" placeholder="Password" />     );
    }
}

class LoginSubmit extends React.Component {
    render() {
        return ( <input type="submit" id="loginSubmit" value="Login" onClick={this.props.clickHandler}/>  );
    }
}

class ToRegister extends React.Component {
    render() {
        return ( <input type="submit" id="toRegister" value="Register" onClick={this.props.clickHandler}/> );
    }
}

class RegisterPage extends React.Component {
    constructor(props) {
		super(props);
	}

    // Player moves to the login page
    toLogin() {
        var temp = this;
        console.log('to login!');
        // Clear feedback, other forms
        document.getElementById("Feedback").innerHTML = "";
        document.getElementById("enterUsername").value = "";
        document.getElementById("enterPassword").value = "";
        document.getElementById("confirmPassword").value = "";
        var roles = document.getElementsByName('role');
        var i;
        for (i = 0; i < roles.length - 1; i++) {
                if (roles[i].checked) {
                        roles[i].checked = false;
                }
        }
        document.getElementById("morning").checked = false;
        document.getElementById("afternoon").checked = false;
        document.getElementById("evening").checked = false;

        // Create a POST request to move to the login page.
        // Authorization is not required. 
        $.ajax({
                method: "POST",
                url: "/api/test",
                data: {},
                //headers: {"Authorization": "Basic " + btoa(credentials.username + ":" + credentials.password) },
                contentType:"application/json; charset=utf-8",
                datatype:"json"
        }).done(function(data, text_status, jqXHR){
                console.log(jqXHR.status+" "+text_status+JSON.stringify(data));

                // Update display
                temp.props.setLogin();
        }).fail(function(err){
                console.log("fail "+err.status+" "+JSON.stringify(err.responseJSON));
        });
    }


    // Player registers. 
    register(){
        var temp = this;

        // Clear feedback. 
        document.getElementById("Feedback").innerHTML = "";

        // Get the user's role. Default is 'Other'. 
        var roles = document.getElementsByName('role');
        var i;
        var userRole = roles[4];
        for (i = 0; i < roles.length; i++) {
                if (roles[i].checked) {
                        userRole = roles[i];
                }
        }

        // Get info on the times when the user can play the game
        var morning = document.getElementById("morning");
        var afternoon = document.getElementById("afternoon");
        var evening = document.getElementById("evening");

        // We will send this information to the database
        var information =  { 
        "username": $("#enterUsername").val(), 
        "enterPassword": $("#enterPassword").val(),
                "confirmPassword": $("#confirmPassword").val(),
                "role": userRole.value,
                "playMorning": morning.checked,
                "playAfternoon": afternoon.checked,
                "playEvening": evening.checked
        };

        if (information.username == "") { // Username not specified
                document.getElementById("Feedback").innerHTML = "Please enter Username";
                return;
        }

        if (information.enterPassword == "") { // Password not specified 
                document.getElementById("Feedback").innerHTML = "Please enter Password";
                return;
        }

        if (information.confirmPassword == "") { // Password is not confirmed
                document.getElementById("Feedback").innerHTML = "Please confirm Password";
                return;
        }

        if (information.enterPassword != information.confirmPassword) { // Passwords do not match
                document.getElementById("Feedback").innerHTML = "Passwords do not match";
                return;
        }

        // Create a POST request, send the user data to the back-end database
        $.ajax({
                method: "POST",
                url: "/api/register",
                data: JSON.stringify({"username": information.username, "password": information.enterPassword,
                                "role": information.role, playMorning: information.playMorning, 
                                playAfternoon: information.playAfternoon, playEvening: information.playEvening}),
                headers: {},
                processData:false,
                contentType: "application/json; charset=utf-8",
                dataType:"json"
        }).done(function(data, text_status, jqXHR){
                console.log(jqXHR.status+" "+text_status+JSON.stringify(data));

                // Create basic Settings and Score information to the user
                createSettings();
                createScore();

                // Move to the login page
                console.log(temp.props);
                temp.toLogin();

                // Clear the information from the request page
                document.getElementById("enterUsername").value = "";
                document.getElementById("enterPassword").value = "";
                document.getElementById("confirmPassword").value = "";
                userRole.checked = false;
                morning.checked = false;
                afternoon.checked = false;
                evening.checked = false;
        }).fail(function(err){
                console.log("fail "+err.status+" "+JSON.stringify(err.responseJSON));
                document.getElementById("Feedback").innerHTML = err.responseJSON.error;
        });
    }

    render() {
        return (
            <div id="ui_register">
                <RegisterUsername></RegisterUsername>
                <RegisterRole></RegisterRole>
                <RegisterPassword></RegisterPassword>
                <RegisterConfirmPassword></RegisterConfirmPassword>
                <RegisterTime></RegisterTime>
                <RegisterSubmit clickHandler={this.register.bind(this)}></RegisterSubmit>      
                <br/>
                <ToLogin clickHandler={this.toLogin.bind(this)}></ToLogin>
            </div>
        );
    }
}

class RegisterUsername extends React.Component {
    render() {
        return (
            <input type="text" id="enterUsername" placeholder="Username" />
        );
    }
}

class RegisterPassword extends React.Component {
    render() {
        return (
            <input type="password" id="enterPassword" placeholder="Password" />
        );
    }
}

class RegisterConfirmPassword extends React.Component {
    render() {
        return (
            <input type="password" id="confirmPassword" placeholder="Confirm Password" />
        );
    }
} 

class RegisterRole extends React.Component {
    render() {
        return (
            <div>
                <label for="role">Role</label> <br/>
				<input type="radio" id="student" name="role" value="student" />
				<label for="student">Student</label><br/>
				<input type="radio" id="ta" name="role" value="ta" />
				<label for="ta">Teaching Assistant</label><br/>
				<input type="radio" id="professor" name="role" value="professor" />
				<label for="professor">Professor</label><br/>
				<input type="radio" id="other" name="role" value="other" defaultChecked />
				<label for="other">Other</label><br/>
            </div>
        );
    }
}

class RegisterTime extends React.Component {
    render() {
        return (
            <div>
                <label for="time">Prefer to play:</label>
				<input type="checkbox" id="morning" name="morning" value="morning" /> <label>Morning</label>
				<input type="checkbox" id="afternoon" name="afternoon" value="afternoon" /><label>Afternoon</label>
				<input type="checkbox" id="evening" name="evening" value="evening" /> <label>Evening</label><br/>
            </div>
        );
    }
}

class RegisterSubmit extends React.Component {
    render() {
        return (
            <input type="submit" id="register" value="Register" onClick={this.props.clickHandler}/>	
        );
    }
}

class ToLogin extends React.Component {
    render() {
        return (
			<input type="submit" id="toLogin" value="Back to Login" onClick={this.props.clickHandler}/>
        );
    }
}

class Feedback extends React.Component{
    render() {
        return (
            <label id="Feedback"> </label>
        );
    }
}

export {Container};

// Create Score information for a player.
function createScore() {

    // Create a POST request to create the player's score (initially empty).
    $.ajax({
            method: "POST",
            url:"/api/createScore",
            data: JSON.stringify({"username": $("#enterUsername").val()}),
            headers: {},
            processData:false,
            contentType: "application/json; charset=utf-8",
            dataType:"json"
    }).done(function(data, text_status, jqXHR){
            console.log(jqXHR.status+" "+text_status+JSON.stringify(data));
    }).fail(function(err){
            console.log("fail "+err.status+" "+JSON.stringify(err.responseJSON));
    });
}

// Create Game Settings information for a player.
function createSettings() {
    
    // Create a POST request to create the player's game settings (initially default).
    $.ajax({
            method: "POST",
            url:"/api/createSettings",
            data: JSON.stringify({"username": $("#enterUsername").val()}),
            headers: {},
            processData:false,
            contentType: "application/json; charset=utf-8",
            dataType:"json"
    }).done(function(data, text_status, jqXHR){
            console.log(jqXHR.status+" "+text_status+JSON.stringify(data));
    }).fail(function(err){
            console.log("fail "+err.status+" "+JSON.stringify(err.responseJSON));
    });
}



