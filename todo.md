### Todo list for Echo APIs

- [x] Send some events messages to specific list of users
    - Manage users messages/server specific events and send them to specific users, not everyone
    - [ ] Separate messages events only for users connected to same server
- [ ] Spearate some events for specific users, like room join only for users connected to server
- [ ] Add mediasoup logic to API to deprecate socket-io server
- [ ] Add certificates to API
    - HTTPS lol
- [x] Enhance the authentication logic of the API to prevent impersonification
- [ ] Add updater logic to the API, for example changelogs, in the /app route
- [ ] Implement paging on API responses, like server list and room list
- [ ] Implement timeout logic in case of connection lost for events subscribing (should be already in place, but needs to be checked)
- [x] Differentiate the POST /users/image to the GET for authentication
- [x] Move the upload folder to the /data folder
- [x] Move the logging folder to /data
- [ ] Implement sqlite caching (or any other type for that matter :P)
- [ ] Create centralize database to store the data of all the CDN API nodes
- [ ] Build database restructure logic for the central API node
- [x] Remove client-sent IDs from all endpoints that execute self action (eg. /users/images) since we can use the JWT to get the user
    - I didn't quite remove all the IDs from the requests, but either we are now using a full or partial authentication in each route that requires such a thing. The full authentication is used when the only action a user CAN perform is a SELF ACTION (mostly update), partial is when a user only needs to retrive data, like getting an image, getting how many users are in a channel, etc...