class EchoApi {
    constructor(baseUrl = "https://echo.kuricki.com/api/") {
        this.baseUrl = baseUrl;
    }

    async call(token, path, method = 'GET', body = null, forceString = true, forceContentType = false) {
        console.log("[API] - ", method, " - ", path, " - ", body)

        const options = {
            method: method,
            cache: 'no-cache',
            cors: false,
            headers: new Headers({
              'Content-Type': forceContentType ? null : 'application/json',
              "Authorization": token
            }),
            body: body ? (forceString ? JSON.stringify(body) : body) : null
          };

        return await fetch(this.baseUrl + path, options);
    }
}

module.exports = EchoApi;