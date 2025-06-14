const Feed = require("../../models/feed");
const Portal = require("../../models/portal");
const Game = require("../../models/game");
const Story = require("../../models/story");
const Message = require("../../models/message");
const MessageService = require("../../services/Message/message");
const mongoose = require("mongoose");
const MailService = require("../../services/Email/email");
const emailService = require("../Email/email");
const User = require("../../models/user");
const Twillio = require("../Twilio/twillio");
require("dotenv").config();
const Mongoose = require("mongoose");
const ObjectId = Mongoose.Types.ObjectId;

const getFeedData = async (feed) => {
    let data = feed;
    if (data?.portalID) {
        const portal = await Portal.findById(data.portalID).exec();
        data.portalFull = portal;
        data.portalFull.icon = `/api/routes/media/image/${portal.icon.url}`;
    }

    if (data?.storyID) {
        const story = await Story.findById(data.storyID).exec();
        data.storyFull = story;
    }

    if (data?.gameID) {
        let feedGame = await Game.findById(data.gameID).exec();
        let game = feedGame;
        if (game?.storyId) {
            let gameStory = await Story.findById(game.storyId);
            game.story = gameStory;
        }
        data.gameFull = game;
    }

    if (data?.type === "video" || data?.type === "image") {
        if (data.desktopFile || data.mobileFile) {
            data.desktopFile = `/api/routes/media/file/${data?.desktopFile}/${data?.type}`;
            data.mobileFile = `/api/routes/media/file/${data?.mobileFile}/${data?.type}`;
        }
        if (
            data?.mobileVideos?.pending ||
            data?.mobileVideos?.submission ||
            data?.mobileVideos?.vote ||
            data?.mobileVideos?.completed ||
            data?.mobileVideos?.play_starts ||
            data?.mobileVideos?.hold
        ) {
            data.mobileVideos = {
                pending: data?.mobileVideos?.pending
                    ? `/api/routes/media/file/${data?.mobileVideos?.pending}/${data?.type}`
                    : "",
                submission: data?.mobileVideos?.submission
                    ? `/api/routes/media/file/${data?.mobileVideos?.submission}/${data?.type}`
                    : "",
                vote: data?.mobileVideos?.vote
                    ? `/api/routes/media/file/${data?.mobileVideos?.vote}/${data?.type}`
                    : "",
                completed: data?.mobileVideos?.completed
                    ? `/api/routes/media/file/${data?.mobileVideos?.completed}/${data?.type}`
                    : "",
                play_starts: data?.mobileVideos?.play_starts
                    ? `/api/routes/media/file/${data?.mobileVideos?.play_starts}/${data?.type}`
                    : "",
                hold: data?.mobileVideos?.hold
                    ? `/api/routes/media/file/${data?.mobileVideos?.hold}/${data?.type}`
                    : "",
            };
        }

        if (
            data?.desktopVideos?.pending ||
            data?.desktopVideos?.submission ||
            data?.desktopVideos?.vote ||
            data?.desktopVideos?.completed ||
            data?.desktopVideos?.play_starts ||
            data?.desktopVideos?.hold
        ) {
            data.desktopVideos = {
                pending: data?.desktopVideos?.pending
                    ? `/api/routes/media/file/${data?.desktopVideos?.pending}/${data?.type}`
                    : "",
                submission: data?.desktopVideos?.submission
                    ? `/api/routes/media/file/${data?.desktopVideos?.submission}/${data?.type}`
                    : "",
                vote: data?.desktopVideos?.vote
                    ? `/api/routes/media/file/${data?.desktopVideos?.vote}/${data?.type}`
                    : "",
                completed: data?.desktopVideos?.completed
                    ? `/api/routes/media/file/${data?.desktopVideos?.completed}/${data?.type}`
                    : "",
                play_starts: data?.desktopVideos?.play_starts
                    ? `/api/routes/media/file/${data?.desktopVideos?.play_starts}/${data?.type}`
                    : "",
                hold: data?.desktopVideos?.hold
                    ? `/api/routes/media/file/${data?.desktopVideos?.hold}/${data?.type}`
                    : "",
            };
        }

        if (
            data?.thumbnails?.pending ||
            data?.thumbnails?.submission ||
            data.thumbnails?.vote ||
            data.thumbnails?.completed ||
            data?.thumbnails?.hold
        ) {
            data.thumbnails = {
                pending: data?.thumbnails?.pending,
                submission: data?.thumbnails?.submission,
                vote: data?.thumbnails?.vote,
                completed: data?.thumbnails?.completed,
                hold: data?.thumbnails?.hold,
            };
        }
    }
    data.messages = [];

    const messages = await Message.find({feedId: feed._id})
        .populate({
          path: 'responses',
          options: { sort: {created_at: "desc"} }
        })
        .sort({created_at: "desc"})
        .limit(3)
        .exec();

    if (messages.length) {
        for await (let message of messages) {
            const fullMessage = await MessageService.getMessageData(message);
            data.messages.push(fullMessage);
        }
    }
    return data;
};

