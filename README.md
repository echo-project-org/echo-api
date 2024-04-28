# Echo API

## Description

This is the official API for the Echo Messaging and Comunication App

## Features

- Events subscribing
- JWT authentication
- Routing for all the different parts of the application (eg. rooms, users)
- Custom logging class for trace of actions and debugging

## Installation

If you want to self host then...
<Inser self hosting here>

## API Endpoints

### App

- Method: GET
- Path: /app
- Description: Get informations about the app.

### Auth

- Method: GET/POST
- Path: /auth
- Description: Authenticate users to the API by generating JWT tokens.

### Events

- Method: GET
- Path: /events
- Description: Subscribe to different events to see the activity of different endpoints.

### Rooms

- Method: GET/POST
- Path: /rooms
- Description: Get all different rooms, rooms configuration and users connected to different rooms.

### Servers

- Method: GET/POST
- Path: /servers
- Description: Same as the rooms, but for the servers.

### Users

- Method: GET/POST
- Path: /users
- Description: Display and update all the users informations.

## TODO

If you want to check what we are working on / what has been done, check the [Todo list](https://github.com/echo-project-org/echo-api/blob/main/todo.md) on this repository
