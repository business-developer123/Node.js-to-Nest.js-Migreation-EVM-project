const MessageService = require("../message")

module.exports = (socket) => {
    async function onDeleteMessage(message) {
        await MessageService.deleteMessage(message);
    }

    async function onDeleteResponse(response){
        await MessageService.deleteResponse(response)
    }

    socket.on("deleteMessage", onDeleteMessage);
    socket.on("deleteResponse", onDeleteResponse);
}
