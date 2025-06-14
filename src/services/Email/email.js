require("dotenv").config();
const SendGridClient = require("../SendGrid/Client");
const Tools = require("../Tools/Tools");
const emailTypes = require("../../constants/emailType");
const userTypes = require("../../constants/userType");
const { v4: uuidv4 } = require("uuid");

async function getEmailTemplate(user, domain, emailType, options) {
  let html = "";
  let subject = "";
  if (emailType === emailTypes.RESET_PASSWORD) {
    user.verifyEmail.resetPassword = {
      pin: Tools.generatePin(),
      expiration: Date.now() + 3600000,
    };
    html = `
      <div>
        <h4>Reset Password</h4>
        <p>It's ok, you are one step away from recovering your password. Click <a href="${domain}forgot-password/${user.id}">here</a> to reset your password.</p>
      </div>`;
    subject = "Reset Password";
  } else if (emailType === emailTypes.VERIFY_EMAIL) {
    if (user.type === userTypes.BISNEY) {
      let pin = Tools.generatePin();
      user.verifyEmail.verifyEmail = {
        pin: pin,
        expiration: Date.now() + 3600000,
      }; //expiration in 60min ~ 1h
      html = `
        <div>
          <h4>Successful Registration</h4>
          <p>Click the link below to verify your email!</p>
          <br>
          <a href="${domain}verify-email?${user.id}&${user.verifyEmail.verifyEmail.pin}">${domain}verify-email?${user.id}&${user.verifyEmail.verifyEmail.pin}</a>
        </div>`;
      subject = "Successful Registration";
    } else {
      let pin = options?.pin || Tools.generatePin();
      user.verifyEmail.verifyEmail = {
        pin: pin,
        expiration: Date.now() + 3600000,
      }; //expiration in 60min ~ 1h
      html = `
        <div>
          <h4>Verify Email</h4>
          <p>Follow this <a href="${domain}login">link</a> to login and drop this pin - ${pin} in onboarding chat to start Kawaii and enter.</p>
        </div>`;
      subject = "Verify Email";
    }
  } else if (emailType === emailTypes.PAYOUT_SUCCESSFUL) {
    html = `
      <div>
        <h4>Payout Successful Email</h4>
        <p>You successfully withdraw ${user.coinCount} points.</p>
      </div>`;
    subject = "Payout Successful";
  } else if (emailType === emailTypes.STRIPE_ACCOUNT_CREATED) {
    html = `
      <div>
        <h4>Coin account created Email</h4>
        <p>Congrats! You have successfully created your coin account to payout funds you collect from Imagine Council. AWESOME! ${String.fromCodePoint(
          0x1f389
        )}.</p>
      </div>`;
    subject = "Account created";
  } else if (emailType === emailTypes.PUSHUSER_APPROVED) {
    html = `
      <div>
        <p>You just spoke to Kawaii and we now wanted to welcome you to Imagine Council. Explore our new ecosystem and </p>
        <a href="${domain}login">LETS GO PLAY!</a>
      </div>`;
    subject = "Welcome to the Imagine Council!";
  } else if (emailType === emailTypes.PRODUCT_BOUGHT) {
    html = `
      <div>
        <h4>Order from Imagine Council</h4>
        <p>Thank you for your recent purchase. Your order is on its way.</p>
      </div>`;
    subject = "Order confirmation";
  } else if (emailType === emailTypes.NEW_PLAY) {
    html = `
      <div>
        <h4>New Play!</h4>
        <p>Brand, ${brand.username}, pushed a new play on Imagine Council. GO PLAY!</p>
        <br>
        <a href="${domain}">${domain}</a>
      </div>`;
  } else if (emailType === emailTypes.USER_VERIFIED) {
    html = `
      <div>
        <p>Congrats! You're successfully verified in the Imagine Council system and you will never have to add those credentials again unless we find a problem.</p>
      </div>`;
    subject = "Account verified";
  }

  return { html, subject };
}

function getFrom(userType) {
  let domain = process.env[`URL_${userType.toUpperCase()}`];
  var from = domain.replace("https://", "").replace("/", "");
  if (from.includes("localhost")) from = "localhost";
  from = `noreply@` + from;
  return { domain: domain, from: from };
}

