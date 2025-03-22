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

function authMiddleware(req, res, next){
  let token = req.headers.authorization;

  if (!token) {
    res.status(401).send({ message: "You are not authorized to do this." });
    return;
  }
  
  //remove the Bearer part
  token = token.split(" ")[1];
  req.authenticator.verifyToken(token).then((tokenBody) => {
    req.validatedId = tokenBody.id;
    next();
  }).catch((err) => {
    res.status(401).send({ message: "You are not authorized to do this.", error: err });
  });
}

module.exports = {
  checkEmail,
  authMiddleware,
  getRoomIdFromUserId
}