var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var gameTick = 60;

var gameList = [];
var playerList = [];
var playerCounter = 1;
var gameCounter = 1;

var gameTimer = [];

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client.html');
});
app.get('/app.js', function(req, res) {
	res.sendFile(__dirname + '/app.js');
});

io.on('connection', function(socket) {
	socket.on('newPlayer', function(data) {
		console.log("newPlayer: " + data.playerName);
		addPlayer(data.playerName, socket);
	});
	socket.on('exitPlayer', function(data) {
		console.log("exitPlayer: " + data.name);
		removePlayer(data.name, data.id, socket);
	});
	socket.on('getPlayers', function(data) {
		//console.log("getPlayers");
		socket.emit('recievedPlayerList', playerList);
	});
	socket.on('getGameList', function(data) {
		socket.emit('recievedGameList', gameList);
	});
	socket.on('createGame', function(data) {
		createNewGame(data, socket);
	});
	socket.on('cancelGame', function(data) {
		cancelGame(data, socket);
	});
	socket.on('joinGame', function(data) {
		joinGame(data, socket);
	});
	socket.on('getGameInfo', function(data) {
		//console.log("Player #" + data.id + " (" + data.name + ") querying game #" + data.gameId);
		getGameInfo(data.gameId, socket);
	});
	socket.on('startGame', function(data) {
		startGame(data, socket);
	});
	socket.on('moveLeft', function(data) {
		movePlayer(data, -8, socket);
	});
	socket.on('moveRight', function(data) {
		movePlayer(data, 8, socket);
	});
	socket.on('quitGame', function(data) {
		playerQuit(data, socket);
	});
	socket.on('mousePostion', function(data) {
		mousePlayer(data, socket);
	});
});

http.listen(5000, function(){
  console.log('listening on *:5000');
});

var mousePlayer = function(player, movement, socket) {
	var targetGame = null;
	for (var i = 0; i < gameList.length; i++) {
		if (gameList[i].id === player.gameId) {
			targetGame = gameList[i];
			continue;
		}
	};
	if (targetGame === null) {
		socket.emit('clientError', 'GameNoLongerAvailable');
		return;
	}
	var plrNo = targetGame.players.indexOf(player.name);
	targetGame.data.batX[plrNo] = player.mouseX;
	if (targetGame.data.batX[plrNo] < 10) {
		targetGame.data.batX[plrNo] = 10;
	}
	if (targetGame.data.batX[plrNo] > 750) {
		targetGame.data.batX[plrNo] = 750;
	}
};


var movePlayer = function(player, movement, socket) {
	var targetGame = null;
	for (var i = 0; i < gameList.length; i++) {
		if (gameList[i].id === player.gameId) {
			targetGame = gameList[i];
			continue;
		}
	};
	if (targetGame === null) {
		socket.emit('clientError', 'GameNoLongerAvailable');
		return;
	}
	var plrNo = targetGame.players.indexOf(player.name);
	targetGame.data.batX[plrNo] = targetGame.data.batX[plrNo] + movement;
	if (targetGame.data.batX[plrNo] < 10) {
		targetGame.data.batX[plrNo] = 10;
	}
	if (targetGame.data.batX[plrNo] > 750) {
		targetGame.data.batX[plrNo] = 750;
	}
};

var playerQuit = function(player, socket) {
	var plr = findPlayerByIdAndName(player.id, player.name);
	if (plr === null) {
		console.log("Error: Unregistered player (" + player.name + ") attempting to quit game.");
		socket.emit('clientError', 'UnknownPlayerGameJoin');
		return;
	}
	plr.gameId = 0;
	var targetGame = null;
	for (var i = 0; i < gameList.length; i++) {
		if (gameList[i].id === player.gameId) {
			clearInterval(gameTimer[player.gameId]);
			targetGame = gameList[i];
			gameList.splice(i);
			targetGame.active = false;
			console.log("Player #" + player.id + " (" + player.name + ") quit game #" + targetGame.id);
			continue;
		}
	};
};

