const express = require("express");
const router = express.Router();
const {
    fullAuthenticationMiddleware,
    partialAuthenticationMiddleware
} = require("../classes/utils");

// get all servers
router.get("/", partialAuthenticationMiddleware, (req, res) => {
    req.database.query("SELECT id, name, description, img FROM servers ORDER BY name", [], (err, result, fields) => {
        if (err) return console.error(err);

        var jsonOut = [];
        if (result.length > 0) {
            result.forEach((plate) => {
                jsonOut.push({
                    id: plate.id,
                    name: plate.name,
                    description: plate.description,
                    img: plate.img
                });
            });
        }
        return res.json(jsonOut);
    });
});

//get server by id
router.get("/:id", partialAuthenticationMiddleware, (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Provide a valid server id" });

    req.database.query("SELECT id, name, description, img FROM servers WHERE id = ?", [req.params.id], (err, result, fields) => {
        if (err) return console.error(err);

        if (result.length > 0) {
            const plate = result[0];
            res.json({
                id: plate.id,
                name: plate.name,
                description: plate.description,
                img: plate.img
            });
        } else {
            return res.status(400).json({ message: "No server found with the provided id" });
        }
    });
});

// create new server
router.post("/", partialAuthenticationMiddleware, (req, res) => {
    const { name, description, owner, inviteCode, img, psw } = req.body;
    if (!name || !description || !owner || !inviteCode || !img || !psw) return res.status(400).json({ message: "Provide a valid server id" });

    req.database.query("INSERT INTO servers (name, description, owner, inviteCode, img, password) VALUES (?, ?, ?, ?, ?, ?)", [name, description, owner, inviteCode, img, psw], (err, result, fields) => {
        if (err) {
            res.status(400).json({ message: "Error creating the server!" });
            return console.error(err);
        }
        res.json({ message: "Server created!" });
        req.eventsHandler.sendEvent("servers", { action: "newServer", data: { serverId: result.insertId, name, description, owner, inviteCode, img, psw } });
    });
});

module.exports = router;