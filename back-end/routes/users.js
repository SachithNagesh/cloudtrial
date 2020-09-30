var express = require("express");
var router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");
require("../config/passport")(passport);
const User = require("../models").User;

/* POST route for users to sign-up */
router.post("/signup", function (req, res) {
  if (!req.body.email_address || !req.body.password) {
    res.status(400).send({ message: "Please pass username and password." });
  } else {
    User.findOne({
      where: {
        email_address: req.body.email_address,
      },
    })
      .then((user) => {
        if (!user) {
          var passwordTester = new RegExp(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})"
          );

          if (passwordTester.test(req.body.password)) {
            User.create({
              email_address: req.body.email_address,
              password: req.body.password,
              first_name: req.body.first_name,
              last_name: req.body.last_name,
            })
              .then((user) => {
                return res.status(201).send(userPayload(user));
              })
              .catch((error) => {
                console.log(error);
                return res.status(400).send(error);
              });
          } else {
            return res.status(400).send({
              message:
                "Please choose a strong password that contains atleast 1 numerical, lowercase, uppercase alphabetic charater with one special charater and 8 charaters long.",
            });
          }
        } else {
          return res.status(401).send({
            message: "Email address already exists",
          });
        }
      })
      .catch((error) => res.status(400).send(error));
  }
});

/* POST route for users to sign-in */
router.post("/signin", function (req, res) {
  User.findOne({
    where: {
      email_address: req.body.email_address,
    },
  })
    .then((user) => {
      if (!user) {
        return res.status(401).send({
          message: "Authentication failed. User not found.",
        });
      }
      user.comparePassword(req.body.password, (err, isMatch) => {
        if (isMatch && !err) {
          var token = jwt.sign(
            JSON.parse(JSON.stringify(user)),
            "nodeauthsecret",
            { expiresIn: 86400 * 30 }
          );
          jwt.verify(token, "nodeauthsecret", function (err, data) {
            console.log(err, data);
          });
          res.json({ success: true, token: "JWT " + token });
        } else {
          res.status(401).send({
            success: false,
            msg: "Authentication failed. Wrong password.",
          });
        }
      });
    })
    .catch((error) => res.status(400).send(error));
});

// Update route for users to update profile
router.put("/self", passport.authenticate("jwt", { session: false }), function (
  req,
  res
) {
  var token = getToken(req.headers);

  if (token) {
    jwt.verify(token, "nodeauthsecret", function (err, decoded) {
      if (err) {
        return res
          .status(500)
          .send({ auth: false, message: "Failed to authenticate token." });
      } else {
        User.findOne({
          where: {
            email_address: decoded.email_address,
          },
        })
          .then((user) => {
            if (!user) {
              return res.status(401).send({
                message: "Authentication failed. User not found.",
              });
            }

            if (req.body.password) {
              user
                .update({
                  password: req.body.password,
                  first_name: req.body.first_name
                    ? req.body.first_name
                    : user.first_name,
                  last_name: req.body.last_name
                    ? req.body.last_name
                    : user.last_name,
                })
                .then((user) => res.status(201).send(userPayload(user)))
                .catch((error) => {
                  console.log(error);
                  logger.info(error);
                  res.status(400).send(error);
                });
            } else {
              user
                .update({
                  first_name: req.body.first_name
                    ? req.body.first_name
                    : user.first_name,
                  last_name: req.body.last_name
                    ? req.body.last_name
                    : user.last_name,
                })
                .then((user) => res.status(201).send(userPayload(user)))
                .catch((error) => {
                  console.log(error);
                  logger.info(error);
                  res.status(400).send(error);
                });
            }
          })
          .catch((error) => res.status(400).send(error));
      }
    });
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

// Get route for users to view profile
router.get("/self", passport.authenticate("jwt", { session: false }), function (
  req,
  res
) {
  var token = getToken(req.headers);

  if (token) {
    jwt.verify(token, "nodeauthsecret", function (err, decoded) {
      if (err)
        return res
          .status(500)
          .send({ auth: false, message: "Failed to authenticate token." });

      User.findOne({
        where: {
          email_address: decoded.email_address,
        },
      })
        .then((user) => {
          if (!user) {
            return res.status(401).send({
              message: "Authentication failed. User not found.",
            });
          }

          return res.status(201).send(userPayload(user));
        })
        .catch((error) => res.status(400).send(error));
    });
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

userPayload = function (user) {
  let userPayload = {
    id: user.id,
    email_address: user.email_address,
    first_name: user.first_name,
    last_name: user.last_name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return userPayload;
};

getToken = function (headers) {
  if (headers && headers.authorization) {
    var parted = headers.authorization.split(" ");
    if (parted.length === 2) {
      return parted[1];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

module.exports = router;