var processGameTick = function(gameId) {
	var targetGame = null;
	for (var i = 0; i < gameList.length; i++) {
		if (gameList[i].id === gameId) {
			targetGame = gameList[i];
			continue;
		}
	};
	if (targetGame === null) {
		clearInterval(gameTimer[gameId]);
		socket.emit('clientError', 'GameNoLongerAvailableToStart');
		return;
	}
	
	targetGame.data.bx = targetGame.data.bx + targetGame.data.bxs;
	targetGame.data.by = targetGame.data.by + targetGame.data.bys;
	
	var randSpeed = 10 + parseInt(Math.random() * 35);
	
	var tx = targetGame.data.bx;
	var ty = targetGame.data.by;
	
	if (tx < 10) {
		targetGame.data.bx = 10;
		targetGame.data.bxs = randSpeed;
	}
	if (tx > 780) {
		targetGame.data.bx = 780;
		targetGame.data.bxs = -randSpeed;
	}
	if (ty < 50) {
		targetGame.data.scores[1] = targetGame.data.scores[1] + 1;
		targetGame.data.by = 300;
		targetGame.data.bx = 400;
		var randY = 10 + parseInt(Math.random() * 10);
		targetGame.data.bys = randY;
		var randX = 10 + parseInt(Math.random() * 10);
		if (Math.random() > 0.75) randX = -randX;
		targetGame.data.bxs = randX;
	}
	if (ty > 540) {
		targetGame.data.scores[0] = targetGame.data.scores[0] + 1;
		targetGame.data.by = 300;
		targetGame.data.bx = 400;
		var randY = 10 + parseInt(Math.random() * 10);
		targetGame.data.bys = randY;
		var randX = 10 + parseInt(Math.random() * 10);
		if (Math.random() > 0.75) randX = -randX;
		targetGame.data.bxs = -randX;
	}
	
	if (ty > 505 && tx >= targetGame.data.batX[1] && tx <= (targetGame.data.batX[1] + 60)) {
		targetGame.data.bys = -randSpeed;
	}
	if (ty < 75 && tx >= targetGame.data.batX[0] && tx <= (targetGame.data.batX[0] + 60)) {
		targetGame.data.bys = randSpeed;
	}
};

var startGame = function(player, socket) {
	console.log("Player #" + player.id + " (" + player.name + ") starting game #" + player.gameId);
	var targetGame = null;
	for (var i = 0; i < gameList.length; i++) {
		if (gameList[i].id === player.gameId) {
			targetGame = gameList[i];
			continue;
		}
	};
	if (targetGame === null) {
		socket.emit('clientError', 'GameNoLongerAvailableToStart');
		return;
	}
	targetGame.active = true;
	targetGame.data = {
		"ball": true,
		"by": 200,
		"bx": 400,
		"bxs": 2,
		"bys": 2,
		"scores": [ 0, 0 ],
		"batX": [ 390, 390 ],
		"names": [ targetGame.players[0], targetGame.players[1] ]
	};
	var randY = 10 + parseInt(Math.random() * 10);
	if (Math.random() > 0.75) randY = -randY;
	targetGame.data.bys = randY;
	
	var randX = 10 + parseInt(Math.random() * 10);
	if (Math.random() > 0.75) randX = -randX;
	targetGame.data.bxs = randX;
	
	var timer = setInterval(processGameTick, gameTick, player.gameId);
	gameTimer[player.gameId] = timer;
	socket.emit('gameStarted', '');
};

var getGameInfo = function(gameId, socket) {
	var targetGame = null;
	for (var i = 0; i < gameList.length; i++) {
		if (gameList[i].id === gameId) {
			targetGame = gameList[i];
			continue;
		}
	};
	if (targetGame === null) {
		socket.emit('clientError', 'GameNoLongerAvailable');
		return;
	}
	socket.emit('recievedGameInfo', targetGame);
};

var joinGame = function(player, socket) {
	console.log("Player #" + player.id + " (" + player.name + ") attempting to join game #" + player.gameId);
	var plr = findPlayerByIdAndName(player.id, player.name);
	if (plr === null) {
		console.log("Error: Unregistered player (" + player.name + ") attempting to join game.");
		socket.emit('clientError', 'UnknownPlayerGameJoin');
		return;
	}
	var targetGame = null;
	for (var i = 0; i < gameList.length; i++) {
		if (gameList[i].id === player.gameId) {
			targetGame = gameList[i];
			continue;
		}
	};
	if (targetGame === null) {
		socket.emit('clientError', 'GameNoLongerAvailableToJoin');
		return;
	}
	plr.gameId = player.gameId;
	console.log("Player #" + player.id + " (" + player.name + ") successfully joined game #" + player.gameId);
	targetGame.players.push(player.name);
	socket.emit('joinedGame', plr);
};

