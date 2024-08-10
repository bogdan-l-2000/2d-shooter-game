DROP TABLE tankGameScore;
DROP TABLE tankGameParameters;
DROP TABLE tankGameUser;

CREATE TABLE tankGameUser (
	username VARCHAR(20) PRIMARY KEY,
	password BYTEA NOT NULL,
	role varchar(50) default 'other' NOT NULL,
	playMorning boolean default 'f',
	playAfternoon boolean default 'f',
	playEvening boolean default 'f'
);

CREATE TABLE tankGameParameters (
	username VARCHAR(20) PRIMARY KEY,
	FOREIGN KEY (username) REFERENCES tankGameUser(username) ON DELETE CASCADE ON UPDATE CASCADE,
	numOpponents INTEGER DEFAULT 10,
	numAdvOpponents INTEGER DEFAULT 5,
	numObstacles INTEGER DEFAULT 20,
	playerHP INTEGER DEFAULT 10,
	opponentHP INTEGER DEFAULT 10
);

CREATE TABLE tankGameScore (
	username VARCHAR(20) PRIMARY KEY,
	score INTEGER DEFAULT 0,
	FOREIGN KEY (username) REFERENCES tankGameUser(username) ON DELETE CASCADE ON UPDATE CASCADE,
	gamesPlayed INTEGER DEFAULT 0,
	gamesWon INTEGER DEFAULT 0
);

--- Could have also stored as 128 character hex encoded values
--- select char_length(encode(sha512('abc'), 'hex')); --- returns 128
INSERT INTO tankGameUser VALUES('user1', sha512('password1'));
INSERT INTO tankGameParameters(username) VALUES('user1');
INSERT INTO tankGameScore(username) VALUES('user1');

INSERT INTO tankGameUser VALUES('user2', sha512('password2'));
INSERT INTO tankGameParameters(username) VALUES('user2');
INSERT INTO tankGameScore(username) VALUES('user2');