function getFromName(userType) {
  switch (userType) {
    case "bisney":
      return "Bisney Helix";
    default:
      return "Imagine Council";
  }
}

async function sendBrandVerifiedEmail(brand) {
  if (!brand.verifyEmail) brand.verifyEmail = {};
  let { domain, from } = getFromPortalPathway();
  brand.verifyEmail.verifyEmail = {
    pin: Tools.generatePin(),
    expiration: Date.now() + 900000,
  };
  let html = `<div><h4>Verify Email</h4><p>Click the link below to verify your email!</p><br><a href="${domain}api/routes/brands/verifyEmail?id=${brand.id}&pin=${brand.verifyEmail.verifyEmail.pin}">${domain}verifyEmail?id=${brand.id}&pin=${brand.verifyEmail.verifyEmail.pin}</a></div>`;
  let subject = "Verify Email";
  const fromName = "Portalpathway";
  let errorMessage = "";
  await SendGridClient.sendEmail(
    from,
    html,
    subject,
    brand.email,
    fromName
  ).catch((error) => {
    errorMessage = error;
  });
  if (errorMessage) throw errorMessage;

  brand.markModified("verifyEmail");
  return brand;
}

async function sendMail(user, emailType, emailSender, options) {
  if (!user.verifyEmail) user.verifyEmail = {};
  let { domain, from } = getFrom(user.type);
  let data = await getEmailTemplate(user, domain, emailType, options);
  let errorMessage = "";
  const fromName = getFromName(user.type);
  await SendGridClient.sendEmail(
    from,
    data.html,
    data.subject,
    user.email,
    fromName
  ).catch((error) => {
    errorMessage = error;
  });
  if (errorMessage) throw errorMessage;

  user.markModified("verifyEmail");
  return user;
}


async function sendFeedbackEmail(user, feedback) {
  try {
    let from = user.email;
    let fromName = user.name;
    let affiliation = user.affiliation;

    let html = `
      <div>
        <h2>User sent feedback</h2>
        <p>From: ${fromName}</p>
        <p>Email: ${from}</p>
        <p>Affiliation: ${affiliation}</p>
        <h4>Feedback:</h4>
        <p>${feedback}</p>
      </div>
    `;

    let subject = "User feedback";

    // We must deside where to send the feedback email to
    let to = process.env.EMAIL_FEEDBACK;

    await SendGridClient.sendEmail(from, html, subject, to, fromName);
  } catch (error) {
    throw error;
  }
}

function getFromPortalPathway() {
  var domain = process.env.URL_PORTALPATHWAY;
  var from = domain.replace("https://", "").replace("/", "");
  if (from.includes("localhost")) from = "localhost";
  from = "ppw@" + from;
  return { domain: domain, from: from };
}

function getFromWebflow() {
  var domain = process.env.URL_BISNEY;
  var from = domain.replace("https://", "").replace("/", "");
  if (from.includes("localhost")) from = "localhost";
  from = "noreply@" + from;
  return { from: from };
}

async function sendUserMailForRoyalty(userEmail) {
  var domain = process.env.URL_PUSHUSER;
  var from = domain.replace("https://", "").replace("/", "");
  if (from.includes("localhost")) from = "localhost";
  from = `noreply@` + from;
  const fromName = "Imagine Council";
  var html = `
    <div>
      <h4>Product bought!</h4>
      <p>${String.fromCodePoint(
        0x1f44b
      )} You have new message from me — Kawaii. ${String.fromCodePoint(
    0x1f911
  )}</p>
    </div>`;
  var subject = `Object Bought ${String.fromCodePoint(0x1f4b0)}`;
  await SendGridClient.sendEmail(
    from,
    html,
    subject,
    userEmail,
    fromName
  ).catch((error) => {
    console.log("mail wasn't send", error);
  });
}

