const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "cricketMatchDetails.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//Converting MatchDetailsDbObject TO ResponseObject
const convertMatchDetailsDbObjectToResponseObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

//Converting PlayerDetailsDbObject TO ResponseObject
const convertPlayerDetailsDbObjectToResponseObject = (playerName, statsObj) => {
  return {
    playerId: statsObj.player_id,
    playerName: playerName,
    totalScore: statsObj.totalScore,
    totalFours: statsObj.totalFours,
    totalSixes: statsObj.totalSixes,
  };
};

//Converting PlayerMatchDetailsDbObject TO ResponseObject
const convertPlayerMatchDetailsDbObjectToResponseObject = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

//API:1 => Returns a list of all the players in the player table
//Path: /players/
app.get("/players/", async (request, response) => {
  const getPlayersListQuery = `select * from player_details;`;
  const getPlayersListQueryResponse = await database.all(getPlayersListQuery);
  response.send(
    getPlayersListQueryResponse.map((eachPlayer) =>
      convertMatchDetailsDbObjectToResponseObject(eachPlayer)
    )
  );
});

//API:2 => Returns a specific player based on the player ID
//Path: /players/:playerId/
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayersListByIdQuery = `select * from player_details where player_id = ${playerId};`;
  const getPlayersListByIdQueryResponse = await database.get(getPlayersListByIdQuery);
  response.send(convertMatchDetailsDbObjectToResponseObject(getPlayersListByIdQueryResponse));
});

//API:3 => Updates the details of a specific player based on the player ID
//Path: /players/:playerId/
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;

  const updatePlayerNameQuery = `
    UPDATE player_details
        SET player_name='${playerName}'
    WHERE player_id=${playerId}`;
  const updatePlayerNameResponse = await database.run(updatePlayerNameQuery);
  response.send("Player Details Updated");
});

//API:4 => Returns the match details of a specific match
//Path: /matches/:matchId/
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetailsQuery = ` 
    SELECT * 
        FROM match_details
    WHERE match_id=${matchId}`;
  const getMatchDetailsResponse = await database.get(getMatchDetailsQuery);
  response.send(convertPlayerMatchDetailsDbObjectToResponseObject(getMatchDetailsResponse));
});

//API:5 => Returns a list of all the matches of a player
//Path: /players/:playerId/matches
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getMatchesOfPlayerDBQuery = `
    SELECT *
        FROM player_match_score
    WHERE 
        player_id=${playerId};`;

  const getMatchesOfPlayerDBResponse = await database.all(getMatchesOfPlayerDBQuery);
  const matchesIdArr = getMatchesOfPlayerDBResponse.map((eachMatch) => {
    return eachMatch.match_id;
  });

  const getMatchDetailsQuery = `
    SELECT *
        FROM match_details 
    WHERE match_id IN (${matchesIdArr});`;

  const fetchMatchDetailsResponse = await database.all(getMatchDetailsQuery);
  response.send(
    fetchMatchDetailsResponse.map((eachMatch) =>
      convertPlayerMatchDetailsDbObjectToResponseObject(eachMatch)
    )
  );
});

//API:6 => Returns a list of players of a specific match
//Path: /matches/:matchId/players
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getPlayersOfMatchQuery = `
    SELECT *
        FROM player_match_score
            NATURAL JOIN player_details
    WHERE match_id=${matchId};`;
  const getPlayersOfMatchResponse = await database.all(getPlayersOfMatchQuery);
  response.send(
    getPlayersOfMatchResponse.map((eachPlayer) =>
      convertMatchDetailsDbObjectToResponseObject(eachPlayer)
    )
  );
});

//API:7 => Returns the statistics of the total score, fours, sixes of a specific player based on the player ID
//Path: /players/:playerId/playerScores
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerNameQuery = `
    SELECT player_name
        FROM player_details
    WHERE player_id=${playerId};`;
  const getPlayerNameResponse = await database.get(getPlayerNameQuery);
  const getPlayerStatisticsQuery = `
    SELECT 
        player_id,
        sum(score) AS totalScore,
        sum(fours) AS totalFours,
        sum(sixes) AS totalSixes
    FROM 
        player_match_score
    WHERE 
        player_id=${playerId};`;

  const getPlayerStatisticsResponse = await database.get(getPlayerStatisticsQuery);
  response.send(
    convertPlayerDetailsDbObjectToResponseObject(
      getPlayerNameResponse.player_name,
      getPlayerStatisticsResponse
    )
  );
});

module.exports = app;