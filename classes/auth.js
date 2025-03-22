import * as jose from 'jose';
import * as crypto from 'crypto';

class Auth {
  constructor() {
    //generate a random key secret that is a Uint8array
    this.encryptionKey = jose.base64url.decode(crypto.randomBytes(32).toString('base64url'));
  }

  /**
   * Generates a token for the user
   * @param {*} user 
   * @returns a JWT token
   */
  async generateToken(user) {
    let claims = {
      id: user.id,
      creationTime: Date.now()
    };
    console.info("Generating token for user", user.id, "with claims", claims);

    // Generate a JWT
    let jwt = await new jose.SignJWT(claims)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(this.encryptionKey);

    // Encrypt the JWT
    let encryptedToken = await new jose.CompactEncrypt(new TextEncoder().encode(jwt))
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .encrypt(this.encryptionKey);

    return encryptedToken;
  }

  /**
   * Verifies a token
   * @param {*} token 
   * @returns 
   */
  async verifyToken(token) {
    return new Promise(async (resolve, reject) => {
      try {
        // Decrypt the JWE
        let { plaintext } = await jose.compactDecrypt(token, this.encryptionKey);

        // Decode the JWT
        let jwt = new TextDecoder().decode(plaintext);
        let { payload } = await jose.jwtVerify(jwt, this.encryptionKey);
        resolve(payload);
      } catch (error) {
        console.error("Error verifying token", error);
        reject("Token invalid");
      }
    });
  }
}

export { Auth };