async function sendBrandMailForRoyalty(productName, coinAmount, brandEmail) {
  let { from } = getFromWebflow();
  const fromName = "Imagine Council";
  var html = `
    <div>
      <h4>Product bought!</h4>
      <p>Your product - ${productName} - was bought and you earned ${coinAmount} points!</p>
    </div>`;
  var subject = "Your product was bought!";
  await SendGridClient.sendEmail(
    from,
    html,
    subject,
    brandEmail,
    fromName
  ).catch((error) => {
    console.log("mail wasn't send", error);
  });
}

async function sendProductBought(
  user,
  addressInfo,
  tokens,
  willDeliver = false,
  transactionId,
  orderId,
  payment,
  attachments = []
) {
  let { from } = getFromWebflow();
  const fromName = "Imagine Council";

  let transaction = transactionId || uuidv4();
  let order = orderId || uuidv4();
  const customerName = user.username;

  const subtotalPrice = await tokens.reduce((total, token) => {
    const count = token.count ?? 1;
    return total + count * token.price;
  }, 0);

  const currentDate = new Date();

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthsOfYear = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const dayOfWeek = daysOfWeek[currentDate.getDay()];
  const month = monthsOfYear[currentDate.getMonth()];
  const dayOfMonth = currentDate.getDate();
  const year = currentDate.getFullYear();
  const hours = currentDate.getHours();
  const minutes = currentDate.getMinutes();
  const seconds = currentDate.getSeconds();
  const formattedDate = `${dayOfWeek} ${month} ${dayOfMonth} ${year} ${hours}:${minutes}:${seconds}`;

  const tokenTableRows = tokens
    .map(
      (token) => `
            <tr>
                <td>${token.name}</td>
                <td>${token.count || 1}</td>
                <td>$ ${token.price}</td>
            </tr>
        `
    )
    .join("");

  var html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Receipt</title>
                <style>
            body {
                padding: 40px 50px;
                font-size: 14px;
                color: black;
            }

            table {
                width: 35%;
                border-collapse: collapse;
                border: 1px solid black; 
            }

            th, td {
                border: 1px solid black;
                padding: 5px;
                text-align: left;
                height: 15px;
            }

            th {
                background-color: #f2f2f2;
            }

            td:nth-child(2), td:nth-child(3) {
                width: 10%;
            }
            
            span {
                font-weight: 600 !important;
            }
            
            img {
                width: 65px;
                height: 60px;
            }
            div {
                color: black;
                font-weight: normal;
            }
            
            </style>
            </head>
            
            <body>  
                <div>Hi ${customerName},</div>
                <div>Thank you for being a part of our society and supporting the economics of Imagine Council with your recent purchase!</div>
                <br/>
                <div style="font-weight: bold">Purchase Details:</div>
                <div>For more information about your purchase, you can visit the Society Mechanics page at <a href="https://imaginecouncil.com/societymechanics" style="color: #c2b47f; text-decoration: none"> https://imaginecouncil.com/societymechanics.</a></div>
                <br/>
                <div><span>Items Purchased:</span></div>
                <table>
                    <tr>
                        <th><strong>Collectibles</strong></th>
                        <th><strong>Quantity</strong></th>
                        <th><strong>Price</strong></th>
                    </tr>
                    
                    ${tokenTableRows}
                    
                    <tr>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td><strong>Subtotal</strong></td>
                        <td></td>
                        <td>$ ${subtotalPrice}</td>
                    </tr>
                </table>
                <br/>
                <div><strong>Payment Details:</strong></div>
                <ul>
                    <li>Payment Method: ${
                      payment === "stripe" ? "Credit Card" : "PayPal"
                    }</li>
                    <li>Transaction ID: ${transaction}</li>
                </ul>
                <div><strong>Shipping Information:</strong></div>
                <div>${
                  addressInfo.firstName ? addressInfo.firstName + "," : ""
                } ${
    addressInfo.lastName ? addressInfo.lastName + "," : ""
  }</div>
                <div>${addressInfo.country ? addressInfo.country + "," : ""} ${
    addressInfo.city ? addressInfo.city + "," : ""
  } ${addressInfo.street ? addressInfo.street : ""}</div>
                <div>${addressInfo.city ? addressInfo.city + "," : ""} ${
    addressInfo.state ? addressInfo.state + "," : ""
  } ${addressInfo.zip ? addressInfo.zip : ""}</div>
                <div>${user.phoneNumber}</div>
                <br/>
                <div><strong>Order Summary:</strong></div>
                <ul>
                    <li>Order Number: ${order}</li>
                    <li>Order Date: ${formattedDate}</li>
                </ul>
                <div><strong>Thank you for choosing being a part of the Imagine Council!</strong></div>
            </body>
            </html>
        `;

  var subject = `${String.fromCodePoint(
    0x1f9fe
  )} Your Imagine Council Purchase Receipt.`;
  await SendGridClient.sendEmail(
    from,
    html,
    subject,
    user.email,
    fromName,
    attachments
  ).catch((error) => {
    console.log("mail wasn't send", error);
  });
}

async function sendNewPlayMail(user, brandUsername) {
  var domain = process.env.URL_IMAGINE;
  var from = domain.replace("https://", "").replace("/", "");
  if (from.includes("localhost")) from = "localhost";
  from = "noreply@" + from;
  const fromName = "Imagine Council";
  var html = `<div><h4>New Play Promo!</h4><p>${String.fromCodePoint(
    0x1f44b
  )} New play promo is up on Imagine Council. ${String.fromCodePoint(
    0x1f4a5
  )}</p><br>\
            <a href="${domain}">${domain}</a></div>`;
  var subject = `New Play ${String.fromCodePoint(0x1f4a1)}`;
  await SendGridClient.sendEmail(
    from,
    html,
    subject,
    user.email,
    fromName
  ).catch((error) => {
    console.log("mail wasn't send", error);
  });
}

async function sentMailWhenFeedCreated(user, brandUsername) {
  var domain = process.env.URL_IMAGINE;
  var from = domain.replace("https://", "").replace("/", "");
  if (from.includes("localhost")) from = "localhost";
  from = "noreply@" + from;
  const fromName = "Imagine Council";
  var html = `<div>
<h4>${String.fromCodePoint(0x1f60a)} New Play Promo!</h4>
<p>${String.fromCodePoint(0x1f60a)} Hey ${
    user.username
  }! It\'s Kawaii from Imagine Council. Exciting news – a new play promo just dropped! Check it out here: </p><br>\
            <a href="${domain}">${domain}</a></div>`;
  var subject = `${String.fromCodePoint(0x1f60a)} New Play Promo`;
  await SendGridClient.sendEmail(
    from,
    html,
    subject,
    user.email,
    fromName
  ).catch((error) => {
    console.log("mail wasn't send", error);
  });
}

