const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "twitterClone.db");
let db = null;
app.use(express.json());
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

//Register API
app.post("/register/", async (request, response) => {
  const userDetails = request.body;
  const { username, password, name, gender } = userDetails;
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(getUserQuery);
  if (dbUser === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const registerUserQuery = `INSERT INTO user (name,username,password,gender)
            VALUES (
                '${name}',
                '${username}',
                '${hashedPassword}',
                '${gender}'
            );`;
      await db.run(registerUserQuery);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//Login User API
app.post("/login/", async (request, response) => {
  const userDetails = request.body;
  const { username, password } = userDetails;
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(getUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "asdfghjkl");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const authenticateToken = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  let jwtToken;
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "asdfghjkl", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//GET tweets of user
const convertJsonToObjectResponse = (jsonData) => {
  return {
    username: jsonData["username"],
    tweet: jsonData["tweet"],
    dateTime: jsonData["date_time"],
  };
};

app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const { username } = request;
  const getTweetsQuery = `SELECT T.username,tweet.tweet,tweet.date_time FROM (user INNER JOIN follower ON user.user_id = follower.follower_user_id) AS T INNER JOIN tweet ON tweet.user_id = T.following_user_id WHERE username = '${username}' ORDER BY tweet.date_time DESC LIMIT 4;`;
  const userTweetDetails = await db.all(getTweetsQuery);
  response.send(
    //username: user["username"],
    //tweet: tweet["tweet"],
    //dateTime: tweet["date_time"],
    userTweetDetails.map((user) => convertJsonToObjectResponse(user))
  );
});

//GET names API
/*app.get("/user/following/",authenticateToken,(request,response) => {
    const {username} = request;

});
*/

module.exports = app;
