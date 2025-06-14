require("dotenv").config();
const FileSystem = require("file-system");
const Stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Coin = require("../../models/coin");

async function getStripeBalance() {
  let coin = await Coin.find().exec();
  try {
    let balance = await Stripe.balance.retrieve();
    const coinBalance = balance?.available[0]?.amount;
    const realAmount = coinBalance / 100;
    coin[0].usdAmountFromStripe = realAmount;
    coin[0].coinAmountFromStripe = coinBalance;
    coin[0].save();
  } catch (error) {
    console.log("error in retrieving stripe balance");
  }
}

// Account Functions
async function createIndividualAccount(
  street,
  city,
  state,
  dob,
  fileId,
  firstName,
  email,
  ip,
  lastName,
  phoneNumber,
  ssn,
  zip
) {
  var input = {
    business_profile: {
      mcc: "5816",
      url: "https://imaginecouncil.com",
    },
    business_type: "individual",
    country: "US",
    email: email,
    individual: {
      address: {
        city: city,
        line1: street,
        state: state,
        postal_code: zip,
        country: "US",
      },
      dob: {
        day: dob.split("-")[1],
        month: dob.split("-")[0],
        year: dob.split("-")[2],
      },
      email: email,
      first_name: firstName,
      last_name: lastName,
      phone: phoneNumber,
      ssn_last_4: ssn,
      verification: {
        document: {
          front: fileId,
        },
      },
    },
    requested_capabilities: ["card_payments", "transfers"],
    tos_acceptance: {
      date: Math.floor(Date.now() / 1000),
      ip: ip,
    },
    type: "custom",
  };

  var account = await Stripe.accounts.create(input).catch((error) => {
    throw error.message;
  });
  return account.id;
}

async function createCompanyAccount(company, ip) {
  var input = {
    business_profile: {
      mcc: "5816",
      url: "https://imaginecouncil.com",
    },
    business_type: "company",
    company: {
      name: company.name,
      phone: company.phone,
      tax_id: company.taxId,
      address: {
        city: company.city,
        line1: company.street,
        state: company.state,
        postal_code: company.zip,
        country: "US",
      },
      owners_provided: true,
    },
    country: "US",
    requested_capabilities: ["card_payments", "transfers"],
    tos_acceptance: {
      date: Math.floor(Date.now() / 1000),
      ip: "127.0.0.1",
    },
    type: "custom",
  };

  var account = await Stripe.accounts.create(input).catch((error) => {
    throw error.message;
  });
  return account.id;
}

async function deleteAccount(accountId) {
  await Stripe.accounts.del(accountId).catch((error) => {
    throw error.message;
  });
}

async function payoutAccount(accountId, amount, externalAccountId) {
  const account = await Stripe.accounts.retrieve(accountId);
  console.log(
    "Account status:",
    account.payouts_enabled ? "Payouts enabled" : "Payouts disabled"
  );
  console.log(
    "Currently due requirements:",
    account.requirements.currently_due
  );
  console.log(
    "Pending verification:",
    account.requirements.pending_verification
  );

  const updateParams = {};

  for (const requirement of account.requirements.currently_due) {
    switch (requirement) {
      case "individual.first_name":
        updateParams.individual = {
          ...updateParams.individual,
          first_name: "John",
        };
        break;
      case "individual.last_name":
        updateParams.individual = {
          ...updateParams.individual,
          last_name: "Doe",
        };
        break;
      case "individual.dob.day":
      case "individual.dob.month":
      case "individual.dob.year":
        updateParams.individual = {
          ...updateParams.individual,
          dob: { day: 1, month: 1, year: 1990 },
        };
        break;
      case "individual.address.line1":
      case "individual.address.city":
      case "individual.address.state":
      case "individual.address.postal_code":
        updateParams.individual = {
          ...updateParams.individual,
          address: {
            line1: "123 Main St",
            city: "Anytown",
            state: "CA",
            postal_code: "12345",
            country: "US",
          },
        };
        break;
      case "individual.id_number":
        updateParams.individual = {
          ...updateParams.individual,
          id_number: "000000000",
        };
        break;
      case "individual.ssn_last_4":
        updateParams.individual = {
          ...updateParams.individual,
          ssn_last_4: "1234",
        };
        break;
      case "business_profile.url":
        updateParams.business_profile = {
          ...updateParams.business_profile,
          url: "https://www.example.com",
        };
        break;
      case "business_profile.mcc":
        updateParams.business_profile = {
          ...updateParams.business_profile,
          mcc: "5734",
        };
        break;
      case "tos_acceptance.date":
      case "tos_acceptance.ip":
        updateParams.tos_acceptance = {
          date: Math.floor(Date.now() / 1000),
          ip: "127.0.0.1",
        };
        break;
      // Add more cases as needed
    }
  }
  
  if (Object.keys(updateParams).length > 0) {
    return await Stripe.accounts.update(accountId, updateParams);
  }
  
  const isTestMode = Stripe._api.auth.slice(7).startsWith("sk_test_");
  if (isTestMode) {
    const transfer = await Stripe.transfers.create({
      amount: 100, // TestMode amount 
      currency: "usd",
      destination: accountId,
    });
    console.log("Funds added successfully:", transfer.id);
    console.log("Amount:", transfer.amount);
  }
  
  const balance = await Stripe.balance.retrieve({
    stripeAccount: accountId,
  });
  
  const availableBalance = balance.available.find(
    (bal) => bal.currency === "usd"
  );
  
  if (!availableBalance || availableBalance.amount < amount) {
    throw new Error(
      `Insufficient balance. Available: ${
        availableBalance ? availableBalance.amount : 0
      } cents`
    );
  }
  console.log("AvailableBalance.amount, CoinAmount:", availableBalance.amount, amount)
  if(availableBalance.amount === 0) {
    console.log("Stripe account amount isn't enough!")
    return false
  }
  
  const payout = await Stripe.payouts
    .create(
      {
        amount: amount,
        currency: "usd",
        destination: externalAccountId,
        method: "standard",
      },
      {
        stripeAccount: accountId,
      }
    )
    .catch((error) => {
      throw error.message;
    });

  console.log("Payout", payout);  
}

