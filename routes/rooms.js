import express from 'express';
const router = express.Router();

// create new room
router.post('/createRoom', (req, res) => {
  const { uId, name, description, maxUsers } = req.body;
  if (!name || !description || !maxUsers) return res.status(400).json({ message: "Please provide name, description and maxUsers" });

  //find the highest orderIndex and add 1 to it
  var orderIndex = 0;
  req.database.query("SELECT MAX(orderIndex) as orderIndex FROM rooms", (err, result, fields) => {
    if (err) return console.error(err);
    if (result.length > 0) {
      orderIndex = result[0].orderIndex + 1;
    }
  });

  //add the room to the database
  req.database.run(`INSERT INTO rooms (name, description, maxUsers, orderIndex) VALUES (?, ?, ?, ?)`, [name, description, maxUsers, orderIndex], (err) => {
    if (err) {
      res.status(400).json({ message: "Error creating the room!" });
      return console.error(err);
    }
    res.json({ message: "Room created!" });
    //TODO send the new room to all clients
  });
});

//update room
router.post('/updateRoom', (req, res) => {
  const { uid, id, name, description, maxUsers, img, bannerImg, orderIndex } = req.body;
  if (!id) return res.status(400).json({ message: "Provide a valid room id" });

  //update the room with all fields that are not null
  let query = `UPDATE rooms SET `;
  let params = [];
  let setClauses = [];

  if (name !== null) {
    setClauses.push(`name = ?`);
    params.push(name);
  }
  if (description !== null) {
    setClauses.push(`description = ?`);
    params.push(description);
  }
  if (maxUsers !== null) {
    setClauses.push(`maxUsers = ?`);
    params.push(maxUsers);
  }
  if (img !== null) {
    setClauses.push(`img = ?`);
    params.push(img);
  }
  if (bannerImg !== null) {
    setClauses.push(`bannerImg = ?`);
    params.push(bannerImg);
  }
  if (orderIndex !== null) {
    setClauses.push(`orderIndex = ?`);
    params.push(orderIndex);
  }

  if (setClauses.length === 0) {
    res.status(400).json({ message: "No updates provided" });
    return;
  }

  query += setClauses.join(', ');
  query += ` WHERE id = ?`;
  params.push(id);

  req.database.run(query, params, (err) => {
    if (err) {
      res.status(400).json({ message: "Error updating the room!" });
      return console.error(err);
    }
    res.json({ message: "Room updated!" });
    //TODO send the updated room to all clients
  });
});

// join room
router.post('/join', (req, res) => {
  var { uid, roomId, deaf, muted } = req.body;
  if (!roomId || !uid) return res.status(400).json({ message: "Provide valid data" });
  if (!deaf) {
    console.warn("Deaf not provided, setting to false");
    deaf = false;
  }
  if (!muted) {
    console.warn("Muted not provided, setting to false");
    muted = false;
  }

  if (roomId === "-1") {
    // remove user from all rooms
    req.database.query("DELETE FROM roomUsers WHERE userId = ?", [uid], (err, result, fields) => {
      if (err) return console.error(err);
      return res.json({ message: "Left room" });
    });
  } else {
    // add user to joining room
    req.database.query("REPLACE INTO roomUsers (roomId, userId) VALUES (?, ?)", [roomId, id], (err, result, fields) => {
      if (err) return console.error(err);
      // send complete room data back to client
      req.database.query(`
      SELECT users.id, users.username, users.img, users.lastLogin, users.firstLogin, users.online, users.muted, users.deaf 
      FROM users 
      INNER JOIN roomUsers ON users.hashedIdentity = roomUsers.userId 
      WHERE roomUsers.roomId = ?
      `, [roomId], (err, result, fields) => {
        if (err) return console.error(err);

        var jsonOut = [];
        if (result.length > 0) {
          result.forEach((plate) => {
            jsonOut.push({
              id: plate.id,
              name: plate.username,
              img: plate.img,
              lastLogin: plate.lastLogin,
              firstLogin: plate.firstLogin,
              online: plate.online,
              muted: plate.muted,
              deaf: plate.deaf
            });
          });
        }
      });
    });
  }
});

// get users in room
router.get('/:id/users', (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "Provide a valid room id" });

  req.database.query(`
        SELECT users.id, users.username, users.img, users.lastLogin, users.firstLogin, users.online, users.muted, users.deaf 
        FROM users
        INNER JOIN roomUsers ON users.hashedIdentity = roomUsers.userId
        WHERE roomUsers.roomId = ?
    `, [id], (err, result, fields) => {
    if (err) return console.error(err);

    var jsonOut = [];
    if (result.length > 0) {
      result.forEach((plate) => {
        jsonOut.push({
          id: plate.id,
          name: plate.username,
          img: plate.img,
          lastLogin: plate.lastLogin,
          firstLogin: plate.firstLogin,
          online: plate.online,
          muted: plate.muted,
          deaf: plate.deaf
        });
      });
    }

    return res.json(jsonOut);
  });
});

/*router.get('/:id/messages', (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "Provide a valid room id" });

  // TODO: request previous 50 messages if scrolling up
  req.database.query(`
        SELECT
            room_messages.id,
            room_messages.message,
            room_messages.userId,
            room_messages.date,
            room_messages.insertDate,
            users.name,
            users.img
        FROM room_messages
        INNER JOIN users ON room_messages.userId = users.id
        WHERE room_messages.roomId = ? AND room_messages.serverId = ?
        ORDER BY room_messages.id ASC
        LIMIT 50
    `, [id, serverId], (err, result, fields) => {
    if (err) return console.error(err);

    var jsonOut = [];
    if (result.length > 0) {
      result.forEach((plate) => {
        jsonOut.push({
          id: plate.id,
          message: plate.message,
          userId: plate.userId,
          name: plate.name,
          img: plate.img,
          date: plate.date,
          insertDate: plate.insertDate
        });
      });
    }
    res.json(jsonOut);
  });
});*/

/*router.post('/messages', fullAuthenticationMiddleware, (req, res) => {
  var { roomId, id, serverId, message, } = req.body;
  if (!roomId) return res.status(400).json({ message: "Provide a valid room id" });
  if (!id) return res.status(400).json({ message: "Provide a valid user id" });
  if (!serverId) return res.status(400).json({ message: "Provide a valid server id" });
  if (!message) return res.status(400).json({ message: "Provide a valid message" });

  // transform js date to mysql date
  // const jsDate = new Date(date);
  // const mysqlDate = jsDate.toISOString().slice(0, 19).replace('T', ' ');

  req.database.query("INSERT INTO room_messages (roomId, userId, serverId, message) VALUES (?, ?, ?, ?)", [roomId, id, serverId, message], (err, result, fields) => {
    if (err) {
      res.status(400).json({ message: "Error sending the message!" });
      return console.error(err);
    }
    req.eventsHandler.sendEvent("messages", { action: "newMessage", data: { roomId, userId: id, message, serverId, messageId: result.insertId, affectedRows: result.affectedRows } });
    res.json({ message: "Message sent!" });
  });
});*/

export default router;