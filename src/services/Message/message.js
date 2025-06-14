const User = require("../../models/user");
const Feed = require("../../models/feed");
const Message = require("../../models/message");
const Response = require("../../models/response");
const Portal = require("../../models/portal");
const Twillio = require("../Twilio/twillio");


const getMessageData = async (message) => {
    const user = await User.findById(message.userId).exec();
    message.user = {};
    message.user.username = user?.username;
    message.user.nodeID = user?.nodeID;
    return message;
};

async function createMessage(req, res) {
    try {
        const data = req.body;
        const user = await User.findById(req.user._id);
        const feed = await Feed.findById(data.feedId);
        const newMessage = new Message({
            message: data.message,
            userId: user,
            feedId: feed,
        });
        await newMessage.save();
        const message = await Message.findById(newMessage._id);
        io.emit("newMessage", await getMessageData(message));
        return res.status(200).send({message: "Success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
}

async function deleteMessage(message) {
    try {
        await Message.findOneAndRemove({_id: message._id});
        io.emit("messageWasDeleted", await getMessageData(message));
    } catch (error) {
        console.log("deleteMessage error!");
    }
}

async function toggleLike(req, res) {
    try {
        const data = req.body;
        const user = await User.findById(req.user._id);
        const feed = await Feed.findById(data.feedId);
        const message = await Message.findById(data.messageId).populate('responses');

        if (!message.likes) {
            message.likes = {};
        }

        if (!message.likes[data.emoji]) {
            message.likes[data.emoji] = [];
        }

        const existingLikes = message.likes[data.emoji];
        const userId = user._id.toString();

        Object.keys(message.likes).forEach((key) => {
            if (key !== data.emoji) {
                message.likes[key] = message.likes[key].filter(
                    (like) => like !== userId
                );
            } else {
                message.likes[key] = existingLikes.includes(userId)
                    ? existingLikes.filter((like) => like !== userId)
                    : [...existingLikes, userId];
            }
        });

        message.markModified("likes"); // notify mongoose that likes has changed
        await message.save();
        io.emit("newLike", await getMessageData(message));
        return res.status(200).send({message: "Success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
}

async function toggleResponseLike(req, res) {
    try {
        const data = req.body;
        const user = await User.findById(req.user._id);
        const response = await Response.findById(data.responseId)

        if (!response.likes) {
            response.likes = {};
        }

        if (!response.likes[data.emoji]) {
            response.likes[data.emoji] = [];
        }

        const existingLikes = response.likes[data.emoji];
        const userId = user._id.toString();

        Object.keys(response.likes).forEach((key) => {
            if (key !== data.emoji) {
                response.likes[key] = response.likes[key].filter(
                    (like) => like !== userId
                );
            } else {
                response.likes[key] = existingLikes.includes(userId)
                    ? existingLikes.filter((like) => like !== userId)
                    : [...existingLikes, userId];
            }
        });

        response.markModified("likes"); // notify mongoose that likes has changed
        await response.save();

        const message = await Message.findById(data.messageId).populate('responses');
        io.emit("newLike", await getMessageData(message));
        return res.status(200).send({message: "Success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
}


async function deleteResponse(response) {
    try {
        await Response.findOneAndRemove({_id: response._id});
        io.emit("responseWasDeleted", response);
    } catch (error) {
        console.log("deleteMessage error!");
    }
}


async function getMessages(req, res) {
    try {
        const feedId = req.params.feedId;
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 5;
        const query = {feedId};

        const messages = await Message.find(query)
            .populate({
                path: 'responses',
                options: { sort: {created_at: "desc"} }
            })
            .sort({created_at: "desc"})
            .skip(page * limit)
            .limit(limit)

        const populatedMessages = []

        for await (let message of messages) {
            const fullMessage = await getMessageData(message);
            populatedMessages.push(fullMessage)
        }

        const count = await Message.countDocuments(query);

        return res.status(200).json({
            messages: populatedMessages,
            count,
        });
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
}

async function createResponse(req, res) {
    try {
        const data = req.body;
        const user = await User.findById(data.userId);
        const message = await Message.findById(data.messageId);
        const portal = await Portal.findById(data.portalId);

        const newResponse = new Response({
            text: data.text,
            userId: data.userId,
            messageId: data.messageId,
            portalId: data.portalId,
            fromPortal: data.fromPortal,
            fromUser: data.fromUser,
            user,
            message,
            portal,
        });
        await newResponse.save();

        await Message.findByIdAndUpdate(data.messageId, {$push: {responses: newResponse._id}});
        const response = await Response.findById(newResponse._id).exec();

        if (data.portalId && !data.fromUser) {
            await Twillio.sendMessage(
                user?.phoneNumber,
                `Hey ${user.username}! You have a new reply from Character!`
            );
        }
        io.emit('newResponse', response);
        return res.status(200).send({message: "Success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
}


async function updateResponse(req, res) {
    try {
        const data = req.body;
        await Response.findByIdAndUpdate(data._id, {isReviewed: true});
        const response = await Response.findById(data._id).exec();
        io.emit('newResponse', response);
        return res.status(200).send({message: "Success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
}


module.exports = {
    getMessageData,
    createMessage,
    deleteMessage,
    toggleLike,
    getMessages,
    createResponse,
    toggleResponseLike,
    deleteResponse,
    updateResponse
};
