var socket;
var canvas;
var ctx;

var playerInfo = null;
var gameInfo = null;
var oldInfo = {};

var gameTick = 30;

var userListTimer = null;
var gameListTimer = null;
var gameUpdateTimer = null;
var hostWaitTimer = null;

var loginUser = function() {
	var obj = {};
	obj.playerName = $('#userName').val();
	socket.emit('newPlayer', obj); 
};

var createGame = function() {
	socket.emit('createGame', playerInfo);
};

var cancelGame = function() {
	socket.emit('cancelGame', playerInfo);
};

var killAllTimers = function() {
	if (userListTimer != null) {
		clearInterval(userListTimer);
	}
	if (gameListTimer != null) {
		clearInterval(gameListTimer);
	}
	if (gameUpdateTimer != null) {
		clearInterval(gameUpdateTimer);
	}
	if (hostWaitTimer != null) {
		clearInterval(hostWaitTimer);
	}
};

var drawPage = function() {

	if (oldInfo.data) {
		ctx.fillStyle="#ffffff";
		ctx.fillRect(oldInfo.data.batX[0], 50, 60, 20);
		ctx.fillRect(oldInfo.data.batX[1], 520, 60, 20);
		ctx.fillRect(0, 0, 800, 50);
		ctx.fillRect(0, 550, 800, 50);
		ctx.fillRect(oldInfo.data.bx, oldInfo.data.by, 8, 8);
	}
	oldInfo.data = gameInfo.data;
	
	ctx.fillStyle="#0000ff";
	ctx.fillRect(gameInfo.data.batX[0], 50, 60, 20);
	ctx.fillRect(gameInfo.data.batX[1], 520, 60, 20);
	
	ctx.fillStyle="#000000";
	ctx.font = "36px Arial";
	ctx.fillText(gameInfo.players[0] + " : " + gameInfo.data.scores[0], 5, 30);
	ctx.fillText(gameInfo.players[1] + " : " + gameInfo.data.scores[1], 5, 580);
	
	ctx.fillStyle="#ff0000";
	ctx.fillRect(gameInfo.data.bx, gameInfo.data.by, 8, 8);
	
};

var quitGame = function() {
	killAllTimers();
	socket.emit('quitGame', playerInfo);
	$('#userListSection').empty();
	$('#gameListSection').empty();
	$('#canvasSection').hide(75);
	$('#loginForm').hide(75);
	$('#userDetail').show(100);
	$('#gameList').show(100);
	userListTimer = setInterval(getUserList, 1500);
	gameListTimer = setInterval(getGameList, 2500);
};

var logoutUser = function() {
	socket.emit('exitPlayer', playerInfo); 
	killAllTimers();
};

var logoutUserHandler = function() {
	$('#userDetail').hide(75);
	$('#gameList').hide(75);
	$('#loginForm').show(100);
};

var loginUserHandler = function(data) {
	playerInfo = data;
	$('#userListSection').empty();
	$('#gameListSection').empty();
	$('#loginForm').hide(75);
	$('#userDetail').show(100);
	$('#gameList').show(100);
	$('.userNameDisplay').html(playerInfo.name + ' (#' + playerInfo.id + ')');
	killAllTimers();
	userListTimer = setInterval(getUserList, 1500);
	gameListTimer = setInterval(getGameList, 2500);
};

var getUserList = function() {
	socket.emit('getPlayers', ''); 
};

var getGameList = function() {
	socket.emit('getGameList', ''); 
};

var joinGame = function(gameId) {
	playerInfo.gameId = gameId;
	socket.emit('joinGame', playerInfo);
};

var getGameInfo =  function() {
	socket.emit('getGameInfo', playerInfo);
};

var userListHandler = function(data) {
	$('#userListSection').empty();
	$(data).each(function(index) {
		var state = "In lobby";
		if (data[index].gameId != 0) {
			state = "In Game";
		}
		$('#userListSection').append('<div class="row userListItem"><div class="col-md-8">' + data[index].name + '</div><div class="col-md-4">' + state + '</div></div>');
	});
};

var hostWaitForPlayerCheck = function() {
	if (gameInfo.players && gameInfo.players.length === 2) {
		clearInterval(hostWaitTimer);
		$('#hostWaiting').hide(75);
		$('#canvasSection').show(100);
		socket.emit('startGame', playerInfo);
	};
};