async function getFeed(req, res) {
    try {
        const result = await Feed.find({}).sort({updated_at: "desc"}).exec();
        const feeds = [];

        for await (let feed of result) {
            const fullFeedData = await getFeedData(feed);
            feeds.push(fullFeedData);
        }

        return res.status(200).send({message: "Success", data: feeds});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
}

async function getFeedById(req, res) {
    try {
        const feedId = req.params.feedId;
        const feed = await Feed.findOne({_id: ObjectId(feedId)}).exec();
        const fullFeedData = await getFeedData(feed);

        return res.status(200).send({message: "Success", data: fullFeedData});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
}

async function createFeed(req, res) {
    try {
        const values = req.body.values;

        if (!values.portal || values.portal === "none") {
            throw new Error("Please add portal");
        }
        const portal = await Portal.findById(values.portal);

        const gameID = values.game ? mongoose.Types.ObjectId(values.game) : null;
        const game = await Game.findById(gameID);

        const storyID = values.story ? mongoose.Types.ObjectId(values.story) : null;
        const story = await Story.findById(storyID);

        const feed = new Feed({
            title: values.title,
            type: values.type,
            category: values.category,
            message: values.message,
            mobileFile: values.mobileFile,
            desktopFile: values.desktopFile,
            portalID: portal,
            gameID: game || null,
            storyID: story || null,
            mobileVideos: values.mobileVideos,
            desktopVideos: values.desktopVideos,
            thumbnails: values.thumbnails,
        });
        await feed.save();
        const feedData = await getFeedData(feed);
        io.emit("feedCreated", feedData);

        //send mail to game users
        if (feedData.gameFull && feedData?.gameFull?.usersToShow) {
            var domain = process.env.URL_IMAGINE;
            const sendMessagePromises = feedData?.gameFull?.usersToShow?.map(
                async (user) => {
                    try {
                        await MailService.sentMailWhenFeedCreated(user);
                        // await emailService.sendNewPlayMail(user);
                        const userFromDb = await User.findById(user._id).exec();
                        await Twillio.sendMessage(
                            userFromDb?.phoneNumber,
                            `${String.fromCodePoint(0x1f60a)} Hey ${
                                user.username
                            }! It\'s Kawaii from Imagine Council. Exciting news – a new play promo just dropped! Check it out here: ${domain}`
                        );
                        return {status: "fulfilled", user: user.username};
                    } catch (error) {
                        return {
                            status: "rejected",
                            user: user.username,
                            error: error.message,
                        };
                    }
                }
            );
            await Promise.allSettled(sendMessagePromises);
        }

        return res.status(200).send({message: "Success", data: feed});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
}

async function updateFeed(req, res) {
    const values = req.body.values;

    if (!values.portal || values.portal === "none") {
        throw new Error("Please add portal");
    }

    try {
        const feed = await Feed.findById(req.body.feedId);
        if (!feed) {
            throw new Error("Feed not found");
        }

        const portal = await Portal.findById(values.portal);

        let game;
        if (values.game) {
            game = await Game.findById(values.game);
        }

        let story;
        if (values.story) {
            story = await Story.findById(mongoose.Types.ObjectId(values.story));
        }
        const mobileVideos = {
            pending: values?.mobileVideos?.pending
                ? processString(values?.mobileVideos?.pending)
                : feed?.mobileVideos?.pending,
            submission: values?.mobileVideos?.submission
                ? processString(values?.mobileVideos?.submission)
                : feed?.mobileVideos?.submission,
            vote: values?.mobileVideos?.vote
                ? processString(values?.mobileVideos?.vote)
                : feed?.mobileVideos?.vote,
            completed: values?.mobileVideos?.completed
                ? processString(values?.mobileVideos?.completed)
                : feed?.mobileVideos?.completed,
            play_starts: values?.mobileVideos?.play_starts
                ? processString(values?.mobileVideos?.play_starts)
                : feed?.mobileVideos?.play_starts,
            hold: values?.mobileVideos?.hold
                ? processString(values?.mobileVideos?.hold)
                : feed?.mobileVideos?.hold,
        };

        const desktopVideos = {
            pending: values?.desktopVideos?.pending
                ? processString(values?.desktopVideos?.pending)
                : feed?.desktopVideos?.pending,
            submission: values?.desktopVideos?.submission
                ? processString(values?.desktopVideos?.submission)
                : feed?.desktopVideos?.submission,
            vote: values?.desktopVideos?.vote
                ? processString(values?.desktopVideos?.vote)
                : feed?.desktopVideos?.vote,
            completed: values?.desktopVideos?.completed
                ? processString(values?.desktopVideos?.completed)
                : feed?.desktopVideos?.completed,
            play_starts: values?.desktopVideos?.play_starts
                ? processString(values?.desktopVideos?.play_starts)
                : feed?.desktopVideos?.play_starts,
            hold: values?.desktopVideos?.hold
                ? processString(values?.desktopVideos?.hold)
                : feed?.desktopVideos?.hold,
        };

        const thumbnails = {
            pending: values?.thumbnails?.pending || feed?.thumbnails?.pending,
            submission:
                values?.thumbnails?.submission || feed?.thumbnails?.submission,
            vote: values?.thumbnails?.vote || feed?.thumbnails?.vote,
            completed: values?.thumbnails?.completed || feed?.thumbnails?.completed,
            hold: values?.thumbnails?.hold || feed?.thumbnails?.hold,
        };

        feed.title = values?.title || feed.title;
        feed.type = values?.type || feed.type;
        feed.category = values?.category || feed.category;
        feed.message = values?.message || feed.message;
        feed.mobileFile = values?.mobileFile || feed.mobileFile;
        feed.desktopFile = values?.desktopFile || feed.desktopFile;
        feed.portalID = portal;
        feed.gameID = values.game ? (game || feed.gameID) : null,
            feed.storyID = story || feed.storyID;
        feed.mobileVideos = mobileVideos;
        feed.desktopVideos = desktopVideos;
        feed.thumbnails = thumbnails;

        await feed.save();
        return res.status(200).send({message: "Success", data: feed});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
}

async function deleteFeed(req, res) {
    const feedId = req.body.feedId;
    if (!feedId) {
        return res.status(404).send({message: "Not found"});
    }
    try {
        await Feed.findOneAndRemove({_id: feedId});
        return res.status(200).send({message: "Success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
}

function processString(str) {
    if (str.includes("/api/routes/media/file/")) {
        return str.split("/api/routes/media/file/")[1].split("/video")[0];
    } else {
        return str;
    }
}

module.exports = {
    getFeed,
    createFeed,
    updateFeed,
    deleteFeed,
    getFeedData,
    getFeedById,
};
