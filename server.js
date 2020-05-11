const express = require("express");
const bcrypt = require("bcrypt-nodejs");
const cors = require("cors");
const knex = require("knex");

const db = knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    user: "postgres",
    password: "test",
    database: "smartbrain",
  },
});

db.select("*")
  .from("users")
  .then((data) => {
    console.log(data);
  });

const app = express();

app.use(express.json());
app.use(cors());

// const database = {
//   users: [
//     {
//       id: "123",
//       name: "John",
//       email: "john@email.com",
//       password: "cookies",
//       entries: 0,
//       joined: new Date(),
//     },
//     {
//       id: "124",
//       name: "Sally",
//       email: "sally@email.com",
//       password: "bananas",
//       entries: 0,
//       joined: new Date(),
//     },
//   ],
//   login: [
//     {
//       id: "987",
//       hash: "",
//       email: "john@gmail.com",
//     },
//   ],
// };

app.get("/", (req, res) => {
  res.send(database.users);
});

app.post("/signIn", (req, res) => {
  db.select("email", "hash")
    .from("login")
    .where("email", "=", req.body.email)
    .then((data) => {
      const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
      console.log(isValid);
      if (isValid) {
        return db
          .select("*")
          .from("users")
          .where("email", "=", req.body.email)
          .then((user) => {
            res.json(user[0]);
          })
          .catch((err) => res.status(400).json(err, "unable to get user"));
      } else {
        res.json("wrong credentials");
      }
    })
    .catch((err) => res.status(400).json("wrong credentials"));
});

app.post("/register", (req, res) => {
  const { email, name, password } = req.body;
  const hash = bcrypt.hashSync(password);
  db.transaction((trx) => {
    //create a transaction when you have to do more than one thing at once
    trx
      .insert({
        hash: hash,
        email: email,
      })
      .into("login")
      .returning("email")
      .then((loginEmail) => {
        //use loginEmail to insert into users
        return trx("users")
          .returning("*")
          .insert({
            email: loginEmail[0],
            name: name,
            joined: new Date(),
          })
          .then((userResponse) => {
            res.json(userResponse[0]);
          });
      })
      .then(trx.commit)
      .catch(trx.rollback); //if anything fails rollback
  }).catch((err) => res.status(400).json(err, "unable to register"));
});

app.get("/profile/:id", (req, res) => {
  const { id } = req.params;
  db.select("*")
    .from("users")
    .where({
      id: id,
    })
    .then((user) => {
      if (user.length) {
        res.json(user[0]);
      } else {
        res.status(400).json(err, "Not Found");
      }
    });
});

app.put("/image", (req, res) => {
  const { id } = req.body;
  db("users")
    .where("id", "=", id)
    .increment("entries", 1)
    .returning("entries")
    .then((entries) => {
      res.json(entries[0]);
    })
    .catch((err) => res.status(400).json(err, "unable to get entries"));
});

// bcrypt.hash("bacon", null, null, function (err, hash) {
//   // Store hash in your password DB.
// });

// // Load hash from your password DB.
// bcrypt.compare("bacon", hash, function(err, res) {
//     // res == true
// });
// bcrypt.compare("veggies", hash, function(err, res) {
//     // res = false
// });

app.listen(3000, () => {
  console.log("Looks good");
});

/* 
/ Root Route --> res = this is working
/ signIn --> POST with response of success/fail
/ register --> POST = new user object
/ profile/:userId --> GET = return us the user
/ image endpoint --> PUT = return updated user object or count 
*/