async function sendEmailForNotMeetingVotingTreshold(
  userEmail,
  gameName,
  username
) {
  var domain = process.env.URL_PUSHUSER;
  var from = domain.replace("https://", "").replace("/", "");
  if (from.includes("localhost")) from = "localhost";
  from = "noreply@" + from;
  const fromName = "Imagine Council";
  var html = `<div><h4>${String.fromCodePoint(
    0x1f9be
  )} <strong>Time to VOTE Extended!</strong></h4>
<p>${String.fromCodePoint(
    0x1f9be
  )}What's up, ${username}! It's Kawaii again from Imagine Council. The plays are in, and we have extended the time to vote for your favorites and least favorites! GO VOTE!</p><br>\
        <a href="${domain}">${domain}</a></div>`;
  var subject = "Voting Time!";

  var errorMessage = "";
  SendGridClient.sendEmail(from, html, subject, userEmail, fromName).catch(
    (error) => {
      errorMessage = error;
    }
  );
  if (errorMessage) {
    console.error(`Failed to send email. [error = ${errorMessage}`);
  }
}

async function sendEmailReminderToPlay(user) {
  var domain = process.env.URL_PUSHUSER;
  var from = domain.replace("https://", "").replace("/", "");
  if (from.includes("localhost")) from = "localhost";
  from = "noreply@" + from;
  const fromName = "Imagine Council";
  var html = `<div>
<h4>${String.fromCodePoint(0x1f4a5)} New Play Started</h4>
<p>${String.fromCodePoint(0x1f4a5)} Hey ${
    user.username
  }! It's Kawaii from Imagine Council. A new play just started– let’s imagine and create value!</p><br>\
        <a href="${domain}">${domain}</a></div>`;
  var subject = `${String.fromCodePoint(0x1f4a5)} New Play Started`;

  var errorMessage = "";
  SendGridClient.sendEmail(from, html, subject, user.email, fromName).catch(
    (error) => {
      errorMessage = error;
    }
  );
  if (errorMessage) {
    console.error(`Failed to send email. [error = ${errorMessage}`);
  }
}
async function sendEmailReminderToVote(user) {
  var domain = process.env.URL_PUSHUSER;
  var from = domain.replace("https://", "").replace("/", "");
  if (from.includes("localhost")) from = "localhost";
  from = "noreply@" + from;
  const fromName = "Imagine Council";
  var html = `<div>
<h4>${String.fromCodePoint(0x1f9be)} Time to VOTE!</h4>
<p>${String.fromCodePoint(0x1f9be)} What's up, ${
    user.username
  }! It's Kawaii again from Imagine Council. The plays are in, and now it's time to vote for your favorites and least favorites! GO VOTE!</p><br>\
        <a href="${domain}">${domain}</a></div>`;
  var subject = `${String.fromCodePoint(0x1f9be)} Time to VOTE!`;

  var errorMessage = "";
  SendGridClient.sendEmail(from, html, subject, user?.email, fromName).catch(
    (error) => {
      errorMessage = error;
    }
  );
  if (errorMessage) {
    console.error(`Failed to send email. [error = ${errorMessage}`);
  }
}