var gameListHandler = function(data) {
	$('#gameListSection').empty();
	$(data).each(function(index) {
		var state = "Waiting for Player";
		var buttonMarkup = '<button class="btn btn-success" onclick="joinGame(' + data[index].id + ')">Join</button>';
		if (data[index].players.length === 2) {
			buttonMarkup = '';
			if (data[index].active) {
				state = "In Game";
			} else {
				state = "Ready";
			}
		}
		var scoreStats = data[index].data.scores[0] + " Vs " + data[index].data.scores[1];
		var roomName = data[index].players[0] + "'s Game #" + data[index].id;
		$('#gameListSection').append('<div class="row"><div class="col-md-4">' + roomName + '</div><div class="col-md-3">' + scoreStats + '</div><div class="col-md-2">' + state + '</div><div class="col-md-3">' + buttonMarkup + '</div></div>');
	});
};

var gameInfoHandler = function(data) {
	gameInfo = data;
	drawPage();
};

var gameCreatedHandler = function(data) {
	playerInfo.gameId = data.gameId;
	$('#userDetail').hide(75);
	$('#gameList').hide(75);
	$('#hostWaiting').show(100);
	$('.gameIdDisplay').html('Game Unique ID #' + data.gameId);
	killAllTimers();
	gameUpdateTimer = setInterval(getGameInfo, gameTick);
	hostWaitTimer = setInterval(hostWaitForPlayerCheck, 200);
};

var gameCancelledHandler = function(data) {
	playerInfo.gameId = 0;
	$('#hostWaiting').hide(75);
	$('#userDetail').show(100);
	$('#gameList').show(100);
	killAllTimers();
	userListTimer = setInterval(getUserList, 1500);
	gameListTimer = setInterval(getGameList, 2500);
};

var gameJoinedHandler = function(data) {
	playerInfo.gameId = data.gameId;
	$('#userDetail').hide(75);
	$('#gameList').hide(75);
	$('#canvasSection').show(100);
	killAllTimers();
	gameUpdateTimer = setInterval(getGameInfo, gameTick);
};

var gameStartedHandler = function(data) {
};

var errorHandler = function(error) {
	killAllTimers();
	console.log("WebSocket Error: " + error);
	if (error === "LogoutFailed") {
		$('#userDetail').hide(75);
		$('#gameList').hide(75);
		$('#canvasSection').hide(75);
		$('#loginForm').show(100);
	}
	if (error === "GameNoLongerAvailable") {
		socket.emit('quitGame', playerInfo);
		$('#userListSection').empty();
		$('#gameListSection').empty();
		$('#canvasSection').hide(75);
		$('#loginForm').hide(75);
		$('#userDetail').show(100);
		$('#gameList').show(100);
		userListTimer = setInterval(getUserList, 1500);
		gameListTimer = setInterval(getGameList, 2500);
	}
};

var keyDownEvent = function(event) {
	if (gameInfo.active) {
		const key = event.keyCode;
		if (key == 65) {
			socket.emit('moveLeft', playerInfo);
		}
		if (key == 68) {
			socket.emit('moveRight', playerInfo);
		}
	}
};

var getMousePos = function(canvas, evt) {
	var rect = canvas.getBoundingClientRect();
	return {
		x: evt.clientX - rect.left,
		y: evt.clientY - rect.top
	};
};



var mouseMoveEvent = function(event) {
	if (gameInfo.active) {
		var mousePos = getMousePos(canvas, event);
		playerInfo.mouseX = mousePos.x;
		socket.emit('mousePostion', playerInfo);
	}
};

var clientStart = function() {
	socket = io();
	socket.on('clientError', errorHandler);
	socket.on('createdPlayer', loginUserHandler);
	socket.on('removedPlayer', logoutUserHandler);
	socket.on('recievedPlayerList', userListHandler);
	socket.on('recievedGameList', gameListHandler);
	socket.on('createdNewGame', gameCreatedHandler);
	socket.on('cancelledGame', gameCancelledHandler);
	socket.on('joinedGame', gameJoinedHandler);
	socket.on('recievedGameInfo', gameInfoHandler);
	socket.on('gameStarted', gameStartedHandler);
	
	canvas = document.getElementById("mainCanvas");
	ctx = canvas.getContext("2d");
	
	canvas.addEventListener('mousemove', mouseMoveEvent, false);
	
};

