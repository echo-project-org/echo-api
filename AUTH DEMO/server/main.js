const crypto = require("node:crypto");
const fs = require("node:fs");
const express = require("express");
const app = express();

const ALGORITHM_NAME = "aes-256-cbc";
const ALGORITHM_IV_SIZE = 16;
const ALGORITHM_KEY_SIZE = 32;
const PBKDF2_NAME = "sha256";
const PBKDF2_SALT_SIZE = 16;
const PBKDF2_ITERATIONS = 32767;

function encryptString(plaintext, password) {
    // Generate a 128-bit salt using a CSPRNG.
    let salt = crypto.randomBytes(PBKDF2_SALT_SIZE);
    // Derive a key using PBKDF2.
    let key = crypto.pbkdf2Sync(Buffer.from(password, "utf8"), salt, PBKDF2_ITERATIONS, ALGORITHM_KEY_SIZE, PBKDF2_NAME);
    // Encrypt and prepend salt.
    let ciphertextAndIvAndSalt = Buffer.concat([salt, encrypt(Buffer.from(plaintext, "utf8"), key)]);
    // Return as base64 string.
    return ciphertextAndIvAndSalt.toString("base64");
}

function decryptString(base64CiphertextAndIvAndSalt, password) {
    // Decode the base64.
    let ciphertextAndIvAndSalt = Buffer.from(base64CiphertextAndIvAndSalt, "base64");
    // Create buffers of salt and ciphertextAndIv.
    let salt = ciphertextAndIvAndSalt.slice(0, PBKDF2_SALT_SIZE);
    let ciphertextAndIv = ciphertextAndIvAndSalt.slice(PBKDF2_SALT_SIZE);
    // Derive the key using PBKDF2.
    let key = crypto.pbkdf2Sync(Buffer.from(password, "utf8"), salt, PBKDF2_ITERATIONS, ALGORITHM_KEY_SIZE, PBKDF2_NAME);
    // Decrypt and return result.
    return decrypt(ciphertextAndIv, key).toString("utf8");
}

function encrypt(plaintext, key) {
    // Generate a 128-bit IV using a CSPRNG.
    let iv = crypto.randomBytes(ALGORITHM_IV_SIZE);
    // Create the cipher instance.
    let cipher = crypto.createCipheriv(ALGORITHM_NAME, key, iv);
    // Encrypt and prepend IV.
    let ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return Buffer.concat([iv, ciphertext]);
}

function decrypt(ciphertextAndIv, key) {
    // Create buffers of IV and ciphertext.
    let iv = ciphertextAndIv.slice(0, ALGORITHM_IV_SIZE);
    let ciphertext = ciphertextAndIv.slice(ALGORITHM_IV_SIZE);
    // Create the cipher instance.
    let decipher = crypto.createDecipheriv(ALGORITHM_NAME, key, iv);
    // Decrypt and return result.
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

app.use(express.json());

// get algorithm
const prime_length = 1024;
const mod = crypto.createDiffieHellman(prime_length);

mod.generateKeys();

app.get("/init", (req, res) => {
    const publicKey = mod.getPublicKey().toString("hex");
    res.json({
        prime: mod.getPrime().toString("hex"),
        publicKey: publicKey
    });
});

app.post("/verify", (req, res) => {
    const otherPublicKey = req.body.publicKey;
    const secret = mod.computeSecret(otherPublicKey, "hex");
    const serverSecret = secret.toString("hex");

    let encryptedPayload = req.body.encrypted;
    // convert from hex
    encryptedPayload = Buffer.from(encryptedPayload, "base64");
    // decrypt with shared secret
    let decrypted = decryptString(encryptedPayload, secret);
    // parse JSON
    decrypted = Buffer.from(decrypted, "base64");

    const payload = JSON.parse(decrypted);
    console.log("Payload: " + JSON.stringify(payload));

    const rsaPublicKey = payload.rsaPublicKey;
    const sharedSecret = payload.secret;
    const uuid = payload.uuid;
    console.log("Other public key: " + otherPublicKey);

    console.log("---------------------")
    console.log("Shared secret: " + secret.toString("hex"));
    console.log("---------------------")
    
    if (crypto.timingSafeEqual(Buffer.from(sharedSecret, "hex"), Buffer.from(serverSecret, "hex"))) {
        // create keys folder if it doesn't exist
        if (!fs.existsSync("keys")) {
            fs.mkdirSync("keys");
        }

        // save public key to file having uuid as name
        fs.writeFileSync("keys/" + uuid + ".pem", rsaPublicKey);
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

const checkMessageMiddleware = (req, res, next) => {
    try {
        const message = req.body.message;
        const uuid = req.body.uuid;
        // decrypt message using user public key

        // get user public key
        const userPublicKey = fs.readFileSync("keys/" + uuid + ".pem").toString();
        const decryptBuffer = Buffer.from(message, "hex");
        const decrypted = crypto.publicDecrypt(userPublicKey, decryptBuffer);
        const data = decrypted.toString("utf8");
        req.body.data = data;
        req.body.error = false;
    } catch (error) {
        console.log(error);
        req.body.error = true;
    }
    next();
}

app.post("/sendData", checkMessageMiddleware, (req, res) => {
    if (req.body.error) {
        res.status(403).json({ success: false });
        return
    }

    const data = req.body.data;
    console.log("Data: " + data);
    res.json({ success: true });
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});