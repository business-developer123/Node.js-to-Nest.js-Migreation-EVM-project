### Date

17.4.2023

### Status

accepted

### Context

Game flow for DRRT token

### Decision

- on ppw create:
    - story
    - portal
    - token 
        - when token is created, if its type is `DRRT` we create product out of that drrt token - you can say drrt token represents product for games
        - we automatically create 29 plays(games) for that token
        - you have to  `deploy smart contract` and `start token sale` for token to become active, to be visible on pushuser and to start creating games for it

- when you create game, it shows 29 for you to create, it creates them in `PENDING` state and we have scheduler that checks which game needs to be played. It runs each day at 4 pm NY time
- only if user bought DRRT token is he invited to play
- everyone can vote
- once voting phase is done, job is triggered to distribute royalties