async function transferToAccount(accountId, amount) {
  var input = {
    amount: amount,
    currency: "usd",
    destination: accountId,
  };

  await Stripe.transfers.create(input).catch((error) => {
    console.log(error.message);
    throw error.message;
  });
}

// Customer Functions

async function chargeCustomersCard(amount, token = "tok_mastercard") {
  var charge = await Stripe.charges
    .create({
      amount: amount,
      currency: "usd",
      source: token,
      description: "Buying a product",
    })
    .catch((error) => {
      throw error.message;
    });

  return charge.id;
}

async function chargeCustomer(amount, stripeAccId, description) {
  var charge = await Stripe.charges
    .create({
      amount: amount,
      currency: "usd",
      source: stripeAccId,
      description: description,
    })
    .catch((error) => {
      throw error.message;
    });

  return charge.id;
}

async function createCustomer(description, email, name, phoneNumber) {
  var customer = await Stripe.customers
    .create({
      description: description,
      email: email,
      name: name,
      phone: phoneNumber,
    })
    .catch((error) => {
      throw error.message;
    });

  return customer.id;
}

async function createCardToken(cardNumber, expMonth, expYear, cvc) {
  const token = await Stripe.tokens.create({
    card: {
      number: cardNumber,
      exp_month: expMonth,
      exp_year: expYear,
      cvc: cvc,
      currency: "usd",
    },
  });
  return token.id;
}

async function createToken(firstName, lastName, routingNumber, accountNumber) {
  var token = await Stripe.tokens
    .create({
      bank_account: {
        country: "US",
        currency: "usd",
        account_holder_name: firstName,
        account_holder_type: lastName,
        routing_number: routingNumber,
        account_number: accountNumber,
        account_holder_type: "individual",
      },
    })
    .catch((error) => {
      throw error.message;
    });

  return token.id;
}

async function createPersonForCompany(person, accountId, fileId) {
  let input = {
    first_name: person.firstName,
    last_name: person.lastName,
    address: {
      city: person.city,
      line1: person.street,
      state: person.state,
      postal_code: person.zip,
      country: "US",
    },
    dob: {
      day: person.dob.split("-")[1],
      month: person.dob.split("-")[0],
      year: person.dob.split("-")[2],
    },
    email: person.email,
    phone: person.phone,
    ssn_last_4: person.ssn,
    relationship: {
      executive: true,
      representative: true,
      title: "CEO",
    },
    verification: {
      document: {
        front: fileId,
      },
    },
  };

  return await Stripe.accounts.createPerson(accountId, input).catch((error) => {
    throw error.message;
  });
}

async function retrieveCustomer(customerId) {
  return await Stripe.customers.retrieve(customerId).catch((error) => {
    throw error.message;
  });
}

async function addCardAccount(accountId, card) {
  let input;
  if (card.number !== "4242424242424242") {
    let cardToken = await createCardToken(
      card.number,
      card.expMonth,
      card.expYear,
      card.cvc
    );
    input = { external_account: cardToken };
  } else {
    input = { external_account: "tok_visa_debit" };
  }
  await Stripe.accounts
    .createExternalAccount(accountId, input)
    .catch((error) => {
      throw error.message;
    });
}

// Bank Functions
async function addBankAccount(accountId, accountNumber, routingNumber) {
  var input = {
    external_account: {
      account_holder_type: "individual",
      account_number: accountNumber,
      country: "US",
      currency: "USD",
      object: "bank_account",
      routing_number: routingNumber,
    },
  };
  let data = await Stripe.accounts.createExternalAccount(accountId, input);
  return data;
}

async function getCardAccount(accountId) {
  var options = { object: "card", limit: 3 };
  var bankAccounts = await Stripe.accounts
    .listExternalAccounts(accountId, options)
    .catch((error) => {
      throw error.message;
    });
  return bankAccounts.data[0].id;
}

