### Todo list for Echo APIs

- [ ] Send some events messages to specific list of users
- [ ] Spearate some events for specific users, like room join only for users connected to server
- [ ] Separate messages events only for users connected to same server
- [ ] Add mediasoup logic to API to deprecate socket-io server
- [ ] Add certificates to API
- [ ] Enhance the authentication logic of the API to prevent impersonification
- [ ] Add updater logic to the API, for example changelogs, in the /app route
- [ ] Implement paging on API responses, like server list and room list
- [ ] Implement timeout logic in case of connection lost for events subscribing (should be already in place, but needs to be checked)