const { TEXT, SELECT, NONE } = require('../../constants/answerInputType')
const { SYSTEM_MESSAGE, QUESTION, MULTIPLE } = require('../../constants/chatGameType')
const fieldType = require('../../constants/fieldChatGameType')

const onboardingScript = {
  user: [
    {
      id: 0,
      message:
        'Verify your email by typing the pin I just sent you to activate me so we can chat. Don\'t worry if your inbox is still empty, it takes a little while to get there.',
      chatGameType: SYSTEM_MESSAGE,
      answerInputType: TEXT,
      fieldName: fieldType.EMAIL_VERIFICATION,
    },
    {
      id: 1,
      message: `What up bestie ${String.fromCodePoint(
        0x2757
      )} My name is "Kawaii" and welcome to Imagine Council.`,
      chatGameType: SYSTEM_MESSAGE,
      answerInputType: NONE,
      fieldName: fieldType.GREETING_USER
    },
    {
      id: 2,
      message: `Imagine Council produces the Globe’s imagination by creating, building and producing new stories to distribute.`,
      chatGameType: SYSTEM_MESSAGE,
      answerInputType: NONE,
      fieldName: fieldType.MESSAGE
    },
    {
      id: 3,
      message: `We aim to collectively create new ideas, stories, and collectible tokens with people around the ${String.fromCodePoint(
        0x1f30e
      )}. Collectible tokens can be anything from props, wardrobe, music, set design, and more.`,
      chatGameType: SYSTEM_MESSAGE,
      answerInputType: NONE,
      fieldName: fieldType.MESSAGE
    },
    {
      id: 4,
      message: `Let's get started. I am pleased to present you with the Data Identity Token (DiT); we use it to recognize you in the system.`,
      chatGameType: SYSTEM_MESSAGE,
      answerInputType: NONE,
      fieldName: fieldType.MESSAGE
    },
    {
      id: 5,
      message: ``,
      chatGameType: SYSTEM_MESSAGE,
      answerInputType: NONE,
      fieldName: fieldType.AVATAR,
    },
    {
      id: 6,
      message: `We use Data Identity Token (DiT) so you can help us, the characters of the Imagine Council — develop ideas for the stories and not be scared to share, but be open to imagine — like me. ${String.fromCodePoint(
        0x1f60a
      )}`,
      chatGameType: SYSTEM_MESSAGE,
      answerInputType: NONE,
      fieldName: fieldType.MESSAGE
    },
    {
      id: 7,
      message: 'Now the first question I need to know. What hub do you most identify with or want to rep?',
      chatGameType: MULTIPLE,
      answerInputType: SELECT,
      fieldName: fieldType.HUB,
      answers: [
        'CGI',
        'Cartoon',
        'Anime',
        'Puppet',
        'Robot',
        'Superhero',
      ],
    },
    {
      id: 8,
      message: `OK! Shoutout to the Supers. Look up in the sky -- it's a bird, it's a plane, nope — it's me chatting with you. Now, I need to know your vibe and to know that, you must tell me your favorite color.`,
      chatGameType: MULTIPLE,
      answerInputType: SELECT,
      fieldName: fieldType.FAVORITE_COLOR,
      answers: [
        'Green',
        'Yellow',
        'Red',
        'Orange',
        'Brown',
        'Blue',
        'Black',
        'White',
        'Purple',
      ],
    },
    {
      id: 9,
      message: `Cool. You're unique. Now can you tell me your style? Which feels most like you?`,
      chatGameType: MULTIPLE,
      answerInputType: SELECT,
      fieldName: fieldType.CREATIVE,
      answers: ['Numbers', 'Sound', 'Word', 'Visual', 'Voice'],
    },
    {
      id: 10,
      message: `Awesome sauce. Looking forward to having you in the society. Cheers to a mutually beneficial relationship. Oh, and one more thing. I'm just curious — what's your favorite number?`,
      chatGameType: QUESTION,
      answerInputType: TEXT,
      fieldName: fieldType.IMAGINATION,
      action: 'onboard',
    },
    {
      id: 11,
      message: `Nice! Just so you know, mines is number one (1), because I like to win ${String.fromCodePoint(0x1f3c1)}. YUP!`,
      chatGameType: SYSTEM_MESSAGE,
      answerInputType: NONE,
      fieldName: fieldType.MESSAGE
    },
    {
      id: 12,
      message: `Wait! one more thing, I almost forgot the best part — here's 111 points.`,
      chatGameType: SYSTEM_MESSAGE,
      answerInputType: NONE,
      fieldName: fieldType.MESSAGE
    },
    // {
    //   id: 13,
    //   message: `show goplay coing to user`,
    //   chatGameType: SYSTEM_MESSAGE,
    //   answerInputType: NONE,
    //   fieldName: fieldType.SHOW_COIN,
    // },
    {
      id: 13,
      message: `Points represent value in our system. Points represent ideas you bring to the Imagine Council characters. You can cash out your points for real ${String.fromCodePoint(0x1f4b0)} and so you know, 111 points = $1.11.`,
      chatGameType: SYSTEM_MESSAGE,
      answerInputType: NONE,
      fieldName: fieldType.MESSAGE
    },
    {
      id: 14,
      message: `Seriously, last question... What is your phone number? We need to verify you are who you say you are for your and our security.`,
      chatGameType: QUESTION,
      answerInputType: TEXT,
      fieldName: fieldType.PHONE,
    },
    {
      id: 15,
      message: `I just texted you a pin. When you get it, enter it here`,
      chatGameType: QUESTION,
      answerInputType: TEXT,
      fieldName: fieldType.PHONE_VERIFICATION,
    },
    {
      id: 16,
      message: `Alright, I'm done for now—I have a nail appointment ${String.fromCodePoint(0x1f485)}. And welcome to the Imagine Council${String.fromCodePoint(0x1f4a5)}`,
      chatGameType: SYSTEM_MESSAGE,
      answerInputType: NONE,
      fieldName: fieldType.END,
    },
  ],
}

module.exports = onboardingScript
