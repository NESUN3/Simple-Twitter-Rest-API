// Load external libraries
import express from "express";
import { LowSync } from "lowdb";
import { JSONFileSync } from "lowdb/node";
import lodash from "lodash";
import * as EmailValidator from "email-validator";
import { nanoid } from "nanoid";

// Setup Express
const app = express();
app.use(express.json());

// Example Data
const tweets = [
  {
    username: "nesun3",
    message: "First Tweet",
  },
  {
    username: "nesun3",
    message: "Hello World!",
  },
  {
    username: "nesun3",
    message: "Uno Dos Tres",
  },
];

// Define Database
const db = new LowSync(new JSONFileSync("db.json"), {});
db.read();

// Write data to db
/* 
db.data = { tweets: [
  {
    username: "nesun3",
    message: "First Tweet"
  },
  {
    username: "nesun3",
    message: "Hello World!"
  },
  {
    username: "nesun3",
    message: "Uno Dos Tres"
  }
] };
db.write();
*/
db.chain = lodash.chain(db.data);

// Status endpoint
app.get("/status", (request, response) => {
  response.send({ status: "UP" });
});

// Get/Read all tweets
app.get("/tweets", (request, response) => {
  //response.send(tweets);
  const tweets = db.data.tweets;
  response.send(tweets);
});

// Register user
app.post("/users", (request, response) => {
  const newUser = {
    username: request.body.username,
    email: request.body.email,
  };

  // Validate username
  if (!newUser.username || newUser.username.length < 3) {
    response.status(400);
    response.send({
      message: "Invalid Username. Username should have minimum 3 characters.",
    });
    return;
  }

  const existingUser = db.chain
    .get("users")
    .find({ username: newUser.username })
    .value();
  if (existingUser) {
    response.status(400);
    response.send({ message: "Username already taken." });
    return;
  }

  // Validate email
  if (!EmailValidator.validate(newUser.email)) {
    response.status(400);
    response.send({
      message: "Invalid Email Id.",
    });
    return;
  }

  const existingEmail = db.chain
    .get("users")
    .find({ email: newUser.email })
    .value();

  if (existingEmail) {
    response.status(400);
    response.send({ message: "Email already registered." });
    return;
  }

  // Write to db
  db.data.users.push(newUser);
  db.write();

  response.status(201);
  response.send({
    message: `User ${newUser.username} is created. Thank you for registering.`,
  });
});

// Create a personal access token or api-keys
app.post("/api-key", (request, response) => {
  const userApiKeys = {
    username: request.query.username,
    api_key: nanoid(),
  };

  if (!userApiKeys.username) {
    response.status(400);
    response.send({ message: "Username is missing in the query." });
    return;
  }

  // Validate username
  const existingUser = db.chain
    .get("users")
    .find({ username: userApiKeys.username })
    .value();

  if (!existingUser) {
    response.status(401);
    response.send({
      message: "Username does not exists. Please register first.",
    });
    return;
  }

  // Check if api_key exist for the user
  const existingApikey = db.chain
    .get("api_keys")
    .find({ username: userApiKeys.username })
    .value();
  if (existingApikey) {
    // if exists, then update the entry with the new key
    existingApikey.api_key = userApiKeys.api_key;
    db.write();
  } else {
    db.data.api_keys.push(userApiKeys);
    db.write();
  }

  response.send({ api_key: userApiKeys.api_key });
});

// Create a new tweet
app.post("/tweets", (request, response) => {
  const isAuthenticated = getUserByApiKey(request);

  if (!isAuthenticated) {
    response.status(401);
    response.send({ message: "Missing or Invalid api_key" });
    return;
  }

  const newTweet = {
    username: request.body.username,
    message: request.body.message,
  };
  //tweets.push(newTweet)
  db.data.tweets.push(newTweet);
  db.write();
  response.send({ message: "Your Tweet is Created." });
});

function getUserByApiKey(request) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return;
  }

  const api_key = authHeader.replace("Bearer ", "");
  console.log(db.chain.get("api_keys").find({ api_key: api_key }).value());
  return db.chain.get("api_keys").find({ api_key: api_key }).value();
}

// Listed for incomming requests
const listener = app.listen(process.env.PORT, () => {
  console.log("The API is listening on port " + listener.address().port);
});
