const { TEXT, SELECT, NONE } = require('../../constants/answerInputType');
const { SYSTEM_MESSAGE, LINK_MESSAGE} = require('../../constants/chatGameType');

const systemScript = {
    verified : 
        {
            id: 0,
            message: `Congrats you have been verified ${String.fromCodePoint(0x1F44D)}. Now you can explore our system and play games.`,
            chatGameType: SYSTEM_MESSAGE,
            answerInputType: NONE,
            fieldName: 'userVerified',
        },
    newGame: 
        {
            id: 0,
            message: ``,
            chatGameType: LINK_MESSAGE,
            answerInputType: NONE,
            link: '',
            fieldName: 'newGame',
        },
    voteGame: 
        {
            id: 0,
            message: ``,
            chatGameType: LINK_MESSAGE,
            answerInputType: NONE,
            link: '',
            fieldName: 'voteGame',
        },
    remidUserOfGameInPlay: 
        {
            id: 0,
            message: ``,
            chatGameType: LINK_MESSAGE,
            answerInputType: NONE,
            link: '',
            fieldName: 'remidUserOfGameInPlay',
        },
    coinsDistributed: 
        {
            id: 0,
            message: ``,
            chatGameType: LINK_MESSAGE,
            answerInputType: NONE,
            link: '',
            fieldName: 'coinsDistributed',
        },
    royalty: {
            id: 0,
            message: ``,
            chatGameType: SYSTEM_MESSAGE,
            answerInputType: NONE,
            fieldName: 'royalty',
        },
    potentialEarning: {
            id: 0,
            message: ``,
            chatGameType: SYSTEM_MESSAGE,
            answerInputType: NONE,
            fieldName: 'potentialEarning'
    },   
    productPicture: {
            id: 0,
            message: ``,
            chatGameType: SYSTEM_MESSAGE,
            answerInputType: NONE,
            fieldName: 'productPicture',
            picture: ``,
    }
    
}

module.exports = systemScript
