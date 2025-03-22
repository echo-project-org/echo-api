import express from "express";
import fs from "fs";
import path from "path";
import { authMiddleware } from "../classes/utils.js";

const router = express.Router();

router.post("/auth", (req, res) => {
    const { hashedIdentity } = req.body;
    if (!hashedIdentity) return res.status(400).send({ message: "You didn't privide an identity." });

    req.database.get("SELECT id FROM users WHERE hashedIdentity = ?", [hashedIdentity], (err, result) => {
        if (err) return res.status(400).send({ error: "You messed up the request.", message: err });
        if (result) {
            req.authenticator.generateToken({ id: result.id }).then((token) => {
                res.status(200).send({ token: token });
            }).catch((err) => {
                res.status(500).send({ error: "Failed to generate token." });
            });
        } else {
            //add user to database
            req.database.run("INSERT INTO users (hashedIdentity) VALUES (?)", [hashedIdentity], function (err) {
                if (err) return res.status(400).send({ error: "You messed up the request.", message: err });
                //get the id of the user
                req.database.get("SELECT id FROM users WHERE hashedIdentity = ?", [hashedIdentity], (err, result) => {
                    if (err) return res.status(400).send({ error: "You messed up the request.", message: err });
                    if (result) {
                        req.authenticator.generateToken({ id: result.id }).then((token) => {
                            res.status(200).send({ token: token });
                        }).catch((err) => {
                            res.status(500).send({ error: "Failed to generate token." });
                        });
                    } else {
                        res.status(500).send({ error: "Failed to add the user to the server" });
                    }
                });
            });
        }
    });
});

router.get("/verifyToken", authMiddleware, (req, res) => {
    res.status(200).send({ message: "Token is valid.", id: req.validatedId });
});

router.get("/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).send({ message: "Please provide an id" });

    console.log("Getting user with id", id);
    req.database.get(`
        SELECT users.id, users.username, users.lastLogin, users.firstLogin, users.img, users.online, users.muted, users.deaf
        FROM users
        WHERE id = ?
    `, [id], (err, result, fields) => {
        if (err) return res.status(400).send({ error: "You messed up the request.", message: err });
        console.log(result)
        if (result) {
            res.status(200).send(result);
        } else {
            res.status(404).send({ error: "User not found." });
        }
    });
});

router.get("/image/:id", (req, res) => {
    var { id } = req.params;
    // maybe good? IDK
    if (id.includes(".")) id = id.split(".")[0];
    const filePath = path.resolve("./", req.config.uploader.uploadDirectory, id + ".png");
    // check if the folder and the subfolder exists
    if (!fs.existsSync(filePath)) return res.status(404).send({ message: "File not found" });
    // get image from file system
    fs.readFile(filePath, function (err, data) {
        if (err) {
            console.log(err);
            res.status(400).send({ message: "Error reading image" });
        } else {
            //allow client to cache image for 15 minutes
            res.set("Cache-Control", "public, max-age=900");
            res.writeHead(200, { "Content-Type": "image/*,image/png" });
            res.end(data);
        }
    });

    // res.status(404).send("File not found");
});

router.post("/image", (req, res) => {
    var { id, image } = req.body;
    if (!id || !image) return res.status(400).send({ message: "You messed up the request." });

    let filePath = req.config.uploader.uploadDirectory
    // check if the folder and the subfolder exists, if not create them
    if (filePath.includes("/")) {
        const folders = filePath.split("/");
        let folderPath = "./";
        folders.forEach(folder => {
            folderPath = path.join(folderPath, folder);
            if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);
        });
    }

    filePath = path.join(filePath, id + ".png");
    // save image (base64 of file) to file system from jpeg
    // const base64Data = image.replace(/^data:image\/jpeg;base64,/, "");
    const base64Data = image.replace(/^data:image\/png;base64,/, "");
    fs.writeFile(filePath, base64Data, "base64", function (err) {
        if (err) {
            console.log(err);
            res.status(400).send({ message: "Error saving image" });
        } else {
            const imgUrl = "https://echo.kuricki.com/api/users/image/" + id + ".png";
            req.database.run("UPDATE users SET img = ? WHERE id = ?", [imgUrl, id], (err, result, fields) => {
                // console.log(err);
                if (err) return res.status(400).send({ error: "You messed up the request." });
                res.status(200).send({ message: "Image updated!", url: imgUrl });
                req.eventsHandler.sendEvent("users", { action: "imageUpdate", data: { userId: authUId, url: imgUrl } });
            });
        }
    });
});

router.get("/status/:id", (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).send({ message: "You messed up the request." });

    req.database.get("SELECT online FROM users WHERE id = ?", [id], (err, user, fields) => {
        if (err) return res.status(400).send({ error: "You messed up the request." });
        if (user.length > 0) {
            if (user[0].online === "1") {
                req.database.query("SELECT status FROM user_status WHERE userId = ?", [id], (err, result, fields) => {
                    if (err) return res.status(400).send({ error: "You messed up the request." });
                    if (result.length > 0) {
                        res.status(200).send({ status: result[0].status });
                    } else {
                        res.status(404).send({ error: "User not found." });
                    }
                });
            }
        } else {
            res.status(404).send({ error: "User not found." });
        }
    });
});

// update user status
router.post('/status', (req, res) => {
    let { id, status } = req.body;
    if (!id || !status) return res.status(400).send({ message: "You messed up the request." });

    // set online status of user to offline
    req.database.run("UPDATE users SET online = ? WHERE id = ?", [status, id], function (err, result, fields) {
        if (err) console.log(err);

        // remove user from any rooms
        if (status === "0") {
            req.database.run("DELETE FROM roomUsers WHERE userId = ?", [id], function (err, result, fields) {
                if (err) console.log(err);
                res.status(200).send({ message: "You are now offline!" });
            });

        } else {
            res.status(200).send({ message: "Status updated!" });
        }
    });
});

router.post("/customStatus", (req, res) => {
    let { id, status } = req.body;
    if (!id || !status) return res.status(400).send({ message: "You messed up the request." });

    // update user status
    req.database.run("UPDATE user_status SET status = ? WHERE userId = ?", [status, id], (err, result, fields) => {
        if (result.warningCount === 1) {
            console.error("Query gave an error: " + result.message);
            return res.status(400).send({ error: "You can't use this value." });
        }
        if (err) console.error(err);
        if (err) return res.status(500).send({ error: "You messed up the request." });
        res.status(200).send({ message: "Status updated!" });
        req.eventsHandler.sendEvent("users", { action: "customStatusUpdate", data: { userId: id, status } });
    });
});

export default router;