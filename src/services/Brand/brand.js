 const FileSystem = require('file-system');
const emailTypes = require("../../constants/emailType");
const emailService = require("../Email/email");
const Tools = require("../Tools/Tools");
const StripeClient = require("../Stripe/Client");
const Brand = require("../../models/brand");
const Transaction = require("../../models/transaction");
const GpcAccount = require("../../models/gpcAccount")
// const Unit = require("../../models/unit");
// const UnitType = require("../../constants/unitType");
const coinService = require('../Coin/coin')
const S3Service = require("../S3/S3Service")
const gpcService = require('../Gpc/gpc')
const brandTypes = require('../../constants/brandType')



async function getAllBrands() {
  try {
    const brands = await Brand.find({}).exec();
    return { brands: brands, message: "Success", status: 200 };
  } catch(error) {
    return { message: error.message, status: 500 };
  }
}

async function signUpBrand(brandData) {
  let errorMessage = "";
  let { email, firstName='', lastName='', phoneNumber, password, type, role='brand' } = brandData;
  let brand = await Brand.register(
    new Brand({
      firstName: firstName,
      lastName: lastName,
      username: `${firstName}-${lastName}`,
      email: email,
      phoneNumber: phoneNumber,
      coinCount: "0",
      verified: false,
      bank: false,
      card: false,
      type: type,
      customerID: "",
      onboarded: false,
      businessName: "",
      description: "",
      city: "",
      state: "",
      country: "",
      category: "",
      whyPortalPathway: "",
      whatIsExprected: "",
      logo: "",
      role: role,
      payment: false,
      paymentBank: false,
      verifiedPaymentBank: false,
      identification: "",
      verifyEmail: {
        // Removed verify email from register process
        // verifyEmail: {
        //   pin: Tools.generatePin(),
        //   expiration: Date.now() + 900000,
        // },
      },
    }),
    password
  ).catch((error) => {
    console.log(error)
    errorMessage = `Failed to create brand. [error = ${error}]`;
  });

  if (errorMessage) return { message: errorMessage, status: 500 };
  // Removed verify email from registration process
  // await emailService.sendBrandVerifiedEmail(brand);
  // brand.markModified('verifyEmail');
  brand.save();
  
  return { message: "Success", status: 200 };
}

async function updateBrand(brandId, values) {
    let errorMessage = "";
    let brand = await Brand.findById(brandId).exec();
    if (!brand) {
      return { message: `Brand not found. [id = ${brandId}]`, status: 500 };
    }
    Object.keys(values).forEach((key) => {
      brand[key] = values[key];
    });
    await brand.save().catch((error) => {
      errorMessage = error;
    });
    if (errorMessage) {
      return { message: `Failed to update brand. [error = ${errorMessage}]`, status: 500 };
    }
    return { message: "Successfully updated brand data!", status: 200 };
}

async function forgotPassword(email) {
  let brand = await Brand.findOne({ email: email }).exec();
  if (brand === null) {
    return { message: `Brand does not exist. [email = ${email}]`, status: 500 };
  }
  //sendResetPasswordEmail
  let updatedBrand = await emailService.sendMail(
    brand,
    emailTypes.RESET_PASSWORD,
    'password'
  );

  await updatedBrand.save().catch((error) => {
    return {
      message: `Failed to update brand. [id = ${brand.id}, error = ${error}]`,
      status: 500,
    };
  });

  return { message: "Success", status: 200 };
}

async function resetPassword(brandId, password, pin) {
  let errorMessage = "";
  let brand = await Brand.findById(brandId)
    .exec()
    .catch((error) => {
      errorMessage = error;
    });
  if (!brand || errorMessage) {
    return {
      message: `Failed to find brand. [error = ${errorMessage}, userId = ${brandId}]`,
      status: 500,
    };
  }

  if (
    !(
      brand.verifyEmail &&
      brand.verifyEmail.resetPassword &&
      brand.verifyEmail.resetPassword.pin === pin
    )
  ) {
    return { message: "Invalid PIN.", status: 500 };
  }

  if (Date.now() > brand.verifyEmail.resetPassword.expiration) {
    emailService.sendMail(brand, emailTypes.RESET_PASSWORD, 'password');
    return {
      message:
        "This reset password link is expired, a new one has been sent out!",
      status: 500,
    };
  }

  delete brand.verifyEmail.resetPassword;
  brand.markModified("verifyEmail");
  await brand.setPassword(password).catch((error) => {
    return {
      message: `Failed to set password for brand. [error = ${error}, userId = ${brand.id}]`,
      status: 500,
    };
  });

  await brand.save().catch((error) => {
    return {
      message: `Failed to set update brand. [error = ${error}, userId = ${brand.id}]`,
      status: 500,
    };
  });

  return { message: "Success", status: 200 };
}

