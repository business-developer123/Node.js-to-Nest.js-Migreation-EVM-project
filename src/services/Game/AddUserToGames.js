const Game = require("../../models/game");
const GameStatus = require("../../constants/gameStatus");

async function addUserToGames(userData) {
    try {
        const user = {
            role: userData.role,
            _id: userData._id.toString(),
            username: userData.username,
            email: userData.email,
            onboarding: userData.onboarding,
            hub: userData.hub,
            creative: userData.creative,
            favoriteColor: userData.favoriteColor,
            nodeID: userData.nodeID
        }

        const games = await Game.find({
            $or: [
                {
                    $and: [
                        {state: {$in: [GameStatus.PENDING, GameStatus.SUBMISSION, GameStatus.VOTING]}},
                        {forAllUsers: true}
                    ]
                },
                {forAllUsers: true}
            ]
        });

        const updatePromises = games.length && games.map(game =>
            Game.updateOne(
                { _id: game._id },
                { $addToSet: { usersToShow: user } }
            )
        );
        return Promise.allSettled(updatePromises);
    } catch (e) {
        console.log('Error adding user to games => ', e.message)
    }
}

module.exports = {
    addUserToGames
}
