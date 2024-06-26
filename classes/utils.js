function checkEmail(email) {
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
}

function getRoomIdFromUserId(db, userId) {
  return new Promise((resolve, reject) => {
    let roomId, serverId;
    db.query("SELECT roomId, serverId FROM room_users WHERE userId = ?", [userId], (err, result, fields) => {
      if (err) {
        console.error(err); 
        reject(err);
      }
      
      if (result.length > 0) {
        const plate = result[0];
        roomId = plate.roomId;
        serverId = plate.serverId;
        resolve({ roomId, serverId });
      } else {
        reject("User not found in any room.");
      }
    });
  });
}

function fullAuthenticationMiddleware(req, res, next) {
  const tokenBody = req.authenticator.checkToken(req, res);
  if (!tokenBody) return res.status(401).send({ message: "You are not authorized to do this." });
  // if (tokenBody.scope !== "self") return res.status(401).send({ message: "You are not authorized to do this." });
  const tokenUid = tokenBody.sub.toString();

  // check if the token has a valid userId
  if (tokenUid) {
    // check if the body of the request has a valid id
    const id = req.body?.id || req.params?.id;
    if (!id) {
      // if not then use the id from the token
      console.warn(`User ${tokenUid} is making a request without an id.`);
      req.body.id = tokenUid;
      req.params.id = tokenUid;
      return next();
    }
    // check if the user making the request can impersonate someone else using the scope
    switch (tokenBody.scope) {
      // if the user is executing an action on their own behalf
      case "self":
        if (tokenUid === id.toString()) {
          next();
        } else {
          res.status(401).send({ message: "You are not authorized to do this." });
        }
        break;
      // if the user is executing an action on behalf of someone else
      case "admin":
        console.warn(`User ${tokenUid} is impersonating user ${id} using the admin scope.`)
        next();
        break;
      // default action is to deny the request
      default:
        res.status(401).send({ message: "You are not authorized to do this." });
        break;
    }
  }
  // if the token does not have a valid userId
  else {
    res.status(401).send({ message: "You are not authorized to do this. Please don't..." });
  }
}

function partialAuthenticationMiddleware(req, res, next) {
  const tokenBody = req.authenticator.checkToken(req, res);
  if (!tokenBody) return res.status(401).send({ message: "You are not authorized to do this." });
  // if (tokenBody.scope !== "self") return res.status(401).send({ message: "You are not authorized to do this." });
  const tokenUid = tokenBody.sub.toString();

  // check if the token has a valid userId
  if (tokenUid) {
    // check if the user making the request can impersonate someone else using the scope
    switch (tokenBody.scope) {
      // if the user is executing an action on their own behalf
      case "self":
        next();
        break;
      // if the user is executing an action on behalf of someone else
      case "admin":
        console.warn(`User ${tokenUid} is impersonating user ${id} using the admin scope.`)
        next();
        break;
      // default action is to deny the request
      default:
        res.status(401).send({ message: "You are not authorized to do this." });
        break;
    }
  }
  // if the token does not have a valid userId
  else {
    res.status(401).send({ message: "You are not authorized to do this. Please don't..." });
  }
}

module.exports = {
  checkEmail,
  getRoomIdFromUserId,
  fullAuthenticationMiddleware,
  partialAuthenticationMiddleware
}