async function sendEmailForNotMeetingSubmissionTreshold(
  userEmail,
  brand,
  gameName,
  username
) {
  var domain = process.env.URL_PUSHUSER;
  var from = domain.replace("https://", "").replace("/", "");
  if (from.includes("localhost")) from = "localhost";
  from = "noreply@" + from;
  const fromName = "Imagine Council";
  var html = `<div><h4>${String.fromCodePoint(
    0x1f4a5
  )}<strong> New Play Extended!</strong></h4>
<p>${String.fromCodePoint(
    0x1f4a5
  )} Hey ${username}! It's Kawaii from Imagine Council. A new play just extended, and we'd love your ideas. GO Play and earn now!</p><br>\
        <a href="${domain}">${domain}</a></div>`;
  var subject = "Play Time!";

  var errorMessage = "";
  SendGridClient.sendEmail(from, html, subject, userEmail, fromName).catch(
    (error) => {
      errorMessage = error;
    }
  );
  if (errorMessage) {
    console.error(`Failed to send email. [error = ${errorMessage}`);
  }
}

async function sendEmailForGoUsersSubscribes(req, res) {
  const email = req.body?.email
  try {
    var from = 'subscribe@globeorbit.com';

    let fromName = 'Globe Orbit';
    let subject = "Welcome to GLOBE ORBIT";


    let html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <p>Thank you for subscribing to GLOBE ORBIT!</p>
        <p>Get ready for up-to-date news delivered straight to your inbox, keeping you informed about what we're up to and giving you the chance to check out our latest content.</p>
        <p>Thanks for joining us on this adventure!</p>
        <p>Best regards, </p>
        <p>Brandon Crawford<br> Founder of GLOBE ORBIT</p>
      </div>
    `;

    await SendGridClient.sendEmail(from, html, subject, email, fromName).catch(e => console.log(e));
    return res.status(200).send({message: 'Mail sent successfully'});
  } catch (error) {
    return res.status(500).send({message: 'Error sending email', error});
  }
}

module.exports = {
  sendMail,
  sendFeedbackEmail,
  sendBrandVerifiedEmail,
  sendUserMailForRoyalty,
  sendBrandMailForRoyalty,
  sendEmailForNotMeetingVotingTreshold,
  sendEmailForNotMeetingSubmissionTreshold,
  sendProductBought,
  sendEmailReminderToPlay,
  sendNewPlayMail,
  sendEmailReminderToVote,
  sentMailWhenFeedCreated,
  sendEmailForGoUsersSubscribes
};