var cancelGame = function(player, socket) {
	var plr = findPlayerByIdAndName(player.id, player.name);
	if (plr === null) {
		console.log("Error: Unregistered player (" + player.name + ") attempting to create game.");
		socket.emit('clientError', 'UnknownPlayerGameCreation');
		return;
	}
	for (var i = 0; i < gameList.length; i++) {
		if (gameList[i].id === player.gameId) {
			gameList.splice(i);
			plr.gameId = 0;
			continue;
		}
	};
	socket.emit('cancelledGame', '');
};

var createNewGame = function(player, socket) {
	var plr = findPlayerByIdAndName(player.id, player.name);
	if (plr === null) {
		console.log("Error: Unregistered player (" + plr.name + ") attempting to create game.");
		socket.emit('clientError', 'UnknownPlayerGameCreation');
		return;
	}
	if (plr.gameId != 0) {
		console.log("Error: Player #" + plr.id + " (" + plr.name + ") already assigned to game #" + plr.gameId);
		socket.emit('clientError', 'AlreadyInGameGameCreation');
		return;
	}
	var newGame = {
		"id": gameCounter++,
		"active": false,
		"players": [ plr.name ],
		"data": {
			"ball": false,
			"by": 0,
			"bx": 0,
			"bxs": 0,
			"bys": 0,
			"scores": [ 0, 0 ],
			"batX": [ 390, 390 ]
		},
		"error": ""
	};
	gameList.push(newGame);
	plr.gameId = newGame.id;
	//updatePlayer(plr);
	socket.emit('createdNewGame', plr);
	console.log("New game created #" + newGame.id);
};

var addPlayer = function(playerName, socket) {
	var plr = findPlayerByName(playerName);
	if (plr === null) {
		var newPlayer = {
			"id": playerCounter++,
			"name": playerName,
			"gameId": 0
		};
		playerList.push(newPlayer);
		socket.emit('createdPlayer', newPlayer);
	} else {
		console.log("User (" + playerName + ") already registered.");
		socket.emit('clientError', 'player name already taken.');
	}
};

var removePlayer = function(playerName, playerId, socket) {
	var plr = findPlayerByIdAndName(playerId, playerName);
	if (plr === null) {
		console.log("Unable to remove player, not registered or invalid details provided!");
		socket.emit('clientError', 'LogoutFailed');
	} else {
		var ele = getPlayerElementId(playerId);
		console.log(playerList);
		playerList.splice(ele);
		console.log("Removed player #" + plr.id + " (" + plr.name + ")");
		
		for (var i = 0; i < gameList.length; i++) {
			var game = gameList[i];
			for (var a = 0; a < game.players.length; a++) {
				if (game.players[a] == plr.id) {
					game.players.splice(a);
					console.log("Removed player #" + plr.id + " from game #" + game.id);
				}
			}
			if (game.players.length === 0) {
				gameList.splice(i);
				if (game.timer) {
					clearInterval(game.timer);
					console.log("Game #" + game.id + " timer found and stopped.");
				}
				console.log("Removed game #" + game.id + " as no players exist.");
			}
		}
		socket.emit('removedPlayer', true);
	}
	console.log(playerList);
};

var findPlayerByName = function(playerName) {
	for (var i = 0; i < playerList.length; i++) {
		if (playerList[i].name === playerName) {
			return playerList[i];
		}
	}
	return null;
};

var findPlayerById = function(playerId) {
	for (var i = 0; i < playerList.length; i++) {
		if (playerList[i].id === playerId) {
			return playerList[i];
		}
	}
	return null;
};

var findPlayerByIdAndName = function(playerId, playerName) {
	for (var i = 0; i < playerList.length; i++) {
		if (playerList[i].id === playerId && playerList[i].name === playerName) {
			return playerList[i];
		}
	}
	return null;
};

var getPlayerElementId = function(playerId) {
	for (var i = 0; i < playerList.length; i++) {
		if (playerList[i].id === playerId) {
			return i;
		}
	}
	return -1;
};