async function verifyEmail(brandData) {
  let { id, pin } = brandData;
  let errorMessage = "";
  let brand = await Brand.findById(id)
    .exec()
    .catch((error) => (errorMessage = `Brand not found. ${error}`));
  if (!brand || errorMessage)
    return { message: `Brand not found. ${errorMessage}`, status: 500 };

  if (
    !(
      brand.verifyEmail &&
      brand.verifyEmail.verifyEmail &&
      brand.verifyEmail.verifyEmail.pin === pin
    )
  ) {
    return { message: "Invalid PIN.", status: 500 };
  }

  if (Date.now() > brand.verifyEmail.verifyEmail.expiration) {
    await emailService.sendBrandVerifiedEmail(brand);
    return {
      message:
        "This verification link is expired, a new one has been sent out!",
      status: 500,
    };
  }

  delete brand.verifyEmail.verifyEmail;
  brand.markModified("verifyEmail");
  await brand.save().catch((error) => {
    return { message: `Failed to verify email. ${error}`, status: 500 };
  });

  return { message: "Success", status: 200 };
}

async function completeOnboarding(brandData) {
  let brand = await Brand.findOne({ email: brandData.brandEmail });

  if (!brand)
    return { message: `Could not find brand: ${brandData.user}`, status: 500 };
  let customerId = await StripeClient.createCustomer(
    `New Brand adding card for coin purchase`,
    brand.email,
    `${brand.firstName} ${brand.lastName}`,
    brand.phoneNumber,
    brandData.token
  ).catch((error) => {
    console.log("stripe err, ", error);
    return {
      message: `Error: Unable to create customer in Stripe, ${error}`,
      status: 500,
    };
  });

  brand.customerID = customerId;
  brand.businessName = brandData.businessName.toLowerCase();
  brand.logo = brandData.logo;
  brand.city = brandData.city;
  brand.state = brandData.state;
  brand.country = brandData.country;
  brand.category = brandData.category;
  brand.description = brandData.description;
  brand.whatIsExpected = brandData.whatIsExpected;
  brand.whyPortalPathway = brandData.whyPortalPathway;
  brand.brandDetail = brandData.brandDetail;
  brand.onboarded = true;
  
  await brand.save().catch((error) => {
    return {
      message: `Failed to update brand with onboarding data. ${error}`,
      status: 500,
    };
  });

  return { message: "Success", status: 200, brand: brand };
}

async function addPaymentBank(brandData) {
  return Brand.findOne({ username: brandData.user }, async function (
    err,
    foundUser
  ) {
    if (err) {
      return { message: "Error", status: 500 };
    }
    // tokenize bank information before creating sources
    let tokendId = await StripeClient.createToken(
      `New Brand adding card for coin purchase`,
      foundUser.firstName,
      foundUser.lastName,
      brandData.routingNumber,
      brandData.accountNumber
    ).catch((error) => {
      return {
        message: `Error: Unable to create token in Stripe, ${error}`,
        status: 500,
      };
    });

    await StripeClient.addCard(foundUser.customerID, tokendId).catch(
      (error) => {
        return { message: `Failed to add card. ${error}`, status: 500 };
      }
    );
    return { message: "Success", status: 200 };
  });
}

async function verifyAmounts(brandData) {
  return Brand.findOne({ username: brandData.user }, async function (
    err,
    foundUser
  ) {
    if (err) {
      return { message: "Error", status: 500 };
    }

    let customer = await StripeClient.retrieveCustomer(
      foundUser.customerID
    ).catch((error) => {
      return { message: `Failed to retrieve customer. ${error}`, status: 500 };
    });
    //TODO CHECK THIS OUT
    // var stripe = require('stripe')('sk_test_4tBMbS5UJcVnbWYrkNp2fx9J007CYMHVjn');
    // stripe.customers.retrieve(
    //   foundUser.customerID,
    //   function(err, customer) {
    //     if (err) {
    //       console.log(err)
    //       return res.status(500).send({message : 'Error'});
    //     }
    //     var index
    //     for (i=0; i<customer.sources.data.length; i++) {
    //       if (customer.sources.data[i].id.includes('card')) {

    //       } else {
    //         index = i
    //       }
    //     }
    //     stripe.customers.verifySource(
    //       foundUser.customerID,
    //       customer.sources.data[index].id,
    //       {
    //         amounts: [parseInt(req.body.amount1.split('.')[1]), parseInt(req.body.amount2.split('.')[1])],
    //       },
    //       function(err, cust) {
    //         if (err) {
    //           console.log(err)
    //           return res.status(500).send({message : 'Error'});
    //         }
    //         foundUser.verifiedPaymentBank = true
    //         foundUser.save()
    //         return res.status(200).send({message : 'Success'});
    //     })
    //   })
  });
}

async function purchasePackage(brandData) {
  let brand = await Brand.findOne({email: brandData.email})
  if (!brand) {
    return { message: 'Brand not found', status: 500}
  }
  let description = "Brand Purchased Coins for game package";
  let amount = parseInt(brandData.desiredCoins) //amount is in cents 

  buyCoins(brand, amount, description)

  brand.coinCount = brand.coinCount + parseInt(brandData.desiredCoins)
  brand.subscription = true
  brand.gamePackage = brandData.packageType
  brand.save();

  return { message: "Success", status: 200 };
}