async function getBankAccount(accountId) {
  var options = { object: "bank_account", limit: 3 };
  var bankAccounts = await Stripe.accounts
    .listExternalAccounts(accountId, options)
    .catch((error) => {
      throw error.message;
    });
  return bankAccounts.data[0].id;
}

// Card Functions
async function addCard(customer, sourceToken) {
  await Stripe.customers
    .createSource(customer.id, { source: sourceToken })
    .catch((error) => {
      throw error.message;
    });
}

async function removeCard(customer) {
  await Stripe.customers
    .deleteSource(customer.id, customer.sources.data[0].id)
    .catch((error) => {
      throw error.message;
    });
}

async function addDebitCard(accountId, externalAccountId) {
  var input = { external_account: externalAccountId };
  await Stripe.accounts
    .createExternalAccount(accountId, input)
    .catch((error) => {
      throw error.message;
    });
}

async function getDebitCard(accountId) {
  var options = { object: "card", limit: 3 };
  var debitCards = await Stripe.accounts
    .listExternalAccounts(accountId, options)
    .catch((error) => {
      throw error.message;
    });
  return debitCards.data[0].id;
}

// File Functions
async function createFile(file) {
  var fp = FileSystem.readFileSync(file);
  var input = {
    purpose: "identity_document",
    file: {
      data: fp,
      name: file.split("/").pop(),
      type: "application/octet-stream",
    },
  };

  var uploadedFile = await Stripe.files.create(input).catch((error) => {
    throw error.message;
  });
  return uploadedFile.id;
}

//PaymentIntent

async function createPaymentIntent(amount) {
  try {
    const paymentIntent = await Stripe.paymentIntents.create({
      amount: amount * 100,
      currency: "usd",
    });
    return {
      message: "Payment intent created",
      success: true,
      cSecret: paymentIntent.client_secret,
    };
  } catch (error) {
    console.log("error", error);
    return {
      message: "Payment intent not succeeded",
      success: false,
      cSecret: null,
    };
  }
}

async function createVerificationSession(user) {
  if (!user || !user?.stripeCustomerID) {
    throw new Error("There is no such user in Stripe");
  }

  try {
    const verificationSession =
      await Stripe.identity.verificationSessions.create({
        type: "document",
        metadata: {
          user_id: user.stripeCustomerID,
        },
      });
    return verificationSession.client_secret;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function createExpressAccount(user) {
  try {
    const input = {
      country: user?.country || "US",
      type: "express",
      capabilities: {
        card_payments: {
          requested: true,
        },
        transfers: {
          requested: true,
        },
      },
      business_type: "individual",
      // business_profile: {
      //   url: 'https://example.com',
      // },
    };

    const account = await Stripe.accounts.create(input);
    return account;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function createAccountLink(expressAccountId, body) {
  const { page } = body;
  let redirectUrl;
  if (page) {
    redirectUrl = page;
  } else {
    redirectUrl = "checkout";
  }

  try {
    const url = process.env.URL_PUSHUSER
    const input = {
      account: expressAccountId,
      refresh_url: `${url}${redirectUrl}`,
      return_url: `${url}${redirectUrl}`,
      type: "account_onboarding",
    };
    const accountLink = await Stripe.accountLinks.create(input);
    return accountLink;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function retrieveStripeAccount(expressAccountId) {
  try {
    const account = await Stripe.accounts.retrieve(expressAccountId);
    return account;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function createCheckoutSession(amount, successUrl, cancelUrl) {
  try {
    const session = await Stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Purchase",
            },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return {
      message: "Checkout session created",
      success: true,
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.log("error", error);
    return {
      message: "Checkout session creation failed",
      success: false,
      sessionId: null,
      url: null,
    };
  }
}

async function listCustomers() {
  try {
    const customers = await Stripe.customers.list({
      limit: 10, 
    });
    customers.data.forEach((customer) => {
      console.log(`Customer ID: ${customer.id}, Email: ${customer.email}`);
    });
    return {
      message: "success",
    };
  } catch (error) {
    return error.message;
  }
}

async function getExternalAccountId(accountId) {
  try {
    const account = await Stripe.accounts.retrieve(accountId);
    console.log("ex", account);
    if (
      account.external_accounts &&
      account.external_accounts.data.length > 0
    ) {
      const externalAccount = account.external_accounts.data[0];
      console.log("External Account ID:", externalAccount.id);
      return externalAccount.id;
    } else {
      console.log("No external accounts found for this account.");
      return null;
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

//webhooks

module.exports = {
  createIndividualAccount,
  createPaymentIntent,
  createCheckoutSession,
  createCompanyAccount,
  deleteAccount,
  addCardAccount,
  payoutAccount,
  transferToAccount,
  chargeCustomer,
  chargeCustomersCard,
  createCustomer,
  retrieveCustomer,
  createPersonForCompany,
  addBankAccount,
  getBankAccount,
  getCardAccount,
  addCard,
  removeCard,
  addDebitCard,
  getDebitCard,
  createToken,
  createCardToken,
  createFile,
  getStripeBalance,
  createVerificationSession,
  createExpressAccount,
  createAccountLink,
  retrieveStripeAccount,
  listCustomers,
  getExternalAccountId,
};