async function buyCoins(brand, amount, description) {
  await StripeClient.chargeCustomer(amount, brand.stripeAccountID, description)
  .catch((error) => (errorMsg = error));

  coinService.brandPurchaseCoins(amount)
  let gpcAcc = await GpcAccount.findOne({brandId: brand._id}).exec()
  gpcAcc.coinCount += amount;
  gpcAcc.save()
  let transaction = new Transaction({
    purchased: true,
    brand: {
      email: brand.email,
      id: brand.id
    },
    coinAmount: amount,
    reason: 'purchased points on ppw',
    portal: 'ppw',
    event: `Brand ${brand.username} has purchased  ${amount} points in PPW`,
    transactionCreated: new Date(),
  });
  transaction.save();
}

async function purchaseCoins(brandData) {
  let amount = parseInt(brandData.desiredCoins) //amount is in cents 
  let description = "Brand Purchased points";
  let brand = await Brand.findOne({email: brandData.email})
  buyCoins(brand, amount, description)
  
  let coinAmount = parseInt(brand.coinCount) + parseInt(brandData.desiredCoins)
  brand.coinCount = coinAmount.toString();
  brand.save();

  return { message: "Success", status: 200 };
}

async function verifyBrand(brand, data, file, remoteAddress) {
  let fileId = await StripeClient.createFile(file)
  .catch((error) => { 
      return { message : `Failed to upload identification file. [error = ${error}]`, status: 500 }
   })
   FileSystem.unlinkSync(file)
 
  let accountId = await StripeClient.createCompanyAccount(data.company, fileId, remoteAddress)
  .catch((error) => {
      console.log("account wasnt created: ", error)
      return { message: `Failed to create Stripe account. [error = ${error}]`, status: 500 }  
  })
  
  brand.stripeAccountID = accountId
  await brand.save().catch((error) => {
    return { message: `Failed to set update brand. [error = ${error}, brand = ${brand.id}]`, status: 500 }  
  })

  await StripeClient.createPersonForCompany(data.companyOwner, accountId, fileId)
  .catch((error) => {
    return { message: `Failed to create Stripe person for the account. [error = ${error}]`, status: 500 }  
  })

  if (data.isBank) {
    brand.bank = true
    await StripeClient.addBankAccount(brand.stripeAccountID, data.bankInfo.accountNumber, data.bankInfo.routingNumber)
    .catch((error) => { 
        return { message: `Failed to add bank account in Stripe. [error = ${error}]`, status: 500 }
     })
  } else if (data.isCard) {
    brand.card = true
    await StripeClient.addCardAccount(brand.stripeAccountID, data.cardInfo)
    .catch((error) => { 
        return { message: `Failed to add card account in Stripe. [error = ${error}]`, status: 500 }
     })
  }

  let gpcAccountData = {
    firstName: data.companyOwner.firstName,
    lastName: data.companyOwner.lastName,
    company: data.company.name,
    coinCount: brand.coinCount,
    stripeAccountID: accountId,
    username: data.gpcAccount.username,
    email: data.gpcAccount.email,
    password: data.gpcAccount.password,
    type: brandTypes.PORTALPATHWAY,
    brandId: brand.id,
    card: data.isCard,
    bank: data.isBank
  }
  let gpcAccount = await gpcService.registerGpcAccount(gpcAccountData)

  await new Transaction({
    user: {
        email: gpcAccount.account.email,
        id: brand.id
    },
    coinAmount: brand.coinCount,
    portal: 'ppw', //todo change to be sent from frontend
    reason: 'creating gpc acount for company',
    event: `Creating GoPlayCoin account for company ${brand.id}`,
    transactionCreated: new Date()
  }).save().catch(error => console.error(error))

  brand.gpcAccount = true
  await brand.save().catch((error) => {
    return { message: `Failed to set update user. [error = ${error}, id = ${userBrand.id}]`, status: 500 }
  })

  emailService.sendMail(brand, emailTypes.STRIPE_ACCOUNT_CREATED, 'coinAccount');
  return { message : 'Success!', status: 200 }
}

function checkIfEmailIsVerified(customer) {
  if (customer.verifyEmail && customer.verifyEmail.verifyEmail) {
    if (Date.now() > customer.verifyEmail.verifyEmail.expiration) {
      emailService.sendMail(customer, emailTypes.VERIFY_EMAIL, 'verify');
      return false;
    } else {
      return false;
    }
  }
  return true;
}

async function uploadProductImage(file, brandEmail) {
  let brand = await Brand.findOne({ email: brandEmail}).exec()
  if (brand) {
    let data = await S3Service.uploadFromUppyToS3(file)
    return data
  } else {
    return { message: "Unsuccess", status: 500 }
  }
}

async function uppyUpload(file) {
  let url = await S3Service.uploadFromUppyToS3(file)
  return url
}
 
module.exports = {
  signUpBrand,
  resetPassword,
  forgotPassword,
  verifyEmail,
  completeOnboarding,
  addPaymentBank,
  verifyAmounts,
  purchaseCoins,
  purchasePackage,
  verifyBrand,
  checkIfEmailIsVerified,
  uppyUpload,
  getAllBrands,
  updateBrand,
  uploadProductImage
};
